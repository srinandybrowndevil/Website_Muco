"use client";

import { FormEvent, useState } from "react";
import { Icon } from "./Icon";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Member" | "Client";
  status: "Active" | "Pending";
};

const initial: Member[] = [
  { id: "m-1", name: "Srinivash Mahalingam", email: "srinivash@mucolabs.com", role: "Admin", status: "Active" },
  { id: "m-2", name: "Yuvan Raj", email: "yuvan@mucolabs.com", role: "Member", status: "Active" },
  { id: "m-3", name: "Keerthi Krishnan", email: "keerthi@mucolabs.com", role: "Member", status: "Pending" },
  { id: "m-4", name: "Anitha Ramesh", email: "anitha@srisakthi.demo.local", role: "Client", status: "Active" },
];

export function TeamSettings() {
  const [members, setMembers] = useState<Member[]>(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Admin" | "Member" | "Client">("Member");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setSending(true);
    setTimeout(() => {
      setMembers((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          name: email.split("@")[0],
          email: email.trim().toLowerCase(),
          role,
          status: "Pending",
        },
      ]);
      setSending(false);
      setSent(true);
      setEmail("");
      setTimeout(() => setSent(false), 3000);
    }, 600);
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <p className="eyebrow">Workspace / Team</p>
          <h1>Team & invitations</h1>
          <p>Manage who can access this workspace and their current status.</p>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panelhead">
          <h2>Invite a member</h2>
        </div>
        <form onSubmit={submit} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ flex: 1, minWidth: 240 }}>
            <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
              Email address
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.in"
              style={{
                width: "100%",
                height: 40,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                padding: "0 12px",
              }}
            />
          </label>
          <label>
            <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Member["role"])}
              style={{
                height: 40,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                padding: "0 12px",
              }}
            >
              <option value="Admin">Admin</option>
              <option value="Member">Member</option>
              <option value="Client">Client</option>
            </select>
          </label>
          <button className="primary" type="submit" disabled={sending}>
            <Icon name="plus" />
            {sending ? "Sending…" : "Send invite"}
          </button>
        </form>
        {sent && (
          <p style={{ marginTop: 14, fontSize: 12, color: "var(--green)" }}>
            Demo: invitation queued. In production, Supabase sends an email link.
          </p>
        )}
      </section>

      <div className="tablewrap">
        <table>
          <caption className="visually-hidden">Workspace members and invitations</caption>
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <span className="avatar">{m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
                  <span>
                    <b>{m.name}</b>
                    <small>{m.email}</small>
                  </span>
                </td>
                <td>{m.role}</td>
                <td>
                  <em className={`status ${m.status.toLowerCase()}`}>{m.status}</em>
                </td>
                <td>
                  <button
                    className="secondary compact"
                    type="button"
                    onClick={() =>
                      setMembers((prev) => prev.filter((x) => x.id !== m.id))
                    }
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
