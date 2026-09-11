"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "../Icon";

/**
 * Signing out ends the session on this origin only.
 *
 * The four workspaces hold four separate cookies, so somebody who is an admin
 * of the studio and also a customer of it stays signed in to the client
 * workspace after leaving the console. That is the correct behaviour for four
 * separate products, and it is worth stating because the single application
 * these replaced behaved the other way.
 */
export function SignOutButton({ label = "Sign out", className = "btn quiet sm" }: { label?: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" className={className} onClick={signOut} disabled={busy}>
      <Icon name="logout" size={15} />
      <span>{busy ? "Signing out" : label}</span>
    </button>
  );
}
