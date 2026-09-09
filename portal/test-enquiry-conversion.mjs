import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("./supabase/migrations/20261019000000_website_enquiry_conversion.sql", import.meta.url), "utf8");
const fileSql = readFileSync(new URL("./supabase/migrations/20261020000000_customer_request_files.sql", import.meta.url), "utf8");

test("website enquiry conversion is admin-only and locked", () => {
  assert.match(sql, /for update;/i);
  assert.match(sql, /if v_role <> 'admin' then raise exception 'admin required'/i);
  assert.match(sql, /if v_enquiry\.converted_lead_id is not null/i);
});

test("conversion links the lead, marks the source enquiry, and records activity", () => {
  assert.match(sql, /returning id into v_lead_id/i);
  assert.match(sql, /set status = 'converted', converted_at = now\(\), converted_lead_id = v_lead_id/i);
  assert.match(sql, /'website_enquiry', p_enquiry_id,\s*'converted'/i);
});

test("request file failure cleanup is customer-scoped and retryable", () => {
  assert.match(fileSql, /delete_customer_request_after_file_failure/i);
  assert.match(fileSql, /c\.auth_user_id = v_user/i);
  assert.match(fileSql, /r\.status = 'new'/i);
  assert.match(fileSql, /r\.converted_at is null/i);
});
