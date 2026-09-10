import { WorkspaceLink as Link } from "@/components/WorkspaceHost";
import Image from "next/image";
import { LogoutButton } from "../auth/LogoutButton";

// Deliberately quieter than the team workspace and narrower than the client
// portal. An intern has one project slice and their own record; a sidebar of
// studio sections would only advertise doors that are locked.
//
// Specification section 11.3 lists more pages than exist yet. The nav carries
// what is built rather than links to nothing.
const NAV = [
  ["Internship", "/intern"],
  ["Work log", "/intern/log"],
  ["Certificate", "/intern/certificate"],
] as const;

export function InternShell({
  children,
  readOnly = false,
}: { children: React.ReactNode; readOnly?: boolean }) {
  return (
    <div className="clientportal internportal">
      <header>
        <Link className="authbrand" href="/intern" aria-label="Intern workspace home">
          <Image src="/logo-mark.svg" alt="" width={26} height={26} priority />
          <b>MUCO LABS</b><span className="brandws">Internship</span>
        </Link>
        <nav className="portaldesktop" aria-label="Intern workspace">
          {NAV.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div>
          <span className="demo">{readOnly ? "Read-only" : "Intern"}</span>
          <LogoutButton className="secondary compact" />
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
