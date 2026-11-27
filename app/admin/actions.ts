"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authClient, getAdmin, requireAdmin } from "@/lib/admin-auth";
import { pricingSchema, transitions, type Status } from "@/lib/booking";
import { database, type Booking } from "@/lib/database";
import { parseDriverTime } from "@/lib/driver-time";
import { drainNotifications } from "@/lib/notifications";
import { requestPayment, ReservationError, saveBooking } from "@/lib/reservations";
import { deactivateDepositLink, getOrderState } from "@/lib/square";

export async function signIn(form: FormData) {
  const email = z.email().safeParse(form.get("email"));
  const password = form.get("password");
  const auth = await authClient();
  if (!auth) redirect("/admin/login?message=unavailable");
  if (!email.success || typeof password !== "string" || !password || password.length > 256) redirect("/admin/login?message=invalid");
  const { error } = await auth.auth.signInWithPassword({ email: email.data, password });
  if (error || !(await getAdmin())) {
    if (!error) await auth.auth.signOut({ scope: "local" });
    redirect("/admin/login?message=invalid");
  }
  redirect("/admin");
}

export async function signOut() {
  const client = await authClient();
  await client?.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}

const editSchema = z.object({
  pickup: z.string().trim().min(3).max(250),
  destination: z.string().trim().min(3).max(250),
  pickupAt: z.string().transform((value, ctx) => {
    const timestamp = parseDriverTime(value);
    if (!timestamp || Date.parse(timestamp) <= Date.now()) {
      ctx.addIssue({ code: "custom", message: "Invalid pickup time" });
      return z.NEVER;
    }
    return timestamp;
  }),
  passengers: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100)),
  luggage: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(0).max(100)),
  flight: z.string().trim().max(25).transform((value) => value.toUpperCase()),
  duration: z.string().regex(/^\d{2,4}$/).transform(Number).pipe(z.number().int().min(15).max(1440)),
});

const nextStatus: Record<string, Status> = { decline: "declined", cancel: "cancelled", start: "in_progress", complete: "completed" };

async function retireCheckout(link: string, order: string) {
  const state = await getOrderState(order);
  if (state !== "OPEN" && state !== "CANCELED") throw new ReservationError("payment_review");
  if (state === "OPEN") await deactivateDepositLink(link);
  if (await getOrderState(order) !== "CANCELED") throw new ReservationError("payment_review");
}

