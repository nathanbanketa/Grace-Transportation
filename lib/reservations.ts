import "server-only";
import { database, type Booking } from "./database";
import { createDepositLink } from "./square";

export class ReservationError extends Error {
  constructor(readonly code: string) { super(code); }
}

export async function saveBooking(booking: Booking, changes: Partial<Booking>, actor: string | null) {
  const { data, error } = await database().from("bookings").update({ ...changes, updated_by: actor })
    .eq("id", booking.id).eq("revision", booking.revision).select().maybeSingle<Booking>();
  if (error?.code === "23P01") throw new ReservationError("conflict");
  if (error) throw error;
  if (!data) throw new ReservationError("stale");
  return data;
}

export async function requestPayment(booking: Booking, actor: string | null) {
  if (booking.status !== "approved") throw new ReservationError("stale");
  if (Date.parse(booking.pickup_at) <= Date.now()) throw new ReservationError("time");

  // Do not expose the link until its order and slot have been committed together.
  const link = await createDepositLink(booking);
  return saveBooking(booking, {
    status: "awaiting_deposit", driver_id: booking.driver_id ?? actor, deposit_url: link.url, square_order_id: link.order_id,
    square_link_id: link.id, checkout_revision: booking.revision + 1,
  }, actor);
}

export async function retryApprovedCheckouts() {
  const { data, error } = await database().from("bookings").select().eq("status", "approved")
    .not("driver_id", "is", null).gt("pickup_at", new Date().toISOString())
    .order("updated_at", { ascending: true }).limit(6).returns<Booking[]>();
  if (error) throw error;
  await Promise.allSettled(data.map((booking) => requestPayment(booking, null)));
}
