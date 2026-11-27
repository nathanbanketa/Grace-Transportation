import { ActionButton } from "@/components/action-button";
import Link from "next/link";
import { DateTime } from "luxon";
import { Ban, ClipboardList } from "lucide-react";
import { Badge, DriverNotice, DriverShell, Money, RideCard, views, type DriverView } from "@/components/driver-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { database, type Booking } from "@/lib/database";
import { driverZone, formatPickup, localInput } from "@/lib/driver-time";
import { updateAvailability } from "./actions";

export const dynamic = "force-dynamic";
const perPage = 24;

const groups = {
  requests: ["pending", "approved", "awaiting_deposit"],
  upcoming: ["confirmed", "in_progress"],
  history: ["completed", "declined", "cancelled"],
};
const titles: Record<DriverView, { title: string; text: string }> = {
  requests: { title: "Ride requests", text: "Review and confirm advance bookings." },
  upcoming: { title: "Upcoming rides", text: "Trips confirmed or in progress." },
  schedule: { title: "Driver schedule", text: "Review the next 14 days and block off unavailable times." },
  history: { title: "Booking history", text: "Completed, declined and cancelled rides." },
  payments: { title: "Payments", text: "Track verified Square deposits and payments that need review." },
};

type Block = { id: string; starts_at: string; ends_at: string; note: string };
type Payment = { square_payment_id: string; booking_id: string; amount_cents: number; refunded_cents: number; disposition: "accepted" | "review"; created_at: string };
type Revenue = { gross_cents: number; refunded_cents: number; accepted_net_cents: number; review_count: number };

export default async function Admin({ searchParams }: {
  searchParams: Promise<{ message?: string; view?: string; state?: string; page?: string; date?: string }>;
}) {
  const driver = await requireAdmin();
  const query = await searchParams;
  const view = views.find(({ key }) => key === query.view)?.key ?? "requests";
  const page = query.page && /^[1-9]\d{0,3}$/.test(query.page) ? Number(query.page) : 1;

  let content: React.ReactNode;
  try {
    if (view === "schedule") content = await schedule(query.date);
    else if (view === "payments") content = await payments(page);
    else content = await rides(view, query.state, page);
  } catch {
    content = <p className="driver-notice driver-notice-warning" role="alert">Could not load booking data. Check Supabase configuration and try again.</p>;
  }

  return <DriverShell driver={driver.display_name} view={view}>
    <div className="driver-title"><h1>{titles[view].title}</h1><p>{titles[view].text}</p></div>
    <DriverNotice code={query.message} />
    {content}
  </DriverShell>;
}

function Pagination({ view, page, next, filter }: { view: DriverView; page: number; next: boolean; filter?: string }) {
  const path = (number: number) => `/admin?${new URLSearchParams({ view, page: String(number), ...(filter ? { state: filter } : {}) })}`;
  return <div className="driver-pagination">
    {page > 1 && <Link className="driver-link" href={path(page - 1)}>Previous</Link>}
    {next && <Link className="driver-link" href={path(page + 1)}>Next page</Link>}
  </div>;
}

async function rides(view: keyof typeof groups, filter: string | undefined, page: number) {
  const db = database();
  const states = groups[view];
  const selected = filter && states.includes(filter) ? filter : undefined;
  const start = (page - 1) * perPage;
  const [result, pending, active, completed, alerts] = await Promise.all([
    db.from("bookings").select().in("status", selected ? [selected] : states)
      .order(view === "upcoming" ? "pickup_at" : "updated_at", { ascending: view === "upcoming" }).order("id")
      .range(start, start + perPage).returns<Booking[]>(),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("bookings").select("id", { count: "exact", head: true }).in("status", groups.upcoming),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
    db.from("notifications").select("id", { count: "exact", head: true }).not("failed_at", "is", null),
  ]);
  if ([result, pending, active, completed, alerts].some(({ error }) => error) || !result.data) throw new Error("Could not load rides");
  return <>
    <div className="driver-stats">
      <Link className="driver-stat" href="/admin?view=requests&state=pending"><span>New requests</span><strong>{pending.count}</strong></Link>
      <Link className="driver-stat" href="/admin?view=upcoming"><span>Upcoming</span><strong>{active.count}</strong></Link>
      <Link className="driver-stat" href="/admin?view=history&state=completed"><span>Completed</span><strong>{completed.count}</strong></Link>
    </div>
    {!!alerts.count && <p className="driver-notice driver-notice-warning">{alerts.count} notification deliveries require review. Check the Resend, push or SMS provider logs before resending.</p>}
    <div className="driver-filters">
      <Link href={`/admin?view=${view}`} aria-current={!selected ? "page" : undefined}>All</Link>
      {states.map((state) => <Link key={state} href={`/admin?view=${view}&state=${state}`} aria-current={state === selected ? "page" : undefined}>{state === "awaiting_deposit" ? "Awaiting payment" : state.replaceAll("_", " ")}</Link>)}
    </div>
    {result.data.length ? <div className="driver-ride-grid">{result.data.slice(0, perPage).map((booking) => <RideCard key={booking.id} booking={booking} />)}</div>
      : <div className="driver-empty"><ClipboardList size={24} /><p>No rides in this view.</p></div>}
    <Pagination view={view} page={page} next={result.data.length > perPage} filter={selected} />
  </>;
}

