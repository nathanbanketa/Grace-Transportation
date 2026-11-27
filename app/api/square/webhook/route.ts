import { z } from "zod";
import { database, type Booking } from "@/lib/database";
import { retrievePayment, verifySquareSignature } from "@/lib/square";
import { sendBookingEmail } from "@/lib/notifications";

const eventSchema = z.object({ type: z.string(), data: z.object({ id: z.string().max(192) }) });

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySquareSignature(raw, request.headers.get("x-square-hmacsha256-signature") ?? "")) {
    return new Response(null, { status: 401 });
  }
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  const event = eventSchema.safeParse(payload);
  if (!event.success) return new Response(null, { status: 400 });
  if (!["payment.created", "payment.updated"].includes(event.data.type)) return new Response(null, { status: 204 });

  try {
    const payment = await retrievePayment(event.data.data.id);
    if (!payment.order_id || payment.status !== "COMPLETED" || payment.location_id !== process.env.SQUARE_LOCATION_ID
      || payment.amount_money.currency !== "USD" || (payment.refunded_money?.amount ?? 0) > 0) return new Response(null, { status: 204 });

    const db = database();
    const { data, error } = await db.from("bookings").select().eq("square_order_id", payment.order_id).maybeSingle<Booking>();
    if (error) throw error;
    if (!data || data.deposit_cents !== payment.amount_money.amount) return new Response(null, { status: 204 });

    if (data.status === "awaiting_deposit") {
      const { error: updateError } = await db.from("bookings").update({
        status: "confirmed", square_payment_id: payment.id, confirmed_at: new Date().toISOString(),
      }).eq("id", data.id).eq("status", "awaiting_deposit");
      if (updateError) throw updateError;
    }

    const { data: current, error: currentError } = await db.from("bookings").select().eq("id", data.id).single<Booking>();
    if (currentError) throw currentError;
    if (current.status === "confirmed" && current.square_payment_id === payment.id) {
      await sendBookingEmail(current, "confirmation");
    }
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
