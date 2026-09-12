import type { Metadata, Viewport } from "next";
import { PreviewBar } from "@muco/ui";
import "@muco/ui/tokens.css";
import "@muco/ui/base.css";
import "@muco/ui/components.css";
import "./theme.css";
import "./chrome.css";

export const metadata: Metadata = {
  title: { default: "MUCO LABS Employee", template: "%s · MUCO LABS Employee" },
  description: "Your projects, your tasks, your compensation and your documents.",
  metadataBase: new URL("https://employee.mucolabs.com"),
  // Three layers of this, because each covers what the others cannot: the tag
  // here, the X-Robots-Tag header on every response, and robots.txt. A meta
  // tag only exists on a response that renders HTML.
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  // Both, in the order the design prefers. Declaring one tells the browser to
  // paint form controls and scrollbars for that theme only.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f8" },
    { media: "(prefers-color-scheme: dark)", color: "#101017" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body><PreviewBar />{children}</body>
    </html>
  );
}
