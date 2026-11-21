import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FPL League Ownership",
  description: "See how widely your FPL squad is owned across your mini-league.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
