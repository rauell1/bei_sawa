import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "../../brand-mark";
export const dynamic = "force-static";
/** PNG rather than SVG for mail clients that block SVG images. */
export function GET() {
  return new ImageResponse(<div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "white" }}><BrandMark size={152} color={BRAND.forest} accent={BRAND.sage} /></div>, { width: 180, height: 180 });
}
