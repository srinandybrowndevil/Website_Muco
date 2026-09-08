export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Without Supabase the workspace runs on fixtures as a credential-free demo.
// That is useful in development and dangerous in production: one misspelled
// environment variable would silently switch authentication off for everyone
// rather than failing loudly. A production build therefore has to opt in.
export const isDemoAllowed =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ALLOW_DEMO === "1";
