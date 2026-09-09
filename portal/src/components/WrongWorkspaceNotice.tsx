import { LogoutButton } from "./auth/LogoutButton";

/**
 * Shown after the proxy has bounced someone to the workspace their account
 * actually belongs to. Without it a team link simply appears not to open:
 * the click lands on the customer portal (or the team dashboard) with nothing
 * saying the signed-in account was the reason.
 */
export function WrongWorkspaceNotice({ audience }: { audience: "team" | "customer" }) {
  const message = audience === "team"
    ? "That page belongs to the MUCO LABS team workspace. You are signed in as a customer, so we opened your client portal instead."
    : "That page belongs to the client portal. You are signed in as a team member, so we opened the team workspace instead.";
  return (
    <div className="panel notice" role="status">
      <p>{message}</p>
      <p>To open the other one, sign out and sign back in with that account.</p>
      <LogoutButton className="secondary compact" />
    </div>
  );
}
