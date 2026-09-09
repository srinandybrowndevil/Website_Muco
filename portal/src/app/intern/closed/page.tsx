import { LogoutButton } from "@/components/auth/LogoutButton";

// Reached when the lockout refuses entry. It explains which of the three
// reasons applied rather than bouncing someone to a login screen that will
// simply let them back in and refuse again.
const REASONS: Record<string, { title: string; body: string }> = {
  not_started: {
    title: "Your internship has not started yet",
    body: "Access opens on your start date. Nothing is missing and there is nothing to do until then — sign in again on the day you begin.",
  },
  ended: {
    title: "Your internship has ended",
    body: "Access closed after the read-only period that follows the end date. If you still need your certificate, ask your mentor to reopen access.",
  },
  missing: {
    title: "Your internship record is not set up",
    body: "Your account exists but no internship has been attached to it, so there are no dates to open access against. Ask your mentor to complete the setup.",
  },
};

export default async function InternClosed({
  searchParams,
}: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const copy = REASONS[reason ?? ""] ?? REASONS.ended;

  return (
    <main className="page">
      <div className="panel notice" role="status">
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <LogoutButton className="secondary compact" />
      </div>
    </main>
  );
}
