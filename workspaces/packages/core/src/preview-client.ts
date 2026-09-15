import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceKey } from "./workspaces";
import { PREVIEW_USERS } from "./preview-data";

export type PreviewOperation = { table?: string; rpc?: string; args?: Record<string, unknown>; action?: string; values?: unknown; columns?: string; options?: Record<string, unknown>; filters?: [string, string, unknown][]; order?: [string, boolean][]; limit?: number; range?: [number, number]; single?: boolean; storage?: string; path?: string; contentType?: string };
export type PreviewResult = { data: unknown; error: { message: string } | null; count?: number };
export type PreviewExecute = (operation: PreviewOperation) => Promise<PreviewResult>;

/** A deliberately limited local data adapter, never a replacement for real RLS/auth tests. */
class PreviewQuery implements PromiseLike<PreviewResult> {
  private operation: PreviewOperation;
  constructor(table: string, private execute: PreviewExecute) { this.operation = { table, action: "select", filters: [], order: [] }; }
  select(columns = "*", options?: Record<string, unknown>) { this.operation.columns = columns; this.operation.options = { ...this.operation.options, ...options }; return this; }
  insert(values: unknown) { this.operation.action = "insert"; this.operation.values = values; return this; }
  update(values: unknown) { this.operation.action = "update"; this.operation.values = values; return this; }
  upsert(values: unknown, options?: Record<string, unknown>) { this.operation.action = "upsert"; this.operation.values = values; this.operation.options = options; return this; }
  delete() { this.operation.action = "delete"; return this; }
  eq(key: string, value: unknown) { return this.filter(key, "eq", value); }
  neq(key: string, value: unknown) { return this.filter(key, "neq", value); }
  in(key: string, value: unknown) { return this.filter(key, "in", value); }
  is(key: string, value: unknown) { return this.filter(key, "is", value); }
  not(key: string, op: string, value: unknown) { return this.filter(key, `not.${op}`, value); }
  gte(key: string, value: unknown) { return this.filter(key, "gte", value); }
  lte(key: string, value: unknown) { return this.filter(key, "lte", value); }
  gt(key: string, value: unknown) { return this.filter(key, "gt", value); }
  lt(key: string, value: unknown) { return this.filter(key, "lt", value); }
  match(values: Record<string, unknown>) { Object.entries(values).forEach(([key, value]) => this.eq(key, value)); return this; }
  filter(key: string, op: string, value: unknown) { this.operation.filters!.push([key, op, value]); return this; }
  order(key: string, options?: { ascending?: boolean }) { this.operation.order!.push([key, options?.ascending !== false]); return this; }
  limit(count: number) { this.operation.limit = count; return this; }
  range(from: number, to: number) { this.operation.range = [from, to]; return this; }
  single() { this.operation.single = true; return this; }
  maybeSingle() { this.operation.single = true; return this; }
  then<TResult1 = PreviewResult, TResult2 = never>(onfulfilled?: ((value: PreviewResult) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    return this.execute(this.operation).then(onfulfilled, onrejected);
  }
}

export function createPreviewClient(workspace: WorkspaceKey, execute: PreviewExecute): SupabaseClient {
  const user = { id: PREVIEW_USERS[workspace], email: `${workspace}@example.test` };
  const fileUrl = (bucket: string, path: string) => `/api/preview?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
  const unavailable = async () => ({ data: null, error: { message: "Authentication is disconnected in local preview. Use the Sign in button." } });
  const client = {
    from: (table: string) => new PreviewQuery(table, execute),
    rpc: (rpc: string, args?: Record<string, unknown>) => execute({ rpc, args }),
    auth: {
      getClaims: async () => ({ data: { claims: { sub: user.id, email: user.email } }, error: null }),
      getUser: async () => ({ data: { user }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: unavailable, signInWithOAuth: unavailable, signUp: unavailable,
      updateUser: unavailable, resetPasswordForEmail: unavailable, exchangeCodeForSession: unavailable,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    storage: { from: (bucket: string) => ({
      upload: async (path: string, blob: Blob) => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        // Chunking avoids a stack overflow for document-sized uploads.
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return execute({ storage: bucket, action: "upload", path, contentType: blob.type, values: btoa(binary) });
      },
      remove: (paths: string[]) => execute({ storage: bucket, action: "remove", values: paths }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: fileUrl(bucket, path) } }),
      createSignedUrl: async (path: string) => ({ data: { signedUrl: fileUrl(bucket, path) }, error: null }),
    }) },
  };
  return client as unknown as SupabaseClient;
}
