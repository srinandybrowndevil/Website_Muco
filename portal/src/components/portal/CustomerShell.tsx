"use client";

import { WorkspaceLink as Link } from "@/components/WorkspaceHost";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { initials } from "@/lib/requests";
import { LiveRefresh } from "@/components/live/LiveRefresh";

const nav = [
  ["Dashboard", "/portal", "grid"],
  ["Projects", "/portal#projects", "briefcase"],
  ["Requests", "/portal/requests", "inbox"],
  ["Files", "/portal#files", "file"],
  ["New request", "/portal/requests/new", "plus"],
] as const;

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = createClient();
    if (!client) return;
    const loadProfile = async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const meta = user?.user_metadata ?? {};
      const { data: profile } = await client.from("profiles").select("full_name,avatar_url").eq("id", user.id).maybeSingle();
      setUserName(profile?.full_name ?? meta.full_name ?? user.email ?? "Customer");
      setAvatar(profile?.avatar_url ?? null);
    };
    void loadProfile();
    const onProfileUpdated = () => void loadProfile();
    window.addEventListener("muco-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("muco-profile-updated", onProfileUpdated);
  }, []);

  const path = pathname ?? "";
  const isActive = (href: string) => {
    if (href === "/portal") return path === href;
    if (href.startsWith("/portal#")) return path === "/portal";
    if (href === "/portal/requests") return path === href || /^\/portal\/requests\/[^/]+$/.test(path);
    return path === href;
  };
  const label = userName ? `Welcome, ${userName.split(" ")[0]}` : "Customer portal";

  return (
    <div className="clientportal">
      <LiveRefresh />
      <header>
        <Link href="/portal" className="authbrand">
          <span className="brandmark">
            <Image src="/logo-mark.svg" alt="" width={32} height={32} priority />
          </span>
          <b>MUCO LABS</b><span className="brandws">Client</span>
        </Link>

        <button
          className="iconbtn mobile"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          type="button"
        >
          <Icon name="menu" />
        </button>

        <nav className="portaldesktop" aria-label="Customer portal">
          {nav.map(([label, href, icon]) => (
            <Link
              key={href}
              href={href}
              className={isActive(href) ? "active" : ""}
              aria-current={isActive(href) ? "page" : undefined}
            >
              <Icon name={icon} size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div>
          <span className="demo">Client portal</span>
          <Link className="profilechip" href="/portal/profile" aria-label="Open your profile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar ? <img src={avatar} className="avatar profile-photo" alt="" width={34} height={34} /> : <span className="avatar">{userName ? initials(userName) : "CP"}</span>}
            <span className="profilechip-name">{userName ?? "Profile"}</span>
          </Link>
          <LogoutButton className="secondary compact" />
        </div>
      </header>

      {open && (
        <>
          <button
            className="scrim"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            type="button"
          />
          <aside className="portalsidebar" aria-label="Customer portal menu">
            <div className="brand">
              <span className="brandmark">
                <Image src="/logo-mark.svg" alt="" width={32} height={32} priority />
              </span>
              <b>MUCO LABS</b><span className="brandws">Client</span>
              <button
                className="iconbtn close"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                type="button"
              >
                <Icon name="x" />
              </button>
            </div>
            <nav aria-label="Customer portal">
              {nav.map(([label, href, icon]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={isActive(href) ? "active" : ""}
                  aria-current={isActive(href) ? "page" : undefined}
                >
                  <Icon name={icon} size={16} />
                  <span>{label}</span>
                </Link>
              ))}
              <Link href="/portal/profile" onClick={() => setOpen(false)} className={path === "/portal/profile" ? "active" : ""} aria-current={path === "/portal/profile" ? "page" : undefined}>
                <Icon name="user" size={16} />
                <span>Profile</span>
              </Link>
            </nav>
          </aside>
        </>
      )}

      <main>
        <p className="eyebrow">{label}</p>
        {children}
      </main>
    </div>
  );
}
