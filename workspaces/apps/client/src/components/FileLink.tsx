"use client";

import { useState } from "react";
import { createClient } from "@muco/core/browser";
import { Icon } from "@muco/ui";

/**
 * A download that does not leave a permanent address behind.
 *
 * The bucket is private, so there is no public URL to render. A signed one is
 * created at the moment somebody clicks, lasts sixty seconds, and is never
 * written into the page — which means a copied link, a shared screenshot or a
 * page cached by a browser extension does not carry a working key to somebody
 * else's documents.
 */
export function FileLink({ bucket, path, name }: { bucket: string; path: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function open() {
    setBusy(true);
    setError(false);
    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setError(true);
      return;
    }
    const { data, error: failure } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    setBusy(false);
    if (failure || !data?.signedUrl) {
      setError(true);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      className="btn sm"
      onClick={open}
      disabled={busy}
      aria-label={"Open " + name}
    >
      <Icon name={error ? "alert" : "download"} size={14} />
      <span>{busy ? "Opening" : error ? "Unavailable" : "Open"}</span>
    </button>
  );
}
