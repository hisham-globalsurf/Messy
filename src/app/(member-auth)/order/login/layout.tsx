import type { Metadata } from "next";

// Same reasoning as (member)/layout.tsx — this page is a client component and
// can't export metadata itself, so it gets a thin server layout just for this.
export const metadata: Metadata = {
  title: "Messy — Order",
  manifest: "/order-manifest.webmanifest",
};

export default function MemberLoginLayout({ children }: LayoutProps<"/">) {
  return children;
}
