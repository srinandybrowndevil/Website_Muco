export default function Loading() {
  // A skeleton in the shape of the page that is coming, rather than a spinner.
  // A spinner says "wait"; this says "a heading, then some cards", which is
  // what stops the layout jumping when the content lands.
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="stack-sm">
        <div className="skeleton" style={{ height: 12, width: 90 }} />
        <div className="skeleton" style={{ height: 28, width: 260 }} />
      </div>
      <div className="grid">
        <div className="skeleton" style={{ height: 104 }} />
        <div className="skeleton" style={{ height: 104 }} />
        <div className="skeleton" style={{ height: 104 }} />
      </div>
      <div className="skeleton" style={{ height: 220 }} />
    </div>
  );
}
