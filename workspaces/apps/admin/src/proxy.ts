import { createWorkspaceProxy } from "@muco/core/proxy";

// Every request to admin.mucolabs.com passes through here before it reaches a
// route. It admits the roles this workspace serves and sends everybody else to
// the address that belongs to them.
//
// The same question is asked again inside each page, by requireAccount. That
// is not redundancy for its own sake: this matcher is a regular expression,
// and a regular expression is a thing that acquires holes.
export const proxy = createWorkspaceProxy("admin");

// Static on purpose, and repeated in each of the four applications rather than
// imported: Next.js parses this at build time and refuses anything it cannot
// read as a literal. Static assets are excluded because a session check on
// each of them costs a database round trip per file and protects nothing —
// they are public files served out of /public.
export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf|ico)$).*)"],
};
