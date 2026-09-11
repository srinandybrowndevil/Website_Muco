import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@muco/ui/auth";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" lede="Status, scope, milestones, files, previews and billing. This workspace is for your project only.">
      {/* The form reads the query string — the destination to return to, and
          whether this visit is a switched-off account or somebody who arrived
          at the wrong front door — so it renders inside a boundary. */}
      <Suspense fallback={<p className="hint">Loading</p>}>
        <SignInForm workspace="client" />
      </Suspense>
    </AuthShell>
  );
}
