import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeiSawa — Value-for-Money Review Agent",
  description:
    "A synthetic-data procurement review prototype with cited drafts. No authenticated approval or filing path is implemented.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
