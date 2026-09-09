"use client";

// Saving the invoice goes through the browser's print dialog, where every
// desktop and mobile browser offers "Save as PDF". The label says print rather
// than download because that is the dialog that opens -- a button promising a
// download that instead shows a print preview is the kind of small lie that
// makes people distrust the rest of the page.
export function PrintButton() {
  return (
    <button type="button" className="primary" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
