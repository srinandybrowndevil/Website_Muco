// Formatting is a correctness surface, not a convenience one.
//
// The studio is in Erode and bills in rupees, so every date is read in
// Asia/Kolkata and every amount is rendered in INR. Leaving either to the
// browser's locale means a client in Dubai and the founder in Erode disagree
// about which day a milestone is due — and a date column is exactly the place
// where that disagreement stays invisible until it matters.

const ZONE = "Asia/Kolkata";
const LOCALE = "en-IN";

const DAY = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: ZONE });
const DAY_LONG = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: ZONE });
const DAY_TIME = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric", month: "short", year: "numeric",
  hour: "numeric", minute: "2-digit", hour12: true, timeZone: ZONE,
});
const MONEY = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 12 Nov 2026 */
export function formatDate(value: string | Date | null | undefined, fallback = "—"): string {
  const date = parse(value);
  return date ? DAY.format(date) : fallback;
}

/** 12 November 2026 — for certificates and anything a person signs. */
export function formatDateLong(value: string | Date | null | undefined, fallback = "—"): string {
  const date = parse(value);
  return date ? DAY_LONG.format(date) : fallback;
}

/** 12 Nov 2026, 4:30 pm */
export function formatDateTime(value: string | Date | null | undefined, fallback = "—"): string {
  const date = parse(value);
  return date ? DAY_TIME.format(date) : fallback;
}

/** Rupees, whole. */
export function formatMoney(amount: number | string | null | undefined, fallback = "—"): string {
  if (amount === null || amount === undefined || amount === "") return fallback;
  const value = typeof amount === "string" ? Number(amount) : amount;
  return Number.isFinite(value) ? MONEY.format(value) : fallback;
}

/** The calendar day a timestamp falls on in Asia/Kolkata, as an epoch. */
function calendarDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONE,
  }).format(date);
  return Date.parse(`${parts}T00:00:00Z`);
}

/**
 * Whole days from today to a date, in the studio's timezone.
 *
 * Positive means the date is ahead. Both sides are reduced to a calendar day
 * before subtracting, so "ends today" is 0 rather than a fraction that rounds
 * the wrong way in the evening — which is the difference between an internship
 * that says "ends today" and one that says "ended yesterday" at 6pm on its
 * final day.
 */
export function daysUntil(value: string | Date | null | undefined): number | null {
  const date = parse(value);
  if (!date) return null;
  return Math.round((calendarDay(date) - calendarDay(new Date())) / 86_400_000);
}

/** "in 12 days", "today", "6 days ago" */
export function relativeDays(value: string | Date | null | undefined, fallback = "—"): string {
  const days = daysUntil(value);
  if (days === null) return fallback;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

/** Two letters for an avatar, from a name or an email. */
export function initials(name: string | null | undefined, email?: string | null): string {
  const source = (name ?? "").trim() || (email ?? "").split("@")[0].replace(/[._-]+/g, " ");
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "··";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Sentence case for an enum value: "on_hold" becomes "On hold". */
export function humanise(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const words = value.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A count with its noun pluralised: 1 task, 3 tasks, 0 tasks. */
export function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Today, as the studio's calendar sees it.
 *
 * Not `new Date().toISOString().slice(0, 10)`, which is the obvious version and
 * is wrong for five and a half hours of every day: it is UTC, so between
 * midnight and 5:30am in Erode it names yesterday. A query filtering "grants
 * expiring from today" against that misses a day's worth of rows, every night,
 * silently.
 */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONE,
  }).format(new Date());
}

/** A calendar day this many days from today, in the studio's timezone. */
export function daysFromToday(days: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONE,
  }).format(new Date(Date.now() + days * 86_400_000));
}

/** True when a date has already passed. Null and unparseable are not past. */
export function isPast(value: string | Date | null | undefined): boolean {
  const days = daysUntil(value);
  return days !== null && days < 0;
}

/** True when a date is today or within the next `days` days. */
export function isWithin(value: string | Date | null | undefined, days: number): boolean {
  const left = daysUntil(value);
  return left !== null && left >= 0 && left <= days;
}

/**
 * A grant, an internship or anything else with an optional end date is live
 * when it has no end date or its end date has not passed.
 *
 * Worth having in one place: written inline it comes out four slightly
 * different ways, and one of them treats a grant expiring today as already
 * expired.
 */
export function stillLive(endsAt: string | null | undefined): boolean {
  return !endsAt || !isPast(endsAt);
}
