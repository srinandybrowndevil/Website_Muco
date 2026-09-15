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
    try {
    const { data, error: failure } = await supabase.rpc(rpc, argument);
    if (failure) {
      setError(
        failure.message.includes("admin required")
          ? "Only an administrator can convert " + what + "."
          : failure.message,
      );
      return;
    }
    if (!data?.lead_id) { setError("The conversion was not confirmed. Refresh to check its status before retrying."); return; }
    router.refresh();
    } catch { setError("The connection was interrupted. Refresh to check whether it converted, then retry if needed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="stack-sm">
    <button className="btn sm primary" type="button" onClick={convert} disabled={busy}>
      <Icon name="bolt" size={14} />
      <span>{busy ? "Converting" : label}</span>
    </button>
    {error ? <span className="errortext" role="alert">{error}</span> : null}
    </div>
  );
}
