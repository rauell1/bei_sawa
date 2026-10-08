import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeiSawa — Value-for-Money Review Agent",
  description:
    "A synthetic-data procurement review desk with cited drafts and a private reviewer workspace. No approval or filing action is implemented.",
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
