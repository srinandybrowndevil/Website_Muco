"use client";

import { useMemo, useState } from "react";
import { WorkspaceLink as Link } from "@/components/WorkspaceHost";
import { customers, documents, leads, money, projects, tasks as seedTasks } from "@/lib/data";
import { Icon } from "./Icon";

const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

const titles: Record<string, [string, string]> = {
  leads: ["Leads pipeline", "Track enquiries from first contact to signed scope."],
  customers: ["Customers", "Active accounts, health and lifetime value in one view."],
  tasks: ["Follow-ups", "What needs your attention next."],
  projects: ["Projects", "Delivery timeline, risk and progress at a glance."],
  proposals: ["Proposals", "Scopes sent, viewed and accepted."],
  invoices: ["Invoices", "GST-aware invoices and payment status."],
  files: ["Files", "One secure home for client deliverables."],
  reports: ["Reports", "The signal behind your pipeline."],
  automation: ["Automation", "Put routine work on autopilot."],
};

const demoAction = () => alert("Demo mode: connect Supabase to create records.");

function Head({ section, action = "Create new" }: { section: string; action?: string }) {
  const t = titles[section];
  return (
    <div className="pagehead">
      <div>
        <p className="eyebrow">Workspace / {section.toUpperCase()}</p>
        <h1>{t[0]}</h1>
        <p>{t[1]}</p>
      </div>
      <button className="primary" onClick={demoAction} type="button">
        <Icon name="plus" />
        {action}
      </button>
    </div>
  );
}

