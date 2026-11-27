# Project status

Updated 2026-11-27.

## Repository and workflow

- [GitHub repository](https://github.com/nathanbanketa/Grace-Transportation) contains the public site and driver dashboard. PR #1 established the initial app on `main`. The reservation expansion is on `codex/reservation-management`.
- The owner uses a phone. Codex performs development, test and Git operations in Cloud and opens pull requests. Browser provider setup is in the README.

## Implemented

- The original public layout and booking form are preserved. Intake now uses transactional request deduplication, private quota keys, rate limits and validated PostgreSQL persistence.
- The driver dashboard includes a live request feed, upcoming rides, history, address and contact shortcuts, pricing, checkout, a two-week schedule, availability editing, customer history, payment history and a booking timeline.
- The versioned database models customers, an active driver, bookings, checkouts, payments, availability, notifications and booking history. PostgreSQL enforces schedule conflicts and valid transitions.
- Square deposit links follow driver approval. Verified Square events reconcile payment and refund state. Payments for stale, retired or mismatched orders are flagged for review. Resend jobs, optional driver SMS and driver push use a durable outbox.
- The driver PWA has an admin-scoped service worker and install manifest. It does not cache booking data.

## Verification and next steps

- The Cloud checks cover lint, TypeScript, nine tests and the production build. PostgreSQL tests cover transitions, schedule conflicts, access control, duplicate submission, rate limits, payment replay, checkout retirement and legacy data import.
- Mobile Chromium passed the booking form, admin redirect and sign-in, ride detail, schedule layout, manifest and service worker smoke test against a local Supabase API fixture. This did not exercise live providers.
- Configure separate test provider projects from the browser. Apply the migrations in order and provision Temesgen’s active driver record.
- Run a real Square Sandbox approval, payment, refund and checkout retirement, and verify Resend, dashboard updates and push on actual devices. No live integrations or deployment have been verified.
- Before launch, confirm business policies and artwork and define operational monitoring, retention and reconciliation. Scheduled checkout expiry, automatic refunds and remaining balance collection remain outside this implementation.

## Design overhaul preparation

- Reservation management PR #2 is merged at `3408f19`. The owner reported successful driver sign-in.
- Hallmark 2.0.0 is installed in Cloud and vendored under `.agents/skills/hallmark/` with its MIT license and reference materials. Upstream is [nutlope/hallmark at 04977e1](https://github.com/nutlope/hallmark/tree/04977e15f3dfd6ee4b74c887dac3eb52665d6c92/skills/hallmark).
- `DESIGN.md` defines the persistent standard. `docs/design-audit.md` records the existing UI audit and fixture coverage.
- The UI overhaul is waiting for the owner to confirm the full design skill list. Application code is unchanged on the preparation branch.
