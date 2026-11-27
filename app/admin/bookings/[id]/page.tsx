import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, ContactActions, DriverNotice, DriverShell, Money } from "@/components/driver-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { database, type Booking } from "@/lib/database";
import { formatPickup, localInput } from "@/lib/driver-time";
import { updateBooking } from "../../actions";

type History = { id: number; event: string; actor_id: string | null; status: Booking["status"]; created_at: string };
type Payment = { square_payment_id: string; amount_cents: number; refunded_cents: number; disposition: string };
type Delivery = { id: string; kind: string; channel: string; delivered_at: string | null; failed_at: string | null };

export default async function BookingDetails({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const driver = await requireAdmin();
  const { id } = await params;
  const { message } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = database();
  const { data: booking, error } = await db.from("bookings").select().eq("id", id).maybeSingle<Booking>();
  if (error) return <DriverShell driver={driver.display_name}><DriverNotice code="failed" /></DriverShell>;
  if (!booking) notFound();
  const [history, customer, payments, deliveries] = await Promise.all([
    db.from("booking_history").select("id,event,actor_id,status,created_at").eq("booking_id", id)
      .order("id", { ascending: false }).limit(50).returns<History[]>(),
    db.from("bookings").select("id, status, pickup_at, pickup, destination").eq("customer_id", booking.customer_id).neq("id", id)
      .order("pickup_at", { ascending: false }).limit(25).returns<Pick<Booking, "id" | "status" | "pickup_at" | "pickup" | "destination">[]>(),
    db.from("payments").select("square_payment_id,amount_cents,refunded_cents,disposition").eq("booking_id", id).order("created_at").returns<Payment[]>(),
    db.from("notifications").select("id,kind,channel,delivered_at,failed_at").eq("booking_id", id)
      .eq("channel", "email").order("created_at", { ascending: false }).limit(30).returns<Delivery[]>(),
  ]);
  const canEdit = ["pending", "approved", "awaiting_deposit", "confirmed"].includes(booking.status);
  const canDecline = booking.status === "pending" || booking.status === "approved";
  const canPrice = canDecline || (booking.status === "awaiting_deposit" && !!booking.square_link_id);
  const canCancel = ["pending", "approved", "awaiting_deposit", "confirmed", "in_progress"].includes(booking.status);
  const payable = (amount: number | null) => amount === null ? "" : (amount / 100).toFixed(2);
  const backView = ["confirmed", "in_progress"].includes(booking.status)
    ? "upcoming" : ["completed", "declined", "cancelled"].includes(booking.status) ? "history" : "requests";

  return <DriverShell driver={driver.display_name}>
    <Link className="driver-link" href={`/admin?view=${backView}`}>Back to rides</Link>
    <div className="driver-title"><p className="driver-kicker">{booking.trip_type}</p><h1>{booking.customer_name}</h1><Badge status={booking.status}/></div>
    <DriverNotice code={message} />
    <ContactActions booking={booking} />
    <div className="driver-detail-grid">
      <section className="driver-panel">
        <h2>Trip details</h2>
        <dl className="summary">
          <div><dt>Pickup</dt><dd>{booking.pickup}</dd></div>
          <div><dt>Destination</dt><dd>{booking.destination}</dd></div>
          <div><dt>Pickup time</dt><dd>{formatPickup(booking.pickup_at)} CT</dd></div>
          <div><dt>Estimated duration</dt><dd>{booking.duration_minutes} minutes</dd></div>
          <div><dt>Passengers</dt><dd>{booking.passengers}</dd></div>
          <div><dt>Bags</dt><dd>{booking.luggage}</dd></div>
          <div><dt>Email</dt><dd>{booking.customer_email}</dd></div>
          <div><dt>Phone</dt><dd>{booking.customer_phone}</dd></div>
          {booking.airport && <div><dt>Airport</dt><dd>{booking.airport} · {booking.airport_direction} · {booking.flight}</dd></div>}
          <div><dt>Booking reference</dt><dd>{booking.id}</dd></div>
        </dl>
      </section>
      <section className="driver-panel">
        <h2>Price and status</h2>
        {booking.price_cents !== null && <dl className="summary">
          <div><dt>Trip total</dt><dd><Money amount={booking.price_cents}/></dd></div>
          <div><dt>Requested deposit</dt><dd><Money amount={booking.deposit_cents ?? 0}/></dd></div>
        </dl>}
        {canPrice && <form key={booking.revision} action={updateBooking} className="driver-form">
          <BookingFields booking={booking} />
          <div className="fields">
            <label className="field">Total (USD)<input name="price" type="number" min=".01" max="999999.99" step=".01" required defaultValue={payable(booking.price_cents)} /></label>
            <label className="field">Deposit (USD)<input name="deposit" type="number" min=".01" max="999999.99" step=".01" required defaultValue={payable(booking.deposit_cents)} /></label>
            {booking.status === "awaiting_deposit"
              ? <input type="hidden" name="duration" value={booking.duration_minutes}/>
              : <label className="field">Estimated duration (minutes)<input name="duration" type="number" min="15" max="1440" required defaultValue={booking.duration_minutes} /></label>}
          </div>
          <button className="button button-light" name="action" value={booking.status === "pending" ? "approve" : "price"}>
            {booking.status === "pending" ? "Approve and request deposit" : "Update price and request deposit"}
          </button>
        </form>}
        <form action={updateBooking} className="driver-quick-actions">
          <BookingFields booking={booking} />
          {booking.status === "approved" && <button className="button button-outline" name="action" value="payment">Retry checkout</button>}
          {booking.status === "confirmed" && <button className="button button-light" name="action" value="start">Start ride</button>}
          {booking.status === "in_progress" && <button className="button button-light" name="action" value="complete">Complete ride</button>}
        </form>
        {(canCancel || canPrice) && <details className="driver-disclosure">
          <summary>Decline or cancel</summary>
          <p className="driver-subtle">Review any collected deposit in Square after cancellation.</p>
          <form className="driver-quick-actions" action={updateBooking}>
            <BookingFields booking={booking} />
            {canDecline && <button className="button button-outline" name="action" value="decline">Decline request</button>}
            {canCancel && <button className="button button-outline" name="action" value="cancel">Cancel booking</button>}
          </form>
        </details>}
      </section>
      {canEdit && <section className="driver-panel">
        <h2>Modify ride</h2>
        <form key={booking.revision} action={updateBooking} className="driver-form">
          <BookingFields booking={booking} />
          <div className="fields">
            <label className="field">Pickup<input name="pickup" maxLength={250} required defaultValue={booking.pickup} /></label>
            <label className="field">Destination<input name="destination" maxLength={250} required defaultValue={booking.destination} /></label>
            <label className="field">Pickup time (Central)<input name="pickupAt" type="datetime-local" required defaultValue={localInput(booking.pickup_at)} /></label>
            <label className="field">Passengers<input name="passengers" type="number" min="1" max="100" required defaultValue={booking.passengers} /></label>
            <label className="field">Bags<input name="luggage" type="number" min="0" max="100" required defaultValue={booking.luggage} /></label>
            {booking.airport && <label className="field">Flight number<input name="flight" maxLength={25} required defaultValue={booking.flight ?? ""} /></label>}
            <label className="field">Estimated duration (minutes)<input name="duration" type="number" min="15" max="1440" required defaultValue={booking.duration_minutes} /></label>
          </div>
          <button className="button button-outline" name="action" value="edit">Save trip changes</button>
        </form>
      </section>}
      <section className="driver-panel">
        <h2>Customer history</h2>
        {customer.error && <p className="driver-subtle">Could not load customer history.</p>}
        {customer.data?.length === 0 && <p className="driver-subtle">No other bookings for this email address.</p>}
        {customer.data?.map((ride) => <Link key={ride.id} className="driver-list-row" href={`/admin/bookings/${ride.id}`}>
          <span><b>{formatPickup(ride.pickup_at)} CT</b><small>{ride.pickup} to {ride.destination}</small></span><Badge status={ride.status}/>
        </Link>)}
      </section>
      <section className="driver-panel">
        <h2>Booking activity</h2>
        {history.error && <p className="driver-subtle">Could not load the activity history.</p>}
        {history.data?.map((item) => <div key={item.id} className="driver-list-row">
          <span><b className="capitalize">{item.event.replaceAll("_", " ")}</b><small>{formatPickup(item.created_at)} CT · {item.actor_id ? "Driver" : "System"}</small></span>
          <Badge status={item.status}/>
        </div>)}
      </section>
      <section className="driver-panel">
        <h2>Payments and emails</h2>
        {(payments.error || deliveries.error) && <p className="driver-subtle">Some payment or delivery data could not be loaded.</p>}
        {payments.data?.length === 0 && <p className="driver-subtle">No verified deposits received.</p>}
        {payments.data?.map((payment) => <div key={payment.square_payment_id} className="driver-list-row">
          <span><b><Money amount={payment.amount_cents}/></b><small>{payment.refunded_cents > 0 ? <><Money amount={payment.refunded_cents} /> refunded</> : "Verified Square payment"}</small></span>
          <span>{payment.disposition === "accepted" ? "Accepted" : "Needs review"}</span>
        </div>)}
        {deliveries.data?.map((delivery) => <div key={delivery.id} className="driver-list-row"><span className="capitalize">{delivery.kind.replaceAll("_", " ")} email</span>
          <span>{delivery.delivered_at ? "Processed" : delivery.failed_at ? "Needs review" : "Queued"}</span></div>)}
        {deliveries.data?.some((delivery) => !delivery.delivered_at && !delivery.failed_at) && <form action={updateBooking}>
          <BookingFields booking={booking} /><button className="button button-outline" name="action" value="notify">Process due emails</button>
        </form>}
      </section>
    </div>
  </DriverShell>;
}

function BookingFields({ booking }: { booking: Booking }) {
  return <><input type="hidden" name="id" value={booking.id}/><input type="hidden" name="revision" value={booking.revision}/></>;
}
