# UI refresh — Design handoff

## Navigation and layout

Keep the MUCO masthead and customer identity. At 1080px and above, show a 208px rail with Project (Overview, Scope, Milestones, Previews, Files, Billing), Working together (Support, People), and Account (Profile). At smaller widths use a 44px minimum inline disclosure button with the current destination, expanded state, and all routes visible when opened. Escape closes it and restores focus. Selecting a route closes it. The menu is not a modal and does not trap focus. The document remains the scrolling surface. Long names and companies wrap or truncate within available width.

## Profile screen

Retain `/organisation` for existing links, but use the visible title “Profile & organisation” and a discoverable “Profile” navigation label. The large editable panel contains a 1:1 avatar, labelled personal fields, optional social fields, and save/discard actions. A smaller business panel displays the studio's record and a real link to Support to request corrections. On narrow screens the form appears before business details. Separate contact/social data from invoice data; do not repeat social links in the billing record.

## States, content and accessibility

Keep exact labels Full name, Phone, LinkedIn profile, Instagram profile and Save changes. Name is required and whitespace-only input receives a useful message. Phone includes country-code guidance. Photo uses a real keyboard-operable button, square local crop, and JPG/PNG/WebP up to 5 MB. Optional social fields explain the accepted full HTTPS URLs. Save is disabled until changed. Pending disables editing and shows “Saving”; failures keep the draft with a retry message; success is announced after persistence; Discard changes restores saved values and photo. Reserve one status area. No success may be shown for failed/offline requests. Missing organisation keeps a heading and support action.

Use existing fonts, restrained borders, larger avatar, grouped fields and the MUCO blue accent. Raise muted-text contrast against both surfaces. Keep controls at least 44px and form text at least 16px on phones. Respect reduced motion; no new animation dependencies. Existing private-page metadata and access rules remain intact. No new endpoints or fields are needed.
