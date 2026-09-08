import { existsSync } from "node:fs";
import https from "node:https";
for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);
const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!origin || !key) {
  console.error("Supabase public configuration is missing. Copy .env.example to .env.local and fill both public values.");
  process.exit(1);
}
try { new URL(origin); } catch { console.error("Supabase URL is invalid."); process.exit(1); }
// Read-only requests: no personal records, privileged keys or writes.
async function check(path) {
  return new Promise((resolve, reject) => {
    const request = https.get(new URL(path, origin), { headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) } }, response => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    });
    request.setTimeout(15000, () => request.destroy(new Error("Connection timed out")));
    request.on("error", reject);
  });
}
for (const table of ["memberships", "invitations", "leads", "customers", "tasks", "projects", "proposals", "invoices", "files", "website_enquiries", "project_requests", "analytics_events"]) {
  try {
    const code = await check(`/rest/v1/${table}?select=id&limit=0`.replace("memberships?select=id", "memberships?select=organization_id"));
    console.log(`${table}: HTTP ${code}${code === 200 ? " (API reachable)" : " — check migrations / API key / grants"}`);
    if (code !== 200) process.exitCode = 1;
  } catch (error) { console.error(`Connection failed: ${error.code ?? error.message}`); process.exitCode = 1; break; }
}
console.log("This checks API reachability only. Complete the two-account access and realtime tests in DEPLOYMENT_GUIDE_TA.md.");
