import Link from "next/link";
import { Brand } from "@/components/brand";
import { requireAdmin } from "@/lib/admin-auth";
import { database, type Booking } from "@/lib/database";
import { formatPickup } from "@/lib/notifications";
import { signOut, updateBooking } from "./actions";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  saved: "Booking updated.",
  invalid: "This action is unavailable for the current booking.",
  amounts: "Enter a positive deposit no greater than the total, with at most two decimal places.",
  failed: "The action could not finish. Check the booking’s current status before retrying.",
};
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const pageSize = 25;

export default async function Admin({ searchParams }: { searchParams: Promise<{ message?: string; page?: string }> }) {
  await requireAdmin();
  const { message, page } = await searchParams;
  const index = page && /^[1-9]\d{0,5}$/.test(page) ? Number(page) - 1 : 0;
  let bookings: Booking[] = [];
  let failed = false;
  try {
    const { data, error } = await database().from("bookings").select()
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(index * pageSize, (index + 1) * pageSize).returns<Booking[]>();
    if (error) throw error;
    bookings = data;
  } catch {
    failed = true;
  }

  return <main className="shell admin">
    <div className="flex flex-wrap items-center justify-between gap-4"><Brand/><form action={signOut}><button className="button button-outline">Sign out</button></form></div>
    <h1 className="text-5xl">Bookings</h1>
    {message && Object.hasOwn(messages, message) && <p role="status">{messages[message]}</p>}
    {failed ? <p role="alert">Booking storage is unavailable.</p> : !bookings.length && <p>No booking requests on this page.</p>}
    {bookings.slice(0, pageSize).map((booking) => <article className="admin-card" key={booking.id} id={`booking-${booking.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl">{booking.customer_name}</h2><p className="capitalize">{booking.status.replaceAll("_", " ")}</p></div>
      <dl className="summary">
        <div><dt>Reference</dt><dd>{booking.id}</dd></div>
        <div><dt>Pickup time (Central)</dt><dd>{formatPickup(booking.pickup_at)}</dd></div>
        <div><dt>Pickup</dt><dd>{booking.pickup}</dd></div>
        <div><dt>Destination</dt><dd>{booking.destination}</dd></div>
        <div><dt>Trip</dt><dd>{booking.trip_type} · {booking.passengers} passengers · {booking.luggage} bags</dd></div>
        <div><dt>Contact</dt><dd>{booking.customer_email} · {booking.customer_phone}</dd></div>
        {booking.airport && <div><dt>Airport details</dt><dd>{booking.airport} · {booking.airport_direction} · {booking.flight}</dd></div>}
        {booking.price_cents !== null && <div><dt>Price and deposit</dt><dd>{currency.format(booking.price_cents / 100)} total · {currency.format((booking.deposit_cents ?? 0) / 100)} deposit</dd></div>}
        {booking.deposit_url && <div><dt>Deposit email</dt><dd>{booking.deposit_email_at ? "Sent" : "Pending"}</dd></div>}
        {booking.confirmed_at && <div><dt>Confirmation email</dt><dd>{booking.confirmation_email_at ? "Sent" : "Pending"}</dd></div>}
      </dl>
      <form className="admin-controls" action={updateBooking}>
        <input type="hidden" name="id" value={booking.id}/>
        {booking.status === "pending" && <>
          <label className="field">Total (USD)<input name="price" type="number" step=".01" min=".01" max="999999.99" required /></label>
          <label className="field">Deposit (USD)<input name="deposit" type="number" step=".01" min=".01" max="999999.99" required /></label>
          <button className="button button-light" name="action" value="approve">Approve and set price</button>
        </>}
        {["pending", "approved"].includes(booking.status) && <button formNoValidate className="button button-outline" name="action" value="decline">Decline</button>}
        {(booking.status === "approved" || (booking.status === "awaiting_deposit" && !booking.deposit_email_at)) && <button className="button button-light" name="action" value="deposit">{booking.status === "approved" ? "Request deposit" : "Retry deposit email"}</button>}
        {["confirmed", "completed"].includes(booking.status) && !booking.confirmation_email_at && <button className="button button-light" name="action" value="confirmation">Retry confirmation email</button>}
        {booking.status === "confirmed" && <>
          <button className="button button-outline" name="action" value="complete">Mark complete</button>
          <button className="button button-outline" name="action" value="cancel">Mark cancelled</button>
        </>}
      </form>
    </article>)}
    <div className="flex gap-3">
      {index > 0 && <Link className="button button-outline" href={`/admin?page=${index}`}>Previous page</Link>}
      {bookings.length > pageSize && <Link className="button button-outline" href={`/admin?page=${index + 2}`}>Next page</Link>}
    </div>
  </main>;
}
