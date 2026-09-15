# Production repair — frontend contract

Customer `/start-project` calls the existing authenticated `project_requests` insert with organization/customer identifiers, status `new`, title, service, problem, optional requirements, budget_range, timeline, website, reference and contact_preference. Request identifiers are generated before submission and reused after uncertain failures; retries first check for that same identifier to prevent duplicate inserts. Successful writes return an id before displaying success. Existing row-level permissions remain authoritative.

Admin `/pipeline/[id]` reads the lead within the current organization and updates stage, estimated_value and last_contact_at using the authenticated database client. Require an actual returned id, not merely absence of an error. Members permitted by existing database policy may edit sales records; conversion remains admin-only.

Pipeline uses exact count and inclusive ranges of 30 rows, with deterministic created_at/id ordering. Metrics explicitly describe visible rows. Extend the local adapter with inclusive range support and SQL-equivalent conversion return fields/statuses. This adapter remains development-only and is not a security test.

No new production schema is required for these UI fields. Validate existing migration application separately. Database, network, permission and missing-record errors must preserve a recovery action without claiming success.
