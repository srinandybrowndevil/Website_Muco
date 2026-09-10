"use client";

import { WorkspaceLink as Link } from "@/components/WorkspaceHost";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  statusLabel,
  statusOrder,
  statusTone,
  type WebsiteEnquiry,
  type WebsiteEnquiryStatus,
} from "@/lib/enquiries";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function EnquiryDetailClient({
  enquiry,
  isConfigured,
  role,
}: {
  enquiry: WebsiteEnquiry;
  isConfigured: boolean;
  role: "admin" | "member" | null;
}) {
  const [item, setItem] = useState<WebsiteEnquiry>(enquiry);
  useEffect(() => {
    // Reconcile realtime server refreshes with the editable local row.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItem(enquiry);
  }, [enquiry]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversion, setConversion] = useState<{ lead_id: string; already_converted: boolean } | null>(
    item.converted_lead_id ? { lead_id: item.converted_lead_id, already_converted: true } : null
  );

  async function convertToLead() {
    if (!isConfigured || role !== "admin" || conversion) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setBusy(false);
      return;
    }
    const { data, error: conversionError } = await supabase.rpc("convert_website_enquiry", {
      p_enquiry_id: item.id,
    });
    setBusy(false);
    if (conversionError) {
      setError(conversionError.message);
      return;
    }
    const result = data as { lead_id?: string; already_converted?: boolean } | null;
    if (!result?.lead_id) {
      setError("The lead was not created. Please try again.");
      return;
    }
    setConversion({ lead_id: result.lead_id, already_converted: Boolean(result.already_converted) });
    setItem((prev) => ({
      ...prev,
      status: "converted",
      converted_at: prev.converted_at ?? new Date().toISOString(),
      converted_lead_id: result.lead_id,
    }));
  }

  async function updateStatus(status: WebsiteEnquiryStatus) {
    if (!isConfigured || role == null) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("website_enquiries")
      .update({ status })
      .eq("id", item.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setItem((prev) => ({ ...prev, status }));
    }
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <p className="eyebrow">
            <Link href="/admin/enquiries">Enquiries</Link> / {item.id.slice(0, 8)}
          </p>
          <h1>{item.name}</h1>
          <p>
            Submitted {formatDate(item.created_at)}
            {item.channel ? ` · ${item.channel}` : ""}
          </p>
        </div>
        <span className={`status ${statusTone(item.status)}`}>
          {statusLabel[item.status]}
        </span>
      </div>

      {error && (
        <div className="panel error" role="alert">
          {error}
        </div>
      )}

      <div className="requestdetailgrid">
        <section className="panel requestdetail">
          <h2>Details</h2>
          <dl className="requestmeta">
            <div>
              <dt>Business</dt>
              <dd>{item.business ?? "—"}</dd>
            </div>
            <div>
              <dt>Phone / WhatsApp</dt>
              <dd>{item.phone ?? "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{item.email ? <a href={`mailto:${item.email}`}>{item.email}</a> : "—"}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{item.location ?? "—"}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{item.service ?? "—"}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{item.budget ?? "—"}</dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>{item.timeline ?? "—"}</dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>
                {item.website ? (
                  <a href={item.website} target="_blank" rel="noopener noreferrer">
                    {item.website}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Submitted from</dt>
              <dd>{item.page ?? "—"}</dd>
            </div>
            <div>
              <dt>Referrer</dt>
              <dd>{item.referrer ?? "—"}</dd>
            </div>
            <div>
              <dt>Campaign</dt>
              <dd>
                {[item.utm_source, item.utm_medium, item.utm_campaign]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
          </dl>

          <h3>Message</h3>
          <p className="requesttext">{item.message}</p>
        </section>

        <aside className="panel requestactions">
          <h2>Actions</h2>
          <div className="actiongroup">
            <label id="status-label">Update status</label>
            <div className="statusactions" role="group" aria-labelledby="status-label">
              {statusOrder.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={item.status === status ? "selected" : ""}
                  disabled={busy || !isConfigured || role == null || (status === "converted" && !conversion)}
                  onClick={() => updateStatus(status)}
                >
                  {statusLabel[status]}
                </button>
              ))}
            </div>
          </div>

          {role === "admin" && !conversion && item.status !== "spam" && (
            <div className="actiongroup">
              <label>Sales pipeline</label>
              <button type="button" className="primary" disabled={busy || !isConfigured} onClick={convertToLead}>
                {busy ? "Converting…" : "Convert to lead"}
              </button>
              <p className="muted">Creates one linked lead and records the conversion.</p>
            </div>
          )}

          {conversion && (
            <div className="panel success conversion">
              <h3>{conversion.already_converted ? "Lead already linked" : "Converted successfully"}</h3>
              <p>Lead ID: <code>{conversion.lead_id.slice(0, 8)}</code></p>
              <Link href={`/admin/leads/${conversion.lead_id}`}>Open lead</Link>
            </div>
          )}

          {item.email && (
            <div className="actiongroup">
              <label>Reply</label>
              <a href={`mailto:${item.email}`} className="primary">
                Email {item.name}
              </a>
            </div>
          )}

          {item.phone && (
            <div className="actiongroup">
              <label>Call / WhatsApp</label>
              <p>{item.phone}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
