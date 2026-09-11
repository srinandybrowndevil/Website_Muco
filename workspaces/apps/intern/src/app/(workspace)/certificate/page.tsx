import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, formatDateLong, humanise } from "@muco/core";
import { Callout, EmptyState, Fact, Facts, Icon } from "@muco/ui";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = { title: "Certificate" };

const MONTHS: Record<string, string> = { m1: "one month", m2: "two months", m3: "three months" };

// Locked or issued. There is no third state, and the locked one says exactly
// what has to happen next rather than "not available" — an intern who has
// finished and cannot see why is an intern who emails the founder.
export default async function CertificatePage() {
  const { supabase, userId, organizationId, fullName } = await requireAccount("intern");

  const { data: internship } = await supabase
    .from("intern_profiles")
    .select("id,track,tier,starts_at,ends_at,status,mentor_recommended_at")
    .eq("user_id", userId).eq("organization_id", organizationId).maybeSingle();

  if (!internship) {
    return (
      <div className="page">
        <EmptyState icon="award" title="No internship record yet" />
      </div>
    );
  }

  const { data: certificate } = await supabase
    .from("intern_certificates")
    .select("serial,issued_on,tools,mentor_name,approved_by_name,document_hash")
    .eq("intern_id", internship.id).maybeSingle();

  if (!certificate) {
    const finished = internship.status === "completed";
    return (
      <div className="page">
        <div className="page-head">
          <span className="eyebrow">Not yet</span>
          <h1>Certificate</h1>
        </div>
        <Callout tone={finished ? "warn" : "info"} icon="lock"
          title={finished ? "Waiting on the founder" : "Your internship is still running"}>
          {finished
            ? internship.mentor_recommended_at
              ? "Your mentor has recommended your completion. The certificate unlocks when the founder approves it."
              : "Your mentor has not recommended your completion yet. That comes first, then the founder approves."
            : "Your certificate unlocks when the founder approves your completion, which happens after your end date of " +
              formatDate(internship.ends_at) + "."}
        </Callout>
        <p className="notice">
          <Icon name="info" size={14} />
          <span>
            Nothing you do on this page brings that forward. Keeping your work log current is what
            the approval is based on.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="split">
          <div className="stack-sm">
            <span className="eyebrow">Issued {formatDate(certificate.issued_on)}</span>
            <h1>Certificate</h1>
          </div>
          <PrintButton />
        </div>
        <p className="lede">
          Yours to keep. Anybody can confirm it is genuine from the serial alone, without an account
          and without contacting the studio.
        </p>
      </div>

      <section className="panel raised certificate">
        <div className="panel-body stack-lg">
          <div className="stack-sm" style={{ textAlign: "center" }}>
            <span className="eyebrow">MUCO LABS · Erode, Tamil Nadu</span>
            <h2 className="certname">{fullName ?? "Intern"}</h2>
            <p>
              completed a {MONTHS[internship.tier] ?? internship.tier} internship in{" "}
              {humanise(internship.track).replace("Intern ", "").toLowerCase()}, from{" "}
              {formatDateLong(internship.starts_at)} to {formatDateLong(internship.ends_at)}.
            </p>
          </div>

          <Facts>
            <Fact label="Serial" mono>{certificate.serial}</Fact>
            <Fact label="Issued on">{formatDateLong(certificate.issued_on)}</Fact>
            <Fact label="Mentor">{certificate.mentor_name ?? "Not recorded"}</Fact>
            <Fact label="Approved by">{certificate.approved_by_name}</Fact>
          </Facts>

          {(certificate.tools ?? []).length > 0 ? (
            <div className="stack-sm">
              <span className="label">Tools used</span>
              <div className="cluster">
                {(certificate.tools ?? []).map((tool: string) => (
                  <span className="badge" key={tool}>{tool}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="card-foot">
          Verify at intern.mucolabs.com/verify/{certificate.serial}
          {certificate.document_hash ? " · hash " + certificate.document_hash.slice(0, 12) : ""}
        </div>
      </section>

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          The verification page shows your name, track, dates and status — nothing else. It does not
          reveal your email address, your college or your work.
        </span>
      </p>
    </div>
  );
}
