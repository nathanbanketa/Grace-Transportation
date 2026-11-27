import { createHmac } from "node:crypto";
import { after } from "next/server";
import { DateTime } from "luxon";
import { bookingSchema } from "@/lib/booking";
import { database } from "@/lib/database";
import { drainNotifications } from "@/lib/notifications";
import { BodyTooLarge, readBody } from "@/lib/request-body";

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Submit the form from the Grace Transportation website." }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Expected a JSON booking request." }, { status: 415 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await readBody(request, 8192));
  } catch (error) {
    return Response.json({ error: "The booking request is invalid." }, { status: error instanceof BodyTooLarge ? 413 : 400 });
  }
  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: "Review your booking details and choose a future pickup time." }, { status: 422 });
  const data = parsed.data;
  const isAirport = data.tripType === "Airport transfer";
  const booking = {
    pickup: data.pickup,
    destination: data.destination,
    pickup_at: DateTime.fromISO(`${data.date}T${data.time}`, { zone: "America/Chicago" }).toUTC().toISO(),
    trip_type: data.tripType,
    passengers: data.passengers,
    luggage: data.luggage,
    airport: isAirport ? (data.airport === "Other airport" ? data.airportName : data.airport) : null,
    airport_direction: isAirport ? data.airportDirection : null,
    flight: isAirport ? data.flight.toUpperCase() : null,
    customer_name: data.name,
    customer_email: data.email.toLowerCase(),
    customer_phone: data.phone,
  };
  try {
    const secret = process.env.BOOKING_RATE_LIMIT_SECRET;
    if (!secret || secret.length < 32) throw new Error("Booking rate limit key unavailable.");
    const hash = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
    const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : undefined;
    const { data: reference, error } = await database().rpc("submit_booking", {
      p_booking: { ...booking, id: data.requestId },
      p_ip_key: hash(ip || "shared"), p_email_key: hash(booking.customer_email),
      p_fingerprint: hash(JSON.stringify(booking)),
    });
    if (error?.message === "REQUEST_MISMATCH") return Response.json({ error: "This reference already belongs to another request." }, { status: 409 });
    if (error) throw error;
    if (!reference) return Response.json({ error: "Too many booking requests. Please try again in a few minutes." }, {
      status: 429, headers: { "Retry-After": String(900 - Math.floor(Date.now() / 1000) % 900) },
    });
    after(() => drainNotifications(reference).catch(() => undefined));
    return Response.json({ reference }, { status: 201 });
  } catch {
    return Response.json({ error: "Booking requests are temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
