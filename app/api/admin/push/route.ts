import { getAdmin } from "@/lib/admin-auth";
import { database } from "@/lib/database";
import { pushEndpoint, pushSubscriptionSchema } from "@/lib/push-subscription";
import { readBody } from "@/lib/request-body";

async function subscription(request: Request, remove: boolean) {
  const driver = await getAdmin();
  if (!driver) return new Response(null, { status: 401 });
  if (request.headers.get("sec-fetch-site") === "cross-site" || request.headers.get("content-type") !== "application/json") {
    return new Response(null, { status: 403 });
  }
  try {
    const body = JSON.parse(await readBody(request, 4096));
    const parsed = pushSubscriptionSchema.safeParse(body);
    const db = database();
    if (remove) {
      const endpoint = pushEndpoint.safeParse(body?.endpoint);
      if (!endpoint.success) return new Response(null, { status: 422 });
      const { error } = await db.from("driver_push_subscriptions").delete().eq("endpoint", endpoint.data).eq("driver_id", driver.id);
      if (error) throw error;
    } else {
      if (!parsed.success) return new Response(null, { status: 422 });
      if (!process.env.WEB_PUSH_PRIVATE_KEY || !process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || !process.env.WEB_PUSH_SUBJECT) return new Response(null, { status: 503 });
      const { count, error: countError } = await db.from("driver_push_subscriptions").select("endpoint", { count: "exact", head: true })
        .eq("driver_id", driver.id).neq("endpoint", parsed.data.endpoint);
      if (countError) throw countError;
      if ((count ?? 0) >= 20) return new Response(null, { status: 429 });
      const { error } = await db.from("driver_push_subscriptions").upsert({
        endpoint: parsed.data.endpoint, driver_id: driver.id, subscription: parsed.data,
      });
      if (error) throw error;
    }
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export async function POST(request: Request) { return subscription(request, false); }
export async function DELETE(request: Request) { return subscription(request, true); }
