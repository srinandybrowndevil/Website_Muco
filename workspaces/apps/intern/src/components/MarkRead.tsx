"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * Marking a piece of learning material as read.
 *
 * Deliberately reversible. A tick that cannot be unticked makes people
 * reluctant to tick anything, and nothing here depends on the number being
 * true — it is for the intern to keep their own place, not for the studio to
 * measure them.
 */
export function MarkRead({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    if (supabase) {
      await supabase
        .from("learning_assignments")
        .update({ completed_at: done ? null : new Date().toISOString() })
        .eq("id", id);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      className={done ? "btn sm" : "btn sm primary"}
      onClick={toggle}
      disabled={busy}
      aria-pressed={done}
    >
      <Icon name={done ? "checkCircle" : "circle"} size={14} />
      <span>{done ? "Read" : "Mark read"}</span>
    </button>
  );
}
