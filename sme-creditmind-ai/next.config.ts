import type { NextConfig } from "next";

/** FastAPI base URL for local proxy (server-side only; not exposed to the client). */
const backendInternalOrigin =
  process.env.BACKEND_INTERNAL_ORIGIN ?? "http://127.0.0.1:8012";

const nextConfig: NextConfig = {
  output: "standalone",
  /**
   * Rewrites to FastAPI default to a short proxy timeout (~30s), which breaks long
   * LLM calls (e.g. financial-document-pipeline). Allow several minutes.
   * @see https://github.com/vercel/next.js/issues/36586
   */
  experimental: {
    proxyTimeout: 300_000, // 5 minutes (ms)
  },
  async redirects() {
    return [
      {
        source: "/assets",
        destination: "/live-pos-capture",
        permanent: true,
      },
    ];
  },
  /**
   * Local / self-hosted: proxy `/api/*` to FastAPI so the browser can use same-origin
   * requests (`NEXT_PUBLIC_API_URL` empty → `/api/...`) and avoid CORS issues.
   * On Vercel, `vercel.json` routes `/api` to the Python handler instead — skip rewrites.
   */
  async rewrites() {
    if (process.env.VERCEL) {
      return [];
    }
    const base = backendInternalOrigin.replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${base}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
