# MUCO LABS — Customer UI refresh

Date: 13 September 2026. Environment: local development preview.

The customer workspace now has grouped desktop navigation and a mobile menu that exposes all nine destinations. “Profile” is a direct navigation item and the header identity links to it. The profile page separates editable personal information from the studio's business record, offers a direct correction request route, improves photo controls and readability, and supports save/discard feedback with draft preservation on failure. The prior mentoring recommendation copy now acknowledges notes already sent.

The design uses [21st.dev responsive navigation references](https://21st.dev/community/components/explore/responsive-sidebar) and [dashboard composition guidance](https://21st.dev/blog/react-dashboard-components), implemented in MUCO's existing component system without adding a runtime library.

Validation: 32 browser checks passed, with 1 intentional duplicate profile-mutation skip; all workspace typechecks passed. See the Tester and QA reports for exact scope and limitations. Screenshots: [Desktop](profile-desktop.png) and [Mobile](profile-mobile.png).

Preview: http://localhost:3104/organisation. This is a local UI delivery. No commit, push or deployment was performed; production authentication and delivery are not certified by these tests.