export async function updateBooking(form: FormData) {
  const driver = await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  const expected = z.string().regex(/^\d{1,10}$/).transform(Number).safeParse(form.get("revision"));
  const action = form.get("action");
  if (!id.success) redirect("/admin?message=invalid");
  let message = "saved";
  try {
    const { data: booking, error } = await database().from("bookings").select().eq("id", id.data).single<Booking>();
    if (error) throw error;
    if (!expected.success || booking.revision !== expected.data) throw new ReservationError("stale");

    if ((action === "approve" && booking.status === "pending") || (action === "price" && ["approved", "awaiting_deposit"].includes(booking.status))) {
      const amounts = pricingSchema.safeParse({ price: form.get("price"), deposit: form.get("deposit") });
      const duration = z.string().regex(/^\d{2,4}$/).transform(Number).pipe(z.number().min(15).max(1440)).safeParse(form.get("duration"));
      if (!amounts.success || !duration.success) throw new ReservationError("amounts");
      if (Date.parse(booking.pickup_at) <= Date.now()) throw new ReservationError("time");
      if (booking.status === "awaiting_deposit") {
        if (duration.data !== booking.duration_minutes) throw new ReservationError("details");
        if (!booking.square_link_id || !booking.square_order_id) throw new ReservationError("legacy");
        await retireCheckout(booking.square_link_id, booking.square_order_id);
      }
      const approved = await saveBooking(booking, {
        deposit_url: null, square_order_id: null, square_link_id: null, checkout_revision: null,
        status: "approved", driver_id: driver.id, price_cents: amounts.data.price,
        deposit_cents: amounts.data.deposit, duration_minutes: duration.data,
      }, driver.id);
      try {
        await requestPayment(approved, driver.id);
      } catch {
        message = "checkout";
      }
    } else if (action === "payment") {
      await requestPayment(booking, driver.id);
    } else if (action === "edit" && ["pending", "approved", "awaiting_deposit", "confirmed"].includes(booking.status)) {
      const edit = editSchema.safeParse({
        pickup: form.get("pickup"), destination: form.get("destination"), pickupAt: form.get("pickupAt"), duration: form.get("duration"),
        passengers: form.get("passengers"), luggage: form.get("luggage"), flight: form.get("flight") ?? "",
      });
      if (!edit.success) throw new ReservationError("details");
      const { pickup, destination, pickupAt, duration, passengers, luggage, flight } = edit.data;
      if (booking.airport && !/^[A-Z0-9][A-Z0-9 -]{1,24}$/.test(flight)) throw new ReservationError("details");
      const flightNumber = booking.airport ? flight : null;
      if (pickup !== booking.pickup || destination !== booking.destination
        || Date.parse(pickupAt) !== Date.parse(booking.pickup_at) || duration !== booking.duration_minutes
        || passengers !== booking.passengers || luggage !== booking.luggage || flightNumber !== booking.flight) {
        await saveBooking(booking, { pickup, destination, pickup_at: pickupAt, duration_minutes: duration, passengers, luggage, flight: flightNumber }, driver.id);
      }
    } else if (typeof action === "string" && Object.hasOwn(nextStatus, action) && (transitions[booking.status] as readonly Status[]).includes(nextStatus[action])) {
      if (action === "cancel" && booking.status === "awaiting_deposit") {
        if (!booking.square_link_id || !booking.square_order_id) throw new ReservationError("legacy");
        await retireCheckout(booking.square_link_id, booking.square_order_id);
      }
      await saveBooking(booking, { status: nextStatus[action] }, driver.id);
    } else if (action !== "notify") {
      throw new ReservationError("invalid");
    }
    after(() => drainNotifications(id.data).catch(() => undefined));
  } catch (error) {
    message = error instanceof ReservationError ? error.code : "failed";
  }
  redirect(`/admin/bookings/${id.data}?message=${message}`);
}

export async function updateAvailability(form: FormData) {
  const driver = await requireAdmin();
  let message = "saved";
  try {
    const db = database();
    if (form.get("action") === "remove") {
      const id = z.uuid().safeParse(form.get("id"));
      if (!id.success) throw new ReservationError("invalid");
      const { error } = await db.from("availability").delete().eq("id", id.data);
      if (error) throw error;
    } else {
      const input = z.object({ start: z.string(), end: z.string(), note: z.string().trim().max(160) })
        .safeParse({ start: form.get("start"), end: form.get("end"), note: form.get("note") });
      if (!input.success) throw new ReservationError("details");
      const start = parseDriverTime(input.data.start);
      const end = parseDriverTime(input.data.end);
      if (!start || !end || (form.get("action") !== "edit" && Date.parse(start) <= Date.now()) || Date.parse(end) <= Date.now()
        || Date.parse(end) <= Date.parse(start) || Date.parse(end) - Date.parse(start) > 30 * 86400_000) {
        throw new ReservationError("time");
      }
      const values = { starts_at: start, ends_at: end, note: input.data.note };
      const id = z.uuid().safeParse(form.get("id"));
      const editing = form.get("action") === "edit";
      if (editing && !id.success) throw new ReservationError("invalid");
      const { error } = editing && id.success
        ? await db.from("availability").update(values).eq("id", id.data)
        : await db.from("availability").insert({ ...values, created_by: driver.id });
      if (error?.code === "23P01") throw new ReservationError("conflict");
      if (error) throw error;
    }
  } catch (error) {
    message = error instanceof ReservationError ? error.code : "failed";
  }
  redirect(`/admin?view=schedule&message=${message}`);
}
