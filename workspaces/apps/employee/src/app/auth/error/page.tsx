import Link from "next/link";
import type { Metadata } from "next";
import { Callout } from "@muco/ui";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Link problem", robots: { index: false, follow: false } };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const expired = reason === "expired";

  return (
    <AuthShell title="That link did not work">
      <Callout tone="warn" title={expired ? "The link has expired." : "The link is incomplete."}>
        {expired
          ? "Email links are valid for one hour and can be used once. Ask for a new one and it will work."
          : "Some mail clients shorten long links. Open the message again and use the whole link, or ask for a new one."}
      </Callout>
      <Link className="btn primary block" href="/forgot-password">Send me a new link</Link>
      <Link className="hint" href="/login">Back to sign in</Link>
    </AuthShell>
  );
}
