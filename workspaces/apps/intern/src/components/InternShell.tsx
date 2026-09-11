"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "@muco/ui";
import { SignOutButton } from "@muco/ui/auth";

// Nine destinations, in the order an intern needs them rather than the order
// they were built. Home first because it answers the question they opened the
// workspace with; Help last because it is the one they reach for when
// something has gone wrong, and it should always be in the same place.
const NAV: [string, string, string][] = [
  ["Home", "/", "home"],
  ["Tasks", "/tasks", "list"],
  ["Work log", "/log", "edit"],
  ["Learning", "/learning", "book"],
  ["Project", "/project", "layers"],
  ["Internship", "/internship", "calendar"],
  ["Certificate", "/certificate", "award"],
  ["Profile", "/profile", "user"],
  ["Help", "/help", "help"],
];

export function InternShell({
  children,
  daysLeft,
  state,
}: {
  children: React.ReactNode;
  daysLeft: number | null;
  state: string;
}) {
  const pathname = usePathname() ?? "/";
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Three ways of saying the same thing, because "0 days left" and "ended" are
  // different sentences to the person reading them, and "-4 days left" is not
  // a sentence at all.
  const tone = state !== "active" ? "over" : daysLeft !== null && daysLeft <= 7 ? "ending" : "";
  const chip =
    state === "not_started" ? "Starts soon"
    : state !== "active" ? "Internship ended"
    : daysLeft === null ? "Dates not set"
    : daysLeft === 0 ? "Last day"
    : null;

  return (
    <div className="internshell">
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="internhead">
        <div>
          <Link className="mark" href="/">
            <Image src="/logo-mark.svg" alt="" width={32} height={32} priority />
            <span>
              <b>MUCO LABS</b>
              <small>Intern</small>
            </span>
          </Link>

          <span className="spacer" />

          <span className={tone ? "daysleft " + tone : "daysleft"}>
            {chip ? <span>{chip}</span> : (
              <>
                <b>{daysLeft}</b>
                <span>days left</span>
              </>
            )}
          </span>

          <SignOutButton className="iconbtn" label="" />
        </div>

        <nav className="internnav" aria-label="Your internship">
          {NAV.map(([label, href, icon]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
              <Icon name={icon} size={17} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </header>

      <main id="main" tabIndex={-1}>{children}</main>
    </div>
  );
}
