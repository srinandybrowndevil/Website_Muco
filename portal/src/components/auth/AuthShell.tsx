import Link from "next/link";
import Image from "next/image";

type AuthStatusProps = {
  tone?: "success" | "error";
  title: string;
  children: React.ReactNode;
};

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth">
      <section className="authstory">
        <Link href="/" className="authbrand">
          <span className="brandmark">
            <Image src="/logo-mark.svg" alt="" width={32} height={32} priority />
          </span>
          <b>MUCO LABS</b>
        </Link>
        <div>
          <p className="eyebrow">Client workspace, Erode</p>
          <h1>
            Clear projects.<br />
            <i>Honest progress.</i>
          </h1>
          <p>
            A secure place for MUCO LABS clients and team to track work, share
            files and settle invoices — built for Tamil Nadu businesses.
          </p>
        </div>
        <blockquote>
          “Good design is as little design as possible.”
          <small>DIETER RAMS</small>
        </blockquote>
      </section>
      <section className="authform">
        <div>{children}</div>
      </section>
    </main>
  );
}

export function AuthStatus({ tone = "success", title, children }: AuthStatusProps) {
  return (
    <div
      className={`authstatus ${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <b>{title}</b>
      {/* A div, not a p: callers pass a list of validation errors, and a
          paragraph cannot legally contain one. The browser closes the
          paragraph early when it happens, which is invalid markup and a
          console error on the screen where someone is already stuck. */}
      <div className="authstatus-body">{children}</div>
    </div>
  );
}
