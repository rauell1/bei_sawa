import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "../../brand-mark";
export const dynamic = "force-static";
export async function GET() {
  const font = await readFile(join(process.cwd(), "public/brand/DejaVuSans-Bold.ttf"));
  return new ImageResponse(<div style={{ display: "flex", alignItems: "center", gap: "20px", width: "100%", height: "100%", background: "white", color: BRAND.forest, padding: "12px" }}>
    <BrandMark size={118} color={BRAND.forest} accent={BRAND.sage} />
    <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontFamily: "BeiSawa Wordmark", fontSize: 76, fontWeight: 700, letterSpacing: "-3px" }}>{BRAND.wordmark}</span><span style={{ fontSize: 14, letterSpacing: "3px", marginTop: "8px" }}>{BRAND.tagline.toUpperCase()}</span></div>
  </div>, { width: 600, height: 150, fonts: [{ name: "BeiSawa Wordmark", data: font, weight: 700, style: "normal" }] });
}
