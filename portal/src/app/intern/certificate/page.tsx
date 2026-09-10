import Link from "next/link";
import { requireIntern } from "@/lib/intern";
import { recordView } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { InternShell } from "@/components/intern/InternShell";
import { EmptyState } from "@/components/EmptyState";
import { PrintButton } from "@/components/portal/PrintButton";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default async function CertificatePage() {
  const { userId, readOnly } = await requireIntern();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening the certificate.");

  // The embed names its foreign key. intern_profiles reaches profiles twice --
  // once as the intern, once as the mentor -- and an unqualified profiles(...)
  // is ambiguous, which PostgREST answers with PGRST201 rather than a guess.
  // Unqualified, this query failed and the certificate printed "Not recorded"
  // where the intern's name belongs.
  const { data: profile, error: profileError } = await client.from("intern_profiles")
    .select("id, track, starts_at, ends_at, status, profiles!intern_profiles_user_id_fkey(full_name)")
    .eq("user_id", userId).maybeSingle();

  const { data: certificate, error: certificateError } = await client.from("intern_certificates")
    .select("serial, issued_on, tools, mentor_name")
    .maybeSingle();

  // A certificate is shown to employers. Printing one with a placeholder where
  // the holder's name belongs is worse than not printing it, so a failure to
  // read either record stops the page instead of degrading quietly.
  if (profileError) throw new Error("Your internship record could not be read, so the certificate cannot be shown.");
  if (certificateError) throw new Error("Your certificate could not be read. Try again in a moment.");

  const holder = (profile?.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "Not recorded";
  const track = String(profile?.track ?? "").replace("intern_", "");

  // Specification 8.1: the button exists only once the founder has approved
  // issue. Until a certificate row exists there is nothing to show, and the
  // page says what is still outstanding rather than dangling a locked button.
  if (!certificate) {
    return (
      <InternShell readOnly={readOnly}>
        <div className="pagehead"><div><p className="eyebrow">Internship / Certificate</p><h1>Your certificate.</h1></div></div>
        <section className="panel">
          <EmptyState icon="file" title="Not issued yet"
            body="A certificate is issued after your internship is complete, your mentor has confirmed it, and the founder has approved it. It appears here the moment that happens — there is nothing for you to apply for."
            note="Your dates and your work log are what the review looks at." />
        </section>
      </InternShell>
    );
  }

  // Recorded only once there is a certificate to look at, and carrying the
  // serial rather than the holder's details. Saving it as a PDF happens in the
  // browser's own print dialog, which the page cannot observe, so opening it
  // is the honest moment to record.
  await recordView("certificate.view", "intern_certificate", null, { serial: certificate.serial });

  return (
    <InternShell readOnly={readOnly}>
      <div className="pagehead invoice-actions">
        <div><p className="eyebrow">Internship / {certificate.serial}</p><h1>Your certificate.</h1></div>
        <PrintButton />
      </div>

      <article className="invoicedoc certificatedoc panel">
        <header>
          <div>
            <b>MUCO LABS</b>
            <span>Erode, Tamil Nadu, India</span>
          </div>
          <div className="invoicedoc-ref">
            <span className="eyebrow">Certificate</span>
            <b>{certificate.serial}</b>
          </div>
        </header>

        <div className="certificatedoc-body">
          <p className="eyebrow">This certifies that</p>
          <h2>{holder}</h2>
          <p>
            completed a supervised {track} internship at MUCO LABS from{" "}
            {profile ? formatDate(profile.starts_at) : "—"} to {profile ? formatDate(profile.ends_at) : "—"},
            carrying out the work assigned during that period.
          </p>
          {certificate.tools?.length > 0 && (
            <p><b>Tools used:</b> {certificate.tools.join(", ")}</p>
          )}
          {certificate.mentor_name && <p><b>Mentor:</b> {certificate.mentor_name}</p>}
        </div>

        <footer>
          <p><b>Srinivash Mahalingam</b><br />Founder and Chairman, MUCO LABS</p>
          <p className="invoicedoc-note">
            Issued {formatDate(certificate.issued_on)}. This document is not an employment offer.
            It can be checked at mucolabs.com/verify/{certificate.serial}.
          </p>
        </footer>
      </article>

      <p className="invoicedoc-back"><Link href="/intern">Back to your internship</Link></p>
    </InternShell>
  );
}
