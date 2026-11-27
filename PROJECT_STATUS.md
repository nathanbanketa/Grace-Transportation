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

## Design overhaul

- Reservation management PR #2 is merged at `3408f19`. The owner reported successful driver sign-in.
- Hallmark 2.0.0 is installed in Cloud and vendored under `.agents/skills/hallmark/` with its MIT license and reference materials. Upstream is [nutlope/hallmark at 04977e1](https://github.com/nutlope/hallmark/tree/04977e15f3dfd6ee4b74c887dac3eb52665d6c92/skills/hallmark).
- `DESIGN.md` defines the persistent standard. `docs/design-audit.md` records the existing UI audit and fixture coverage.
- The authorized overhaul updates the customer site, booking flow, driver sign-in, dashboard and booking detail. Backend endpoints, database migrations and provider configuration are unchanged.
- Chromium verified the revised routes at 390, 768 and 1440 px. A separate 320 px check covered keyboard navigation, airport booking validation, submit/retry/receipt, protected sign-in, ride links, cancellation disclosure, availability submission and the missing-page fallback using a local Supabase fixture.
- Production rollout uses the existing Vercel project and environment variables. Merge the redesign PR and verify that the newest Production deployment tracks the updated `main` commit. No migrations are required for this redesign.

## Custom public-site redesign

- The owner approved a new Hallmark direction after PR #3 retained too much of the earlier visual composition. The current design uses a light blue-gray palette, an oversized Dallas heading, a panoramic illustrative hero, a dedicated airport feature and a matching driver workspace.
- The Hallmark bundle is already on main. This PR changes application presentation and design documentation without bundling another skill copy.
- Deploy the new main commit through the existing Vercel project. Preserve the existing configuration and database.
- The editorial build passed lint, type checks, all nine tests and the production build. Chromium verified phone, tablet and desktop renders and exercised booking retry, driver sign-in and schedule changes with a local API fixture. Hallmark’s public render audit reported zero failures and two documented exceptions where the panoramic image fills the area below the masthead.

## Suburban hero refinement

- After reviewing the editorial redesign, the owner requested a larger vehicle background, a darker theme and shorter copy. The opening uses the existing illustration edge to edge, with a crop for phones and a single booking action. Shared charcoal tokens extend into the booking and driver screens.
- The booking flow, database and provider configuration are unchanged by this refinement.
- Lint, type checking, nine tests, and the production build passed. Chromium covered phone, tablet and desktop, including a 320 px booking and driver workflow with a local fixture. Hallmark reported no failures or warnings and documented the photograph’s light tones as a palette-audit exception.
