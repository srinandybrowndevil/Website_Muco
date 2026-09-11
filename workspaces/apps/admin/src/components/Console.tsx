"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar, Icon } from "@muco/ui";
import { SignOutButton } from "@muco/ui/auth";

// Grouped by frame of mind rather than alphabetically. Running the studio,
// the internship programme, money, what arrived from outside, and control are
// five different jobs, and the founder is usually in exactly one of them.
const GROUPS: { label: string; items: [string, string, string][] }[] = [
  {
    label: "Studio",
    items: [
      ["Home", "/", "home"],
      ["People", "/people", "users"],
      ["Projects", "/projects", "briefcase"],
      ["Pipeline", "/pipeline", "target"],
    ],
  },
  {
    label: "Internships",
    items: [
      ["Completions", "/completions", "checkCircle"],
      ["Certificates", "/certificates", "award"],
    ],
  },
  {
    label: "Money",
    items: [["Compensation", "/compensation", "card"]],
  },
  {
    label: "Came in",
    items: [
      ["Enquiries", "/enquiries", "inbox"],
      ["Requests", "/requests", "fileText"],
      ["Analytics", "/analytics", "chart"],
    ],
  },
  {
    label: "Control",
    items: [
      ["Grants", "/grants", "key"],
      ["Audit", "/audit", "shield"],
      ["Settings", "/settings", "settings"],
    ],
  },
];

export type Counts = { enquiries: number; requests: number; completions: number };

export function Console({
  children,
  name,
  email,
  role,
  avatar,
  counts,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  counts: Counts;
}) {
  const pathname = usePathname() ?? "/";

  // Closing the drawer on navigation is the difference between a menu and a
  // menu that stays in the way. Derived rather than done in an effect: the
  // drawer is only ever open because somebody clicked, so a pathname that has
  // changed since that click means the click is spent. Setting state inside an
  // effect for this causes a second render every time anybody navigates.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = useCallback(
    (next: boolean) => setOpenedAt(next ? pathname : null),
    [pathname],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const badge = (href: string) =>
    href === "/enquiries" ? counts.enquiries
    : href === "/requests" ? counts.requests
    : href === "/completions" ? counts.completions
    : 0;

  const current = GROUPS.flatMap(group => group.items).find(([, href]) => active(href));

  return (
    <div className="console">
      <a className="skip-link" href="#main">Skip to content</a>

      <aside className={open ? "rail open" : "rail"} aria-label="Console navigation">
        <div className="railbrand">
          <Image src="/logo-mark.svg" alt="" width={30} height={30} priority />
          <div>
            <b>MUCO LABS</b>
            <small>Admin</small>
          </div>
          <button
            className="iconbtn railclose"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="x" />
          </button>
        </div>

        <nav className="railnav">
          {GROUPS.map(group => (
            <div className="navgroup" key={group.label}>
              <span>{group.label}</span>
              {group.items.map(([label, href, icon]) => {
                const count = badge(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active(href) ? "page" : undefined}
                  >
                    <Icon name={icon} size={16} />
                    <span>{label}</span>
                    {count > 0 ? <em>{count}</em> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="railfoot">
          <Avatar name={name} src={avatar} size="sm" />
          <span className="who">
            <b>{name}</b>
            <small>{email}</small>
          </span>
          <SignOutButton className="iconbtn" label="" />
        </div>
      </aside>

      {open ? (
        <button className="scrimclick" type="button" aria-label="Close navigation" onClick={() => setOpen(false)} />
      ) : null}

      <div className="frame">
        <header className="topbar">
          <button
            className="iconbtn railtoggle"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
          >
            <Icon name="menu" />
          </button>
          <span className="crumb">
            Admin <span aria-hidden="true">/</span> <b>{current?.[0] ?? "Workspace"}</b>
          </span>
          <span className="spacer" />
          {/* A member runs the studio but cannot change grants, compensation,
              invitations or certificates. Saying so here is cheaper than
              letting them find out one refused button at a time. */}
          {role === "member" ? <span className="badge">Read and operate</span> : null}
          <Link className="btn sm" href="/people/invite/staff">
            <Icon name="userPlus" size={15} />
            <span>Invite</span>
          </Link>
        </header>

        <main id="main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
