"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { daysFromToday, formatDate, formatMoney, today } from "@muco/core";
import { Icon, StatusPill } from "@muco/ui";

export type Invoice = {
  id: string;
  number: string;
  amount: number;
  status: string;
  issued_on: string | null;
  due_on: string | null;
};

/**
 * Raising an invoice.
 *
 * The studio bills 50% on start and 50% on completion, as published, so those
 * two are offered as buttons rather than left as arithmetic somebody does in
 * their head against a budget on another screen. A free amount stays, because
 * published terms are the common case and not the only one.
 *
 * It is created as a draft. The customer's Billing page shows every invoice
 * with its status, so an invoice that leaves the studio does so because
 * somebody marked it sent.
 */
export function Invoices({
  projectId,
  customerId,
  organizationId,
  invoices,
  budget,
  nextNumber,
  canEdit,
}: {
  projectId: string;
  customerId: string | null;
  organizationId: string;
  invoices: Invoice[];
  budget: number | null;
  nextNumber: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [number, setNumber] = useState(nextNumber);
  const [amount, setAmount] = useState("");
  const [dueOn, setDueOn] = useState(() => daysFromToday(14));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const half = budget ? Math.round(budget / 2) : null;
  const billed = invoices
    .filter(row => row.status !== "void")
    .reduce((total, row) => total + Number(row.amount ?? 0), 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!customerId) {
      setError("An invoice needs a customer. This project has none, so it cannot be billed.");
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError("Not connected to the database.");
      return;
    }

    const { error: failure } = await supabase.from("invoices").insert({
      organization_id: organizationId,
      customer_id: customerId,
      project_id: projectId,
      number: number.trim(),
      amount: Number(amount),
      status: "draft",
      issued_on: today(),
      due_on: dueOn || null,
    });

    setBusy(false);
    if (failure) {
      setError(
        failure.message.toLowerCase().includes("duplicate")
          ? "That invoice number already exists. Change it and try again."
          : failure.message,
      );
      return;
    }
    setAmount("");
    setAdding(false);
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    setBusy(true);
    const supabase = createClient();
    if (supabase) {
      await supabase.from("invoices").update({
        status,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      }).eq("id", id);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      {invoices.length === 0 ? (
        <div className="empty">
          <span className="mark"><Icon name="receipt" size={22} /></span>
          <b>None raised</b>
          <p>The customer sees every invoice here on their own Billing page, with its status.</p>
        </div>
      ) : (
        <div className="list">
          {invoices.map(invoice => (
            <div className="item" key={invoice.id}>
              <span className="item-main">
                <b className="mono">{invoice.number}</b>
                <small>
                  {invoice.issued_on ? "Issued " + formatDate(invoice.issued_on) : "Not issued"}
                  {invoice.due_on ? " · due " + formatDate(invoice.due_on) : ""}
                </small>
              </span>
              <span className="tabular">{formatMoney(invoice.amount)}</span>
              <StatusPill value={invoice.status} />
              {canEdit ? (
                <select value={invoice.status} disabled={busy} style={{ width: "auto" }}
                  aria-label={"Status of invoice " + invoice.number}
                  onChange={event => setStatus(invoice.id, event.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="viewed">Viewed</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="void">Void</option>
                </select>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {canEdit ? (
        <div className="panel-body">
          {adding ? (
            <form className="stack" onSubmit={submit}>
              {half ? (
                <div className="cluster">
                  <span className="label">Published terms</span>
                  <button type="button" className="chip" onClick={() => setAmount(String(half))}>
                    50% on start, {formatMoney(half)}
                  </button>
                  <button type="button" className="chip" onClick={() => setAmount(String((budget ?? 0) - billed))}>
                    Balance, {formatMoney((budget ?? 0) - billed)}
                  </button>
                </div>
              ) : (
                <p className="hint">
                  This project has no budget recorded, so there is nothing to halve. Enter the
                  amount directly.
                </p>
              )}

              <div className="grid-2">
                <div className="field">
                  <label htmlFor="i-number">Invoice number</label>
                  <input id="i-number" type="text" value={number}
                    onChange={event => setNumber(event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="i-amount">Amount (INR)</label>
                  <input id="i-amount" type="number" min="0" step="100" value={amount}
                    onChange={event => setAmount(event.target.value)} required />
                </div>
              </div>

              <div className="field">
                <label htmlFor="i-due">Due</label>
                <input id="i-due" type="date" value={dueOn}
                  onChange={event => setDueOn(event.target.value)} />
              </div>

              {error ? <p className="errortext" role="alert">{error}</p> : null}

              <p className="notice">
                <Icon name="info" size={14} />
                <span>
                  It is created as a draft. The customer sees it once you mark it sent, so nothing
                  leaves the studio by accident.
                </span>
              </p>

              <div className="cluster">
                <button className="btn sm primary" type="submit" disabled={busy || !amount || !number.trim()}>
                  {busy ? "Raising" : "Raise invoice"}
                </button>
                <button className="btn sm quiet" type="button" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn sm" type="button" onClick={() => setAdding(true)} disabled={!customerId}>
              <Icon name="plus" size={14} />
              <span>{customerId ? "Raise an invoice" : "No customer to bill"}</span>
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
