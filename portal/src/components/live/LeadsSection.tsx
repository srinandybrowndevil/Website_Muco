"use client";

import { useSyncExternalStore } from "react";
import { LeadPipeline } from "./LeadPipeline";
import { LiveRecords } from "./LiveRecords";

// Two ways to look at the same leads, because they answer different questions.
// The board answers "where does everything stand" and is how the pipeline gets
// worked. The table answers "find me this one" and is where a lead is created
// or edited. Neither replaces the other, so the choice is remembered.
const REMEMBER = "muco-leads-view";
type View = "board" | "table";

// The preference lives in the browser, which is outside React. Reading it in an
// effect and calling setState is the obvious approach and the wrong one: it
// renders the default first and corrects it a frame later, which is a visible
// flicker and what the set-state-in-effect rule exists to prevent. Subscribing
// to it as an external store lets the first client render already be right,
// while the server still renders the default it has no way to know differs.
let cached: View | null = null;
const listeners = new Set<() => void>();

function readView(): View {
  if (cached) return cached;
  try {
    cached = window.localStorage.getItem(REMEMBER) === "table" ? "table" : "board";
  } catch {
    // Storage blocked. The page works; the preference just will not stick.
    cached = "board";
  }
  return cached;
}

// The server has no browser storage to read, so it renders the default and the
// browser reconciles on its own first pass.
const readServerView = (): View => "board";

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function writeView(next: View) {
  cached = next;
  try {
    window.localStorage.setItem(REMEMBER, next);
  } catch {
    /* Preference not saved; the view still changes. */
  }
  listeners.forEach(listener => listener());
}

export function LeadsSection({ organizationId, role }: { organizationId: string; role?: string }) {
  const view = useSyncExternalStore(subscribe, readView, readServerView);
  const choose = writeView;

  return (
    <div className="page">
      <nav className="filterbar" aria-label="How to view leads">
        <button
          type="button"
          className={view === "board" ? "chip active" : "chip"}
          aria-pressed={view === "board"}
          onClick={() => choose("board")}
        >
          Pipeline
        </button>
        <button
          type="button"
          className={view === "table" ? "chip active" : "chip"}
          aria-pressed={view === "table"}
          onClick={() => choose("table")}
        >
          Table
        </button>
      </nav>

      {view === "board"
        ? <LeadPipeline organizationId={organizationId} />
        : <LiveRecords section="leads" organizationId={organizationId} role={role} />}
    </div>
  );
}
