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
