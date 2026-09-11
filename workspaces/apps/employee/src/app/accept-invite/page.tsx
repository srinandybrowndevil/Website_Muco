import type { Metadata } from "next";
import { AcceptInviteForm } from "@muco/ui/auth";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Accept your invitation", robots: { index: false, follow: false } };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell title="This link is incomplete">
        <p className="lede">An invitation link carries a token. Open the message again and use the whole link.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Accept your invitation"
      lede="Choose a password and your account is ready. The address shown below is the one this invitation was issued to."
    >
      <AcceptInviteForm token={token} />
    </AuthShell>
  );
}
