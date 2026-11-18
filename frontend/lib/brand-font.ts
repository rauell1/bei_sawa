import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const FONT_PATH = "/brand/DejaVuSans-Bold.ttf";

/**
 * The wordmark font for generated images. On Node (build, local dev) it is
 * read from public/. A Cloudflare Worker has no copy of public/ on disk (the
 * read failed with ENOENT and the share image answered 500), so there it comes
 * from the static assets binding.
 */
export async function loadBrandFont(): Promise<ArrayBuffer> {
  try {
    const file = await readFile(join(process.cwd(), "public", FONT_PATH));
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  } catch (error) {
    const { env } = await getCloudflareContext({ async: true });
    const assets = (env as { ASSETS?: { fetch(input: string): Promise<Response> } }).ASSETS;
    if (!assets) throw error;
    const response = await assets.fetch(`https://assets.local${FONT_PATH}`);
    if (!response.ok) throw new Error(`Brand font unavailable (${response.status})`);
    return response.arrayBuffer();
  }
}
