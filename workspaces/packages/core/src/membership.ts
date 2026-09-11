// One account can hold more than one membership row: a founder who is an admin
// of the studio and also a customer of it, or somebody who belongs to two
// organizations. Resolving which one they act under has to have exactly one
// answer, because PostgREST does not promise an order without one — and the
// version of this that let each caller run its own `.limit(1)` produced a
// workspace that admitted an account on one request and redirected it on the
// next.

export type MembershipRow = {
  organization_id?: string;
  role: string;
  disabled_at?: string | null;
};

// Highest privilege first. An admin who also holds a client row is a member of
// staff; the studio is the workspace they are actually working in.
const ROLE_PRIORITY = ["admin", "member", "employee", "intern", "client"];

function rank(role: string) {
  const index = ROLE_PRIORITY.indexOf(role);
  return index === -1 ? ROLE_PRIORITY.length : index;
}

/** The membership an account acts under: highest privilege, then lowest org id. */
export function primaryMembership<T extends MembershipRow>(rows: T[] | null | undefined): T | null {
  // A membership that has been switched off is not a membership. Dropping it
  // here — in the function every caller funnels through — is the same argument
  // as putting disabled_at inside the policy predicates: one place to change,
  // and no page added later can forget it. The database refuses those rows
  // regardless; this is so the interface agrees with the database about why.
  const active = (rows ?? []).filter(row => !row.disabled_at);
  if (active.length === 0) return null;
  return active.sort((a, b) =>
    rank(a.role) - rank(b.role) ||
    (a.organization_id ?? "").localeCompare(b.organization_id ?? "")
  )[0];
}

/**
 * True when this account holds memberships and every one of them is switched
 * off.
 *
 * Worth separating from "has no membership at all": the two are identical to
 * primaryMembership and deserve opposite destinations. Somebody with no
 * membership is a new customer to onboard. Somebody switched off must not be
 * walked back through sign-up, which would invite them to let themselves in.
 */
export function accessSwitchedOff<T extends MembershipRow>(rows: T[] | null | undefined): boolean {
  return !!rows && rows.length > 0 && rows.every(row => !!row.disabled_at);
}
