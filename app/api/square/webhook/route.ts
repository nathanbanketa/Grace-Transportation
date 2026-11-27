import { after } from "next/server";
import { z } from "zod";
import { database } from "@/lib/database";
import { retrievePayment, retrieveRefundPaymentId, verifySquareSignature } from "@/lib/square";
import { drainNotifications } from "@/lib/notifications";
import { BodyTooLarge, readBody } from "@/lib/request-body";

const eventSchema = z.object({ type: z.string(), data: z.object({ id: z.string().min(1).max(192) }) });

export async function POST(request: Request) {
  let raw: string;
  try { raw = await readBody(request, 65536); } catch (error) { return new Response(null, { status: error instanceof BodyTooLarge ? 413 : 400 }); }
  if (!verifySquareSignature(raw, request.headers.get("x-square-hmacsha256-signature") ?? "")) {
    return new Response(null, { status: 401 });
  }
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  const event = eventSchema.safeParse(payload);
  if (!event.success) return new Response(null, { status: 400 });
  if (!["payment.created", "payment.updated", "refund.created", "refund.updated"].includes(event.data.type)) return new Response(null, { status: 204 });

  try {
    const idFromEvent = event.data.data.id;
    const paymentId = event.data.type.startsWith("refund.") ? await retrieveRefundPaymentId(idFromEvent) : idFromEvent;
    if (!paymentId) return new Response(null, { status: 204 });
    const payment = await retrievePayment(paymentId);
    if (!payment.order_id || payment.status !== "COMPLETED" || payment.location_id !== process.env.SQUARE_LOCATION_ID
      || payment.amount_money.currency !== "USD" || payment.amount_money.amount <= 0) return new Response(null, { status: 204 });

    const { data: id, error } = await database().rpc("record_square_payment", {
      p_order: payment.order_id,
      p_payment: payment.id,
      p_amount: payment.amount_money.amount,
      p_refunded: payment.refunded_money?.amount ?? 0,
      p_paid_at: payment.created_at,
    });
    if (error) throw error;
    if (id) after(() => drainNotifications(id).catch(() => undefined));
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
