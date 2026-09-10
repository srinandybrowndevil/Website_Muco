import { WorkspaceLink as Link } from "@/components/WorkspaceHost";
import { requireIntern } from "@/lib/intern";
import { recordView } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { InternShell } from "@/components/intern/InternShell";
import { EmptyState } from "@/components/EmptyState";
import { PrintButton } from "@/components/portal/PrintButton";
import { readSettings } from "@/lib/settings";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default async function CertificatePage() {
  const { userId, readOnly, organizationId } = await requireIntern();
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

  // Checklist 2.12: the signature belongs to the template, not to whoever
  // happens to print it. It lives in the private files bucket, so the page
  // asks for a short-lived signed link rather than making the image public --
  // a founder signature on an open URL is a founder signature anybody can put
  // on anything. A missing or unreadable file falls back to the typed name
  // below, which is what this page has always shown.
  const settings = await readSettings(organizationId);
  const signature = settings.signaturePath
    ? (await client.storage.from("crm-files").createSignedUrl(settings.signaturePath, 300)).data?.signedUrl ?? null
    : null;

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
          <p className="signatureblock">
            {/* A signed storage URL expires in minutes, which the image
                optimizer would cache past its own lifetime and then fail to
                re-fetch, so this stays a plain img. */}
            {signature && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="signature" src={signature} alt="" width={180} height={60} />
            )}
            <b>Srinivash Mahalingam</b><br />Founder and Chairman, MUCO LABS
          </p>
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
