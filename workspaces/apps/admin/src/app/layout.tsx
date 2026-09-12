import type { Metadata, Viewport } from "next";
import { PreviewBar } from "@muco/ui";
import "@muco/ui/tokens.css";
import "@muco/ui/base.css";
import "@muco/ui/components.css";
import "./theme.css";
import "./chrome.css";

export const metadata: Metadata = {
  title: { default: "MUCO LABS Admin", template: "%s · MUCO LABS Admin" },
  description: "Run the studio: people, projects, grants, certificates and the audit trail.",
  metadataBase: new URL("https://admin.mucolabs.com"),
  // Three layers of this, because each covers what the others cannot: this
  // tag, the X-Robots-Tag header on every response, and robots.txt. A meta tag
  // only exists on a response that renders HTML.
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  // Both, in the order the design prefers. Declaring one tells the browser to
  // paint form controls and scrollbars for that theme only.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body><PreviewBar />{children}</body>
    </html>
  );
}
