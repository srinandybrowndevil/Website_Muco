import type { Metadata } from "next";
import { ResetPasswordForm } from "@muco/ui/auth";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      lede="Choose something long rather than something complicated. Four unrelated words beat a short password with symbols in it."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
