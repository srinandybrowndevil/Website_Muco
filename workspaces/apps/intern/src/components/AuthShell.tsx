import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The frame around every page somebody can reach without a session.
 *
 * The form inside it is shared across all four workspaces — four copies of a
 * sign-in form would be four chances to get the redirect validation wrong.
 * What is not shared is this: the statement on the right says what this
 * particular workspace is, so somebody who lands on the wrong address can tell
 * before typing a password.
 */
export function AuthShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <div className="authpage">
      <div className="authform">
        <div className="authmark">
          <Image src="/logo-mark.svg" alt="" width={36} height={36} priority />
          <div>
            <b>MUCO LABS</b>
            <small>Intern</small>
          </div>
        </div>

        <div className="page-head">
          <h1>{title}</h1>
          {lede ? <p className="lede">{lede}</p> : null}
        </div>

        {children}
      </div>

      <aside className="authaside">
        <Image src="/logo-mark.svg" alt="" width={28} height={28} />
        <div className="stack-sm">
          <h2>Your internship, from the first day to the certificate.</h2>
          <p>Your dates, the work assigned to you, your daily log and your learning material. Your certificate unlocks when the founder approves your completion, and anyone can verify it afterwards from its serial.</p>
        </div>
        <p className="notice">
          <span>MUCO LABS · Erode, Tamil Nadu · Monday to Saturday, 9am to 7pm</span>
        </p>
      </aside>
    </div>
  );
}
