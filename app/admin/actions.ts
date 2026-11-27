"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authClient, requireAdmin } from "@/lib/admin-auth";
import { pricingSchema } from "@/lib/booking";
import { database, type Booking } from "@/lib/database";
import { sendBookingEmail } from "@/lib/notifications";
import { createDepositLink } from "@/lib/square";

export async function signIn(form: FormData) {
  const email = z.email().safeParse(form.get("email"));
  const password = form.get("password");
  const auth = await authClient();
  if (!auth) redirect("/admin/login?message=unavailable");
  if (!email.success || typeof password !== "string" || !password) redirect("/admin/login?message=invalid");
  const { error } = await auth.auth.signInWithPassword({ email: email.data, password });
  if (error) redirect("/admin/login?message=invalid");
  redirect("/admin");
}

export async function signOut() {
  const client = await authClient();
  await client?.auth.signOut();
  redirect("/admin/login");
}

export async function updateBooking(form: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  const action = form.get("action");
  if (!id.success) redirect("/admin?message=invalid");
  let message = "saved";

  try {
    const db = database();
    const { data, error } = await db.from("bookings").select().eq("id", id.data).single<Booking>();
    if (error) throw error;
    const booking = data;

    async function update(values: Partial<Booking>) {
      const { data, error } = await db.from("bookings").update(values)
        .eq("id", booking.id).eq("status", booking.status).select().maybeSingle<Booking>();
      if (error || !data) throw new Error("Booking changed.");
      return data;
    }

    if (action === "approve" && booking.status === "pending") {
      const amounts = pricingSchema.safeParse({ price: form.get("price"), deposit: form.get("deposit") });
      if (amounts.success) {
        await update({ status: "approved", price_cents: amounts.data.price, deposit_cents: amounts.data.deposit });
      } else {
        message = "amounts";
      }
    } else if (action === "deposit" && booking.status === "approved") {
      const link = await createDepositLink(booking);
      const awaiting = await update({ status: "awaiting_deposit", deposit_url: link.url, square_order_id: link.order_id });
      await sendBookingEmail(awaiting, "deposit");
    } else if (action === "deposit" && booking.status === "awaiting_deposit") {
      await sendBookingEmail(booking, "deposit");
    } else if (action === "confirmation" && ["confirmed", "completed"].includes(booking.status)) {
      await sendBookingEmail(booking, "confirmation");
    } else if (action === "decline" && ["pending", "approved"].includes(booking.status)) {
      await update({ status: "declined" });
    } else if (action === "cancel" && ["pending", "approved", "confirmed"].includes(booking.status)) {
      await update({ status: "cancelled" });
    } else if (action === "complete" && booking.status === "confirmed") {
      await update({ status: "completed" });
    } else {
      message = "invalid";
    }
  } catch {
    message = "failed";
  }
  redirect(`/admin?message=${message}#booking-${id.data}`);
}
