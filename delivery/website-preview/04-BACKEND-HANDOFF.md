# Station 4 — Backend
## Website Preview experience (Frontend V1) · Loop 1

**Status: deliberately not run. No backend work was performed, and none should be.**

This station is recorded rather than skipped, because a missing station file and a
station that was correctly declined look identical in a directory listing.

---

## 1. Why there is nothing here

The brief scopes this phase to the frontend and names the exclusions explicitly:
backend APIs, Supabase, database, lead persistence, email, WhatsApp automation, CRM,
admin dashboard, login, Google Maps, Google Business Profile, Gemini or any AI API,
payments, checkout, domain purchase, production file storage, production share links,
server-side lead submission, automated deployment and CMS.

Every one of those is absent from the implementation. This was verified rather than
assumed — see `05-TEST-REPORT.md`, case T-19: a browser test watches every request to
this origin through the complete flow up to and including approval, and asserts that
the list of non-GET requests is empty.

## 2. What the frontend does instead

Nothing is faked. Specifically:

- The approval screen does not claim anything was sent. It says: *"This design is
  saved in this browser only. Nothing has been sent to MUCO LABS yet."*
- The enquiry form inside the Modern Business template is visual only. Its inputs are
  `disabled` and it is labelled *"Enquiry form — preview only. It is not connected to
  anything."*
- Uploaded images never leave the browser. They are read with `FileReader` and held as
  `data:` URLs.
- There is no mock API client, no stubbed fetch and no pretend latency.

## 3. The seam a backend will use

`PreviewRepository` in `website-preview.js`. One interface, one local implementation,
no abstraction beyond what is needed to swap it. The contract is written out in
`03-FRONTEND-HANDOFF.md` section 9.

When a backend phase begins, the work is:

1. Implement the same seven methods against the server.
2. Decide what identity a draft belongs to. Today there is none, and the tool works
   without an account on purpose.
3. Add error, empty and offline states to the screens. They do not exist yet because
   no call can fail yet, and inventing them now would be designing against an
   imaginary contract.

## 4. What must not happen in that phase

- Do not make approval silently post a lead. If approval should notify MUCO LABS, the
  visitor has to be told it will, and the copy has to change with it.
- Do not move the content engine to an AI service without saying so on the page. The
  page currently states, as a published question and answer, that the content is not
  AI-generated.
- Do not add environment variables for services this phase does not call.

---

**No S0–S4 findings, because no backend code exists to find them in.**
Proceed to Station 5.
