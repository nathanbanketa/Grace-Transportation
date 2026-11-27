import { createHash, timingSafeEqual } from "node:crypto";
import { database } from "@/lib/database";
import { drainNotifications } from "@/lib/notifications";
import { retryApprovedCheckouts } from "@/lib/reservations";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!secret || !timingSafeEqual(hash(request.headers.get("authorization") ?? ""), hash(`Bearer ${secret}`))) {
    return new Response(null, { status: 401 });
  }

  try {
    await retryApprovedCheckouts();
    await drainNotifications();
    const bucket = Math.floor(Date.now() / 900_000);
    const { error } = await database().from("booking_request_limits").delete().lt("bucket", bucket - 96);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
