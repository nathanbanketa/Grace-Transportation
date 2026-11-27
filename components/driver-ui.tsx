import Link from "next/link";
import { CalendarDays, CarFront, ChevronRight, CircleDollarSign, ClipboardList, History, MapPin, MessageSquare, Navigation, Phone, UsersRound } from "lucide-react";
import type { Status } from "@/lib/booking";
import type { Booking } from "@/lib/database";
import { currency, formatPickup } from "@/lib/driver-time";
import { Brand } from "./brand";
import { DriverLive } from "./driver-live";
import { signOut } from "@/app/admin/actions";

const statusLabels: Record<Status, string> = {
  pending: "Pending", approved: "Approved", awaiting_deposit: "Awaiting payment",
  confirmed: "Confirmed", in_progress: "In progress", completed: "Completed", declined: "Declined", cancelled: "Cancelled",
};

const messages: Record<string, string> = {
  saved: "Changes saved.",
  checkout: "Ride approved and held on the schedule. The payment link could not be created yet. Retry checkout on this ride.",
  invalid: "That action is unavailable for this booking.",
  amounts: "Enter a positive deposit no greater than the total and an estimated duration between 15 and 1,440 minutes.",
  time: "Use a valid future Central time and, for availability, an end after the start within 30 days.",
  details: "Check the trip details, Central pickup time, and estimated duration.",
  failed: "The action could not finish. Review the current status before retrying.",
  conflict: "The selected time overlaps a ride or an availability block. Choose another time or adjust the estimated duration.",
  stale: "This booking changed while you were viewing it. Check its current details and try again.",
  payment_review: "Square could not verify that the old checkout was cancelled. Review the order in Square and wait for any payment update before retrying.",
  legacy: "This older payment link needs review in Square before this booking can be cancelled.",
};

export function DriverNotice({ code }: { code?: string }) {
  return code && Object.hasOwn(messages, code)
    ? <p className={`driver-notice ${code === "saved" ? "" : "driver-notice-warning"}`} role="status">{messages[code]}</p> : null;
}

export const views = [
  { key: "requests", label: "Requests", icon: ClipboardList },
  { key: "upcoming", label: "Upcoming", icon: CarFront },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "history", label: "History", icon: History },
  { key: "payments", label: "Payments", icon: CircleDollarSign },
] as const;
export type DriverView = (typeof views)[number]["key"];

export function DriverShell({ driver, view, children }: { driver: string; view?: DriverView; children: React.ReactNode }) {
  return <main className="driver-shell">
    <a className="skip-link" href="#driver-content">Skip to dashboard content</a>
    <header className="driver-header">
      <Brand />
      <form action={signOut}><button className="driver-link">Sign out</button></form>
    </header>
    <div className="driver-layout">
      <aside className="driver-sidebar">
        <div className="driver-profile"><span>{driver.slice(0, 1)}</span><div><b>{driver}</b><small>Driver dashboard</small></div></div>
        <nav className="driver-nav" aria-label="Driver dashboard">
          {views.map(({ key, label, icon: Icon }) => <Link key={key} href={`/admin?view=${key}`} aria-current={view === key ? "page" : undefined}><Icon size={19} aria-hidden="true" /> {label}</Link>)}
        </nav>
      </aside>
      <div className="driver-content" id="driver-content" tabIndex={-1}>
        <DriverLive pushKey={process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY} />
        {children}
      </div>
    </div>
  </main>;
}

export function Badge({ status }: { status: Status }) {
  return <span className={`driver-badge driver-badge-${status}`}>{statusLabels[status]}</span>;
}

export function RideCard({ booking }: { booking: Booking }) {
  return <Link href={`/admin/bookings/${booking.id}`} className="driver-ride">
    <div className="driver-ride-head"><div><h3>{booking.customer_name}</h3><p className="driver-kicker">{booking.trip_type}</p></div><Badge status={booking.status} /></div>
    <div className="driver-route"><div><span><small>Pickup</small>{booking.pickup}</span></div><div><span><small>Destination</small>{booking.destination}</span></div></div>
    <div className="driver-ride-foot"><span><CalendarDays size={15} aria-hidden="true"/>{formatPickup(booking.pickup_at)} CT</span><span><UsersRound size={15} aria-hidden="true"/>{booking.passengers}</span><ChevronRight size={17} className="driver-chevron" aria-hidden="true" /></div>
  </Link>;
}

export function ContactActions({ booking }: { booking: Booking }) {
  const phone = booking.customer_phone.replace(/[^+\d]/g, "");
  const map = new URL("https://www.google.com/maps/dir/");
  map.search = new URLSearchParams({ api: "1", origin: booking.pickup, destination: booking.destination, travelmode: "driving" }).toString();
  const pickup = new URL("https://www.google.com/maps/search/");
  pickup.search = new URLSearchParams({ api: "1", query: booking.pickup }).toString();
  return <div className="driver-quick-actions">
    <a className="driver-link" href={`tel:${phone}`}><Phone size={17} /> Call</a>
    <a className="driver-link" href={`sms:${phone}`}><MessageSquare size={17} /> Text</a>
    <a className="driver-link" href={pickup.href} target="_blank" rel="noreferrer"><MapPin size={17} /> To pickup</a>
    <a className="driver-link" href={map.href} target="_blank" rel="noreferrer"><Navigation size={17} /> Trip route</a>
  </div>;
}

export function Money({ amount }: { amount: number }) {
  return <>{currency.format(amount / 100)}</>;
}
