"use client";
import Link from "next/link";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return <main className="page"><section className="panel"><p className="eyebrow">Workspace unavailable</p><h1>We could not open this workspace.</h1><p>Try again. If this is a new installation, finish the Supabase migrations and administrator setup in the deployment guide.</p><div className="live-tools"><button className="primary" onClick={reset}>Try again</button><Link className="secondary" href="/login">Sign in</Link></div></section></main>;
}
