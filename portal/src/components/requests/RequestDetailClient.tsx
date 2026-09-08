"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  contactPreferenceLabel,
  formatDate,
  formatFileSize,
  requestStatusLabel,
  requestStatusOrder,
  requestStatusTone,
  type ProjectRequest,
} from "@/lib/requests";

type Props = {
  initialRequest: ProjectRequest;
  isConfigured: boolean;
  role: "admin" | "member" | null;
};

export function RequestDetailClient({ initialRequest, isConfigured, role }: Props) {
  const [request, setRequest] = useState<ProjectRequest>(initialRequest);
  useEffect(() => {
    // Reconcile realtime server refreshes with the editable local row.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRequest(initialRequest);
  }, [initialRequest]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversion, setConversion] = useState<{ lead_id: string; project_id: string } | null>(
    request.converted_lead_id && request.converted_project_id
      ? { lead_id: request.converted_lead_id, project_id: request.converted_project_id }
      : null
  );

  const customer = request.customers;
  const converted = Boolean(request.converted_at || conversion);

  async function updateStatus(status: ProjectRequest["status"]) {
    if (!isConfigured || role == null) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("project_requests")
      .update({ status })
      .eq("id", request.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setRequest((prev) => ({ ...prev, status }));
    }
  }

  async function convert() {
    if (!isConfigured || role !== "admin") return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) return;
    const { data, error: rpcError } = await supabase.rpc("convert_request", {
      p_request_id: request.id,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    const result = data as { lead_id: string; project_id: string } | null;
    if (result) {
      setConversion(result);
      setRequest((prev) => ({
        ...prev,
        status: "accepted",
        converted_at: new Date().toISOString(),
        converted_lead_id: result.lead_id,
        converted_project_id: result.project_id,
      }));
    }
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <p className="eyebrow">
            <Link href="/requests">Requests</Link> / {request.id.slice(0, 8)}
          </p>
          <h1>{request.title}</h1>
          <p>
            From {customer?.name ?? "—"}
            {customer?.company ? `, ${customer.company}` : ""} · Submitted {formatDate(request.created_at)}
          </p>
        </div>
        <span className={`status ${requestStatusTone(request.status)}`}>
          {requestStatusLabel[request.status]}
        </span>
      </div>

      <div className="requestdetailgrid">
        <section className="panel requestdetail">
          {error && (
            <div className="panel error" role="alert">
              {error}
            </div>
          )}

          <h2>Details</h2>
          <dl className="requestmeta">
            <div>
              <dt>Service</dt>
              <dd>{request.service ?? "—"}</dd>
            </div>
            <div>
              <dt>Budget range</dt>
              <dd>{request.budget_range ?? "—"}</dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>{request.timeline ?? "—"}</dd>
            </div>
            <div>
              <dt>Contact preference</dt>
              <dd>
                {request.contact_preference ? contactPreferenceLabel[request.contact_preference] : "—"}
              </dd>
            </div>
            <div>
              <dt>Website / reference</dt>
              <dd>{request.website ?? "—"}</dd>
            </div>
            <div>
              <dt>How they heard about us</dt>
              <dd>{request.reference ?? "—"}</dd>
            </div>
          </dl>

          <h3>Problem / goal</h3>
          <p className="requesttext">{request.problem ?? "—"}</p>

          {request.requirements && (
            <>
              <h3>Requirements / scope</h3>
              <p className="requesttext">{request.requirements}</p>
            </>
          )}

          {request.attachments.length > 0 && (
            <>
              <h3>Attachments</h3>
              <ul className="filepreview" aria-label="Request attachments">
                {request.attachments.map((a) => (
                  <li key={a.name}>
                    <span className="fileicon">
                      {a.name.split(".").pop()?.toUpperCase().slice(0, 3) ?? "FILE"}
                    </span>
                    <span>
                      <b>{a.name}</b>
                      <small>{formatFileSize(a.size)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className="panel requestactions">
          <h2>Actions</h2>

          <div className="actiongroup">
            <label id="status-label">Update status</label>
            <div className="statusactions" role="group" aria-labelledby="status-label">
              {requestStatusOrder.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={request.status === status ? "selected" : ""}
                  disabled={busy || !isConfigured || role == null}
                  onClick={() => updateStatus(status)}
                >
                  {requestStatusLabel[status]}
                </button>
              ))}
            </div>
          </div>

          {request.status === "accepted" && !converted && role === "admin" && (
            <div className="actiongroup">
              <label>Convert</label>
              <button
                type="button"
                className="primary"
                disabled={busy || !isConfigured}
                onClick={convert}
              >
                {busy ? "Converting…" : "Convert to lead & project"}
              </button>
            </div>
          )}

          {conversion && (
            <div className="panel success conversion">
              <h3>Converted successfully</h3>
              <p>
                Lead ID: <code>{conversion.lead_id.slice(0, 8)}</code>
              </p>
              <p>
                Project ID: <code>{conversion.project_id.slice(0, 8)}</code>
              </p>
            </div>
          )}

          <div className="actiongroup">
            <label>Customer contact</label>
            <p>{customer?.name ?? "—"}</p>
            {customer?.email && (
              <p>
                <a href={`mailto:${customer.email}`}>{customer.email}</a>
              </p>
            )}
            {customer?.phone && <p>{customer.phone}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
