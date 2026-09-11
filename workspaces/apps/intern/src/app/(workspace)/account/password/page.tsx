import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { ChangePasswordForm } from "@muco/ui/auth";

export const metadata: Metadata = { title: "Your password", robots: { index: false, follow: false } };

// Your own account belongs to no workspace: it is reachable from whichever of
// the four you are signed in to, and it never takes a workspace name in its
// path. Changing a password here changes it everywhere, because there is one
// identity behind all four addresses.
export default async function PasswordPage() {
  const account = await requireAccount("intern");

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Your account</span>
        <h1>Password</h1>
        <p className="lede">
          You have one account across every MUCO LABS workspace, so changing this changes how you
          sign in everywhere. Your current password is checked before the new one is set.
        </p>
      </div>

      <div className="panel" style={{ maxWidth: 520 }}>
        <div className="panel-body">
          <ChangePasswordForm email={account.email ?? ""} />
        </div>
      </div>
    </div>
  );
}
