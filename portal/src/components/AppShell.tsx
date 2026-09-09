"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { nav } from "@/lib/data";
import { Icon } from "./Icon";
import { LogoutButton } from "./auth/LogoutButton";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LiveRefresh } from "./live/LiveRefresh";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = pathname ?? "";
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nav;
    return nav.filter(([label, href]) =>
      `${label} ${href}`.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!command) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setCommand(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [command]);

  useEffect(() => {
    if (!command) return;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.command input, .command a, .command button, .command [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null && !el.hasAttribute("disabled"));
      if (!focusable.length) return;
      const current = document.activeElement as HTMLElement;
      const idx = focusable.indexOf(current);
      if (e.shiftKey && idx <= 0) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!e.shiftKey && idx >= focusable.length - 1) {
        e.preventDefault();
        focusable[0].focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [command]);

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  const handleCommandKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = filtered.length ? (selected + 1) % filtered.length : 0;
      setSelected(next);
      linkRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = filtered.length ? (selected - 1 + filtered.length) % filtered.length : 0;
      setSelected(prev);
      linkRefs.current[prev]?.focus();
    } else if (e.key === "Enter" && filtered[selected]) {
      e.preventDefault();
      linkRefs.current[selected]?.click();
    }
  };

  return (
    <div className="shell">
      <LiveRefresh />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Workspace sidebar">
        <div className="brand">
          <span className="brandmark">
            <Image src="/logo-mark.svg" alt="" width={34} height={34} priority />
          </span>
          <div>
            <b>MUCO LABS</b>
            <small>TEAM WORKSPACE</small>
          </div>
          <button
            className="iconbtn close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            type="button"
          >
            <Icon name="x" />
          </button>
        </div>
        <nav aria-label="Workspace">
          {nav.map(([label, href, icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={isActive(href) ? "active" : ""}
              aria-current={isActive(href) ? "page" : undefined}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {!isSupabaseConfigured && label === "Follow-ups" && <em>4</em>}
            </Link>
          ))}
        </nav>
        <div className="sidefoot">
          <Link href={isSupabaseConfigured ? "/requests" : "/portal"}>
            <span className="avatar small">CP</span>
            <span>
              <b>{isSupabaseConfigured ? "Customer requests" : "Customer portal"}</b>
              <small>{isSupabaseConfigured ? "Open team inbox" : "Preview client view"}</small>
            </span>
          </Link>
          <div className="workspace">
            <span className="avatar">ML</span>
            <span>
              <b>Workspace</b>
              <small>MUCO team</small>
            </span>
            <LogoutButton className="logoutlink" />
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="scrim"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          type="button"
        />
      )}
      <section className="mainarea">
        <header className="topbar">
          <button
            className="iconbtn mobile"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            type="button"
          >
            <Icon name="menu" />
          </button>
          <button
            className="global-search"
            onClick={() => { setQuery(""); setSelected(0); setCommand(true); }}
            aria-label="Open command palette (Ctrl+K or Cmd+K)"
            type="button"
          >
            <Icon name="search" />
            <span>Search anything…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topactions">
            <span className="demo">{isSupabaseConfigured ? "Connected workspace" : "Demo mode"}</span>
            <Link href="/enquiries"
              className="iconbtn"
              aria-label="Open enquiry inbox"
            >
              <Icon name="bell" />
            </Link>
            <Link className="primary compact" href="/leads">
              <Icon name="plus" />
              New lead
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </section>
      {command && (
        <div
          className="modalback"
          onClick={() => setCommand(false)}
          role="presentation"
        >
          <div
            className="command"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <Icon name="search" />
              <input
                ref={inputRef}
                placeholder="Search pages and records…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleCommandKey}
                aria-label="Search pages"
                aria-autocomplete="list"
                aria-controls="command-results"
              />
              <kbd>ESC</kbd>
            </div>
            <p id="command-results">Quick navigation</p>
            {filtered.length > 0 ? (
              filtered.map(([label, href, icon], i) => (
                <Link
                  key={href}
                  href={href}
                  ref={(el) => { linkRefs.current[i] = el; }}
                  onClick={() => setCommand(false)}
                  aria-selected={i === selected}
                  onMouseEnter={() => setSelected(i)}
                  onFocus={() => setSelected(i)}
                >
                  <Icon name={icon} />
                  {label}
                  <span>↗</span>
                </Link>
              ))
            ) : (
              <div className="commandempty">
                No matching pages. Try a different term.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
