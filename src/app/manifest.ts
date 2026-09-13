import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Messy — Mess Tracker",
    short_name: "Messy",
    description: "Track shared meals and settle up.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192-admin.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-admin.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable-admin.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
