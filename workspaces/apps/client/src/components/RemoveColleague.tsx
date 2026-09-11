"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * Removing somebody's access.
 *
 * Two clicks rather than one, and the second one names the person. A single
 * destructive button beside a list of names is how the wrong row gets clicked,
 * and this particular mistake locks a colleague out of a project mid-week.
 */
export function RemoveColleague({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected.");
      return;
    }
    const { error: failure } = await supabase.rpc("remove_client_colleague", { p_user: userId });
    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (error) return <span className="errortext">{error}</span>;

  if (!confirming) {
    return (
      <button className="btn sm quiet" type="button" onClick={() => setConfirming(true)}>
        <Icon name="x" size={14} />
        <span>Remove</span>
      </button>
    );
  }

  return (
    <span className="cluster">
      <button className="btn sm danger" type="button" onClick={remove} disabled={busy}>
        {busy ? "Removing" : "Remove " + name}
      </button>
      <button className="btn sm quiet" type="button" onClick={() => setConfirming(false)}>Keep</button>
    </span>
  );
}
