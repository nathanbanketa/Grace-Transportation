import "server-only";
import { sendNotification } from "web-push";
import { database, type Booking } from "./database";
import { currency, formatPickup } from "./driver-time";
import { pushSubscriptionSchema } from "./push-subscription";

type Database = ReturnType<typeof database>;
type Kind = "new_request" | "approved" | "payment_link" | "declined" | "modified" | "confirmed" | "cancelled";
type Notification = {
  id: string;
  booking_id: string;
  revision: number;
  kind: Kind;
  channel: "email" | "sms" | "push";
  payload: Pick<Booking, "id" | "pickup" | "destination" | "pickup_at" | "price_cents" | "deposit_cents" | "customer_email" | "deposit_url" | "duration_minutes" | "passengers" | "luggage" | "flight">;
  attempts: number;
  first_attempt_at: string;
  lease_token: string;
};

const subjects: Record<Kind, string> = {
  new_request: "New Grace Transportation booking request",
  approved: "Grace Transportation has approved your request",
  payment_link: "Grace Transportation deposit payment",
  declined: "Grace Transportation request update",
  modified: "Grace Transportation trip details changed",
  confirmed: "Grace Transportation reservation confirmed",
  cancelled: "Grace Transportation booking cancelled",
};

function message({ kind, payload: booking }: Notification) {
  if (kind === "new_request") return "A new booking request is ready to review in your Grace Transportation driver dashboard.";
  const pickup = formatPickup(booking.pickup_at);
  const total = currency.format((booking.price_cents ?? 0) / 100);
  const deposit = currency.format((booking.deposit_cents ?? 0) / 100);
  const text: Record<Exclude<Kind, "new_request">, string> = {
    approved: `Temesgen approved your request at ${total}. A ${deposit} deposit is required to confirm.`,
    payment_link: `Pay the ${deposit} deposit toward your ${total} trip through Square to confirm.\n\n${booking.deposit_url}`,
    declined: "Temesgen was unable to accept your booking request.",
    modified: `Your trip details have changed.${booking.price_cents !== null ? ` The trip total is ${total}.` : ""}`,
    confirmed: `Your reservation is confirmed. We received your ${deposit} deposit toward the ${total} trip total.`,
    cancelled: "Your booking was cancelled. Contact Grace Transportation about any payment questions.",
  };
  if (kind === "payment_link") return `${text[kind]}\n\nReference: ${booking.id}`;
  return `${text[kind]}\n\nPickup: ${booking.pickup}\nDestination: ${booking.destination}\nPickup time: ${pickup} Central\nEstimated duration: ${booking.duration_minutes} minutes\nPassengers: ${booking.passengers} · Bags: ${booking.luggage}${booking.flight ? `\nFlight: ${booking.flight}` : ""}\nReference: ${booking.id}`;
}

async function sendEmail(job: Notification) {
  const { RESEND_API_KEY: key, BOOKING_FROM_EMAIL: from, DRIVER_NOTIFICATION_EMAIL: driverEmail } = process.env;
  const to = job.kind === "new_request" ? driverEmail : job.payload.customer_email;
  if (!key || !from || !to) throw new Error("Email configuration missing");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `grace/${job.id}` },
    body: JSON.stringify({ from, to: [to], subject: subjects[job.kind], text: message(job) }),
  });
  if (!response.ok) throw new Error("Email provider rejected delivery");
}

async function sendPush(db: Database, job: Notification) {
  const { WEB_PUSH_SUBJECT: subject, NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: publicKey, WEB_PUSH_PRIVATE_KEY: privateKey } = process.env;
  if (!subject || !publicKey || !privateKey) return;
  const allowed = (process.env.ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim());
  const { data: driver, error: driverError } = await db.from("drivers").select("id").eq("active", true).maybeSingle();
  if (driverError) throw driverError;
  if (!driver || !allowed.includes(driver.id)) return;
  const { data, error } = await db.from("driver_push_subscriptions").select("endpoint,subscription").eq("driver_id", driver.id).limit(20);
  if (error) throw error;
  await Promise.all(data.map(async ({ endpoint, subscription }) => {
    const parsed = pushSubscriptionSchema.safeParse(subscription);
    if (!parsed.success) return;
    try {
      await sendNotification(parsed.data, JSON.stringify({
        title: "New ride request", body: "Open Grace Transportation to review it.", tag: job.id,
      }), { TTL: 600, timeout: 8000, vapidDetails: { subject, publicKey, privateKey } });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status !== 410 && status !== 404) throw error;
      const { error: removeError } = await db.from("driver_push_subscriptions").delete().eq("endpoint", endpoint);
      if (removeError) throw removeError;
    }
  }));
}

