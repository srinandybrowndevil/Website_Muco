import Link from "next/link";
import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { daysUntil, formatDate, humanise } from "@muco/core";
import { Callout, Dial, EmptyState, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = { title: "Home" };

function one<T>(value: unknown): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

// What an intern needs on opening this: how long is left, who their mentor is,
// what they are supposed to be doing today, and whether the certificate has
// unlocked. Four answers, one screen, no navigation required to get them.
export default async function InternHome() {
  const { supabase, userId, organizationId, fullName } = await requireAccount("intern");

  const { data: internship } = await supabase
    .from("intern_profiles")
    .select("id,track,tier,starts_at,ends_at,status,college,mentor_id,mentor_recommended_at")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!internship) {
    return (
      <div className="page">
        <EmptyState icon="calendar" title="Your internship record is not set up yet">
          Your account exists but no internship has been attached to it. The studio has to set your
          track and your dates before this workspace can show you anything.
        </EmptyState>
      </div>
    );
  }

  const [mentor, tasks, issued, unread] = await Promise.all([
    internship.mentor_id
      ? supabase.from("profiles").select("full_name").eq("id", internship.mentor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("tasks")
      .select("id,title,status,due_at,projects(name)")
      .eq("assignee_id", userId).eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false }).limit(4),
    supabase.from("intern_certificates").select("serial,issued_on").eq("intern_id", internship.id).maybeSingle(),
    supabase.from("learning_assignments").select("id", { count: "exact", head: true })
      .eq("intern_id", internship.id).is("completed_at", null),
  ]);

  const total = Math.max(
    1,
    Math.round((Date.parse(internship.ends_at) - Date.parse(internship.starts_at)) / 86_400_000),
  );
  const left = Math.max(0, daysUntil(internship.ends_at) ?? 0);
  const firstName = (fullName ?? "").split(" ")[0];
  const mentorName = one<{ full_name: string }>(mentor?.data)?.full_name;
  const certificate = issued.data;

  return (
    <div className="page">
      <section className="panel internhero">
        <Dial value={left} total={total} unit={left === 1 ? "day" : "days"} caption="until your end date" />
        <div className="stack-sm">
          <h1>{firstName ? "Welcome back, " + firstName : "Welcome back"}</h1>
          <p>
            Your internship runs from {formatDate(internship.starts_at)} to{" "}
            {formatDate(internship.ends_at)}. Access becomes read-only after that date.
            {mentorName ? " Your mentor is " + mentorName + "." : " No mentor has been assigned yet."}
          </p>
          <div className="cluster">
            <StatusPill value={internship.status} />
            <span className="badge">{humanise(internship.track).replace("Intern ", "")}</span>
            <span className="badge">{internship.tier.toUpperCase().replace("M", "")} month</span>
          </div>
        </div>
      </section>

      {certificate ? (
        <Callout tone="ok" icon="award" title="Your certificate is ready">
          Serial {certificate.serial}, issued {formatDate(certificate.issued_on)}.{" "}
          <Link href="/certificate">Open it</Link> — anyone can check it is genuine from the serial,
          without an account.
        </Callout>
      ) : internship.status === "completed" ? (
        <Callout tone="warn" icon="clock" title="Waiting on the founder">
          Your internship is marked complete
          {internship.mentor_recommended_at ? " and your mentor has recommended you" : ""}. The
          certificate unlocks when the founder approves it.
        </Callout>
      ) : null}

      <section className="panel" aria-labelledby="today">
        <div className="panel-head">
          <h2 id="today">What is assigned to you</h2>
          <Link className="btn sm quiet" href="/tasks">
            <span>All tasks</span>
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>
        {(tasks.data ?? []).length === 0 ? (
          <EmptyState icon="list" title="Nothing is assigned right now">
            Only tasks assigned to you appear here. If you are waiting on work, message your mentor —
            the Help page has the right way to reach them.
          </EmptyState>
        ) : (
          <div className="list">
            {(tasks.data ?? []).map(task => (
              <Link className="item" href="/tasks" key={task.id}>
                <span className="item-main">
                  <b>{task.title}</b>
                  <small>
                    {one<{ name: string }>(task.projects)?.name ?? "No project"}
                    {task.due_at ? " · due " + formatDate(task.due_at) : ""}
                  </small>
                </span>
                <Icon name="chevronRight" size={15} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid-2">
        <Link className="panel linkcard" href="/log">
          <div className="panel-body stack-sm">
            <div className="split">
              <b>Today&rsquo;s work log</b>
              <span className="linkcard-go"><Icon name="arrowRight" size={16} /></span>
            </div>
            <p className="hint">
              A few lines about what you did. The attendance percentage your certificate depends on
              is counted from these, so a missed day is a missed day.
            </p>
          </div>
        </Link>

        <Link className="panel linkcard" href="/learning">
          <div className="panel-body stack-sm">
            <div className="split">
              <b>Learning</b>
              <span className="linkcard-go"><Icon name="arrowRight" size={16} /></span>
            </div>
            <p className="hint">
              {(unread.count ?? 0) > 0
                ? (unread.count ?? 0) + " item" + ((unread.count ?? 0) === 1 ? "" : "s") + " assigned to you and not yet marked read."
                : "Everything assigned to you is marked read."}
            </p>
          </div>
        </Link>
      </section>

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          You can see only the work assigned to you. Customer contact details, invoices and other
          clients&rsquo; source code are not part of an internship here.
        </span>
      </p>
    </div>
  );
}
