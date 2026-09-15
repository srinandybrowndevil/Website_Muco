import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerOnboardingForm } from "@muco/ui/auth";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Finish customer setup",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <AuthShell
      title="Finish your customer setup"
      lede="Confirm the details we should use when we reply to your project request."
    >
      <Suspense fallback={<p className="hint">Loading</p>}>
        <CustomerOnboardingForm />
      </Suspense>
    </AuthShell>
  );
}
