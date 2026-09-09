import { requireIntern } from "@/lib/intern";
import { InternShell } from "@/components/intern/InternShell";
import { EmptyState } from "@/components/EmptyState";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function InternHome() {
  const { access, readOnly } = await requireIntern();

  return (
    <InternShell readOnly={readOnly}>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Internship</p>
          <h1>Your internship.</h1>
          <p>
            {readOnly
              ? `Your internship ended on ${formatDate(access.ends_at)}. This workspace is read-only now.`
              : `Your internship ends on ${formatDate(access.ends_at)}. Access becomes read-only after that date.`}
          </p>
        </div>
        {!readOnly && (
          <span className="daysleft" aria-label={`${access.days_left} days remaining`}>
            <b>{access.days_left}</b>
            <small>{access.days_left === 1 ? "day left" : "days left"}</small>
          </span>
        )}
      </div>

      <section className="panel">
        <EmptyState
          icon="check"
          title="Nothing assigned yet"
          body="Your mentor assigns work here. Until then there is nothing you need to do — your dates and your certificate status are on this page and stay accurate on their own."
          note="You can see only the work assigned to you. Customer details, invoices and other projects are not part of an internship."
        />
      </section>
    </InternShell>
  );
}
