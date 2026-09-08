"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Re-fetch authorized rows after changes rather than merging untrusted event
// payloads. Focus/online refresh and polling recover from a dropped websocket.
export function useLiveQuery<T>(tables: string, load: () => Promise<T>, organizationId?: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const generation = useRef(0);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const refresh = useCallback(async () => {
    const run = ++generation.current;
    try {
      const result = await load();
      if (run === generation.current) { setData(result); setError(null); }
    } catch (err) {
      if (run === generation.current) setError(err instanceof Error ? err.message : "Could not load records. Please retry.");
    } finally { if (run === generation.current) setLoading(false); }
  }, [load]);
  useEffect(() => {
    const client = createClient();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 250); };
    // This starts async database I/O; state changes happen after the awaited result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const channel = client?.channel(`crm-${crypto.randomUUID()}`);
    for (const table of tables.split(",").filter(Boolean)) {
      channel?.on("postgres_changes", {
        event: "*", schema: "public", table,
        ...(organizationId ? { filter: `organization_id=eq.${organizationId}` } : {}),
      }, schedule);
    }
    channel?.subscribe((state) => { setConnected(state === "SUBSCRIBED"); if (state === "SUBSCRIBED") schedule(); });
    const visible = () => { if (!document.hidden) schedule(); };
    const poll = setInterval(visible, 30000);
    window.addEventListener("online", schedule);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      invalidate();
      clearTimeout(timer); clearInterval(poll);
      window.removeEventListener("online", schedule); window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      if (channel) void client?.removeChannel(channel);
    };
  }, [tables, organizationId, refresh, invalidate]);
  return { data, error, loading, connected, refresh };
}
