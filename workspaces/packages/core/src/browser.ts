"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";
import { isLocalPreview, previewWorkspaces } from "./preview-mode";
import { createPreviewClient, type PreviewResult } from "./preview-client";

let client: SupabaseClient | null = null;

/**
 * One browser client per tab.
 *
 * Creating a second one is not harmless: each registers its own auth state
 * listener and its own realtime socket, so a page that builds a client per
 * component ends up refreshing the same token from several places at once.
 */
export function createClient(): SupabaseClient | null {
  if (isLocalPreview) {
    if (!client) {
      const workspace = previewWorkspaces.find(item => String(item.port) === window.location.port)?.key ?? "client";
      client = createPreviewClient(workspace, async operation => {
        try {
          const response = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(operation) });
          if (!response.ok) throw new Error("The local sample server could not save this change. Please try again.");
          return await response.json() as PreviewResult;
        } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "The local sample server is unavailable." } }; }
      });
    }
    return client;
  }
  if (!isSupabaseConfigured) return null;
  if (!client) client = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  return client;
}
