// The guard every page in all four applications runs before it renders.
//
// This is deliberately not "a helper". It is the one place that answers: is
// there a session, does it hold a live membership, and does that membership
// belong to *this* product. A page that forgets to call it renders nothing
// useful — every query below it still runs as the signed-in user and row-level
// security still refuses — but it would render a shell to somebody who should
// have been sent elsewhere, and that reads as a leak even when it is not one.
//
// Defence in depth is the point. The proxy answers the same question before
// the request reaches a route; this answers it again at the route, because a
// proxy matcher is a regular expression and regular expressions acquire holes.

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";
import { accessSwitchedOff, primaryMembership } from "./membership";
import { PATH_HEADER } from "./paths";
import { urlForWorkspace, workspaceAdmits, workspaceForRole, type Role, type WorkspaceKey } from "./workspaces";

/**
 * A Supabase client bound to this request's cookies.
 *
 * Wrapped in cache() so a page that calls requireAccount and then runs four
 * queries creates one client and one cookie read, not five.
 */
export const createServerSupabase = cache(async (): Promise<SupabaseClient | null> => {
  if (!isSupabaseConfigured) return null;
  const store = await cookies();
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // A Server Component cannot set cookies. The proxy refreshes the
        // session on every request, so failing quietly here is correct rather
        // than lossy — throwing would turn every authenticated page into a 500
        // the moment a token needed rotating.
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* refreshed by the proxy instead */
        }
      },
    },
  });
});

export type Account = {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  role: Role;
  organizationId: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
};

/** The path this request asked for, as the proxy saw it. */
export async function currentPath(): Promise<string> {
  const header = await headers();
  return header.get(PATH_HEADER) ?? "/";
}

async function signInAgain(): Promise<never> {
  const path = await currentPath();
  redirect(path === "/" ? "/login" : `/login?next=${encodeURIComponent(path)}`);
}

/**
 * The signed-in account, or a redirect.
 *
 * Somebody at the wrong front door is sent to their own address rather than
 * shown a locked page. Refusing them where they stand reads as a broken
 * product; naming the address that works reads as an answer.
 */
export const requireAccount = cache(async (workspace: WorkspaceKey): Promise<Account> => {
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/login");

  const { data: claimed } = await supabase.auth.getClaims();
  const claims = claimed?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) await signInAgain();

  const { data: rows } = await supabase
    .from("memberships")
    .select("organization_id,role,disabled_at")
    .eq("user_id", userId!);

  const membership = primaryMembership(rows);

  if (!membership) {
    // Switched off and never joined look identical to primaryMembership and
    // deserve opposite answers. Sending somebody whose access was just revoked
    // to an onboarding form would invite them to sign themselves back in.
    redirect(accessSwitchedOff(rows) ? "/login?access=closed" : "/login?access=none");
  }

  const role = membership!.role;
  if (!workspaceAdmits(workspace, role)) {
    const host = (await headers()).get("host");
    const own = urlForWorkspace(host, workspaceForRole(role));
    redirect(own ?? `/login?access=wrong-workspace&belongs=${workspaceForRole(role)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,avatar_url,phone")
    .eq("id", userId!)
    .maybeSingle();

  return {
    supabase,
    userId: userId!,
    email: typeof claims?.email === "string" ? claims.email : null,
    role: role as Role,
    organizationId: membership!.organization_id as string,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    phone: profile?.phone ?? null,
  };
});

/**
 * The admin workspace admits two roles with different powers. A member may
 * read the studio; only an admin may change grants, compensation, invitations
 * and certificates. Pages that do those things call this instead.
 *
 * The database enforces the same split — is_org_admin gates every one of those
 * writes — so this decides what is drawn, not what is permitted.
 */
export async function requireAdmin(): Promise<Account> {
  const account = await requireAccount("admin");
  if (account.role !== "admin") redirect("/?denied=admin-only");
  return account;
}

/**
 * Write an audit line.
 *
 * The database function strips anything that looks like a secret from the
 * detail before storing it, and captures the actor's email at write time so
 * the trail survives the account being deleted. Failures are swallowed on
 * purpose: an audit line that cannot be written must not take the page down
 * with it, and the action it describes has already happened.
 */
export async function recordAudit(
  supabase: SupabaseClient,
  action: string,
  resourceType: string,
  resourceId?: string | null,
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.rpc("record_audit_event", {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId ?? null,
      p_detail: detail,
    });
  } catch {
    /* the action stands whether or not the line was written */
  }
}