function Search({
  value,
  onChange,
  label = "Search records…",
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

function formatLakhs(value: number) {
  const lakhs = value / 100000;
  return `₹${lakhs.toFixed(1)}L`;
}

export function Dashboard() {
  const pipelineByStage = [
    { stage: "New", count: 6, value: 715000 },
    { stage: "Qualified", count: 4, value: 1100000 },
    { stage: "Proposal", count: 3, value: 840000 },
    { stage: "Negotiation", count: 2, value: 560000 },
  ];

  return (
    <div className="page">
      <div className="pagehead dashboardhead">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>Studio overview.</h1>
          <p>Here&apos;s what deserves attention today.</p>
        </div>
        <button className="primary" onClick={demoAction} type="button">
          <Icon name="plus" />
          Quick add
        </button>
      </div>
      <section className="metrics" aria-label="Key metrics">
        <article>
          <span>Pipeline value</span>
          <b>{money(2450000)}</b>
          <small className="up">12.4% this month</small>
        </article>
        <article>
          <span>Active projects</span>
          <b>4</b>
          <small>2 milestones this week</small>
        </article>
        <article>
          <span>Outstanding</span>
          <b>{money(325000)}</b>
          <small className="warn">1 invoice overdue</small>
        </article>
        <article>
          <span>Win rate</span>
          <b>64%</b>
          <small className="up">8% vs last quarter</small>
        </article>
      </section>
      <div className="dashgrid">
        <section className="panel pipeline">
          <div className="panelhead">
            <div>
              <p className="eyebrow">Pipeline</p>
              <h2>Opportunity flow</h2>
            </div>
            <Link href="/admin/leads">View pipeline →</Link>
          </div>
          <div className="funnel">
            {pipelineByStage.map((s, i) => (
              <div key={s.stage}>
                <i style={{ width: `${[88, 70, 51, 35][i]}%` }} />
                <span>
                  {s.stage} <b>{s.count}</b>
                </span>
                <em>{formatLakhs(s.value)}</em>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panelhead">
            <div>
              <p className="eyebrow">Today</p>
              <h2>Focus list</h2>
            </div>
            <Link href="/admin/tasks">All follow-ups →</Link>
          </div>
          {seedTasks.slice(0, 4).map((t, i) => (
            <div className="focus" key={t.title}>
              <span className="focusindex" aria-label={`Task ${i + 1}`}>{i + 1}</span>
              <span>
                <b>{t.title}</b>
                <small>{t.meta}</small>
              </span>
              <em className={t.priority.toLowerCase()}>{t.priority}</em>
            </div>
          ))}
        </section>
        <section className="panel wide">
          <div className="panelhead">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2>Across the workspace</h2>
            </div>
          </div>
          {[
            ["Proposal viewed by Chitra Devi", "Royal Tex · PR-1089"],
            ["Invoice INV-2048 marked paid", "Sri Sakthi Agencies · ₹1,40,000"],
            ["Arun Kumar moved to Qualified", "Sri Sakthi Agencies · ₹2,40,000"],
            ["Project milestone completed", "Royal Tex E-Commerce · Design system"],
          ].map((x, i) => (
            <div className="activity" key={x[0]}>
              <span className="activityicon">{["P", "₹", "J", "✓"][i]}</span>
              <div>
                <b>{x[0]}</b>
                <small>{x[1]}</small>
              </div>
              <time>{["8m", "1h", "2h", "4h"][i]}</time>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export function Leads() {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("All");
  const shown = useMemo(
    () =>
      leads.filter(
        (l) =>
          (stage === "All" || l.stage === stage) &&
          `${l.name} ${l.company}`.toLowerCase().includes(q.toLowerCase())
      ),
    [q, stage]
  );
  return (
    <div className="page">
      <Head section="leads" action="Add lead" />
      <div className="toolbar">
        <Search value={q} onChange={setQ} label="Search leads…" />
        <div className="tabs" role="tablist" aria-label="Filter by stage">
          {["All", "New", "Qualified", "Proposal", "Negotiation"].map((x) => (
            <button
              className={stage === x ? "selected" : ""}
              onClick={() => setStage(x)}
              key={x}
              role="tab"
              aria-selected={stage === x}
              type="button"
            >
              {x}
            </button>
          ))}
        </div>
      </div>
      <div className="kanban" aria-label="Leads by stage">
        {["New", "Qualified", "Proposal", "Negotiation"].map((s) => (
          <section key={s}>
            <header>
              <span className={`dot ${s.toLowerCase()}`} />
              <b>{s}</b>
              <em>{shown.filter((l) => l.stage === s).length}</em>
            </header>
            {shown
              .filter((l) => l.stage === s)
              .map((l) => (
                <article className="leadcard" key={l.id}>
                  <small>
                    {l.id} · {l.source}
                  </small>
                  <h3>{l.company}</h3>
                  <p>{l.name}</p>
                  <b>{money(l.value)}</b>
                  <footer>
                    <span className="avatar tiny">{l.owner[0]}</span>
                    <span>{l.lastContact}</span>
                  </footer>
                </article>
              ))}
          </section>
        ))}
      </div>
    </div>
  );
}

export function Customers() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"All" | "Active" | "At risk" | "Onboarding">("All");
  const filters: ("All" | "Active" | "At risk" | "Onboarding")[] = ["All", "Active", "At risk", "Onboarding"];
  const shown = useMemo(
    () =>
      customers.filter(
        (c) =>
          (status === "All" || c.status === status) &&
          `${c.name} ${c.company} ${c.email}`.toLowerCase().includes(q.toLowerCase())
      ),
    [q, status]
  );
  return (
    <div className="page">
      <Head section="customers" action="Add customer" />
      <div className="toolbar">
        <Search value={q} onChange={setQ} label="Search customers…" />
        <button
          className="secondary"
          onClick={() => setStatus((f) => filters[(filters.indexOf(f) + 1) % filters.length])}
          aria-label={`Filter by status: ${status}`}
          type="button"
        >
          {status === "All" ? "Filter" : status} · {shown.length}
        </button>
      </div>
      <div className="tablewrap">
        <table>
          <caption className="visually-hidden">Customer accounts</caption>
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Account</th>
              <th scope="col">Status</th>
              <th scope="col">Lifetime value</th>
              <th scope="col">Contact</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="avatar">{c.initials}</span>
                  <span>
                    <b>{c.name}</b>
                    <small>{c.id}</small>
                  </span>
                </td>
                <td>{c.company}</td>
                <td>
                  <em className={`status ${c.status.toLowerCase().replace(" ", "")}`}>{c.status}</em>
                </td>
                <td>
                  <b>{money(c.value)}</b>
                </td>
                <td>{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Tasks() {
  const [items, setItems] = useState(seedTasks);
  return (
    <div className="page">
      <Head section="tasks" action="Add follow-up" />
      <div className="taskstats" aria-label="Task summary">
        <span>
          <b>{items.filter((x) => !x.done).length}</b> Open
        </span>
        <span>
          <b>2</b> Due today
        </span>
        <span>
          <b>1</b> Overdue
        </span>
      </div>
      <section className="panel tasklist">
        <div className="panelhead">
          <h2>Upcoming</h2>
          <small>Demo changes reset on refresh</small>
        </div>
        {items.map((t, i) => (
          <div className={`taskrow ${t.done ? "done" : ""}`} key={t.title}>
            <button
              aria-pressed={t.done}
              aria-label={t.done ? "Mark task incomplete" : "Mark task complete"}
              onClick={() => setItems((v) => v.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
              type="button"
            >
              {t.done ? "✓" : ""}
            </button>
            <span>
              <b>{t.title}</b>
              <small>{t.meta}</small>
            </span>
            <em className={t.priority.toLowerCase()}>{t.priority}</em>
          </div>
        ))}
      </section>
    </div>
  );
}

export function Projects() {
  return (
    <div className="page">
      <Head section="projects" action="New project" />
      <div className="cards">
        {projects.map((p) => (
          <article className="project" key={p.name}>
            <div>
              <em className={`status ${p.health.replace(" ", "").toLowerCase()}`}>{p.health}</em>
              <span>Due {p.due}</span>
            </div>
            <h2>{p.name}</h2>
            <p>{p.client}</p>
            <div className="progress">
              <i style={{ width: `${p.progress}%` }} />
            </div>
            <footer>
              <span>{p.progress}% complete</span>
              <b>{money(p.budget)}</b>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function exportCSV(type: "proposals" | "invoices", rows: typeof documents.proposals | typeof documents.invoices) {
  const headers =
    type === "invoices"
      ? ["Invoice", "Customer", "Due date", "Value", "Status"]
      : ["Proposal", "Customer", "Title", "Value", "Status"];
  const csv = [headers.join(","), ...rows.map((r) => [r.id, r.customer, r.detail, money(r.value), r.status].map(csvCell).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function Documents({ type }: { type: "proposals" | "invoices" }) {
  const [q, setQ] = useState("");
  const rows = documents[type].filter((r) => `${r.id} ${r.customer} ${r.detail} ${r.status}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="page">
      <Head section={type} action={`New ${type.slice(0, -1)}`} />
      <div className="toolbar">
        <Search value={q} onChange={setQ} label={`Search ${type}…`} />
        <button className="secondary" onClick={() => exportCSV(type, rows)} type="button">
          Export
        </button>
      </div>
      <div className="tablewrap">
        <table>
          <caption className="visually-hidden">{type === "invoices" ? "Invoice records" : "Proposal records"}</caption>
          <thead>
            <tr>
              <th scope="col">{type === "invoices" ? "Invoice" : "Proposal"}</th>
              <th scope="col">Customer</th>
              <th scope="col">{type === "invoices" ? "Due date" : "Title"}</th>
              <th scope="col">Value</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <b>{r.id}</b>
                </td>
                <td>{r.customer}</td>
                <td>{r.detail}</td>
                <td>
                  <b>{money(r.value)}</b>
                </td>
                <td>
                  <em className={`status ${r.status.toLowerCase()}`}>{r.status}</em>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
