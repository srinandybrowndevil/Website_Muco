import type { Metadata } from "next";
import { PublicProjectRequestForm } from "@/components/PublicProjectRequestForm";

export const metadata: Metadata = { title: "Start a project" };

export default function StartProjectPage() {
  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Your next idea</span>
        <h1>Start a project</h1>
        <p className="lede">
          Tell us what you want to build and who it is for. We will review your brief,
          clarify the scope and share a quote before work begins.
        </p>
      </div>
      <div className="grid-main">
        <section className="panel">
          <div className="panel-head"><h2>Your project brief</h2></div>
          <div className="panel-body"><PublicProjectRequestForm /></div>
        </section>
        <aside className="panel">
          <div className="panel-head"><h2>What happens next</h2></div>
          <div className="panel-body stack">
            <div><b>1. Your brief is saved</b><p className="hint">Your request goes directly to the MUCO LABS admin workspace.</p></div>
            <div><b>2. We agree on the scope</b><p className="hint">We discuss your priorities, budget and preferred deadline. The delivery date is confirmed with you after review.</p></div>
            <div><b>3. Your project opens</b><p className="hint">Once accepted, it becomes a lead and we share a written scope and price before work begins.</p></div>
            <p className="notice">Submitting a brief is free and does not commit you to a purchase.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
