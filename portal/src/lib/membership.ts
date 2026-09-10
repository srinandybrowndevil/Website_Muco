// One account can hold more than one membership row -- a founder who is an
// admin of the team workspace and also a customer of it, or someone who
// belongs to two organizations. Every caller used to run its own
// `.limit(1)` against that set, and no two agreed:
//
//   proxy.ts        no role filter, no order  -> whichever row came back first
//   workspace.ts    no role filter, by org id
//   login/callback  no role filter, no order
//   team pages      role in (admin, member), no order
//
// PostgREST does not promise an order without one, so the proxy could decide
// "client" and bounce a team member to /portal on one request and let the
// same account into the workspace on the next. That is what made the admin
// request inbox look intermittently broken: the page guard would have allowed
// it, but the proxy had already redirected.
//
// Resolving identity through this one function makes the answer deterministic
// and the same everywhere. Highest privilege wins, because an admin who also
// holds a client row is a member of staff; the team workspace is the account
// they are actually working in.

export type MembershipRow = { organization_id?: string; role: string; disabled_at?: string | null };

const ROLE_PRIORITY = ["admin", "member", "client"];

function rank(role: string) {
  const index = ROLE_PRIORITY.indexOf(role);
  return index === -1 ? ROLE_PRIORITY.length : index;
}

/** The membership an account acts under: highest privilege, then lowest org id. */
export function primaryMembership<T extends MembershipRow>(rows: T[] | null | undefined): T | null {
  // A membership that has been switched off is not a membership. Dropping it
  // here, in the function every caller already funnels through, is the same
  // argument as putting disabled_at inside the policy predicates: one place to
  // change, and no page added later can forget to check. A caller that selects
  // without disabled_at simply sees the row as active, which is the previous
  // behaviour rather than a new hole -- the database refuses it regardless.
  const active = (rows ?? []).filter(row => !row.disabled_at);
  if (active.length === 0) return null;
  return active.sort((a, b) =>
    rank(a.role) - rank(b.role) ||
    (a.organization_id ?? "").localeCompare(b.organization_id ?? "")
  )[0];
}

/**
 * True when this account holds memberships and every one of them is switched
 * off. Worth separating from "has no membership at all": the two look
 * identical to primaryMembership but deserve opposite destinations. Somebody
 * with no membership is a new customer to be onboarded; somebody who has been
 * switched off must not be walked back through sign-up.
 */
export function accessSwitchedOff<T extends MembershipRow>(rows: T[] | null | undefined): boolean {
  return !!rows && rows.length > 0 && rows.every(row => !!row.disabled_at);
}

/** Ordering for callers that have already filtered to team roles. */
export function teamMembership<T extends MembershipRow>(rows: T[] | null | undefined): T | null {
  return primaryMembership(rows);
}
