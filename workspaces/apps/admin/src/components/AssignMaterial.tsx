"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * Giving an existing piece of material to somebody who does not have it.
 *
 * Only people who do not already have it are offered, because assigning twice
 * either fails on a constraint or produces a duplicate row that shows up as the
 * same article listed twice in the intern's workspace. Neither is a useful
 * thing for a founder to discover afterwards.
 */
export function AssignMaterial({
  materialId,
  organizationId,
  interns,
  alreadyGiven,
}: {
  materialId: string;
  organizationId: string;
  interns: { id: string; name: string; track: string }[];
  alreadyGiven: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = interns.filter(intern => !alreadyGiven.includes(intern.id));

  async function give(internId: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected.");
      return;
    }
    const { error: failure } = await supabase.from("learning_assignments").insert({
      organization_id: organizationId,
      material_id: materialId,
      intern_id: internId,
    });
    setBusy(false);
    if (failure) {
      setError(failure.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (remaining.length === 0) {
    return <span className="hint">Everybody has it</span>;
  }

  if (!open) {
    return (
      <button className="btn sm" type="button" onClick={() => setOpen(true)}>
        <Icon name="userPlus" size={14} />
        <span>Assign</span>
      </button>
    );
  }

  return (
    <span className="stack-sm" style={{ flexBasis: "100%" }}>
      {error ? <span className="errortext">{error}</span> : null}
      <span className="cluster">
        {remaining.map(intern => (
          <button key={intern.id} type="button" className="chip" disabled={busy}
            onClick={() => give(intern.id)}>
            <Icon name="plus" size={12} />
            <span>{intern.name}</span>
          </button>
        ))}
        <button className="btn sm quiet" type="button" onClick={() => setOpen(false)}>Done</button>
      </span>
    </span>
  );
}
