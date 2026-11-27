# Grace Transportation

Advance-booked private SUV transportation in Dallas–Fort Worth. The public landing page and booking steps are unchanged. Temesgen’s private dashboard is at `/admin` in the same Next.js application.

## Codex Cloud setup for agents

Use Node.js 22 or later. Install with `npm ci`, copy `.env.example` to `.env.local` for a configured test project, apply the migrations in order, and run `npm run dev` in Cloud. Use an authenticated Cloud HTTP preview or a separate Vercel test project. The public design and the form’s review step render without credentials. Storage, admin access, and notifications require the corresponding provider configuration.

## How reservations work

| Area | Behavior |
| --- | --- |
| Intake | The server validates each request, limits body size, and uses a transactional request UUID and exact-payload fingerprint to deduplicate submissions. The database permits up to five distinct submissions per normalized email and 20 per Vercel client IP per 15-minute window. Outside Vercel the IP quota is shared. |
| Driver access | Supabase Auth verifies the session. The user must be listed in `ADMIN_USER_IDS` and have an active driver row. PostgreSQL denies direct client access to bookings, customer records, payments, availability, audit history and notification data. Supabase Realtime exposes only a driver-scoped change counter. |
| Schedule | Pending requests do not hold time. Approval with a driver assigned holds the estimated interval. Checkout, confirmed bookings and in-progress rides keep the hold. PostgreSQL rejects conflicting intervals and unavailable blocks atomically, allowing adjacent trips. The driver sets the estimated duration at approval. |
| Lifecycle | Pending → approved → awaiting payment → confirmed → in progress → completed. Drivers may decline or cancel where applicable. Repricing an unpaid checkout requires Square to verify that its order was cancelled before a replacement is issued. Confirmed and in-progress prices stay locked. Booking changes write an audit entry and queue applicable notifications. |
| Payments | Square hosts checkout and receives all card details. The driver sets the trip total and deposit, which can equal the total. Signed webhooks trigger an independent lookup at Square and match payment status, currency, location, order, amount and pickup deadline. Only the current order can confirm a booking. Late, mismatched or superseded payments are recorded for review. |
| Notifications | Resend sends customer status and payment emails and optional driver email alerts. The database queues each event with a delivery lease. Resend uses stable idempotency keys. Push and optional SMS are driver-only, with no customer details. An ambiguous SMS failure requires manual review to avoid duplicate sends. |
| PWA | The driver app has its own install manifest, icons and service worker. The worker handles push without storing authenticated pages or customer data. The dashboard uses Realtime while open and refreshes periodically as a fallback. |

Pickup times are entered and displayed in Central time, with ambiguous and nonexistent daylight saving times rejected. PostgreSQL stores timestamps in UTC and USD amounts in integer cents. Customer history is grouped by normalized email, using the trip-specific contact information saved on each booking.

## Phone setup for the owner

These steps use browser dashboards. If your phone hides a control, request the desktop version of that dashboard. Use sandbox projects for the first deployment and store credentials in Vercel, outside Git and chat.

### 1. Supabase