async function sendSms() {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from, DRIVER_SMS_NUMBER: to } = process.env;
  if (!sid || !token || !from || !to) return;
  if (!/^AC[a-f0-9]{32}$/i.test(sid)) throw new Error("Invalid SMS configuration");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST", signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
    body: new URLSearchParams({ From: from, To: to, Body: "Grace Transportation has a new ride request. Open your driver dashboard to review it." }),
  });
  if (!response.ok) throw new Error("SMS provider rejected delivery");
}

async function stillRelevant(db: Database, job: Notification) {
  if (job.kind === "new_request") return true;
  const { data, error } = await db.from("bookings").select("status,checkout_revision,pickup,destination,pickup_at,duration_minutes,passengers,luggage,flight,price_cents,deposit_cents").eq("id", job.booking_id).single();
  if (error) throw error;
  if (job.kind === "payment_link") return data.status === "awaiting_deposit" && data.checkout_revision === job.revision;
  const booking = job.payload;
  const matchesPrice = data.price_cents === booking.price_cents && data.deposit_cents === booking.deposit_cents;
  if (job.kind === "approved") return ["approved", "awaiting_deposit"].includes(data.status) && matchesPrice
    && data.pickup === booking.pickup && data.destination === booking.destination && Date.parse(data.pickup_at) === Date.parse(booking.pickup_at);
  if (job.kind === "confirmed") return ["confirmed", "in_progress", "completed"].includes(data.status);
  if (job.kind === "modified") return !["declined", "cancelled"].includes(data.status) && matchesPrice
    && data.pickup === booking.pickup && data.destination === booking.destination && Date.parse(data.pickup_at) === Date.parse(booking.pickup_at)
    && data.duration_minutes === booking.duration_minutes && data.passengers === booking.passengers
    && data.luggage === booking.luggage && data.flight === booking.flight;
  return data.status === job.kind;
}

async function deliver(db: Database, job: Notification) {
  const now = Date.now();
  const expired = now - Date.parse(job.first_attempt_at) > 23 * 3600_000;
  let result: Record<string, string | null>;
  try {
    if (expired || (job.channel === "sms" && job.attempts > 1)) throw new Error("Review delivery before retrying");
    if (await stillRelevant(db, job)) {
      if (job.channel === "email") await sendEmail(job);
      if (job.channel === "push") await sendPush(db, job);
      if (job.channel === "sms") await sendSms();
    }
    result = { delivered_at: new Date().toISOString(), last_error: null };
  } catch {
    const terminal = expired || job.channel === "sms" || job.attempts >= 8;
    result = terminal ? { failed_at: new Date().toISOString(), last_error: "Delivery requires review" } : {
      next_attempt_at: new Date(now + Math.min(2 ** job.attempts, 60) * 60_000).toISOString(),
      last_error: "Delivery will be retried",
    };
  }
  const { error } = await db.from("notifications").update({ ...result, lease_until: null, lease_token: null }).eq("id", job.id).eq("lease_token", job.lease_token);
  if (error) throw error;
}

export async function drainNotifications(booking?: string) {
  const db = database();
  const { data, error } = await db.rpc("claim_notifications", { p_booking: booking ?? null });
  if (error) throw error;
  const jobs = (data ?? []) as unknown as Notification[];
  for (let index = 0; index < jobs.length; index += 6) {
    await Promise.all(jobs.slice(index, index + 6).map((job) => deliver(db, job)));
  }
}
