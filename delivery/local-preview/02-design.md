# Local workspace preview — Design handoff

Keep each workspace's existing visual identity and layouts. Replace the sign-in form with a concise sample-data explanation and one primary “Sign in” button. Preserve a safe internal return destination. No email, password, Google or account-creation controls appear in preview mode.

Add a normal-flow preview strip containing “Local preview · Sample data” and links to Website, Customer, Admin, Employee and Intern. Links wrap on narrow screens. Use visible keyboard focus and touch targets of at least 44 pixels. The strip explains that edits are local and authentication is disconnected.

Use coherent fictional people, one customer project, requests, tasks, milestones, learning assignments and billing records. Sample records must never resemble claimed customer testimonials. File previews must be local. Actions needing external services must explicitly say they are unavailable in this preview, rather than claiming an email, invitation or payment was sent.

The existing profile, request and management forms remain the interface for editing sample records. Success means the local store actually changed. Refresh must retain edits. A documented reset command restores samples. Empty and error states remain available through existing forms and filters.

## Review loop 2

Give the overview statement an H1 while preserving its serif typography. Separate header-row styling from progress indicators so logos, names and sign-out controls retain their natural height. Hide the connected “Signing in” settings panel in local preview. On desktop, place the preview strip beside the fixed admin rail; on phones, retain the full-width strip above navigation. API contracts remain unchanged.

## Review loop 3 — mentoring UI

The Employee Mentoring screen now uses a compact dashboard hierarchy: four measured summary cards, a responsive mentee grid, a clear identity block, tabular attendance figures, and a single next-step action per card. Completed interns surface the recommendation action; active interns explain when that action becomes available. The private-view badge and privacy notice make the data boundary visible without adding noise. At 900px the grid becomes one column and at 520px cards stack their next-step copy and action for thumb-friendly use.

The layout is informed by 21st.dev's dashboard guidance for shell-plus-metrics-plus-content composition, reserved card heights and tabular numbers, and its responsive navigation patterns: [dashboard component guidance](https://21st.dev/blog/react-dashboard-components) and [responsive sidebar patterns](https://21st.dev/community/components/explore/responsive-sidebar). These are visual references only; the implementation keeps MUCO's existing tokens, CSS and accessibility primitives.
