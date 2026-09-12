import type { Metadata } from "next";
import { createServerSupabase } from "@muco/core/server";
import { formatDateLong, humanise, isLocalPreview } from "@muco/core";
import { Callout, Fact, Facts, Icon, StatusPill } from "@muco/ui";

export const metadata: Metadata = {
  title: "Verify a certificate",
  robots: { index: false, follow: false },
};

// Deliberately public. An employer checking a certificate has no account here
// and should not need one — a verification page that requires a login verifies
// nothing, because the only people who can reach it are the people who already
// know.
//
// What makes that safe is the function behind it. verify_certificate takes a
// serial and returns exactly seven columns: serial, holder, track, dates,
// issued date and status. It cannot be made to return an email address, a
// college, a mentor or a work log, because it does not select them. The serial
// is not guessable, and guessing one would disclose only what the holder was
// already handing out on paper.
export default async function VerifyPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const supabase = await createServerSupabase();
  const { data } = supabase
    ? await supabase.rpc("verify_certificate", { p_serial: decodeURIComponent(serial) })
    : { data: null };

  const record = (Array.isArray(data) ? data[0] : data) as {
    serial: string; holder: string; track: string;
    starts_at: string; ends_at: string; issued_on: string; status: string;
  } | null;

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-head">
        <span className="eyebrow">MUCO LABS · Erode, Tamil Nadu</span>
        <h1>Certificate verification</h1>
      </div>

      {!record ? (
        <Callout tone="bad" icon="xCircle" title="No certificate with that serial">
          Check the serial against the document — they look like MUCO-INT-2026-0001. If it matches
          and this page still says no, the certificate did not come from MUCO LABS.
        </Callout>
      ) : (
        <>
          <Callout tone={isLocalPreview ? "info" : "ok"} icon="checkCircle" title={isLocalPreview ? "Sample certificate preview" : "This certificate is genuine"}>
            {isLocalPreview ? "This fictional record is for reviewing the layout. It is not a valid certificate or evidence of an internship." : "It was issued by MUCO LABS and the record below is the one held in the studio’s system right now."}
          </Callout>

          <section className="panel">
            <div className="panel-body">
              <Facts>
                <Fact label="Serial" mono>{record.serial}</Fact>
                <Fact label="Holder">{record.holder}</Fact>
                <Fact label="Track">{humanise(record.track).replace("Intern ", "")}</Fact>
                <Fact label="From">{formatDateLong(record.starts_at)}</Fact>
                <Fact label="To">{formatDateLong(record.ends_at)}</Fact>
                <Fact label="Issued">{formatDateLong(record.issued_on)}</Fact>
                <Fact label="Status"><StatusPill value={record.status} /></Fact>
              </Facts>
            </div>
          </section>
        </>
      )}

      <p className="notice">
        <Icon name="shield" size={14} />
        <span>
          This page shows the holder&rsquo;s name, track, dates and status, and nothing else. No
          contact details, college or work are disclosed by a verification.
        </span>
      </p>
    </div>
  );
}
