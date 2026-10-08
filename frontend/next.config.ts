import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const apiTarget = process.env.API_INTERNAL_URL || "http://127.0.0.1:8000";
const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: frontendRoot,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
