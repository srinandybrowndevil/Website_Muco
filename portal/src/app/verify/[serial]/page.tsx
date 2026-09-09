import { createClient } from "@/lib/supabase/server";

// Public on purpose: an employer checking a certificate has no account here.
// verify_certificate() returns only the fields specification 8.2 permits --
// name, track, dates, issue date, status -- so no phone number, college or
// email can leak through a page that anyone can load.
export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

type Verified = {
  serial: string; holder: string; track: string;
  starts_at: string; ends_at: string; issued_on: string; status: string;
};

export default async function VerifyPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const client = await createClient();

  let record: Verified | null = null;
  let unavailable = false;
  if (client) {
    const { data, error } = await client
      .rpc("verify_certificate", { p_serial: decodeURIComponent(serial) })
      .maybeSingle<Verified>();
    // A lookup failure is not the same as "no such certificate" and must not be
    // reported as one -- that would tell an employer a real certificate is fake.
    if (error) unavailable = true; else record = data;
  } else {
    unavailable = true;
  }

  return (
    <main className="page verifypage">
      <div className="panel">
        <p className="eyebrow">MUCO LABS · Certificate check</p>
        {unavailable ? (
          <>
            <h1>Check unavailable</h1>
            <p>This certificate could not be checked right now. That does not mean it is invalid — try again shortly, or email founder@mucolabs.com.</p>
          </>
        ) : record ? (
          <>
            <h1>Certificate {record.serial} is genuine.</h1>
            <dl className="verifylist">
              <div><dt>Holder</dt><dd>{record.holder}</dd></div>
              <div><dt>Track</dt><dd>{record.track} internship</dd></div>
              <div><dt>Period</dt><dd>{formatDate(record.starts_at)} — {formatDate(record.ends_at)}</dd></div>
              <div><dt>Issued</dt><dd>{formatDate(record.issued_on)}</dd></div>
            </dl>
            <p className="invoicedoc-note">
              MUCO LABS issued this certificate for a supervised internship. It is not an
              employment offer, and it does not state a grade or a salary.
            </p>
          </>
        ) : (
          <>
            <h1>No certificate with that number</h1>
            <p>
              Nothing was issued under <b>{decodeURIComponent(serial)}</b>. Check the number on
              the document, including its dashes. If it still does not match, email
              founder@mucolabs.com before relying on the document.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
