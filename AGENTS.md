# Grace Transportation project instructions

- Use Next.js App Router, strict TypeScript, Tailwind CSS, Supabase/PostgreSQL, Square and Resend. Target Vercel on Node.js 22 or later.
- Preserve the dark palette, dove-and-SUV identity and black Chevrolet Suburban. Use “Book Ahead” as the main call to action and “Continue to Booking Details” for the first booking step.
- Display pickup times in America/Chicago and store timestamps in UTC. Store USD amounts in integer cents.
- Treat public submissions as pending requests. Require authenticated driver approval and pricing before requesting a deposit. Confirm only after server-side payment verification.
- Validate customer input on both sides. Verify the Supabase user and administrator allowlist before every dashboard read or mutation.
- Keep credentials, customer data, and payment verification server-side. Avoid logging customer data, raw webhook payloads, or credentials.
- Keep business contact details, rates and policies as placeholders until the owner supplies them. Never imply that a provider is live until its complete workflow has been tested.
- Put database changes in versioned Supabase migrations. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before committing.
