import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
