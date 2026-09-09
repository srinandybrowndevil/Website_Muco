"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LiveRefresh() {
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    const client = createClient();
    if (!client) return;
    let initialized = false;
    let previousUser: string | null = null;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user.id ?? null;
      if (initialized && previousUser !== nextUser) {
        // Clear the old account's client state and re-check server role guards.
        window.location.reload();
      }
      previousUser = nextUser;
      initialized = true;
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const client = createClient();
    if (!client || !/\/(enquiries|requests|analytics)(\/|$)/.test(path)) return;
    let cancelled = false;
    let cleanup = () => {};
    void (async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await client.from("memberships").select("organization_id").eq("user_id", user.id).order("organization_id").limit(1).maybeSingle();
      if (!data || cancelled) return;
      let timer: ReturnType<typeof setTimeout>;
      const refresh = () => { clearTimeout(timer); timer = setTimeout(() => { if (!document.hidden) router.refresh(); }, 400); };
      const tables = path.includes("analytics") ? ["analytics_events", "website_enquiries"] : path.includes("enquiries") ? ["website_enquiries"] : ["project_requests"];
      const channel = client.channel(`inbox-${crypto.randomUUID()}`);
      for (const table of tables) channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `organization_id=eq.${data.organization_id}` }, refresh);
      channel.subscribe();
      const poll = setInterval(refresh, 30000);
      window.addEventListener("online", refresh); window.addEventListener("focus", refresh);
      cleanup = () => { clearTimeout(timer); clearInterval(poll); window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh); void client.removeChannel(channel); };
    })();
    return () => { cancelled = true; cleanup(); };
  }, [path, router]);
  return null;
}
