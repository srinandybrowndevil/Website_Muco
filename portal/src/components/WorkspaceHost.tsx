"use client";

import Link from "next/link";
import { createContext, useContext, type ComponentProps } from "react";
import { stripWorkspacePrefix } from "@/lib/workspace-host";

// Which workspace this address serves, or null when one address serves all
// four. The value comes from the server layout, which reads the hostname, so
// the server and the browser agree on it and nothing has to be re-derived
// during hydration.
const WorkspacePrefix = createContext<string | null>(null);

export function WorkspaceHostProvider({
  prefix,
  children,
}: {
  prefix: string | null;
  children: React.ReactNode;
}) {
  return <WorkspacePrefix.Provider value={prefix}>{children}</WorkspacePrefix.Provider>;
}

export function useWorkspacePrefix() {
  return useContext(WorkspacePrefix);
}

/**
 * A link that writes the shortest address that works.
 *
 * Pages keep saying `/admin/audit`, which is what the route is actually called
 * and what still works on portal.mucolabs.com. On admin.mucolabs.com the same
 * link renders as `/audit`, because the hostname already says "admin" and
 * repeating it in the path reads as a mistake.
 *
 * Doing this here rather than in the proxy matters: the proxy can only correct
 * a long URL by redirecting, which costs a round trip on every navigation and
 * shows the long form in the address bar first.
 */
export function WorkspaceLink({ href, ...rest }: ComponentProps<typeof Link>) {
  const prefix = useWorkspacePrefix();
  const shortened =
    prefix && typeof href === "string" && href.startsWith(prefix)
      ? stripWorkspacePrefix(href, prefix)
      : href;
  return <Link href={shortened} {...rest} />;
}
