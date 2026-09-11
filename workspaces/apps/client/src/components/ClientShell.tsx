"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@muco/ui/auth";

// Nine destinations in the order a customer thinks about their project: how is
// it going, what did we agree, when does it land, what can I see, what do I
// owe, who do I ask. Nothing here is named after a table.
const NAV: [string, string][] = [
  ["Overview", "/"],
  ["Scope", "/scope"],
  ["Milestones", "/milestones"],
  ["Previews", "/previews"],
  ["Files", "/files"],
  ["Billing", "/billing"],
  ["Support", "/support"],
  ["People", "/people"],
  ["Organisation", "/organisation"],
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

  return (
    <div className="clientshell">
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="masthead">
        <div className="bar">
          <Link className="mark" href="/">
            <Image src="/logo-mark.svg" alt="" width={34} height={34} priority />
            <span>
              <b>MUCO LABS</b>
              <small>Client workspace</small>
            </span>
          </Link>

          <span className="who">
            <b>{company}</b>
            <small>{person}</small>
          </span>

          <SignOutButton className="iconbtn" label="" />
        </div>

        <nav className="clientnav" aria-label="Your project">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main" tabIndex={-1}>{children}</main>
    </div>
  );
}
