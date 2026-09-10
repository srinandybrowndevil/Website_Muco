import type { MetadataRoute } from "next";

// The workspaces asked a crawler to sign in.
//
// /robots.txt was not a public path, so the proxy redirected it to
// /login?next=%2Frobots.txt on all five hosts. A crawler following that lands
// on an HTML page, which is read as "this site has no robots.txt", so none of
// these hosts has ever carried a crawl directive. The meta noindex on each
// page still did its job, but only for pages that render one: an API route or
// any non-HTML response had nothing at all.
//
// Nothing behind these addresses is for the public. Every path is disallowed
// and no sitemap is offered, because there is nothing here to index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
