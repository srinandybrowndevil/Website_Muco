# UI refresh — Tester report

## Executed results

- Workspace TypeScript checks: all packages and four applications passed.
- Dedicated customer UI suite: 3 passed. It covers all nine navigation destinations, menu dismissal by Escape and route selection, return to Profile, discard, whitespace-only name validation, failed-save draft retention, and 320/768/1440px rendering in light and dark themes.
- Adjacent preview regression: 29 passed, 1 intentional skip. It covers all customer routes on desktop and Pixel 7 emulation, one-click local entry, profile/photo persistence, employee/intern profiles, mentoring, and all workspace navigation at 320px. The shared profile mutation runs only on desktop to prevent duplicate changes to the same sample account.
- Customer shell and organisation page lint: passed. The initial CLI invocations stalled; a direct local ESLint invocation completed successfully without changing the rules.
- Shared profile form lint: passed with a Next.js pages-directory discovery warning because the component package is not itself an application. The customer application lint above resolved its own routes normally.
- Whitespace validation of changed files: passed.
- Muted-text contrast: 4.63–5.24:1 on the three light surfaces and 5.89–6.41:1 on the two dark surfaces. This measures the changed token, not a full accessibility certification.

The first dedicated UI run found a test selector collision with Next.js's route-announcement alert. The form error was present and correct; the assertion was scoped to the form and the entire three-test family passed on rerun.

Browser screenshots were visually inspected for desktop light and compact dark layouts. The customer menu was also opened in the in-app browser. Screenshots from the regression pass are preserved as `profile-desktop.png` and `profile-mobile.png` beside this report.

No production build, live Google sign-in, Supabase permissions, physical device, Firefox/WebKit, or screen-reader run is claimed for this iteration. Existing local preview isolation remains in force. No new runtime dependency was added.
