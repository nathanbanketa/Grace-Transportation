# Project status

Updated 2026-11-27.

## Repository and workflow

- GitHub target is [nathanbanketa/Grace-Transportation](https://github.com/nathanbanketa/Grace-Transportation). The initial app is commit `9840c8d`.
- The owner works from a phone. Codex owns all terminal work and opens pull requests. Use the browser instructions in the README for provider configuration.
- On resumption, check the GitHub default branch, open PRs and current checkout before starting changes.

## Implemented

- Next.js App Router, TypeScript and Tailwind. Responsive DFW landing page, temporary dove-and-SUV mark and illustrative Suburban hero.
- Three-step booking request with shared validation, Dallas pickup times and airport details. Requests start pending in Supabase.
- Allowlisted driver dashboard for review, pricing, approval, deposit requests and reservation status updates.
- Square hosted checkout and signed payment webhook. Server-side payment verification gates confirmation. Resend sends deposit and confirmation emails.

## Verified

- Initial app passed lint, TypeScript, six unit tests and the production build.
- The initial SQL migration and key state transitions passed in an isolated PostgreSQL instance. Anonymous and authenticated database roles were denied booking reads.
- The prerendered page passed CTA checks. The managed preview could not bind its port, so interactive browser QA remains open.

## Launch blockers

- Configure separate test and production provider settings through the browser dashboards. No deployed environment or live payment flow has been verified.
- Run a complete sandbox booking through approval, deposit checkout and confirmation email. Verify access control, webhook replay and email retry behavior.
- Obtain approved brand artwork, actual vehicle photography if available, business contact details, pricing and cancellation/refund terms.
- Set booking rate limits, retention and recovery procedures. Refunds, deposit expiration, remaining balances and new-request driver alerts remain manual or unimplemented.

## Next session

Start with the test deployment and booking flow in the README. Codex should run browser QA once an authenticated preview or test deployment is reachable, then update this file with the deployment URL and observed results. Keep credentials out of Git and chat.
