# Grace Transportation design system

The current implementation is a custom Hallmark direction for a Dallas and Fort Worth private SUV service. Read the vendored [Hallmark skill](.agents/skills/hallmark/SKILL.md) before a visual redesign. The earlier dark styling, layout and image are historical choices. The owner granted discretion over appearance.

## The public site

Lead with the Suburban. The existing illustrative vehicle image fills the opening section. On wide screens, the heading and booking action sit over a shaded part of the image. On phones, the crop favors the whole vehicle and fades to charcoal behind the copy. Keep the CTA visible before scrolling on common phone and desktop sizes. Replace the illustration with owner-approved vehicle photography when available.

Use “Private SUV rides,” a short service-area line, and one “Book Ahead” action. Airport service lists the two airports and secondary services use plain labels. Keep the deposit condition in the booking area and introduce the driver with verified experience. Avoid repeated calls to action, invented proof, marketing slogans and descriptions that restate the labels.

## The driver workspace

The driver workspace uses the same charcoal surfaces, off-white text and distinct status colors. A compact header and practical navigation frame the work. Keep phone navigation within thumb reach and put status near rider and route information. Wider queue rows align rider, route and pickup information into columns. Keep destructive actions in their own disclosure, preserve keyboard navigation and leave room for long addresses and references.

## Shared visual language

| Role | Value |
| --- | --- |
| Canvas | `#111214` |
| Surface and tint | `#191B1E`, `#202327` |
| Ink and secondary text | `#F3F3F1`, `#B9BCC1` |
| Hero and workspace header | `#0D0E10` |
| Action and active action | `#F3F3F1`, `#D7DADF` |
| Divider, border and control outline | `#2A2D31`, `#3D4147`, `#747981` |

- Semantic tokens are declared in `app/globals.css` and consumed by `app/admin/driver.css`. Keep warning, success, and error text paired with a meaningful state label.
- Use Archivo for display type and Inter for reading, inputs and denser operations. Scale the opening headline to the photo and viewport. Keep body text near 16 px and use smaller type for genuinely secondary information. Use tabular numerals for operational counts and prices.
- Use a centered 1,320 px shell, responsive gutters, small control radii and clear rules. Use spacing to group tasks. Avoid decorative pills, filler labels, icon decoration, stock gradients and repeated equal-weight card grids.
- Keep native controls, visible keyboard focus, labeled errors, pending feedback and distinct empty, error and receipt states. WCAG 2.2 AA is the target. Maintain 44 px primary touch targets, verify reflow at 320 px, and honor reduced motion. Motion should provide short feedback.

## Inspection and release

Review rendered photos, type, clipping, reading order and tap targets on phone, tablet and desktop. Exercise booking validation, review, retry and receipt, authentication, driver destinations and the schedule action. Keep backend routes, field names and provider workflows compatible. Use local fixtures for repeatable UI verification. Document any live-provider coverage separately. Run lint, type checking, tests, production build and Hallmark’s public render audit before opening the PR.
