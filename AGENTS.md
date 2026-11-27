# Grace Transportation project instructions

- Use Next.js App Router, strict TypeScript, Tailwind CSS, Supabase/PostgreSQL, Square and Resend. Target Vercel on Node.js 22 or later.
- Preserve the dark palette, dove-and-SUV identity and black Chevrolet Suburban. Use “Book Ahead” as the main call to action and “Continue to Booking Details” for the first booking step.
- Display pickup times in America/Chicago and store timestamps in UTC. Store USD amounts in integer cents.
- Treat public submissions as pending requests. Require authenticated driver approval and pricing before requesting a deposit. Confirm only after server-side payment verification.
- Validate customer input on both sides. Verify the Supabase user and administrator allowlist before every dashboard read or mutation.
- Keep credentials, customer data, and payment verification server-side. Avoid logging customer data, raw webhook payloads, or credentials.
- Keep business contact details, rates and policies as placeholders until the owner supplies them. Never imply that a provider is live until its complete workflow has been tested.
- Put database changes in versioned Supabase migrations. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before committing.

## Phone-first Cloud workflow

- The owner manages this project from a phone. Perform all coding, dependency installation, tests, Git operations and repository changes in Codex Cloud.
- Read `README.md` and `PROJECT_STATUS.md` at the start of each session. Check the GitHub base branch, open pull requests and working tree before editing. Preserve existing changes.
- Work on a feature branch. Run the applicable checks, commit and push from Cloud, then open a GitHub pull request for each completed implementation. Include verification and provider configuration still required. Share the PR link for browser review.
- Update `README.md` when setup or provider steps change. Update `PROJECT_STATUS.md` with completed work, actual verification, current blockers and the next actionable step. Update this file when persistent project rules change.
- Give the owner exact browser dashboard paths, field names and safe values for required external setup. Keep terminal commands in Cloud-only developer sections and secrets in the provider UI or the configured secret store.

## Reservation operations

- Require the configured UUID allowlist and an active driver row for admin access. Allow customer submissions only through the validated server endpoint and transaction RPC. Never add public booking reads.
- Preserve audit and notification changes in the same transaction as booking changes. Store Square orders separately from bookings so retired orders and late receipts remain reconcilable.
- Enforce single-vehicle schedule exclusivity in PostgreSQL. Keep modifications and payments safe under retries and stale updates. Reject price changes after payment unless a new business-approved settlement workflow is implemented.
- Keep the driver service worker scoped to `/admin`. Avoid caching authenticated responses and exclude customer identifiers, route details, and contact data from push and SMS.
- Use the PGlite database tests to validate changes to migrations, booking transitions, access controls, and payment reconciliation before pushing.

## User-facing design

- Read root `DESIGN.md` and the relevant repository design skills under `.agents/skills/` before creating or changing any user-facing component, page, style or interaction.
- Hallmark is pinned in `.agents/skills/hallmark/`. Read its `SKILL.md` and relevant references, then review any helper script before running it. Repository design standards and explicit owner direction govern existing Grace UI.
- Read `docs/design-audit.md` before the overhaul. The owner must confirm that all intended skills have been provided before implementation begins.
- Use the shared tokens and component states, preserve existing backend and UI wiring, and verify the rendered experience across phone, tablet and desktop. Update `DESIGN.md` with intentional system changes.
