# Grace Transportation

Advance-booked private SUV transportation in Dallas–Fort Worth. The application includes a public landing page and booking request form, plus a private dashboard for Temesgen to review trips, set prices, collect deposits, and manage reservations.

## Codex Cloud setup for agents

1. Install Node.js 22 or later and run `npm ci`.
2. Copy `.env.example` to `.env.local` when testing with configured providers.
3. Create a Supabase project and apply the SQL migration in `supabase/migrations` with the Supabase CLI or SQL editor.
4. Set the Supabase URL, publishable key, and server-only service-role key. Provision Temesgen’s password-based user in Supabase Auth, disable public signups, and set `ADMIN_USER_IDS` to the user UUID. The dashboard is at `/admin`.
5. Run `npm run dev` and use the configured Cloud HTTP preview.

The landing page and the form’s trip, customer and review steps work without credentials. Submitting a request requires Supabase. Missing storage produces a retryable error in the form. The dashboard requires Supabase Auth and an allowlisted user.

## Architecture

| Location | Responsibility |
| --- | --- |
| `app/page.tsx`, `components/` | Responsive landing page and booking form |
| `lib/booking.ts` | Shared validation and booking states |
| `app/api/bookings` | Public booking submission with duplicate protection per request UUID |
| `app/admin`, `lib/admin-auth.ts`, `proxy.ts` | Driver sign-in, session refresh, and protected operations |
| `supabase/migrations` | PostgreSQL constraints, transition trigger and RLS |
| `lib/square.ts`, `app/api/square/webhook` | Hosted checkout, signed webhooks and payment verification |
| `lib/notifications.ts` | Deposit and confirmation emails with retry markers |

Pickup times are entered in Dallas local time and stored in UTC. Nonexistent and ambiguous times during daylight saving transitions are rejected. Counts are collected for driver review. Pricing is entered per trip and stored in USD cents.

## Booking lifecycle

- A submitted request starts **pending**. The driver reviews availability and enters total and deposit amounts to mark it **approved**. The driver can decline a pending or approved trip.
- **Request deposit** creates a Square checkout link, saves its order ID, marks the booking **awaiting deposit**, and emails the link via Resend. The dashboard can retry email delivery.
- A signed Square webhook triggers a server-side Square lookup. The app verifies completion, order, location, USD amount and refund status before recording the payment and marking the request **confirmed**. It then sends the reservation email. Duplicate events use conditional state updates and a Resend idempotency key.
- The driver can mark a confirmed reservation **completed** or **cancelled**. That status change is administrative only. Refunds and customer cancellation notifications are manual. Awaiting-deposit cancellations require reconciling and deactivating the checkout link before a cancellation workflow can be added.

## Browser setup for the owner

Open these dashboards from your phone. Use your browser’s desktop-site mode if a dashboard hides a control. Keep credentials in Vercel’s environment variable dashboard.

### 1. Supabase

1. Open the [Supabase dashboard](https://supabase.com/dashboard) and choose **New project**. Use a dedicated test project for the first deployment.
2. In the project sidebar, open **SQL Editor → New query**. On GitHub, open `supabase/migrations/202611270001_bookings.sql`, use **Raw** to copy the full file, paste it into the SQL editor and tap **Run** once for the new project.
3. Under **Authentication → Users → Add user → Create new user**, create Temesgen’s account with a strong password, confirm the email in the dialog and copy the user UUID. Under **Authentication → Sign In / Providers**, disable **Allow new users to sign up**.
4. Open **Project Settings → API Keys** to find the publishable key and the legacy `service_role` key. Open **Connect** to copy the project URL. Record the values for the Vercel fields below.

### 2. Square Sandbox and Resend

1. Open the [Square Developer Console](https://developer.squareup.com/apps), create or select an application and choose **Sandbox**. Under **Credentials**, copy the Sandbox access token. Under **Locations**, copy the Sandbox location ID.
2. In [Resend Domains](https://resend.com/domains), choose **Add Domain**. Add the listed DNS records in the domain registrar’s DNS dashboard, return to Resend and verify the domain.
3. In [Resend API Keys](https://resend.com/api-keys), create a key with **Sending access** for the verified domain. Choose a sender address on that domain. Use a mailbox that receives replies if you want customers to reply to that address.

### 3. Vercel

1. Open the [Vercel dashboard](https://vercel.com/dashboard). Select **Add New → Project**, import [Grace-Transportation](https://github.com/nathanbanketa/Grace-Transportation), and use the **Next.js** preset with the repository root as the root directory.
2. Add these values in the import screen’s **Environment Variables** section or under **Project → Settings → Environment Variables**. Assign them only to the deployment environment you are configuring.

| Field | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase Connect |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase legacy `service_role` key |
| `ADMIN_USER_IDS` | Temesgen’s Supabase user UUID |
| `SQUARE_ENVIRONMENT` | `sandbox` for testing |
| `SQUARE_ACCESS_TOKEN` | Square Sandbox access token |
| `SQUARE_LOCATION_ID` | Square Sandbox location ID |
| `RESEND_API_KEY` | Resend sending key |
| `BOOKING_FROM_EMAIL` | Sender address on the verified domain |
| `SQUARE_WEBHOOK_URL` | Stable HTTPS deployment URL followed by `/api/square/webhook` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Signature key from the Square subscription below |

3. Deploy and copy the stable domain from **Project → Settings → Domains**. In Square Developer Console, keep **Sandbox** selected and open **Webhooks → Subscriptions → Add subscription**. Enter the full webhook URL, select `payment.created` and `payment.updated`, save, then open the subscription to copy its signature key.
4. Save the final two webhook values in Vercel. Under **Deployments**, open the latest deployment’s menu and choose **Redeploy** so the new deployment picks up those values. Square must be able to reach the webhook over HTTPS without a Vercel sign-in prompt.
5. On the test deployment, submit a booking, sign in at `/admin`, approve it, enter a test price and deposit, then request the deposit. Open the deposit email and complete checkout with a [Square Sandbox test card](https://developer.squareup.com/docs/devtools/sandbox/payments). Verify the dashboard changes to **Confirmed** and the confirmation email arrives. Check that an unlisted account cannot access the dashboard and verify webhook replay and email retries before configuring production.

Use separate Supabase data and Square credentials for production. Set `SQUARE_ENVIRONMENT` to `production` only when the production location, token, webhook and launch requirements are ready.

## Before accepting live bookings

- Replace the temporary dove-and-SUV mark with owner-approved artwork. The hero is an illustrative generated image and can be replaced with a verified photo of the vehicle.
- Confirm business contact details, pricing and cancellation terms. Placeholders are **[business email]**, **[business phone]**, **[driver-approved trip pricing and deposit]**, and **[cancellation and refund policy]**. The public page omits unpublished contact details and terms.
- Set public booking rate limits at the Vercel edge and define data retention, operator monitoring and recovery procedures. Resend’s idempotency window is time-limited. Review provider delivery logs before retrying an older ambiguous send.
- Driver alerts for new requests, automated deposit expiry, cancellation/refund reconciliation and remaining balance collection are outside this initial implementation.
- Supabase, Square, Resend and Vercel need live configuration and end-to-end verification before production use.

## Checks for Codex Cloud agents

```sh
npm run lint
npm run typecheck
npm test
npm run build
```
