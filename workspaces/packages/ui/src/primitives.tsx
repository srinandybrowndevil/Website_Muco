import type { ReactNode } from "react";
import { Icon } from "./Icon";

/* ------------------------------------------------------------------ status */

type Tone = "ok" | "warn" | "bad" | "info" | "neutral";
type Shape = "filled" | "open" | "stopped";

/**
 * Every status value in the schema, mapped once.
 *
 * Four applications reading the same enums will otherwise each invent their
 * own colour for "on_hold", and a client and the founder will look at the same
 * project and see two different severities. The shape matters as much as the
 * tone: filled means running, hollow means waiting on somebody, a bar means
 * stopped. That survives greyscale and colour blindness, which colour alone
 * does not.
 */
const STATUS: Record<string, [Tone, Shape]> = {
  // running
  active: ["ok", "filled"],
  completed: ["ok", "filled"],
  certified: ["ok", "filled"],
  accepted: ["ok", "filled"],
  paid: ["ok", "filled"],
  won: ["ok", "filled"],
  converted: ["ok", "filled"],
  // waiting on somebody
  planning: ["info", "open"],
  invited: ["info", "open"],
  open: ["info", "open"],
  new: ["info", "open"],
  draft: ["neutral", "open"],
  sent: ["info", "filled"],
  viewed: ["info", "filled"],
  reviewing: ["info", "filled"],
  contacted: ["info", "filled"],
  qualified: ["info", "filled"],
  proposal: ["info", "filled"],
  negotiation: ["info", "filled"],
  needs_info: ["warn", "open"],
  // stopped, recoverable
  on_hold: ["warn", "stopped"],
  paused: ["warn", "stopped"],
  overdue: ["bad", "filled"],
  // stopped, final
  expired: ["bad", "stopped"],
  dismissed: ["bad", "stopped"],
  declined: ["bad", "stopped"],
  lost: ["bad", "stopped"],
  spam: ["bad", "stopped"],
  cancelled: ["neutral", "stopped"],
  void: ["neutral", "stopped"],
  ended: ["neutral", "stopped"],
  closed: ["neutral", "stopped"],
};

export function StatusPill({ value, label }: { value: string | null | undefined; label?: string }) {
  const key = (value ?? "").toLowerCase();
  const [tone, shape] = STATUS[key] ?? (["neutral", "open"] as [Tone, Shape]);
  const words = (label ?? key).replace(/[_-]+/g, " ");
  return (
    <span className={`pill ${tone}`} data-shape={shape}>
      {words ? words.charAt(0).toUpperCase() + words.slice(1) : "Unknown"}
    </span>
  );
}

/* ------------------------------------------------------------------ pieces */

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "··";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls = size === "md" ? "avatar" : `avatar ${size}`;
  if (src) {
    return (
      <span className={cls}>
        {/* Deliberately a plain img: these are Supabase storage URLs on an
            origin the image optimiser is not configured for, and a broken
            optimiser turns every avatar into a 400. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={52} height={52} />
      </span>
    );
  }
  return <span className={cls} aria-hidden="true">{initialsOf(name)}</span>;
}

export function EmptyState({
  icon = "inbox",
  title,
  children,
  action,
}: {
  icon?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="mark"><Icon name={icon} size={22} /></span>
      <b>{title}</b>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Metric({
  label,
  value,
  note,
  href,
  attention = false,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  href?: string;
  attention?: boolean;
}) {
  const body = (
    <>
      <span className="k">{label}</span>
      <span className="v">{value}</span>
      {note ? <span className="n">{note}</span> : null}
    </>
  );
  const cls = `metric${attention ? " attention" : ""}`;
  return href ? <a className={cls} href={href}>{body}</a> : <div className={cls}>{body}</div>;
}

export function Fact({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{children}</dd>
    </div>
  );
}

export function Facts({ children }: { children: ReactNode }) {
  return <dl className="facts">{children}</dl>;
}

export function Callout({
  tone = "info",
  icon,
  title,
  children,
}: {
  tone?: "info" | "ok" | "warn" | "bad" | "accent";
  icon?: string;
  title?: string;
  children: ReactNode;
}) {
  const glyph = icon ?? (tone === "warn" || tone === "bad" ? "alert" : tone === "ok" ? "checkCircle" : "info");
  return (
    <div className={`callout ${tone}`} role={tone === "bad" ? "alert" : undefined}>
      <Icon name={glyph} size={18} />
      <div>
        {title ? <b>{title}</b> : null}
        <p>{children}</p>
      </div>
    </div>
  );
}

export function Bar({
  value,
  max = 100,
  tone,
  label,
}: {
  value: number;
  max?: number;
  tone?: "ok" | "warn" | "bad";
  label: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div
      className={`bar${tone ? ` ${tone}` : ""}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * A countdown drawn as an arc rather than printed as a number.
 *
 * Used for the one thing an intern opens their workspace to find out — how
 * long is left — because "37" and "4" read identically as text and completely
 * differently as a shape.
 */
export function Dial({
  value,
  total,
  caption,
  unit,
}: {
  value: number;
  total: number;
  caption: string;
  unit: string;
}) {
  const size = 132;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return (
    <figure className="dial">
      <div className="dial-face">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${value} ${unit}, ${caption}`}
        >
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * ratio} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span className="dial-centre" aria-hidden="true">
          <b>{value}</b>
          <small>{unit}</small>
        </span>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/**
 * The password rules, ticking off as they are met.
 *
 * Takes the result rather than computing it, so this package keeps no
 * dependency on the rules themselves — the sign-in pages all call
 * passwordRequirements from @muco/core and hand the answer here.
 */
export function Requirements({ items }: { items: [string, boolean][] }) {
  return (
    <ul className="requirements" aria-live="polite">
      {items.map(([label, met]) => (
        <li key={label} className={met ? "met" : undefined}>
          <Icon name={met ? "checkCircle" : "circle"} size={14} />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

export { Icon };
