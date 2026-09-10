"use client";

import { WorkspaceLink as Link } from "@/components/WorkspaceHost";
import Image from "next/image";
import { useState } from "react";


function downloadDemo(name: string) {
  alert(`Demo mode: "${name}" is a placeholder. Connect Supabase Storage to download real files.`);
}

export function CustomerDashboard() {
  const [approved, setApproved] = useState(false);
  return (
    <>
      <h1>Everything for your project, in one place.</h1>
      <section className="portalhero">
        <div>
          <small>Active project</small>
          <h2>Sri Sakthi Billing System</h2>
          <p>GST billing, stock tracking and invoice workflows</p>
          <div className="progress"><i style={{ width: "76%" }} /></div>
          <footer>
            <span>76% complete</span>
            <b>Next milestone · 31 Oct 2026</b>
          </footer>
        </div>
        <span className="bigmark" aria-hidden="true">
          <Image src="/logo-mark.svg" alt="" width={180} height={180} />
        </span>
      </section>
      <div className="portalgrid">
        <section className="panel">
          <div className="panelhead">
            <h2>Awaiting your review</h2>
            <span>1 item</span>
          </div>
          <div className="approval">
            <span className="fileicon">PDF</span>
            <div>
              <b>Requirement sign-off · V2</b>
              <small>Shared 2 hours ago · 1.2 MB</small>
            </div>
            <span aria-live="polite">
              <button
                disabled={approved}
                onClick={() => setApproved(true)}
                className="primary"
                aria-label={approved ? "Document approved" : "Review and approve document"}
                type="button"
              >
                {approved ? "Approved" : "Review & approve"}
              </button>
            </span>
          </div>
        </section>
        <section className="panel">
          <div className="panelhead">
            <h2>Recent files</h2>
            <Link href="/portal#files">View all →</Link>
          </div>
          {["GST_export_template.xlsx", "Invoice_mocks.pdf", "Project_plan.pdf"].map((x, i) => (
            <div className="portalf" key={x}>
              <span className="fileicon">{i ? "PDF" : "XLSX"}</span>
              <span>
                <b>{x}</b>
                <small>{["48 KB", "2.4 MB", "1.8 MB"][i]}</small>
              </span>
              <button aria-label={`Download ${x}`} onClick={() => downloadDemo(x)} type="button">↓</button>
            </div>
          ))}
        </section>
        <section className="panel portalcontact">
          <p className="eyebrow">Your project lead</p>
          <span className="avatar">SM</span>
          <h3>Srinivash Mahalingam</h3>
          <p>Founder & Lead Engineer</p>
          <a href="mailto:founder@mucolabs.com">founder@mucolabs.com</a>
        </section>
      </div>
    </>
  );
}
