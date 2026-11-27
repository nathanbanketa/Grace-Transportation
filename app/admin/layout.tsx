import type { Metadata, Viewport } from "next";

import "./driver.css";

export const viewport: Viewport = { themeColor: "#111214", viewportFit: "cover" };

export const metadata: Metadata = {
  title: "Driver dashboard | Grace Transportation",
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Grace Driver", statusBarStyle: "black-translucent" },
  icons: { apple: "/driver-icon-192.png" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
