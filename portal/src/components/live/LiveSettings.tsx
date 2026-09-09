"use client";
import { FormEvent, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/use-live-query";
import { EmptyState } from "../EmptyState";
import { CrmRow, label } from "@/lib/crm";

export function LiveSettings({ organizationId, role, automation = false }: { organizationId: string; role: string; automation?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const load = useCallback(async () => {
    const client = createClient()!;
    if (automation) {
      const result = await client.from("automations").select("*").eq("organization_id", organizationId).eq("trigger_type", "lead_created_followup");
      if (result.error) throw new Error(result.error.message);
      return { rules: (result.data ?? []) as CrmRow[], members: [] as { user_id: string; role: string; profiles: { full_name: string | null } | null }[], invitations: [] as CrmRow[] };
    }
    const [members, invitations] = await Promise.all([
      client.from("memberships").select("user_id,role,profiles(full_name)").eq("organization_id", organizationId),
      role === "admin" ? client.from("invitations").select("id,email,role,expires_at,accepted_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    ]);
    if (members.error) throw new Error(members.error.message);
    if (invitations.error) throw new Error(invitations.error.message);
    return { rules: [] as CrmRow[], members: (members.data ?? []) as unknown as { user_id: string; role: string; profiles: { full_name: string | null } | null }[], invitations: (invitations.data ?? []) as CrmRow[] };
  }, [organizationId, role, automation]);
  const state = useLiveQuery(automation ? "automations" : "memberships,invitations", load, organizationId);
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setInviteUrl("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const { data, error } = await createClient()!.rpc("create_invitation", { invite_organization_id: organizationId, invite_email: String(values.get("email")).trim(), invite_role: values.get("role") });
      if (error) throw new Error(error.message);
      setInviteUrl(`${window.location.origin}/accept-invite?token=${encodeURIComponent(String(data))}`); form.reset(); await state.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create invitation."); }
    finally { setBusy(false); }
  }
  async function toggle() {
    setBusy(true); setError(null);
    const rule = state.data?.rules[0];
    try {
      const client = createClient()!;
      const result = rule ? await client.from("automations").update({ enabled: !rule.enabled }).eq("id", rule.id).eq("organization_id", organizationId).select("id").single()
        : await client.from("automations").insert({ organization_id: organizationId, name: "New lead follow-up", trigger_type: "lead_created_followup", enabled: true }).select("id").single();
      if (result.error) throw new Error(result.error.message);
      await state.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save automation."); }
    finally { setBusy(false); }
  }
  return <div className="page"><div className="pagehead"><div><p className="eyebrow">Workspace / {automation ? "Automation" : "Team"}</p><h1>{automation ? "Follow-up automation" : "Team & invitations"}</h1><p>{automation ? "Create a next-day follow-up task when a lead is added." : "Actual workspace members and secure invitation links."}</p></div></div>
    {(error || state.error) && <p role="alert" className="error">{error || state.error}</p>}{state.loading && !state.data && <p role="status">Loading…</p>}
    {automation ? <div className="panel"><h2>New lead → follow-up task</h2><p>The task is created once, when a new lead is saved. Existing leads are not changed. This rule does not send messages.</p><button className="primary" disabled={busy || role !== "admin" || state.loading || !!state.error} onClick={() => void toggle()}>{busy ? "Saving…" : !state.data ? "Checking rule…" : state.data.rules[0]?.enabled ? "Disable rule" : "Enable rule"}</button>{role !== "admin" && <p>Only an administrator can change rules.</p>}</div> : <>
      {role === "admin" && <form onSubmit={invite} className="panel record-fields"><label>Email<input name="email" type="email" required /></label><label>Role<select name="role"><option value="member">Member</option><option value="admin">Admin</option></select></label><button className="primary" disabled={busy}>{busy ? "Creating…" : "Create invitation link"}</button></form>}
      {inviteUrl && <div className="panel"><p role="status">Invitation created. Share this private link with the invited person. No email has been sent.</p><label>Invitation link<input readOnly value={inviteUrl} onFocus={e => e.currentTarget.select()} /></label></div>}
      <section className="panel"><h2>Workspace members</h2>{state.data?.members.map(member => <div className="portalf" key={member.user_id}><b>{member.profiles?.full_name || "Unnamed member"}</b><span>{label(member.role)}</span></div>)}{state.data && !state.data.members.length && <EmptyState compact icon="users" title="No members listed" body="Everyone with access to this workspace appears here with their role. If this stays empty, the membership query is being blocked rather than returning nobody." />}</section>
      {role === "admin" && <section className="panel"><h2>Recent invitations</h2>{state.data?.invitations.map(invite => <div className="portalf" key={invite.id}><b>{String(invite.email)}</b><span>{invite.accepted_at ? "Accepted" : new Date(String(invite.expires_at)) < new Date() ? "Expired" : "Pending"} · {label(invite.role)}</span></div>)}{!state.data?.invitations.length && <EmptyState compact icon="mail" title="No invitations sent" body="Invite a teammate and their pending, accepted and expired invitations are listed here." />}</section>}
    </>}
  </div>;
}
