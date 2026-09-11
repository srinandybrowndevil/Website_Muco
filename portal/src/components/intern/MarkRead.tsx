"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// The one write an intern has over their own reading list. Everything else
// about an assignment -- which material, to whom -- belongs to the studio.
export function MarkRead({ assignmentId, completedAt }: { assignmentId: string; completedAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    const client = createClient();
    if (!client) { setError("This workspace is not configured for sign-in."); return; }

    setBusy(true);
    const { error: failed } = await client.from("learning_assignments")
      .update({ completed_at: completedAt ? null : new Date().toISOString() })
      .eq("id", assignmentId);
    setBusy(false);

    if (failed) { setError(failed.message); return; }
    router.refresh();
  }

  return (
    <>
      <button type="button" className="secondary compact" disabled={busy} onClick={toggle}>
        {busy ? "Saving…" : completedAt ? "Mark unread" : "Mark read"}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}
