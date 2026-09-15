import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { isLocalPreview } from "./preview-mode";
import { PREVIEW_ORG, PREVIEW_USERS, seedPreview, type PreviewRow, type PreviewStore } from "./preview-data";
import { createPreviewClient, type PreviewOperation, type PreviewResult } from "./preview-client";
import type { WorkspaceKey } from "./workspaces";

const ok = (data: unknown, count?: number): PreviewResult => ({ data, error: null, ...(count === undefined ? {} : { count }) });
const fail = (message: string): PreviewResult => ({ data: null, error: { message } });
function directory() {
  // All four apps use one explicitly configured, ignored local store.
  if (!isLocalPreview || !process.env.MUCO_PREVIEW_DIR) throw new Error("Local preview is not enabled.");
  return resolve(process.env.MUCO_PREVIEW_DIR);
}

function withStore<T>(edit: boolean, callback: (store: PreviewStore) => T): T {
  const dir = directory();
  mkdirSync(dir, { recursive: true });
  const lock = resolve(dir, "store.lock");
  const deadline = Date.now() + 3000;
  let descriptor: number;
  while (true) {
    try { descriptor = openSync(lock, "wx"); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || Date.now() > deadline) throw new Error("The local sample store is busy. Try again.");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try {
    const filename = resolve(dir, "store.json");
    const fresh = !existsSync(filename);
    const store: PreviewStore = fresh ? seedPreview() : JSON.parse(readFileSync(filename, "utf8"));
    if (store.version !== 1) throw new Error("Reset the local sample data before continuing.");
    const result = callback(store);
    if (edit || fresh) {
      const temp = resolve(dir, `store-${process.pid}.tmp`);
      writeFileSync(temp, JSON.stringify(store), "utf8");
      renameSync(temp, filename);
    }
    return result;
  } finally { closeSync(descriptor); unlinkSync(lock); }
}

function columns(value: string): string[] {
  const parts: string[] = []; let level = 0, start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") level++;
    if (value[i] === ")") level--;
    if (value[i] === "," && level === 0) { parts.push(value.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(value.slice(start).trim()); return parts;
}

function projectRow(row: PreviewRow, selection: string, store: PreviewStore): PreviewRow {
  if (selection === "*") return { ...row };
  const result: PreviewRow = {};
  for (const col of columns(selection)) {
    const open = col.indexOf("(");
    if (open < 0) { result[col] = row[col] ?? null; continue; }
    const relationship = col.slice(0, open).split("!")[0];
    const [alias, target] = relationship.includes(":") ? relationship.split(":") : [relationship, relationship];
    const foreignKeys: Record<string, string> = { profiles: "user_id", projects: "project_id", customers: "customer_id", intern_profiles: "intern_id", learning_materials: "material_id" };
    const fk = target === "profiles" ? row.user_id ?? row.assignee_id ?? row.actor_id : row[foreignKeys[target]];
    const related = store.tables[target]?.find(item => item.id === fk);
    result[alias] = related ? projectRow(related, col.slice(open + 1, -1), store) : null;
  }
  return result;
}

function matches(row: PreviewRow, filters: PreviewOperation["filters"]): boolean {
  return (filters ?? []).every(([key, op, expected]) => {
    const actual = row[key] ?? null;
    switch (op) {
      case "eq": case "is": return actual === expected;
      case "neq": case "not.is": return actual !== expected;
      case "in": return Array.isArray(expected) && expected.includes(actual);
      case "gte": return actual !== null && String(actual) >= String(expected);
      case "lte": return actual !== null && String(actual) <= String(expected);
      case "gt": return actual !== null && String(actual) > String(expected);
      case "lt": return actual !== null && String(actual) < String(expected);
      default: throw new Error(`The ${op} filter is not available in local preview.`);
    }
  });
}

function audit(store: PreviewStore, workspace: WorkspaceKey, resource: string) {
  store.tables.audit_events.unshift({ id: randomUUID(), organization_id: PREVIEW_ORG, actor_id: PREVIEW_USERS[workspace], actor_email: `${workspace}@example.test`, action: "preview.updated", resource_type: resource, resource_id: null, detail: { sample: true }, occurred_at: new Date().toISOString() });
}

function rpc(store: PreviewStore, name: string, args: PreviewRow, workspace: WorkspaceKey): PreviewResult {
  const now = new Date().toISOString();
  if (name === "intern_access") {
    const intern = store.tables.intern_profiles.find(row => row.user_id === args.p_user);
    const days = intern ? Math.ceil((Date.parse(String(intern.ends_at)) - Date.now()) / 86400000) : null;
    const state = !intern ? "closed" : Date.parse(String(intern.starts_at)) > Date.now() ? "not_started" : days !== null && days >= 0 && intern.status === "active" ? "active" : "closed";
    return ok([{ state, days_left: days }]);
  }
  if (name === "intern_attendance") {
    const count = new Set(store.tables.intern_work_logs.filter(row => row.intern_id === args.p_intern).map(row => row.logged_on)).size;
    return ok([{ days_logged: count, working_days: 16, percent: Math.min(100, Math.round(count / 16 * 100)) }]);
  }
  if (name === "get_website_analytics_summary") return ok({ period_days: args.p_days ?? 30, enquiries_total: store.tables.website_enquiries.length, enquiries_new_7d: store.tables.website_enquiries.length, page_views: 0, cta_clicks: 0, contact_clicks: 0, signup_clicks: 0, lead_submits: 0, top_paths: [], source_breakdown: {}, utm_breakdown: [], recent_events: [] });
  if (name === "record_audit_event") { audit(store, workspace, String(args.p_resource_type ?? "workspace")); return ok(null); }
  if (name === "verify_certificate") {
    const certificate = store.tables.intern_certificates.find(row => row.serial === args.p_serial);
    if (!certificate) return ok([]);
    const intern = store.tables.intern_profiles.find(row => row.id === certificate.intern_id);
    const person = store.tables.profiles.find(row => row.id === intern?.user_id);
    return ok([{ ...certificate, holder: `${person?.full_name ?? "Sample intern"} · SAMPLE ONLY`, track: intern?.track, starts_at: intern?.starts_at, ends_at: intern?.ends_at, status: "sample" }]);
  }
  if (name === "convert_request" || name === "convert_website_enquiry") {
    if (workspace !== "admin") return fail("admin required");
    const isRequest = name === "convert_request";
    const source = store.tables[isRequest ? "project_requests" : "website_enquiries"].find(row => row.id === (isRequest ? args.p_request_id : args.p_enquiry_id));
    if (!source) return fail("This sample record no longer exists.");
    if (!isRequest && source.converted_lead_id) return ok({ lead_id: source.converted_lead_id, already_converted: true });
    if (source.converted_at) return fail("This sample has already been converted.");
    if (isRequest && source.status !== "accepted") return fail("Accept the sample request before creating its project.");
    const leadId = randomUUID();
    const customer = store.tables.customers.find(row => row.id === source.customer_id);
    store.tables.leads.unshift({ id: leadId, organization_id: PREVIEW_ORG, name: source.name ?? customer?.name, company: source.business ?? customer?.company, email: source.email ?? customer?.email, source: isRequest ? "customer request" : `website ${source.channel || "form"}`, stage: "new", estimated_value: 0, created_at: now });
    if (isRequest) {
      const id = randomUUID();
      store.tables.projects.push({ id, organization_id: PREVIEW_ORG, customer_id: source.customer_id, name: source.title, description: String(source.requirements ?? source.problem ?? "").slice(0, 500), status: "planning", kind: "client", budget: null, progress: 0, created_at: now });
      source.converted_project_id = id;
    } else source.status = "converted";
    source.converted_lead_id = leadId;
    source.converted_at = now; audit(store, workspace, isRequest ? "project_requests" : "website_enquiries");
    return ok(isRequest ? { lead_id: leadId, project_id: source.converted_project_id } : { lead_id: leadId, already_converted: false });
  }
  if (name === "issue_certificate") {
    const intern = store.tables.intern_profiles.find(row => row.id === args.p_intern_id);
    if (!intern || intern.status !== "completed" || !intern.mentor_recommended_at) return fail("Complete and recommend the sample internship first.");
    if (store.tables.intern_certificates.some(row => row.intern_id === args.p_intern_id)) return fail("A sample certificate already exists.");
    store.tables.intern_certificates.push({ id: randomUUID(), organization_id: PREVIEW_ORG, intern_id: args.p_intern_id, serial: `SAMPLE-${Date.now()}`, issued_on: now.slice(0, 10), tools: args.p_tools ?? [], mentor_name: args.p_mentor_name, approved_by_name: "Sample only — not a valid credential", document_hash: "sample-not-a-real-certificate" });
    audit(store, workspace, "intern_certificates"); return ok(null);
  }
  // Invitations and account lifecycle require real authentication. Never fake a sent invitation.
  return fail("This action needs connected authentication and is unavailable in local preview. No email or invitation has been sent.");
}

export async function executePreview(workspace: WorkspaceKey, operation: PreviewOperation): Promise<PreviewResult> {
  if (!isLocalPreview) return fail("Local preview is disabled.");
  try {
    if (operation.storage) return storageOperation(operation);
    const isWrite = !!operation.rpc || (operation.action ?? "select") !== "select";
    return withStore(isWrite, store => {
      if (operation.rpc) return rpc(store, operation.rpc, operation.args ?? {}, workspace);
      const table = operation.table ?? "";
      const source = table === "granted_projects" ? store.tables.projects : store.tables[table];
      if (!source) return fail(`The ${table} table is not available in local preview.`);
      let rows = source.filter(row => matches(row, operation.filters));
      if (table === "granted_projects") rows = rows.filter(row => store.tables.project_grants.some(grant => grant.user_id === PREVIEW_USERS[workspace] && grant.project_id === row.id));
      const action = operation.action ?? "select";
      if (["insert", "upsert"].includes(action)) {
        const values = Array.isArray(operation.values) ? operation.values : [operation.values];
        const conflict = String(operation.options?.onConflict ?? "id").split(",");
        rows = values.map(value => {
          if (!value || typeof value !== "object") throw new Error("A sample record is required.");
          const existing = action === "upsert" ? source.find(row => conflict.every(key => value[key] !== undefined && row[key] === value[key])) : null;
          if (existing) { Object.assign(existing, value); return existing; }
          const created = { id: randomUUID(), organization_id: PREVIEW_ORG, created_at: new Date().toISOString(), ...value };
          source.push(created); return created;
        });
      } else if (action === "update") {
        if (!operation.filters?.length) return fail("Choose a sample record before updating.");
        rows.forEach(row => Object.assign(row, operation.values));
      } else if (action === "delete") {
        if (!operation.filters?.length) return fail("Choose a sample record before deleting.");
        store.tables[table] = source.filter(row => !rows.includes(row));
      } else if (action !== "select") return fail("This operation is unavailable in local preview.");
      if (action !== "select") audit(store, workspace, table);
      for (const [key, asc] of [...(operation.order ?? [])].reverse()) rows.sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, { numeric: true }) * (asc ? 1 : -1));
      const count = rows.length;
      if (operation.range) rows = rows.slice(operation.range[0], operation.range[1] + 1);
      if (operation.limit !== undefined) rows = rows.slice(0, operation.limit);
      const result = rows.map(row => projectRow(row, operation.columns ?? "*", store));
      return ok(operation.options?.head ? null : operation.single ? result[0] ?? null : result, count);
    });
  } catch (error) { return fail(error instanceof Error ? error.message : "The local sample action failed."); }
}

const storageFile = (bucket: string, path: string) => {
  const key = createHash("sha256").update(`${bucket}/${path}`).digest("hex");
  const dir = resolve(directory(), "files"); mkdirSync(dir, { recursive: true }); return resolve(dir, `${key}.json`);
};
function storageOperation(operation: PreviewOperation): PreviewResult {
  const bucket = operation.storage!;
  if (operation.action === "upload") {
    if (typeof operation.values !== "string" || operation.values.length > 36 * 1024 * 1024) return fail("Use a file under 25 MB.");
    writeFileSync(storageFile(bucket, operation.path ?? ""), JSON.stringify({ base64: operation.values, contentType: operation.contentType || "application/octet-stream" }));
    return ok({ path: operation.path });
  }
  if (operation.action === "remove" && Array.isArray(operation.values)) {
    for (const path of operation.values) { const file = storageFile(bucket, String(path)); if (existsSync(file)) unlinkSync(file); }
    return ok([]);
  }
  return fail("This local file action is unavailable.");
}

export function readPreviewFile(bucket: string, path: string): { bytes: Uint8Array; contentType: string } | null {
  if (!isLocalPreview) return null;
  if (["sample/project-brief.txt", "sample/engagement.txt"].includes(path)) return { bytes: Buffer.from("MUCO LABS LOCAL PREVIEW\n\nFictional sample document for reviewing files and handover. No agreement, payment or real customer data is contained in this file.\n"), contentType: "text/plain" };
  const file = storageFile(bucket, path);
  if (!existsSync(file)) return null;
  const stored = JSON.parse(readFileSync(file, "utf8"));
  return { bytes: Buffer.from(stored.base64, "base64"), contentType: stored.contentType };
}

export const previewServerClient = (workspace: WorkspaceKey) => createPreviewClient(workspace, operation => executePreview(workspace, operation));
export function workspaceFromPort(host: string | null): WorkspaceKey {
  const ports: Record<string, WorkspaceKey> = { "3101": "admin", "3102": "employee", "3103": "intern", "3104": "client" };
  return ports[host?.split(":").pop() ?? ""] ?? "client";
}