1. Open the [Supabase dashboard](https://supabase.com/dashboard) and create a dedicated test project.
2. Open **SQL Editor → New query**. On GitHub, open each file under `supabase/migrations`, tap **Raw**, and copy its contents. Paste and run each file as a separate query, in order: `202611270001_bookings.sql`, `202611270002_in_progress.sql`, then `202611270003_reservation_management.sql`. On an existing project apply only pending migrations. The enum migration must be committed before running the next one.
3. Under **Authentication → Users → Add user → Create new user**, create Temesgen’s account, enable email confirmation in that dialog, and copy the UUID. Under **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**.
4. Open **Table Editor → drivers → Insert row**. Enter the Auth UUID under **id**, `Temesgen` under **display_name**, and leave **active** enabled. Save. Only one driver can be active because the business schedules one vehicle.
5. Use **Connect** to copy the project URL. Use **Project Settings → API Keys** to copy the publishable key and the legacy `service_role` key.
6. Under **Database → Publications**, check that the `supabase_realtime` publication includes `driver_feed`. The migration adds this table when that publication exists. If it was absent when the migration ran, enable Realtime for `driver_feed` there. Keep customer and booking tables out of this publication.

The upgrade assigns existing occupied trips a 60-minute estimate. If existing confirmed or awaiting-payment trips overlap under that estimate, the final migration rolls back. Have Codex review the affected times before retrying. Legacy bookings are imported into history. Prior notifications are not replayed. Older checkout links without a saved Square link ID require manual reconciliation in Square.

### 2. Square Sandbox and Resend

1. Open [Square Developer Console](https://developer.squareup.com/apps), create or select an application, and choose **Sandbox**. Copy the **Sandbox access token** under **Credentials** and the **Location ID** under **Locations**.
2. In [Resend Domains](https://resend.com/domains), choose **Add Domain**. Add the listed DNS records in the domain registrar’s DNS dashboard, then return to Resend and verify the domain.
3. In [Resend API Keys](https://resend.com/api-keys), create a key with **Sending access** for the verified domain. Choose a sender address and specify a driver email address that Temesgen can access.

### 3. Vercel and signed webhooks

1. Open the [Vercel dashboard](https://vercel.com/dashboard). Select **Add New → Project** and import [Grace-Transportation](https://github.com/nathanbanketa/Grace-Transportation). Use the **Next.js** preset, repository root, and Node.js 22 or later. For a sandbox, use an isolated Vercel project with test credentials and a stable domain.
2. Open **Project → Settings → Environment Variables** and enter the values below for the environment that will serve your test. Generate independent random values of at least 32 characters for the two private secrets using your password manager.

| Field | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase Connect |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy Supabase `service_role` key |
| `ADMIN_USER_IDS` | Temesgen’s Auth UUID |
| `BOOKING_RATE_LIMIT_SECRET` | Private random quota and idempotency secret |
| `CRON_SECRET` | Separate private random background-job secret |
| `SQUARE_ENVIRONMENT` | `sandbox` |
| `SQUARE_ACCESS_TOKEN` | Square Sandbox access token |
| `SQUARE_LOCATION_ID` | Square Sandbox location ID |
| `RESEND_API_KEY` | Resend sending key |
| `BOOKING_FROM_EMAIL` | Sender address on the verified domain |
| `DRIVER_NOTIFICATION_EMAIL` | Email address for incoming ride alerts |
| `SQUARE_WEBHOOK_URL` | Stable HTTPS deployment URL followed by `/api/square/webhook` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Signature key from the Square subscription |

3. Deploy and copy the stable domain from **Project → Settings → Domains**. In Square Developer Console, choose **Sandbox → Webhooks → Subscriptions → Add subscription**. Enter the full webhook URL and select `payment.created`, `payment.updated`, `refund.created`, and `refund.updated`. Save, open the subscription, and copy its signature key.
4. Save the final two webhook variables in Vercel. Open **Deployments**, open the latest deployment’s menu and choose **Redeploy**. Square must reach the webhook over HTTPS without a Vercel sign-in screen. Check the cron route under **Project → Settings → Cron Jobs**. Vercel supplies the bearer header from `CRON_SECRET`.
5. Open the sandbox deployment in your browser. Submit a request, sign into `/admin`, review the new request, enter duration and amounts, and select **Approve and request deposit**. Open the customer deposit email and pay with a [Square Sandbox test card](https://developer.squareup.com/docs/devtools/sandbox/payments). Check **Confirmed**, the payment history, booking activity and the confirmation email. Also check that an unlisted account cannot enter the dashboard.

The deployment runs a daily recovery job at approximately 12:00 UTC. Immediate processing normally runs after each booking, driver action, or verified webhook. The driver can process due emails from the booking detail view. For a higher-frequency job on a supported Vercel plan, have Codex update the schedule through a PR. Review provider delivery logs before sending an email whose outcome is unknown. Retries stop before Resend’s idempotency window ends.

### 4. Install on a phone and enable optional alerts

- **iPhone or iPad:** open the deployed `/admin` page in Safari. Tap **Share → Add to Home Screen**, then **Add**. Open the installed app and sign in. iOS/iPadOS 16.4 or later supports push for Home Screen web apps. Tap **Enable alerts** and allow notifications when prompted.
- **Android:** open `/admin` in Chrome. Tap **Menu → Install app** or **Add to Home screen**. Open the installed app, sign in, and tap **Enable alerts**.
- **Push setup:** have Codex generate an environment-specific VAPID key pair in Cloud and place it in Vercel’s **Environment Variables** through authorized secret access. Set `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` to the public key, `WEB_PUSH_PRIVATE_KEY` to the private key, and `WEB_PUSH_SUBJECT` to a valid `mailto:` contact or HTTPS URL. Redeploy, install the app and verify a new ride alert on each supported device. Keep the private key in the configured secret store.
- **Optional driver SMS:** in the [Twilio Console](https://console.twilio.com/), copy the Account SID and Auth Token and choose an approved SMS-capable sender under **Phone Numbers → Manage → Active Numbers**. Enter `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, and the opted-in driver’s `DRIVER_SMS_NUMBER` in Vercel. Use E.164 format for both numbers, complete any sender registration in Twilio, then redeploy and test on the driver’s phone.

## Before live bookings

- Keep production Supabase data, Square credentials, webhook subscription and environment secrets separate from sandbox. Switch Square to `production` only after verifying the sandbox flow.
- Verify real provider notifications, webhook replay, late payment review, iOS/Android push, and checkout retirement in the sandbox before advertising them.
- Confirm business contact information, pricing, cancellation and refund terms. Replace the temporary mark and illustrative hero with approved assets when available.
- Configure operational monitoring, retention and backup procedures. Refunds and remaining balances are handled manually in Square. The dashboard tracks verified deposit receipts and refunds; it does not provide full accounting. Automatic expiry of unpaid slot holds is not implemented. Review and cancel expired checkouts from the dashboard.
- Keep `BOOKING_RATE_LIMIT_SECRET` stable across deployments. Rotate with a planned cutover because changing it resets short-window deduplication and quota keys.

## Checks for Codex Cloud agents

```sh
npm run lint
npm run typecheck
npm test
npm run build
```
