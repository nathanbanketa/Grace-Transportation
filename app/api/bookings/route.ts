import { DateTime } from "luxon";
import { bookingSchema } from "@/lib/booking";
import { database } from "@/lib/database";

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Submit the form from the Grace Transportation website." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected a JSON booking request." }, { status: 415 });
  }

  const parsed = bookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Review your booking details and choose a future pickup time." }, { status: 422 });
  const data = parsed.data;
  const isAirport = data.tripType === "Airport transfer";
  try {
    const { error } = await database().from("bookings").upsert({
      id: data.requestId,
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
      customer_email: data.email,
      customer_phone: data.phone,
    }, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    return Response.json({ reference: data.requestId }, { status: 201 });
  } catch {
    return Response.json({ error: "Booking requests are temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
