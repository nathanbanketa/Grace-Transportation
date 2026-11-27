import "server-only";
import { database, type Booking } from "./database";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const formatPickup = (date: string) => new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short",
}).format(new Date(date));

export async function sendBookingEmail(booking: Booking, kind: "deposit" | "confirmation") {
  const column = kind === "deposit" ? "deposit_email_at" : "confirmation_email_at";
  if (booking[column]) return;
  const { RESEND_API_KEY: key, BOOKING_FROM_EMAIL: from } = process.env;
  if (!key || !from) throw new Error("Email is unavailable.");

  const pickup = formatPickup(booking.pickup_at);
  const deposit = money.format((booking.deposit_cents ?? 0) / 100);
  const total = money.format((booking.price_cents ?? 0) / 100);
  const route = `Pickup: ${booking.pickup}\nDestination: ${booking.destination}\nPickup time: ${pickup} Central\nReference: ${booking.id}`;
  const text = kind === "deposit"
    ? `Temesgen has approved your trip at ${total}. Pay the ${deposit} deposit through Square to confirm.\n\n${booking.deposit_url}\n\n${route}`
    : `Your Grace Transportation reservation is confirmed. We received your ${deposit} deposit toward the ${total} total.\n\n${route}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `booking/${booking.id}/${kind}` },
    body: JSON.stringify({ from, to: [booking.customer_email], subject: kind === "deposit" ? "Grace Transportation deposit request" : "Grace Transportation reservation confirmed", text }),
  });
  if (!response.ok) throw new Error("Resend request failed.");
  const { error } = await database().from("bookings").update({ [column]: new Date().toISOString() }).eq("id", booking.id).is(column, null);
  if (error) throw error;
}
