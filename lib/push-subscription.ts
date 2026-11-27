import { z } from "zod";

const browserPushHosts = [
  "fcm.googleapis.com", "updates.push.services.mozilla.com", "push.services.mozilla.com", "web.push.apple.com",
];

export const pushEndpoint = z.url().max(2048).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.port && !url.username && !url.password && !url.hash
    && (browserPushHosts.includes(url.hostname) || url.hostname.endsWith(".notify.windows.com"));
});

export const pushSubscriptionSchema = z.object({
  endpoint: pushEndpoint,
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/), auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/) }),
});
