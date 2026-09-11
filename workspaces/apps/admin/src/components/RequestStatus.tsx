"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";

// "accepted" is here because convert_request refuses a request that is not
// accepted -- accepting is the decision, converting is what follows it. The
// two are separate on purpose: a founder can accept something today and open
// the project when the scope is written.
const CHOICES: [string, string][] = [
  ["new", "New"],
  ["reviewing", "Reviewing"],
  ["needs_info", "Needs information"],
  ["accepted", "Accepted"],
  ["declined", "Declined"],
];

export function RequestStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(value: string) {
    setBusy(true);
    const supabase = createClient();
    if (supabase) await supabase.from("project_requests").update({ status: value }).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <label className="cluster">
      <span className="label">Status</span>
      <select value={status} disabled={busy} onChange={event => change(event.target.value)}
        style={{ width: "auto" }}>
        {CHOICES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}
