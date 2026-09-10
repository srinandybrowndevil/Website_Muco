import { WorkspaceLink as Link } from "@/components/WorkspaceHost";
import Image from "next/image";
import { LogoutButton } from "../auth/LogoutButton";

const NAV = [
  ["Projects", "/staff"],
  ["My compensation", "/staff/compensation"],
  ["My mentees", "/staff/mentees"],
  ["Profile", "/staff/profile"],
] as const;

export function StaffShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="clientportal staffportal">
      <header>
        <Link className="authbrand" href="/staff" aria-label="Staff workspace home">
          <Image src="/logo-mark.svg" alt="" width={26} height={26} priority />
          <b>MUCO LABS</b><span className="brandws">Staff</span>
        </Link>
        <nav className="portaldesktop" aria-label="Staff workspace">
          {NAV.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div>
          <span className="demo">Staff</span>
          <LogoutButton className="secondary compact" />
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
