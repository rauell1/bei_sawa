import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeiSawa — Value-for-Money Review Agent",
  description:
    "A synthetic-data procurement review desk with cited drafts and a private reviewer workspace. Named approval and internal filing require an authorized officer.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
