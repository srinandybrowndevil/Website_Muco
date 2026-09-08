"use client";

import { useState } from "react";
import { money } from "@/lib/data";
import { Icon } from "./Icon";

const copy: Record<string, [string, string]> = {
  files: ["Files", "One secure home for client deliverables."],
  reports: ["Reports", "Pipeline signals, not vanity metrics."],
  automation: ["Automation", "Routine work handled so you can focus on delivery."],
};

const files = [
  ["Sri_Sakthi_Brand_Guidelines.pdf", "Sri Sakthi Agencies", "12.4 MB", "2h ago"],
  ["Royal_Tex_Wireframes.fig", "Royal Tex", "28.8 MB", "Yesterday"],
  ["Palani_Launch_Plan.pdf", "Palani Foods", "4.2 MB", "2 days ago"],
  ["Kovai_Discovery_Notes.docx", "Kovai Traders", "840 KB", "3 days ago"],
];

export function SecondaryPage({ section }: { section: string }) {
  const [enabled, setEnabled] = useState([true, true, false]);
  const t = copy[section];

  if (section === "files") {
    return (
      <div className="page">
        <Header t={t} action="Upload file" />
        <button
          type="button"
          className="drop"
          aria-label="Upload file"
          onClick={() => alert("Demo mode: connect Supabase Storage to upload files.")}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            alert("Demo mode: dropped files would upload to Supabase Storage.");
          }}
        >
          <Icon name="folder" size={28} />
          <b>Drop files here or click to browse</b>
          <span>PDF, images, documents up to 50 MB</span>
        </button>
        <section className="panel filelist">
          <h2>Recent files</h2>
          {files.map((f) => (
            <div key={f[0]}>
              <span className="fileicon">{f[0].split(".").pop()?.toUpperCase()}</span>
              <span>
                <b>{f[0]}</b>
                <small>
                  {f[1]} · {f[2]}
                </small>
              </span>
              <time>{f[3]}</time>
              <button
                aria-label={`Options for ${f[0]}`}
                onClick={() => alert("Demo mode: file options require Supabase Storage.")}
                type="button"
              >
                •••
              </button>
            </div>
          ))}
        </section>
      </div>
    );
  }

  if (section === "reports") {
    return (
      <div className="page">
        <Header t={t} action="Export report" />
        <section className="metrics" aria-label="Report highlights">
          <article>
            <span>Revenue YTD</span>
            <b>{money(3842000)}</b>
            <small className="up">18.2% year over year</small>
          </article>
          <article>
            <span>Average project size</span>
            <b>{money(364000)}</b>
            <small className="up">4.8% this quarter</small>
          </article>
          <article>
            <span>Sales cycle</span>
            <b>24 days</b>
            <small>3 days faster</small>
          </article>
          <article>
            <span>Retention</span>
            <b>92%</b>
            <small className="up">Healthy</small>
          </article>
        </section>
        <div className="reportgrid">
          <section className="panel">
            <h2>Revenue performance</h2>
            <p>Last 6 months</p>
            <div className="bars">
              {[42, 56, 49, 72, 68, 92].map((v, i) => (
                <div key={i}>
                  <i style={{ height: `${v}%` }} />
                  <span>{["Apr", "May", "Jun", "Jul", "Aug", "Sep"][i]}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Acquisition sources</h2>
            <p>Closed revenue contribution</p>
            {[["Referral", 38], ["Website", 27], ["WhatsApp", 21], ["Direct", 14]].map((x) => (
              <div className="source" key={x[0]}>
                <span>{x[0]}</span>
                <div>
                  <i style={{ width: `${x[1]}%` }} />
                </div>
                <b>{x[1]}%</b>
              </div>
            ))}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header t={t} action="New workflow" />
      <div className="automationintro">
        <span>
          <Icon name="bolt" size={26} />
        </span>
        <div>
          <h2>Your delivery playbook, on repeat.</h2>
          <p>Workflows run when Supabase is connected. The examples below are safe to preview.</p>
        </div>
      </div>
      <div className="cards">
        {["New lead follow-up", "Proposal viewed alert", "Invoice payment reminder"].map((name, i) => (
          <article className="workflow" key={name}>
            <div>
              <span className="workflowicon">
                <Icon name={["target", "file", "receipt"][i]} />
              </span>
              <button
                className={`toggle ${enabled[i] ? "on" : ""}`}
                onClick={() => setEnabled((x) => x.map((v, j) => (j === i ? !v : v)))}
                aria-pressed={enabled[i]}
                aria-label={`${name} ${enabled[i] ? "on" : "off"}`}
                type="button"
              >
                <i />
              </button>
            </div>
            <h2>{name}</h2>
            <p>
              {
                [
                  "Create a task when a qualified Tamil Nadu lead has no activity for 3 days.",
                  "Notify the project lead when a client opens a proposal.",
                  "Email a friendly reminder 2 days before a GST invoice is due.",
                ][i]
              }
            </p>
            <footer>
              <span>{enabled[i] ? "Active" : "Paused"}</span>
              <b>{["Ran 14 times", "Ran 8 times", "Not run yet"][i]}</b>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function Header({ t, action }: { t: [string, string]; action: string }) {
  return (
    <div className="pagehead">
      <div>
        <p className="eyebrow">Workspace / {t[0].toUpperCase()}</p>
        <h1>{t[0]}</h1>
        <p>{t[1]}</p>
      </div>
      <button
        className="primary"
        onClick={() => alert("Demo mode: connect Supabase to enable this action.")}
        type="button"
      >
        <Icon name="plus" />
        {action}
      </button>
    </div>
  );
}
