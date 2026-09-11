import { createWorkspaceProxy } from "@muco/core/proxy";

// Every request to client.mucolabs.com passes through here before it reaches a
// route. It admits clients and sends everybody else to the address that
// belongs to them.
//
// It also answers on portal.mucolabs.com, which is retired as a workspace and
// kept as an address: that hostname is in several hundred published links, on
// every page of the marketing site, and in mail already sent to customers. A
// request arriving there is redirected here permanently, path intact, rather
// than being served the same pages under a second name — two addresses for one
// product means two sets of cookies and a canonical nobody chose.
export const proxy = createWorkspaceProxy("client", {
  redirectHosts: { portal: "client" },
});

// Static on purpose, and repeated in each of the four applications rather than
// imported: Next.js parses this at build time and refuses anything it cannot
// read as a literal. Static assets are excluded because a session check on
// each of them costs a database round trip per file and protects nothing —
// they are public files served out of /public.
export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf|ico)$).*)"],
};
