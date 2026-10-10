import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "./brand-mark";
export const alt = "BeiSawa — Value, with evidence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const font = await readFile(join(process.cwd(), "public/brand/DejaVuSans-Bold.ttf"));
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: "80px", background: "#f7f8f4", color: BRAND.forest }}>
    <div style={{ display: "flex", alignItems: "center", gap: "26px" }}><BrandMark size={130} color={BRAND.forest} accent={BRAND.sage} /><span style={{ fontSize: 104, fontFamily: "BeiSawa Wordmark", fontWeight: 700, letterSpacing: "-5px" }}>{BRAND.wordmark}</span></div>
    <div style={{ display: "flex", marginTop: "40px", fontSize: 44 }}>{BRAND.tagline}</div>
    <div style={{ display: "flex", marginTop: "24px", fontSize: 24 }}>Cited drafts. Human review. A private workspace.</div>
    <div style={{ display: "flex", marginTop: "48px", fontSize: 20 }}>beisawa.rauell.systems</div>
  </div>, { ...size, fonts: [{ name: "BeiSawa Wordmark", data: font, weight: 700, style: "normal" }] });
}
