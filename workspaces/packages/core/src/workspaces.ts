// The four workspaces, as data.
//
// Everything that needs to know "which product is this, who belongs in it, and
// where does somebody go who does not" reads this file. Four applications
// means four chances to answer that question differently, and four answers
// drift: one ends up admitting a role the others refuse, and nobody notices
// until it is a finding rather than a bug.

/** A role as the database spells it. Matches the app_role enum exactly. */
export type Role = "admin" | "member" | "client" | "intern" | "employee";

export const ROLES: readonly Role[] = ["admin", "member", "client", "intern", "employee"];

export type WorkspaceKey = "admin" | "employee" | "intern" | "client";

export type WorkspaceDefinition = {
  /** Subdomain label, and the key everything else uses. */
  key: WorkspaceKey;
  /** Roles this application admits. Everyone else is sent to their own. */
  roles: readonly Role[];
  /** What this workspace calls itself to the person using it. */
  name: string;
  /** Development port, so a cross-workspace redirect works without DNS. */
  port: number;
};

export const WORKSPACES: Record<WorkspaceKey, WorkspaceDefinition> = {
  admin: { key: "admin", roles: ["admin", "member"], name: "Admin", port: 3101 },
  employee: { key: "employee", roles: ["employee"], name: "Employee", port: 3102 },
  intern: { key: "intern", roles: ["intern"], name: "Intern", port: 3103 },
  client: { key: "client", roles: ["client"], name: "Client", port: 3104 },
};

export const WORKSPACE_KEYS = Object.keys(WORKSPACES) as WorkspaceKey[];

/**
 * The workspace a role belongs to.
 *
 * admin and member both run the studio. The difference between them is what
 * they may do once inside — a member cannot change grants, compensation or
 * certificates — not which product they open. Giving a member its own
 * application would be a fifth workspace nobody asked for.
 */
export function workspaceForRole(role: string): WorkspaceKey {
  switch (role) {
    case "client": return "client";
    case "intern": return "intern";
    case "employee": return "employee";
    default: return "admin";
  }
}

/** Whether this workspace admits that role at all. */
export function workspaceAdmits(workspace: WorkspaceKey, role: string): boolean {
  return (WORKSPACES[workspace].roles as readonly string[]).includes(role);
}

/**
 * How one workspace names another to somebody who arrived at the wrong door.
 *
 * Phrased around the account rather than the page on purpose: "this account
 * belongs to the intern workspace" is true and actionable, where "access
 * denied" reads as a broken link and produces a support message.
 */
export function wrongDoorMessage(role: string): string {
  const workspace = workspaceForRole(role);
  return `This account belongs to the ${WORKSPACES[workspace].name.toLowerCase()} workspace.`;
}

/**
 * The address of another workspace, derived from the address we are on.
 *
 * In production admin.mucolabs.com becomes intern.mucolabs.com: the first
 * label is replaced and everything after it is kept, so a preview deployment
 * or a staging domain works without being listed anywhere.
 *
 * In development each application runs on its own port, so the port is
 * substituted too. A bare "localhost" has no label to replace — the case a
 * plain `next dev` produces — and returns null, so the caller can fall back to
 * something it can actually reach.
 */
export function hostForWorkspace(
  currentHost: string | null | undefined,
  workspace: WorkspaceKey,
): string | null {
  if (!currentHost) return null;
  const [name, port] = currentHost.split(":");
  const parts = name.split(".");
  if (parts.length < 2) return null;
  parts[0] = workspace;
  const host = parts.join(".");
  // A development host keeps its own port scheme; production has none to keep.
  return port ? `${host}:${WORKSPACES[workspace].port}` : host;
}

/** A full URL at another workspace, or null when this host cannot name one. */
export function urlForWorkspace(
  currentHost: string | null | undefined,
  workspace: WorkspaceKey,
  path = "/",
): string | null {
  const host = hostForWorkspace(currentHost, workspace);
  if (!host) return null;
  const insecure = host.startsWith("localhost") || host.includes(".localhost") || host.startsWith("127.");
  return `${insecure ? "http" : "https"}://${host}${path.startsWith("/") ? path : `/${path}`}`;
}
