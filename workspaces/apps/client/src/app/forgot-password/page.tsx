import type { Metadata } from "next";
import { ForgotPasswordForm } from "@muco/ui/auth";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Recover your password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recover your password"
      lede="Enter the address you sign in with and we will send a link that lets you set a new password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
