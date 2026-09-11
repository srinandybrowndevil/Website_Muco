export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * A build with no database refuses to serve rather than serving with
 * authentication switched off.
 *
 * One misspelled environment variable would otherwise turn every guard in
 * these four applications into a no-op, silently, on the origins that hold
 * every customer record. Failing loudly is the only safe direction, so the
 * unauthenticated mode has to be opted into and cannot happen by accident.
 */
export const isDemoAllowed =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ALLOW_DEMO === "1";
