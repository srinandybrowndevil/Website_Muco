import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@muco/ui/auth";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Create customer account",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your customer account"
      lede="Send project requests, track progress and keep files and replies together in your MUCO LABS workspace."
    >
      <Suspense fallback={<p className="hint">Loading</p>}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
