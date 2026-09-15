"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";

export function RecordStatus({ id, status, table, choices }: { id: string; status: string;
  table: "project_requests" | "website_enquiries"; choices: [string, string][];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function change(value: string) {
    setBusy(true); setError("");
    try {
      const client = createClient();
      if (!client) throw new Error("Not connected.");
      const { data, error: failure } = await client.from(table).update({ status: value }).eq("id", id).select("id").single();
      if (failure || !data) throw failure ?? new Error("No record was updated.");
      router.refresh();
    } catch { setError("The status was not confirmed as saved. Refresh to check it, then choose a status to retry."); }
    finally { setBusy(false); }
  }
  return <div className="stack-sm"><label className="cluster" htmlFor={`status-${id}`}><span className="label">Status</span>
    <select id={`status-${id}`} value={status} disabled={busy} onChange={event => void change(event.target.value)} style={{ width: "auto", maxWidth: "100%" }}>
      {choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>{error ? <p role="alert" className="errortext">{error}</p> : null}</div>;
}
