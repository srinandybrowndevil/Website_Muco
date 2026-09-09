import Link from "next/link";
import { Icon } from "./Icon";

// An empty state is the first screen a new account sees: before any data
// exists, it IS the product. The versions this replaced were dead ends --
// "Nothing shared yet." with nowhere to go -- so a customer's first
// impression was three sentences telling them there was nothing here.
//
// Every empty state now answers three things: what this space is for, why it
// is empty right now, and the one thing worth doing next. `action` is not
// optional by accident; a surface with genuinely nothing to do should say so
// in `note` instead, rather than leaving the reader stranded.
//
// `celebrate` marks the other kind of empty. An inbox that is empty because
// the reader cleared it is not the same screen as one that has never had
// anything in it, and it should not feel like a shrug -- it is the state they
// were working towards.

type Action = { label: string; href: string } | { label: string; onClick: () => void };

export function EmptyState({
  icon = "grid",
  title,
  body,
  action,
  secondary,
  note,
  compact = false,
  celebrate = false,
}: {
  icon?: string;
  title: string;
  body: string;
  action?: Action;
  secondary?: Action;
  note?: string;
  compact?: boolean;
  /** Empty because the reader cleared it, not because nothing ever arrived. */
  celebrate?: boolean;
}) {
  return (
    <div className={`emptystate${compact ? " compact" : ""}${celebrate ? " celebrate" : ""}`}>
      <span className="emptystate-icon" aria-hidden="true"><Icon name={icon} size={compact ? 20 : 26} /></span>
      <h3>{title}</h3>
      <p>{body}</p>
      {(action || secondary) && (
        <div className="emptystate-actions">
          {action && renderAction(action, "primary")}
          {secondary && renderAction(secondary, "secondary")}
        </div>
      )}
      {note && <p className="emptystate-note">{note}</p>}
    </div>
  );
}

function renderAction(action: Action, className: string) {
  return "href" in action
    ? <Link className={className} href={action.href}>{action.label}</Link>
    : <button type="button" className={className} onClick={action.onClick}>{action.label}</button>;
}
