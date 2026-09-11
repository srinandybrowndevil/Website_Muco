"use client";

// What somebody sees when a page throws. Deliberately plain: the message on an
// exception can carry a query, a column name or an identifier, and none of
// those belong on a screen somebody outside the studio might be reading.
export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Something went wrong</span>
        <h1>This page could not be loaded</h1>
        <p className="lede">
          The problem has been recorded. Try again — if it keeps happening, tell the studio what you
          were doing and we will look at it from this side.
        </p>
      </div>
      <div>
        <button className="btn primary" type="button" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
