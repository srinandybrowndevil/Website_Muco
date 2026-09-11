import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate } from "@muco/core";
import { Avatar, Callout, EmptyState, Icon } from "@muco/ui";
import { loadCustomer } from "@/lib/project";
import { InviteColleague } from "@/components/InviteColleague";
import { RemoveColleague } from "@/components/RemoveColleague";

export const metadata: Metadata = { title: "People" };

const LEVELS: Record<string, string> = {
  owner: "Owner — can invite and remove people",
  manager: "Manager — can see the project and raise requests",
  viewer: "Viewer — can see the project",
};

// Who from your side can open this workspace.
//
// Only an owner may change that list, and the check is in the database rather
// than in this page: invite_client_colleague and remove_client_colleague both
// look up the caller's own membership and refuse anybody who is not the owner
// of the organisation they are acting on. This page hides the controls from a
// viewer as a courtesy, not as the boundary.
export default async function PeoplePage() {
  const { supabase, userId } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);
  if (!customer) return <div className="page"><EmptyState icon="building" title="Your organisation is not linked yet" /></div>;

  const { data: members } = await supabase
    .from("customer_members")
    .select("user_id,level,created_at,profiles(full_name)")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: true });

  const rows = (members ?? []).map(row => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      userId: row.user_id,
      level: row.level as string,
      since: row.created_at as string,
      name: (profile as { full_name?: string } | null)?.full_name ?? "Invited person",
    };
  });

  const me = rows.find(row => row.userId === userId);
  const isOwner = me?.level === "owner";

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">{customer.company || customer.name}</span>
        <h1>People</h1>
        <p className="lede">
          Who from your side can open this workspace. Everybody here sees the same project, the same
          files and the same invoices — there is no partial view, so add only people you would show
          all of it to.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>With access</h2>
          <span className="hint">{rows.length} of 10</span>
        </div>
        <div className="list">
          {rows.map(row => (
            <div className="item" key={row.userId}>
              <Avatar name={row.name} size="sm" />
              <span className="item-main">
                <b>
                  {row.name}
                  {row.userId === userId ? <span className="badge" style={{ marginLeft: 8 }}>You</span> : null}
                </b>
                <small>{LEVELS[row.level] ?? row.level} · since {formatDate(row.since)}</small>
              </span>
              {isOwner && row.level !== "owner" ? (
                <RemoveColleague userId={row.userId} name={row.name.split(" ")[0]} />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {isOwner ? (
        <section className="panel">
          <div className="panel-head"><h2>Add somebody</h2></div>
          <div className="panel-body">
            <InviteColleague />
          </div>
        </section>
      ) : (
        <Callout tone="info" icon="lock" title="Only the owner can change this list">
          {rows.find(row => row.level === "owner")?.name ?? "The owner"} added you. If somebody else
          from your side needs access, ask them — or ask the studio on the support page.
        </Callout>
      )}

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          Ownership cannot be handed over from here. If the person who set this up has left, tell
          the studio and it is moved properly, with a record of who asked.
        </span>
      </p>
    </div>
  );
}
