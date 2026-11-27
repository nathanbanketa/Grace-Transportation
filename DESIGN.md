# Grace Transportation design system

The current implementation is a custom Hallmark direction for a Dallas and Fort Worth private SUV service. Read the vendored [Hallmark skill](.agents/skills/hallmark/SKILL.md) before a visual redesign. The earlier dark styling, layout and image are historical choices. The owner granted discretion over appearance.

## The public site

Give Dallas the opening line. The wide “Dallas, driven.” masthead and the photograph underneath set the scale of the site. Keep the booking action visible before scrolling on common desktop and phone sizes. The hero illustration shows an example vehicle, without claiming to be a photograph of Temesgen’s actual Suburban. Replace it with a verified vehicle photograph when the owner provides one.

Use the specific things customers look for. DFW and DAL anchor an airport service feature. Secondary services form a compact directory. The booking area sits on a blue-tinted ground with a single light work surface, followed by the driver introduction and a simple footer. Retain verified service, fleet, region and experience details. Avoid unsupported claims, ratings, safety guarantees and prices.

## The driver workspace

The same light surfaces and ink support daily use. A navy header separates the private workspace from the public site. Keep phone navigation within thumb reach and put status near rider and route information. Wider queue rows align rider, route and pickup information into columns. Keep destructive actions in their own disclosure, preserve keyboard navigation and leave room for long addresses and references.

## Shared visual language

| Role | Value |
| --- | --- |
| Canvas | `#EDF0F5` |
| Surface and tint | `#FAFBFD`, `#E4E9F2` |
| Ink and secondary text | `#142037`, `#45536B` |
| Dark feature and workspace header | `#15213A` |
| Action and active action | `#253FB4`, `#1B2D85` |
| Divider, border and control outline | `#D5DCE8`, `#B5C0D2`, `#74829B` |

- Semantic tokens are declared in `app/globals.css` and consumed by `app/admin/driver.css`. Keep warning, success, and error text paired with a meaningful state label.
- Use Archivo for display type and Inter for reading, inputs and denser operations. The masthead can scale aggressively. Keep body text near 16 px and use smaller type for genuinely secondary information. Use tabular numerals for operational counts and prices.
- Use a centered 1,320 px shell, responsive gutters, small control radii and clear rules. Use spacing to group tasks. Avoid decorative pills, filler labels, icon decoration, stock gradients and repeated equal-weight card grids.
- Keep native controls, visible keyboard focus, labeled errors, pending feedback and distinct empty, error and receipt states. WCAG 2.2 AA is the target. Maintain 44 px primary touch targets, verify reflow at 320 px, and honor reduced motion. Motion should provide short feedback.

## Inspection and release

Review rendered photos, type, clipping, reading order and tap targets on phone, tablet and desktop. Exercise booking validation, review, retry and receipt, authentication, driver destinations and the schedule action. Keep backend routes, field names and provider workflows compatible. Use local fixtures for repeatable UI verification. Document any live-provider coverage separately. Run lint, type checking, tests, production build and Hallmark’s public render audit before opening the PR.
