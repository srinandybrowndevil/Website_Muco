"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * Turning something that arrived into something the studio is doing.
 *
 * Both database functions behind this used to fail open. They read the
 * caller's role into a text variable and compared it with <>, and for a caller
 * holding no membership in that organisation the comparison is NULL rather
 * than true — so the exception never fired and the check waved through the one
 * caller it was never tested with. They now call is_org_admin, which returns
 * false rather than null for a non-member.
 *
 * Worth knowing while reading this component: the button is not the check.
 */
export function Convert({
  rpc,
  id,
  label,
  what,
}: {
  rpc: "convert_request" | "convert_website_enquiry";
  id: string;
  label: string;
  what: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function convert() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }
    const argument = rpc === "convert_request" ? { p_request_id: id } : { p_enquiry_id: id };
    const { error: failure } = await supabase.rpc(rpc, argument);
    setBusy(false);
    if (failure) {
      setError(
        failure.message.includes("admin required")
          ? "Only an administrator can convert " + what + "."
          : failure.message,
      );
      return;
    }
    router.refresh();
  }

  if (error) return <span className="errortext">{error}</span>;

  return (
    <button className="btn sm primary" type="button" onClick={convert} disabled={busy}>
      <Icon name="bolt" size={14} />
      <span>{busy ? "Converting" : label}</span>
    </button>
  );
}
