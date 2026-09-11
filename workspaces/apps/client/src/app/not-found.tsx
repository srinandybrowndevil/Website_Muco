import Link from "next/link";
import { EmptyState } from "@muco/ui";

export default function NotFound() {
  return (
    <div className="page">
      <EmptyState
        icon="search"
        title="There is nothing at this address"
        action={<Link className="btn primary" href="/">Go to your workspace</Link>}
      >
        The page may have been renamed, or the link may be older than the workspace.
      </EmptyState>
    </div>
  );
}
