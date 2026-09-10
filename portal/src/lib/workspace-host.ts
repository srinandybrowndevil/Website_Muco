// One front door per workspace.
//
// Each of the four workspaces gets its own address, so nobody signing in ever
// sees another workspace's name in the URL bar. An intern goes to
// intern.mucolabs.com and reads "intern" -- not portal.mucolabs.com/intern,
// which quietly tells them a larger system exists and they are in a corner of
// it.
//
// This changes nothing about who can reach what. Separation is enforced by the
// database policies and by the proxy, and would hold if all four shared one
// address. What the address changes is what each person understands their
// workspace to be.

/** Subdomain label to the workspace it serves. */
export const WORKSPACE_HOSTS: Record<string, string> = {
  admin: "/admin",
  client: "/portal",
  intern: "/intern",
  employee: "/staff",
};

/**
 * The workspace a hostname owns, or null when the host serves all of them.
 *
 * portal.mucolabs.com deliberately returns null. It is the address every page
 * of the marketing site links to and the one every existing customer has
 * bookmarked, so it keeps working exactly as it did, serving all four
 * workspaces by path. Moving it would break several hundred published links to
 * gain nothing.
 */
export function workspaceForHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const label = host.split(":")[0].toLowerCase().split(".")[0];
  return WORKSPACE_HOSTS[label] ?? null;
}

/**
 * The same host, pointed at a different workspace: admin.mucolabs.com becomes
 * intern.mucolabs.com. Used to send someone who arrived at the wrong front
 * door to their own, rather than refusing them where they stand.
 *
 * Returns null when the current host has no room for a label to replace -- a
 * bare "localhost" being the case that matters -- so the caller falls back to
 * a path on the host it already has.
 */
export function hostForWorkspace(currentHost: string | null | undefined, workspace: string): string | null {
  if (!currentHost) return null;
  const label = Object.keys(WORKSPACE_HOSTS).find(key => WORKSPACE_HOSTS[key] === workspace);
  if (!label) return null;

  const [name, port] = currentHost.split(":");
  const parts = name.split(".");
  // "localhost" alone cannot carry a workspace label; "admin.localhost" can,
  // which is what makes this testable in development without DNS.
  if (parts.length < 2) return null;

  parts[0] = label;
  return parts.join(".") + (port ? `:${port}` : "");
}

/**
 * The path as it should appear on a workspace's own address. On
 * admin.mucolabs.com the audit log is /audit, not /admin/audit: the workspace
 * name is already in the hostname, and repeating it reads as a mistake.
 */
export function stripWorkspacePrefix(path: string, workspace: string): string {
  if (path === workspace) return "/";
  if (path.startsWith(`${workspace}/`)) return path.slice(workspace.length);
  return path;
}
