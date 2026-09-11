"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";

const NEXT: [string, string][] = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["closed", "Closed"],
  ["spam", "Spam"],
];

/**
 * Moving an enquiry along.
 *
 * "converted" is missing from the list on purpose. That status is set by the
 * conversion function, in the same transaction that creates the lead, and a
 * dropdown that can set it by hand produces an enquiry marked converted with
 * no lead behind it.
 */
export function EnquiryStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(value: string) {
    setBusy(true);
    const supabase = createClient();
    if (supabase) {
      await supabase.from("website_enquiries").update({ status: value }).eq("id", id);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <label className="cluster">
      <span className="label">Status</span>
      <select value={status} disabled={busy} onChange={event => change(event.target.value)}
        style={{ width: "auto" }}>
        {NEXT.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}
