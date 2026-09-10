import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { WORKSPACE_HOSTS, workspaceForHost } from "@/lib/workspace-host";
import { WorkspaceHostProvider } from "@/components/WorkspaceHost";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MUCO LABS · Client Workspace", template: "%s · MUCO LABS" },
  description: "Secure client workspace for MUCO LABS projects, invoices, files and support.",
  metadataBase: new URL("https://portal.mucolabs.com"),
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070b",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The address decides which workspace this is, and the whole page inherits
  // it: the links shorten, and the palette changes. Reading it once here means
  // the server and the browser never disagree about which workspace they are
  // rendering, which is what a hydration mismatch is made of.
  const host = (await headers()).get("host");
  const prefix = workspaceForHost(host);
  const workspace = prefix
    ? Object.keys(WORKSPACE_HOSTS).find(label => WORKSPACE_HOSTS[label] === prefix)
    : undefined;

  return (
    <html lang="en-IN" data-workspace={workspace}>
      <body>
        <WorkspaceHostProvider prefix={prefix}>{children}</WorkspaceHostProvider>
      </body>
    </html>
  );
}
