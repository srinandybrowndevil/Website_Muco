# Production repair — backend and hosting

The intake uses the existing project_requests schema and authenticated client permissions. No new production tables or privileged client keys are introduced. Existing converters lock the source record, require an administrator and accepted request, and atomically write links. The development adapter now matches planning status, source links, enquiry converted status and converter return contracts, and supports inclusive pagination with exact counts.

Writes require a returned row before the interface reports success. Customer request retry retains its UUID and reads that record before another insert. This protects against a lost response while the form remains open; resubmitting after closing the page is a new request.

Vercel inspection confirms all five workspace/legacy domains currently belong to the single portal project. That project points at the removed portal directory and also has static-site build/output overrides. A root edit alone cannot deploy four separate apps. Domain separation and a deployment containing the complete local source are release requirements. Database migration application and live identity flows are separate checks from a local preview build.
