import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// No nonces: that requires forcing every page to render dynamically per-request
// (see next/dist/docs/01-app/02-guides/content-security-policy.md), which throws
// away this app's static pages for little benefit here — there's no known HTML
// injection point (no dangerouslySetInnerHTML, React escapes all rendered data).
// 'unsafe-inline' is required regardless: next-themes' flicker-prevention script
// and Next's RSC hydration payload are both inline <script> tags, and Radix UI
// sets inline `style` attributes for positioning.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  worker-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  connect-src 'self' https://rest.ably.io https://realtime.ably.io wss://realtime.ably.io https://*.ably-realtime.com wss://*.ably-realtime.com;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        // Never cache the service worker file itself, so updates roll out on next load
        // instead of getting stuck behind a stale worker.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
