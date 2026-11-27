import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Booking } from "./database";

function configuration() {
  const { SQUARE_ACCESS_TOKEN: token, SQUARE_LOCATION_ID: location, SQUARE_ENVIRONMENT: environment } = process.env;
  if (!token || !location || !["sandbox", "production"].includes(environment ?? "")) throw new Error("Square is unavailable.");
  return { token, location, base: environment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com" };
}

async function square(path: string, init: RequestInit = {}) {
  const { token, base } = configuration();
  const response = await fetch(base + path, {
    ...init, cache: "no-store", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${token}`, "Square-Version": "2025-10-16", "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Square request failed.");
  return response.json();
}

export async function createDepositLink(booking: Booking) {
  const { location } = configuration();
  const response = await square("/v2/online-checkout/payment-links", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: booking.id,
      quick_pay: {
        name: "Grace Transportation reservation deposit",
        location_id: location,
        price_money: { amount: booking.deposit_cents, currency: "USD" },
      },
    }),
  });
  return z.object({ payment_link: z.object({ order_id: z.string().min(1), url: z.url({ protocol: /^https$/ }) }) }).parse(response).payment_link;
}

export async function retrievePayment(paymentId: string) {
  const response = await square(`/v2/payments/${encodeURIComponent(paymentId)}`);
  return z.object({ payment: z.object({
    id: z.string(), status: z.string(), location_id: z.string(), order_id: z.string().optional(),
    amount_money: z.object({ amount: z.number().int(), currency: z.string() }),
    refunded_money: z.object({ amount: z.number().int() }).optional(),
  }) }).parse(response).payment;
}

export function verifySquareSignature(raw: string, signature: string) {
  const { SQUARE_WEBHOOK_SIGNATURE_KEY: key, SQUARE_WEBHOOK_URL: url } = process.env;
  if (!key || !url) return false;
  const expected = createHmac("sha256", key).update(url + raw).digest();
  const supplied = Buffer.from(signature, "base64");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
