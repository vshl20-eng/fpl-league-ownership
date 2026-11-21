import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FPL League Ownership",
  description: "See how widely your FPL squad is owned across your mini-league.",
  applicationName: "FPL League Ownership",
  appleWebApp: {
    capable: true,
    title: "FPL Ownership",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
