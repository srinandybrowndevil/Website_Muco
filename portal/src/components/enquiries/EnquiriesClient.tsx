"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import {
  statusLabel,
  statusOrder,
  statusTone,
  type WebsiteEnquiry,
  type WebsiteEnquiryStatus,
} from "@/lib/enquiries";
import { Icon } from "@/components/Icon";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Search({
  value,
  onChange,
  label = "Search enquiries…",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const id = `search-${label.replace(/\W/g, "").toLowerCase()}`;
  return (
    <label className="searchbox" htmlFor={id}>
      <Icon name="search" />
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        type="search"
      />
    </label>
  );
}

export function EnquiriesClient({
  enquiries,
  isConfigured,
  error,
}: {
  enquiries: WebsiteEnquiry[];
  isConfigured: boolean;
  error: string | null;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<WebsiteEnquiryStatus | "All">("All");
  const [items, setItems] = useState(enquiries);
  useEffect(() => {
    // Reconcile fresh server data after a realtime refresh; keep search/filter state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(enquiries);
  }, [enquiries]);
  const [busy, setBusy] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // "Cleared" only counts when the filter is one of the states that mean
  // "still needs me". Filtering to Closed and finding none is not an
  // achievement, it just means nothing has been closed.
  const openStatuses: WebsiteEnquiryStatus[] = ["new", "contacted", "qualified"];
  const cleared = items.length > 0 && !q.trim()
    && statusFilter !== "All" && openStatuses.includes(statusFilter);

  const filtered = useMemo(() => {
    return items.filter((e) => {
      const matchesStatus = statusFilter === "All" || e.status === statusFilter;
      const text = `${e.name} ${e.business ?? ""} ${e.email ?? ""} ${e.service ?? ""}`.toLowerCase();
      const matchesQ = text.includes(q.trim().toLowerCase());
      return matchesStatus && matchesQ;
    });
  }, [items, q, statusFilter]);

  async function updateStatus(id: string, status: WebsiteEnquiryStatus) {
    if (!isConfigured) return;
    setBusy(id);
    setUpdateError(null);
    const supabase = createClient();
    if (!supabase) {
      setUpdateError("Supabase is not configured.");
      setBusy(null);
      return;
    }
    const { error: updateError } = await supabase
      .from("website_enquiries")
      .update({ status })
      .eq("id", id);
    setBusy(null);
    if (updateError) {
      setUpdateError(updateError.message);
    } else {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    }
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <p className="eyebrow">Workspace / ENQUIRIES</p>
          <h1>Website enquiries.</h1>
          <p>Submissions from the public contact form and their status.</p>
        </div>
      </div>

      {(error || updateError) && (
        <div className="panel error" role="alert">
          {error || updateError}
        </div>
      )}

      <div className="toolbar">
        <Search value={q} onChange={setQ} label="Search enquiries…" />
        <div className="tabs" role="tablist" aria-label="Filter by status">
          {(["All", ...statusOrder] as const).map((s) => (
            <button
              key={s}
              className={statusFilter === s ? "selected" : ""}
              onClick={() => setStatusFilter(s)}
              role="tab"
              aria-selected={statusFilter === s}
              type="button"
            >
              {s === "All" ? s : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {!isConfigured && enquiries.length > 0 && (
        <p className="demopill" aria-live="polite">
          Preview mode — data is not saved.
        </p>
      )}

      {filtered.length === 0 && !error && (
        <div className="panel">
          {/* Three different empties, and they should not read the same.
              Never had one is onboarding. Filtered to nothing is a dead end
              unless it offers the way back. Cleared every open enquiry is an
              achievement, and worth saying so. */}
          {items.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="No enquiries yet"
              body={isConfigured
                ? "Contact actions on mucolabs.com now run through portal sign-in, so most enquiries arrive as project requests instead. Anything captured outside that flow shows up here."
                : "Connect Supabase and real enquiries will appear here instead of this placeholder."}
              action={isConfigured ? { label: "Open project requests", href: "/requests" } : undefined}
            />
          ) : cleared ? (
            <EmptyState
              celebrate
              icon="check"
              title="Inbox zero."
              body={`Every one of the ${items.length} ${items.length === 1 ? "enquiry" : "enquiries"} here has been handled. Nothing is waiting on you.`}
              action={{ label: "Show all enquiries", onClick: () => setStatusFilter("All") }}
              secondary={{ label: "Open project requests", href: "/requests" }}
            />
          ) : (
            <EmptyState
              compact
              icon="search"
              title="Nothing matches these filters"
              body={`You have ${items.length} ${items.length === 1 ? "enquiry" : "enquiries"} in total, but none match${q.trim() ? ` “${q.trim()}”` : ""}${statusFilter !== "All" ? ` in ${statusLabel[statusFilter]}` : ""}.`}
              action={{ label: "Clear filters", onClick: () => { setQ(""); setStatusFilter("All"); } }}
            />
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="tablewrap">
          <table>
            <caption className="visually-hidden">Website enquiries</caption>
            <thead>
              <tr>
                <th scope="col">Name / Business</th>
                <th scope="col">Service</th>
                <th scope="col">Submitted</th>
                <th scope="col">Channel</th>
                <th scope="col">Status</th>
                <th scope="col" className="visually-hidden">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/enquiries/${e.id}`}>
                      <b>{e.name}</b>
                    </Link>
                    {e.business ? <small>{e.business}</small> : null}
                  </td>
                  <td>{e.service ?? "—"}</td>
                  <td>{formatDate(e.created_at)}</td>
                  <td>{e.channel ?? "—"}</td>
                  <td>
                    <em className={`status ${statusTone(e.status)}`}>
                      {statusLabel[e.status]}
                    </em>
                  </td>
                  <td>
                    <div className="statusactions">
                      {statusOrder.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={e.status === s ? "selected" : ""}
                          disabled={busy === e.id || !isConfigured}
                          onClick={() => updateStatus(e.id, s)}
                          title={`Mark as ${statusLabel[s]}`}
                        >
                          {statusLabel[s]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
