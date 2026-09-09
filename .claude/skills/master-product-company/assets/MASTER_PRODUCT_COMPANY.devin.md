# Master Product Company

This playbook turns Devin into a full master-level IT company. Attach it to the session. Keep the matching skill at `.agents/skills/master-product-company/SKILL.md`.

## Outcome

From an idea or prompt, produce professional English station reports and, when the repo is in scope, production-grade implementation. Follow product priority: website, then e-commerce platform, then app, then other software.

## Required from User

- An idea, prompt, URL, or repo
- Product type if already known
- Whether this session is the full factory or one station
- Any hard constraints (market, stack, brand, compliance)

## Forbidden Actions

- Do not skip R&D
- Do not write Tanglish or informal artifacts
- Do not invent market numbers, URLs, or bugs
- Do not start Frontend without `02-DESIGN-SPEC.md`
- Do not start Backend without `03-FRONTEND-HANDOFF.md` and its API contract
- Do not declare done while S0–S2 findings are open unless the user accepts them in writing
- Do not provide exploit recipes or print live secrets
- Do not treat SEO/AEO/AIO/GEO as a post-launch ticket

## Procedure

Read `.agents/skills/master-product-company/SKILL.md` and follow its load map.
Create a `delivery/` folder for station reports if one does not exist.
Classify the product using website, then e-commerce, then app, then software. Combine types when needed.
Run Station 0 intake. Write the idea verbatim and list blocking questions only.
Run Station 1 R&D using `references/rnd.md`. Write `delivery/01-RND-BRIEF.md`.
Run Station 2 Design using `references/design-handoff.md`. Write `delivery/02-DESIGN-SPEC.md` with every page, state, and placeholder.
Run Station 3 Frontend. Implement if the repo is in scope. Write `delivery/03-FRONTEND-HANDOFF.md` including the API contract the UI needs.
Run Station 4 Backend. Implement if the repo is in scope. Write `delivery/04-BACKEND-HANDOFF.md`.
Run Station 5 Tester. Write `delivery/05-TEST-REPORT.md` with cases and results.
Run Station 6 QA audit using audit-protocol, cert-matrix, and finding-template. Write `delivery/06-QA-AUDIT.md` and `delivery/00-MASTER-REPORT.md` in professional English.
If S0–S2 remain, write `delivery/07-RND-RETURN.md` and restart at R&D. Increment the loop number. Do not jump to Frontend.
Include growth gates on every public surface — SEO, AEO, AIO, GEO, and SEM/SMM/SSCM when relevant.
Stop only on QA pass, user-accepted punch list, or user abort.

## Specifications

- Reports follow `assets/professional-report.md`
- Roles are master-level and listed in the references folder
- Organic lead design is part of the quality bar
- One voice. No fake multi-agent transcript

## Advice

If the user gives only a one-line idea, still run full R&D and label assumptions.
If the session is short, finish R&D and Design before cutting code.
Prefer small root-cause fixes over rewrites unless R&D says the model is wrong.
