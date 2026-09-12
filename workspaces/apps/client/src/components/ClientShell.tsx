"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@muco/ui";
import { SignOutButton } from "@muco/ui/auth";

// Nine destinations in the order a customer thinks about their project: how is
// it going, what did we agree, when does it land, what can I see, what do I
// owe, who do I ask. Nothing here is named after a table.
const NAV: { label: string; items: [string, string, string][] }[] = [
  { label: "Your project", items: [
    ["Overview", "/", "home"],
    ["Scope", "/scope", "fileText"],
    ["Milestones", "/milestones", "calendar"],
    ["Previews", "/previews", "eye"],
    ["Files", "/files", "folder"],
    ["Billing", "/billing", "card"],
  ] },
  { label: "Working together", items: [
    ["Support", "/support", "message"],
    ["People", "/people", "users"],
  ] },
  { label: "Your account", items: [["Profile", "/organisation", "user"]] },
];

export function ClientShell({
  children,
  company,
  person,
}: {
  children: React.ReactNode;
  company: string;
  person: string;
}) {
  const pathname = usePathname() ?? "/";
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  const current = NAV.flatMap(group => group.items).find(([, href]) => active(href))?.[0] ?? "Workspace";

  return (
    <div className="clientshell">
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="masthead">
        <div className="header-row">
          <Link className="mark" href="/">
            <Image src="/logo-mark.svg" alt="" width={34} height={34} priority />
            <span>
              <b>MUCO LABS</b>
              <small>Client workspace</small>
            </span>
          </Link>

          <Link className="who" href="/organisation" aria-label="Edit your profile">
            <b>{company}</b>
            <small>{person}</small>
          </Link>

          <SignOutButton className="iconbtn" label="" />
        </div>

      </header>

      <div className="client-frame">
        <div className="client-navigation" onKeyDown={event => {
          if (event.key === "Escape" && menuOpen) {
            setOpenPath(null);
            menuButton.current?.focus();
          }
        }}>
          <button className="client-menu-toggle" ref={menuButton} type="button"
            aria-expanded={menuOpen} aria-controls="client-navigation"
            onClick={() => setOpenPath(menuOpen ? null : pathname)}>
            <Icon name={menuOpen ? "x" : "menu"} size={18} />
            <span>{current}</span>
            <span className="client-menu-caption">{menuOpen ? "Close menu" : "Browse workspace"}</span>
          </button>
          <nav className="clientnav" id="client-navigation" aria-label="Your project" data-open={menuOpen}>
            {NAV.map(group => (
              <div className="client-nav-group" key={group.label}>
                <p className="eyebrow">{group.label}</p>
                {group.items.map(([label, href, icon]) => (
                  <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
                    onClick={() => setOpenPath(null)}>
                    <Icon name={icon} size={18} /><span>{label}</span>
                    {active(href) ? <span className="client-nav-dot" aria-hidden="true" /> : null}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <main id="main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
