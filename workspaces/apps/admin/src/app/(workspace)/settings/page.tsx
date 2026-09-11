import type { Metadata } from "next";
import { requireAdmin } from "@muco/core/server";
import { Callout, Fact, Facts, Icon } from "@muco/ui";
import { WorkspaceSettings, type Settings } from "@/components/WorkspaceSettings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, organizationId } = await requireAdmin();

  const [settings, organization] = await Promise.all([
    supabase.from("organization_settings")
      .select("signature_path,letterhead_path,default_grace_days,attendance_threshold,support_email,handover_note")
      .eq("organization_id", organizationId).maybeSingle(),
    supabase.from("organizations").select("name,slug,created_at").eq("id", organizationId).maybeSingle(),
  ]);

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Administrators only</span>
        <h1>Settings</h1>
        <p className="lede">
          Five settings, and every one of them is read by a page somewhere. A setting nothing reads
          looks like configuration and changes nothing, which is worse than not having it.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Workspace</h2></div>
        <div className="panel-body">
          <Facts>
            <Fact label="Name">{organization.data?.name ?? "MUCO LABS"}</Fact>
            <Fact label="Slug" mono>{organization.data?.slug ?? "muco-labs"}</Fact>
            <Fact label="Identifier" mono>{organizationId.slice(0, 8)}</Fact>
          </Facts>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Rules other pages read</h2></div>
        <div className="panel-body">
          <WorkspaceSettings
            organizationId={organizationId}
            settings={(settings.data as Settings | null) ?? null}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>The four addresses</h2></div>
        <div className="panel-body stack">
          <Facts>
            <Fact label="Admin" mono>admin.mucolabs.com</Fact>
            <Fact label="Employee" mono>employee.mucolabs.com</Fact>
            <Fact label="Intern" mono>intern.mucolabs.com</Fact>
            <Fact label="Client" mono>client.mucolabs.com</Fact>
            <Fact label="Verification" mono>intern.mucolabs.com/verify/&lt;serial&gt;</Fact>
          </Facts>
          <p className="notice">
            <Icon name="info" size={14} />
            <span>
              portal.mucolabs.com is retired as a workspace and redirects to client.mucolabs.com,
              path intact. Existing links keep working; nothing needs updating in published
              material.
            </span>
          </p>
        </div>
      </section>

      <Callout tone="warn" icon="alert" title="Two things this page deliberately cannot do">
        It cannot delete the workspace, and it cannot transfer ownership of a customer. Both are
        rare, both are irreversible, and both should involve a conversation rather than a button
        somebody finds while looking for something else.
      </Callout>
    </div>
  );
}
