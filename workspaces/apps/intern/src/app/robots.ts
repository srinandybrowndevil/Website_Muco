import type { MetadataRoute } from "next";

// A logged-in workspace has nothing a search engine should index, and being
// indexed is actively harmful: a crawler that follows a link here gets a
// sign-in page, and the sign-in page is what ends up in the results under the
// studio's name.
//
// Three layers, because each covers what the others cannot. This file is the
// one a crawler asks for first. The X-Robots-Tag header in next.config covers
// responses that render no HTML. The per-page meta tag covers the rest.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
