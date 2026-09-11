"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

let client: SupabaseClient | null = null;

/**
 * One browser client per tab.
 *
 * Creating a second one is not harmless: each registers its own auth state
 * listener and its own realtime socket, so a page that builds a client per
 * component ends up refreshing the same token from several places at once.
 */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  return client;
}
