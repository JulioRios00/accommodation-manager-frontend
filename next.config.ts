import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    // BACKEND_URL is a server-side-only Vercel env var (no NEXT_PUBLIC_ prefix).
    // Falls back to Render if not set, so local dev and Render deployments keep working.
    const backend = process.env.BACKEND_URL || 'https://accommodation-manager-backend.onrender.com';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  webpack: {
    autoInstrumentServerFunctions: false,
  },
});