async function schedule(date?: string) {
  const now = DateTime.now().setZone(driverZone);
  const requested = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? DateTime.fromISO(date, { zone: driverZone }) : null;
  const start = requested?.isValid ? requested.startOf("day") : now.startOf("day");
  const end = start.plus({ days: 14 });
  const db = database();
  // The maximum ride duration is one day, so include the preceding day for rides spanning midnight.
  const [rides, blocks] = await Promise.all([
    db.from("bookings").select().in("status", ["approved", "awaiting_deposit", "confirmed", "in_progress"])
      .gte("pickup_at", start.minus({ days: 1 }).toUTC().toISO()).lt("pickup_at", end.toUTC().toISO()).order("pickup_at").returns<Booking[]>(),
    db.from("availability").select().gt("ends_at", start.toUTC().toISO()).lt("starts_at", end.toUTC().toISO()).order("starts_at").returns<Block[]>(),
  ]);
  if (rides.error || blocks.error) throw new Error("Could not load schedule");
  const days = Array.from({ length: 14 }, (_, index) => start.plus({ days: index }));
  return <>
    <details className="driver-panel driver-availability">
      <summary>Block availability</summary>
      <form action={updateAvailability} className="driver-form">
        <div className="fields">
          <label className="field">Unavailable from (Central)<input name="start" type="datetime-local" required /></label>
          <label className="field">Available again (Central)<input name="end" type="datetime-local" required /></label>
          <label className="field">Private note<input name="note" maxLength={160} /></label>
        </div>
        <ActionButton>Add availability block</ActionButton>
      </form>
    </details>
    <div className="driver-calendar-heading">
      <h2>{start.toFormat("MMM d")} to {end.minus({ days: 1 }).toFormat("MMM d, yyyy")}</h2>
      <div className="driver-quick-actions">
        <Link className="driver-link" href={`/admin?view=schedule&date=${start.minus({ days: 14 }).toISODate()}`}>Earlier</Link>
        <Link className="driver-link" href="/admin?view=schedule">Today</Link>
        <Link className="driver-link" href={`/admin?view=schedule&date=${end.toISODate()}`}>Later</Link>
      </div>
    </div>
    <div className="driver-calendar">{days.map((day) => {
      const next = day.plus({ days: 1 });
      const onDay = rides.data.filter((ride) => Date.parse(ride.pickup_at) < next.toMillis() && Date.parse(ride.pickup_at) + ride.duration_minutes * 60_000 > day.toMillis());
      const blocked = blocks.data.filter((block) => Date.parse(block.starts_at) < next.toMillis() && Date.parse(block.ends_at) > day.toMillis());
      return <article className={`driver-day${onDay.length || blocked.length ? " driver-day-active" : ""}`} key={day.toISODate()}>
        <h3>{day.toFormat("ccc, MMM d")}</h3>
        {!onDay.length && !blocked.length && <p>Open</p>}
        {onDay.map((ride) => <Link className="driver-calendar-ride" key={ride.id} href={`/admin/bookings/${ride.id}`}><b>{ride.customer_name}</b><small>{formatPickup(ride.pickup_at)}, {ride.duration_minutes} min</small><Badge status={ride.status} /></Link>)}
        {blocked.map((block) => <div className="driver-calendar-block" key={block.id}>
          <b><Ban size={14} /> Unavailable</b><small>{formatPickup(block.starts_at)} to {formatPickup(block.ends_at)}</small>
          {block.note && <small>{block.note}</small>}
          <details className="driver-disclosure"><summary>Manage block</summary>
            {Date.parse(block.ends_at) > Date.now() && <form className="driver-form" action={updateAvailability}>
              <input type="hidden" name="id" value={block.id} />
              <label className="field">Starts (Central)<input name="start" type="datetime-local" required defaultValue={localInput(block.starts_at)} /></label>
              <label className="field">Ends (Central)<input name="end" type="datetime-local" required defaultValue={localInput(block.ends_at)} /></label>
              <label className="field">Private note<input name="note" maxLength={160} defaultValue={block.note} /></label>
              <button className="driver-link" name="action" value="edit">Save block</button>
            </form>}
            <form action={updateAvailability}><input type="hidden" name="id" value={block.id} /><button className="driver-link" name="action" value="remove">Remove block</button></form>
          </details>
        </div>)}
      </article>;
    })}</div>
  </>;
}

async function payments(page: number) {
  const db = database();
  const start = (page - 1) * perPage;
  const since = DateTime.now().setZone(driverZone).startOf("month").toUTC().toISO();
  const [stats, history] = await Promise.all([
    db.rpc("reservation_revenue", { p_since: since }).single<Revenue>(),
    db.from("payments").select().order("created_at", { ascending: false }).order("square_payment_id")
      .range(start, start + perPage).returns<Payment[]>(),
  ]);
  if (stats.error || history.error) throw new Error("Could not load payments");
  return <>
    <div className="driver-stats">
      <div className="driver-stat"><span>Accepted deposits this month</span><strong><Money amount={stats.data.accepted_net_cents} /></strong></div>
      <div className="driver-stat"><span>Refunds on this month’s payments</span><strong><Money amount={stats.data.refunded_cents} /></strong></div>
      <div className="driver-stat"><span>Needs review this month</span><strong>{stats.data.review_count}</strong></div>
    </div>
    <section className="driver-panel">
      <h2>Square payment history</h2>
      {!history.data.length && <p className="driver-subtle">No verified payments yet.</p>}
      {history.data.slice(0, perPage).map((payment) => <Link className="driver-list-row" key={payment.square_payment_id} href={`/admin/bookings/${payment.booking_id}`}>
        <span><b><Money amount={payment.amount_cents} /></b><small>{formatPickup(payment.created_at)} CT</small></span>
        <span>{payment.disposition === "review" ? "Needs review" : "Accepted"}{payment.refunded_cents > 0 && <small><Money amount={payment.refunded_cents} /> refunded</small>}</span>
      </Link>)}
    </section>
    <Pagination view="payments" page={page} next={history.data.length > perPage} />
  </>;
}
