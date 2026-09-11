import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { Callout, Fact, Facts, Icon } from "@muco/ui";

export const metadata: Metadata = { title: "Help" };

// Your mentor first, the studio inbox second, and the founder not at all.
//
// That order is deliberate and worth being explicit about: an intern who
// messages the founder on WhatsApp about a merge conflict has not done
// anything wrong, they were simply never told where the question belongs. A
// help page that lists every channel equally produces exactly that.
export default async function HelpPage() {
  const { supabase, userId, organizationId } = await requireAccount("intern");

  const { data: internship } = await supabase
    .from("intern_profiles").select("mentor_id")
    .eq("user_id", userId).eq("organization_id", organizationId).maybeSingle();

  const [mentor, settings] = await Promise.all([
    internship?.mentor_id
      ? supabase.from("profiles").select("full_name,phone").eq("id", internship.mentor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("organization_settings").select("support_email,handover_note")
      .eq("organization_id", organizationId).maybeSingle(),
  ]);

  const support = settings.data?.support_email ?? "founder@mucolabs.com";

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Getting unstuck</span>
        <h1>Help</h1>
        <p className="lede">
          Almost everything an internship throws at you is a question for your mentor. They know
          what you were assigned and why, which the studio inbox does not.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Your mentor</h2></div>
        <div className="panel-body stack">
          {mentor.data ? (
            <Facts>
              <Fact label="Name">{mentor.data.full_name ?? "Not recorded"}</Fact>
              <Fact label="Phone" mono>{mentor.data.phone ?? "Ask the studio for this"}</Fact>
            </Facts>
          ) : (
            <Callout tone="warn" title="No mentor has been assigned to you yet">
              Until one is, use the studio address below and say which track you are on.
            </Callout>
          )}
          <p className="hint">
            Ask early. A morning spent stuck is a morning that does not appear in your work log, and
            nobody here treats a question as a failure.
          </p>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <div className="panel-body stack-sm">
            <b>Something about your dates, your record or your certificate</b>
            <p className="hint">
              Those are set by the studio, not by your mentor. Write to the studio address and
              include your full name.
            </p>
            <div>
              <a className="btn sm" href={"mailto:" + support}>
                <Icon name="mail" size={14} />
                <span>{support}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-body stack-sm">
            <b>You cannot sign in, or something here looks broken</b>
            <p className="hint">
              Use the recovery link on the sign-in page first — it fixes most of it. If the page
              itself is wrong, say what you clicked and what happened.
            </p>
            <div>
              <a className="btn sm" href="/forgot-password">
                <Icon name="key" size={14} />
                <span>Recover your password</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Callout tone="info" icon="clock" title="When somebody will answer">
        The studio works Monday to Saturday, 9am to 7pm, from Erode. Outside those hours a message
        will wait, which is worth knowing before you sit staring at one.
      </Callout>

      {settings.data?.handover_note ? (
        <section className="panel">
          <div className="panel-head"><h2>From the studio</h2></div>
          <div className="panel-body">
            <p style={{ whiteSpace: "pre-wrap" }}>{settings.data.handover_note}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
