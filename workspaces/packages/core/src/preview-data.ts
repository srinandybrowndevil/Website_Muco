// Fictional records only. This module contains no customer data or credentials.
export type PreviewRow = Record<string, unknown>;
export type PreviewStore = { version: number; tables: Record<string, PreviewRow[]> };
export const previewId = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`;
export const PREVIEW_ORG = previewId(1);
export const PREVIEW_USERS = { admin: previewId(2), client: previewId(3), employee: previewId(4), intern: previewId(5) };

export function seedPreview(): PreviewStore {
  const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  const stamp = (offset: number) => `${day(offset)}T09:00:00.000Z`;
  const row = (n: number, values: PreviewRow): PreviewRow => ({ id: previewId(n), organization_id: PREVIEW_ORG, created_at: stamp(-10), ...values });
  const customer = previewId(10), project = previewId(20), internship = previewId(30);
  return { version: 1, tables: {
    organizations: [row(1, { name: "MUCO LABS · Local preview", slug: "muco-preview" })],
    organization_settings: [row(11, { support_email: "studio@example.test", attendance_threshold: 80, default_grace_days: 7, signature_path: null, letterhead_path: null, handover_note: "Sample handover: check scope, test on mobile, and confirm the launch checklist." })],
    profiles: [
      row(2, { full_name: "Studio Admin (Sample)", email: "admin@example.test", phone: null, avatar_url: null }),
      row(3, { full_name: "Kavin Demo", email: "customer@example.test", phone: null, avatar_url: null, linkedin_url: null, instagram_url: null }),
      row(4, { full_name: "Priya Demo", email: "employee@example.test", phone: null, avatar_url: null }),
      row(5, { full_name: "Arun Demo", email: "intern@example.test", phone: null, avatar_url: null }),
      row(6, { full_name: "Nila Demo", email: "alumni@example.test", phone: null, avatar_url: null }),
    ],
    memberships: [...Object.entries(PREVIEW_USERS).map(([role, user_id], i) => row(100 + i, { user_id, role, disabled_at: null, disabled_reason: null })), row(104, { user_id: previewId(6), role: "intern", disabled_at: null, disabled_reason: null })],
    customers: [row(10, { name: "Kavin Demo", company: "Sample Studio", email: "customer@example.test", phone: null, auth_user_id: PREVIEW_USERS.client, status: "active" })],
    customer_members: [row(12, { customer_id: customer, user_id: PREVIEW_USERS.client, level: "owner" })],
    projects: [row(20, { customer_id: customer, name: "Sample Studio website", description: "A fictional website project for reviewing the workspace. Scope: responsive website, accessible contact journey, and a launch checklist.", status: "active", kind: "client", budget: 60000, progress: 45, starts_on: day(-14), due_on: day(21), preview_url: "/api/preview?sample=project", staging_url: null, repo_url: null })],
    project_milestones: [
      row(21, { project_id: project, title: "Discovery and scope", detail: "Confirm the pages, content and project requirements.", status: "completed", due_on: day(-7), position: 0, completed_at: stamp(-7) }),
      row(22, { project_id: project, title: "Design review", detail: "Review desktop and mobile layouts together.", status: "active", due_on: day(4), position: 1, completed_at: null }),
      row(23, { project_id: project, title: "Build and handover", detail: "Complete accessibility checks and share launch instructions.", status: "planning", due_on: day(21), position: 2, completed_at: null }),
    ],
    tasks: [
      row(24, { project_id: project, assignee_id: PREVIEW_USERS.employee, title: "Review mobile navigation", description: "Check 320px, 390px and tablet widths. Make sure every link is reachable.", status: "open", priority: "high", due_at: stamp(2) }),
      row(25, { project_id: project, assignee_id: PREVIEW_USERS.intern, title: "Check form labels", description: "Tab through the sample contact journey and note unclear labels.", status: "open", priority: "normal", due_at: stamp(3) }),
      row(26, { project_id: project, assignee_id: PREVIEW_USERS.employee, title: "Confirm the project scope", description: "List the pages and acceptance checks.", status: "completed", priority: "normal", due_at: stamp(-3) }),
    ],
    project_grants: [PREVIEW_USERS.employee, PREVIEW_USERS.intern].flatMap((user_id, i) => ["tickets", "files", "staging", "scope"].map((module, j) => row(110 + i * 10 + j, { user_id, project_id: project, module, level: module === "tickets" ? "write" : "read", starts_at: stamp(-14), ends_at: stamp(i === 0 && j === 0 ? 5 : 35) }))),
    project_requests: [row(40, { customer_id: customer, title: "Add a mobile enquiry flow", service: "Website design and development", status: "new", problem: "We need a clear route from the website to the customer workspace on phones.", requirements: "Large tap targets, clear progress, editable customer details.", timeline: "Review next week", budget_range: "Quote required", website: null, reference: null, contact_preference: "Workspace", converted_at: null, converted_project_id: null })],
    website_enquiries: [row(41, { name: "Devika Demo", business: "Sample Workshop", email: "enquiry@example.test", phone: null, location: "Erode", service: "Custom software", budget: "Quote required", timeline: "Next month", message: "Sample enquiry: track incoming work and customer follow-up in one place.", website: null, page: "/contact", channel: "website", status: "new", referrer: null, utm_source: "local-preview", utm_medium: "demo", utm_campaign: "ui-review", converted_at: null, converted_lead_id: null })],
    leads: [row(42, { name: "Devika Demo", company: "Sample Workshop", email: "enquiry@example.test", source: "local-preview", stage: "new", estimated_value: 0, last_contact_at: null })],
    invoices: [row(43, { customer_id: customer, project_id: project, number: "SAMPLE-001", amount: 30000, status: "sent", issued_on: day(-4), due_on: day(10), paid_at: null })],
    files: [row(44, { customer_id: customer, project_id: project, name: "Sample project brief.txt", kind: "document", bucket: "crm-files", path: "sample/project-brief.txt", mime_type: "text/plain", size_bytes: 160 })],
    staff_profiles: [row(29, { user_id: PREVIEW_USERS.employee, roles: ["developer", "designer"], is_mentor: true, status: "active", started_on: day(-90), ended_on: null })],
    intern_profiles: [
      row(30, { user_id: PREVIEW_USERS.intern, track: "intern_frontend", tier: "m2", starts_at: stamp(-20), ends_at: stamp(40), status: "active", college: "Sample College", grace_days: 7, mentor_id: PREVIEW_USERS.employee, mentor_recommended_at: null, mentor_note: null }),
      row(31, { user_id: previewId(6), track: "intern_design", tier: "m1", starts_at: stamp(-35), ends_at: stamp(-5), status: "completed", college: "Sample College", grace_days: 7, mentor_id: PREVIEW_USERS.employee, mentor_recommended_at: stamp(-4), mentor_note: "Sample recommendation for reviewing the completion flow." }),
    ],
    intern_work_logs: [row(32, { intern_id: internship, user_id: PREVIEW_USERS.intern, logged_on: day(-1), summary: "Reviewed the responsive project pages and documented form labels.", hours: 5 })],
    intern_certificates: [row(33, { intern_id: previewId(31), serial: "SAMPLE-LOCAL-001", issued_on: day(-3), tools: ["Figma", "HTML", "CSS"], mentor_name: "Priya Demo", approved_by_name: "Sample only — not a valid credential", document_hash: "sample-not-a-real-certificate" })],
    learning_materials: [
      row(50, { title: "Accessible forms · Sample lesson", summary: "Read the sample checklist, then test labels, keyboard focus and helpful errors.", url: "/api/preview?sample=lesson", track: "intern_frontend", minutes: 25 }),
      row(51, { title: "Responsive layout review", summary: "Review wrapping, spacing and navigation at narrow screen widths.", url: "/api/preview?sample=lesson", track: "intern_design", minutes: 20 }),
    ],
    learning_assignments: [row(52, { material_id: previewId(50), intern_id: internship, assigned_at: stamp(-2), completed_at: null })],
    compensation: [row(60, { user_id: PREVIEW_USERS.employee, engagement: "retainer_monthly", amount: 30000, currency: "INR", cycle_label: "Monthly · Sample", status: "active", effective_from: day(-60), effective_to: null })],
    compensation_payments: [row(61, { compensation_id: previewId(60), amount: 30000, status: "pending", due_on: day(10), paid_on: null, reference: "Local sample; no payment will be made" })],
    person_documents: [row(62, { user_id: PREVIEW_USERS.employee, kind: "offer", label: "Sample engagement note", bucket: "people-documents", path: "sample/engagement.txt", mime_type: "text/plain", size_bytes: 160, uploaded_at: stamp(-10) })],
    audit_events: [row(70, { actor_id: PREVIEW_USERS.admin, actor_email: "admin@example.test", action: "preview.started", resource_type: "workspace", resource_id: null, detail: { sample: true }, occurred_at: stamp(0) })],
    audit_actions: [{ action: "preview.started", description: "Local sample data initialized" }, { action: "preview.updated", description: "Local sample record changed" }],
    invitations: [],
  } };
}
