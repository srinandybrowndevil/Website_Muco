"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Avatar, Icon } from "@muco/ui";
import { SignOutButton } from "@muco/ui/auth";

const NAV: [string, string, string][] = [
  ["Home", "/", "home"],
  ["Projects", "/projects", "briefcase"],
  ["Tasks", "/tasks", "list"],
  ["Compensation", "/compensation", "card"],
  ["Documents", "/documents", "fileText"],
  ["Profile", "/profile", "user"],
];

// Mentoring appears only for somebody who is actually a mentor. A greyed-out
// item that never becomes available is worse than no item: it reads as
// something being withheld, when in fact it simply does not apply.
const MENTORING: [string, string, string] = ["Mentoring", "/mentoring", "users"];

export function WorkShell({
  children,
  name,
  email,
  avatar,
  isMentor,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
  avatar: string | null;
  isMentor: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const items = isMentor ? [...NAV.slice(0, 3), MENTORING, ...NAV.slice(3)] : NAV;

  return (
    <div className="workshell">
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="workhead">
        <div className="header-row">
          <Link className="mark" href="/">
            <Image src="/logo-mark.svg" alt="" width={32} height={32} priority />
            <span>
              <b>MUCO LABS</b>
              <small>Employee</small>
            </span>
          </Link>

          <span className="spacer" />

          <Avatar name={name} src={avatar} size="sm" />
          <span className="hint truncate" style={{ maxWidth: 180 }}>{email}</span>
          <SignOutButton className="iconbtn" label="" />
        </div>

        <nav className="worknav" aria-label="Your workspace">
          {items.map(([label, href, icon]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
              <Icon name={icon} size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </header>

      <main id="main" tabIndex={-1}>{children}</main>
    </div>
  );
}
