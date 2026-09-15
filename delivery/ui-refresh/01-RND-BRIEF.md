# UI refresh — Research, 13 September 2026

Continue the founder's request to improve MUCO LABS UI/UX using 21st.dev design references. This iteration covers the customer workspace shell and the profile/organisation screen, plus the mentoring recommendation copy left from the earlier iteration. All edits remain local; no commit, push or deployment.

The customer needs to find their profile, update contact details and a photo, and distinguish those edits from the studio's billing record. Browser inspection found a nine-link horizontal navigation, a personal form labelled only “You” inside “Organisation”, and no direct support action beside the read-only billing record. The form has no discard action. Small helper text also uses a low-contrast palette in both themes. These are observed design gaps; no customer survey or measured conversion claim is implied.

Use 21st.dev's responsive navigation collection and dashboard composition guidance as references, implemented with existing MUCO components and CSS. Prefer a grouped desktop rail and an inline disclosure menu on phones. Keep the customer's quiet visual identity and avoid invented project metrics. Profile editing retains the existing name, phone, two optional social URLs and 1:1 photo contract. Billing records remain read-only. Errors must retain draft values and allow retry.

Scope: all nine customer routes receive the shell; `/organisation` receives the new profile layout. No authentication, database-policy, live-delivery or public-marketing changes. Private pages remain excluded from search engines. Success requires visible navigation at 320px, accessible upload/save/discard controls, persisted profile edits, truthful success/error states and desktop/mobile screenshots. Browser emulation is not a physical-device test.

References: https://21st.dev/community/components/explore/responsive-sidebar and https://21st.dev/blog/react-dashboard-components.
