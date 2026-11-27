# Grace Transportation

Advance-booked private SUV transportation in Dallas–Fort Worth. The application includes a public landing page and booking request form, plus a private dashboard for Temesgen to review trips, set prices, collect deposits, and manage reservations.

## Local setup

1. Install Node.js 22 or later and run `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Create a Supabase project and apply the SQL migration in `supabase/migrations` with the Supabase CLI or SQL editor.
4. Set the Supabase URL, publishable key, and server-only service-role key. Provision Temesgen’s password-based user in Supabase Auth, disable public signups, and set `ADMIN_USER_IDS` to the user UUID. The dashboard is at `/admin`.
5. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

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

## Square, Resend and Vercel

1. Start with a Square Sandbox access token and location ID. Register `payment.created` and `payment.updated` on the HTTPS `/api/square/webhook` endpoint. Set the exact subscription URL and signing key from Square.
2. Verify a sending domain in Resend and set `RESEND_API_KEY` and `BOOKING_FROM_EMAIL`. Configure the sender mailbox to receive replies if it will be used for customer contact.
3. Import the repository into Vercel as a Next.js app. Set environment variables per environment, keep preview on a separate sandbox and database, and use the production domain in the Square subscription URL when ready.
4. Test a full sandbox trip using Supabase Auth, a submitted request, approval, deposit email, Square checkout, a confirmed database row and a confirmation email. Test replayed webhooks and failed email delivery. Review dashboard access with an unlisted account before enabling live traffic.

## Before accepting live bookings

- Replace the temporary dove-and-SUV mark with owner-approved artwork. The hero is an illustrative generated image and can be replaced with a verified photo of the vehicle.
- Confirm business contact details, pricing and cancellation terms. Placeholders are **[business email]**, **[business phone]**, **[driver-approved trip pricing and deposit]**, and **[cancellation and refund policy]**. The public page omits unpublished contact details and terms.
- Set public booking rate limits at the Vercel edge and define data retention, operator monitoring and recovery procedures. Resend’s idempotency window is time-limited. Review provider delivery logs before retrying an older ambiguous send.
- Driver alerts for new requests, automated deposit expiry, cancellation/refund reconciliation and remaining balance collection are outside this initial implementation.
- Supabase, Square, Resend and Vercel need live configuration and end-to-end verification before production use.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```
