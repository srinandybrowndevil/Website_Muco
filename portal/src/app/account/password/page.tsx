import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { primaryMembership } from "@/lib/membership";
import { homeForRole } from "@/lib/auth";
import { ChangePassword } from "@/components/account/ChangePassword";

// Changing your own password, while signed in.
//
// Until now the only way to set a password was the recovery flow: ask for a
// link, leave the product, open your email, come back. That is the right path
// when you have forgotten it and a poor one when you simply want to change it,
// and it made the most urgent security task in the handover harder than it
// needed to be.
//
// It belongs to no workspace. An intern, an employee, a client and the founder
// all change a password the same way, so this sits outside all four rather
// than being written four times.

export const metadata = { title: "Change your password" };

export default async function ChangePasswordPage() {
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening your account.");

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login?next=%2Faccount%2Fpassword");

  // Only to offer a way back to where this person belongs. A missing
  // membership is not a reason to refuse someone their own account settings.
  const { data: rows } = await client.from("memberships")
    .select("organization_id, role, disabled_at").eq("user_id", user.id);
  const membership = primaryMembership(rows);
  const home = membership ? homeForRole(membership.role) : "/";

  return (
    <main className="account">
      <div className="account-card">
        <p className="eyebrow">Your account</p>
        <h1>Change your password.</h1>
        <p className="account-who">Signed in as {user.email}</p>

        <ChangePassword />

        <Link className="authback" href={home}>Back to your workspace</Link>
      </div>
    </main>
  );
}
