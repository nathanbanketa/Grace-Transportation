# Grace Transportation design system

This is the authoritative design reference for new and revised Grace Transportation UI. It defines the standard for the planned overhaul. The current application is the baseline recorded in [the design audit](docs/design-audit.md). Implementation begins when the owner confirms that the design skill list is complete.

## Brand and product

Grace is a Dallas–Fort Worth private SUV service for advance-booked transportation. The dove-and-SUV mark and black Chevrolet Suburban carry the identity. Use a dark editorial composition, clear language and authentic imagery. Keep the existing illustration identified as such in project documentation and use owner-approved vehicle photography when available. Use existing verified service details. Do not add ratings, guarantees, prices or credentials without a source.

The public site should help someone understand the service and request a trip. The dashboard should help Temesgen read a queue and act on a ride from a phone. They share brand assets and control standards. The public site can give photography and display typography room. Operational screens use a denser sans-serif hierarchy, with color reserved for meaningful states.

## Tokens

Keep semantic tokens in the Tailwind theme or a shared token stylesheet imported by `app/globals.css`. Document the final implementation here. Avoid standalone colors and font declarations in isolated components or the driver stylesheet.

| Role | Baseline value | Use |
| --- | --- | --- |
| Canvas | `#0B0B0C` | Primary background |
| Surface | `#121214` | Meaningful grouping and navigation |
| Raised surface | `#1B1C1F` | Selected controls and raised content |
| Subtle divider | `#26282C` | Decorative separators |
| Border | `#34363B` | Surface boundaries. Use a stronger token where the border identifies a control |
| Quiet detail | `#6E7177` | Nonessential detail, subject to contrast checks |
| Primary text and focus | `#F1F1EF` | Reading, focus indicators and light primary actions |
| Secondary text | `#B6B8BC` | Supporting content, labels and help text |

Add shared semantic foreground, background and border tokens for success, warning and error. Verify their contrast in context and pair them with text. Keep public surfaces monochromatic. Use an off-white primary action with dark text and verify inverse states. Use spacing increments of 4, 8, 12, 16, 24, 32, 48, 64 and 96 px. Default to an 8 px control radius, restrained panel radii and flat surfaces. Round only where the component needs it, such as a status chip.

## Typography and layout

- Preserve the mark’s lettering. Use the local Playfair Display face for public display headings and local Inter for body copy, controls and the driver dashboard. Public display starts around 36 px on phones and scales toward 80 px when space permits. Driver screen titles use approximately 28–40 px. Use 16 px body and form inputs, 14 px supporting labels, and 12 px only for secondary metadata. Use tabular numerals for fares, dates where useful, and counts.
- Keep the page shell capped near 1,280 px, with 16 px phone gutters and 24–48 px gutters at larger sizes. Cap reading measure near 65 characters. Use 12–24 px between related controls and 48–96 px between major public sections. Driver screens use smaller, consistent row and section spacing.
- Choose a single visual priority per viewport. Keep image-bearing grid tracks shrinkable and allow long headlines, addresses, names, IDs, and amounts to wrap. Start with one column and add columns where they save scanning time. Respect both safe-area insets and the on-screen keyboard.

## Components, states and accessibility

- Use shared button, link, form field, progress, notice, status, empty state and list-row styles. Use native links for navigation and buttons for actions. Give each section one obvious primary action. Keep destructive actions separate with clear consequences.
- Use persistent labels, useful autocomplete, explicit Central time where relevant, and specific field-level errors linked to their inputs. Preserve entered values after an error. Mark the active booking step, move focus deliberately, and distinguish booking request received from reservation confirmed. Show the reference without clipping.
- Design default, hover, keyboard focus, pressed, disabled, pending, success, empty and error states. Keep pending labels or activity indicators local to the action, prevent duplicate submits, and avoid moving the control while the user waits. Empty states explain what will appear and offer a valid next action when one exists.
- Target WCAG 2.2 AA. Verify 4.5:1 normal text contrast and 3:1 large text and meaningful nontext contrast. Use visible `:focus-visible` rings, landmarks, logical heading and tab order, skip navigation where appropriate, and 44 px touch targets for primary, navigation and frequently used controls. Use text as well as color for state. Test reflow at 320 px and 200% zoom, screen-reader labels, and focus visibility above fixed controls.
- Use brief 120–200 ms transitions for feedback, favoring opacity and transform. Keep content visible without scripting. Honor reduced motion, including scroll and any reveal. Avoid auto-playing media, parallax and animation that delays loaded content.

## Customer experience

Lead with the vehicle, a concrete service description and **Book Ahead**. Keep the vehicle image dominant and the action visible in the initial desktop viewport. Use typography and alignment to organize services. Keep small-screen access to Services and About. Preserve **Continue to Booking Details** and the existing trip, contact and review data. Use the available width for clear input groups and a useful review. Explain that the request is pending until the existing booking process confirms it. Give driver sign-in the same brand and field standards, with a compact, phone-friendly form.

## Driver experience

Make Requests, Upcoming, Schedule, History and Payments distinct destinations. Prefer a dated list or agenda, with status and the next meaningful action close to the ride details. On mobile keep common destinations reachable by thumb and place price, approve, start or complete where the driver can find them without passing ancillary history. Make call, text and navigation links explicit. Group editing and destructive controls separately. Keep the schedule scannable when open days dominate, and give prices and payment states stable alignment. Refresh data without moving focus or disturbing in-progress input. Use established ride-management conventions with Grace’s own layout and visual identity.

## Patterns to avoid

Avoid gradient ambience, glass panels, ornamental icons, all-capital section prefaces, decorative counts and dots, excessive pills, nested cards, repeated equal-weight card grids, and typography with no hierarchy. Use a divider or spacing for simple grouping. Use icons for navigation, a recognizable action, or a real state. Give whitespace a job, such as separating tasks or emphasizing an action. Avoid copied proprietary layouts and invented social proof.

## Before shipping a UI change

Read the repository design skills. Capture the existing important routes and states, inventory links, fields, handlers and data dependencies, then compare the result. Review mobile, tablet and desktop screenshots and keyboard behavior. Exercise booking validation and submission, sign-in and protection, all five driver views, key ride and schedule actions, and relevant feedback. Use fixtures for repeatable workflow states and label gaps in live-provider coverage. Run lint, type checks, automated tests and a production build. Update this file if an intentional implementation decision changes the system.
