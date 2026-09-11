"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

export function RevokeGrant({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function revoke() {
    setBusy(true);
    const supabase = createClient();
    if (supabase) await supabase.from("project_grants").delete().eq("id", id);
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button className="btn sm quiet" type="button" onClick={() => setConfirming(true)}
        aria-label={"Revoke " + label}>
        <Icon name="x" size={14} />
        <span>Revoke</span>
      </button>
    );
  }

  return (
    <span className="cluster">
      <button className="btn sm danger" type="button" onClick={revoke} disabled={busy}>
        {busy ? "Revoking" : "Revoke now"}
      </button>
      <button className="btn sm quiet" type="button" onClick={() => setConfirming(false)}>Keep</button>
    </span>
  );
}
