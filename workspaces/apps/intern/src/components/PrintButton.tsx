"use client";

import { Icon } from "@muco/ui";

/**
 * Printing is the download.
 *
 * There is no PDF pipeline here and adding one would be a dependency, a font
 * licence question and a rendering service for a document three people a month
 * need. Every browser already prints to PDF, the print stylesheet below
 * removes the chrome, and the result carries the serial — which is what makes
 * the document checkable rather than the file format.
 */
export function PrintButton() {
  return (
    <button className="btn primary" type="button" onClick={() => window.print()}>
      <Icon name="download" size={15} />
      <span>Save as PDF</span>
    </button>
  );
}
