import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/auth/memberSession";
import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { MemberShell } from "@/components/feature/member/member-shell";
import { BlockedScreen } from "@/components/feature/member/blocked-screen";

// Installing "Add to Home Screen" from here must use the member manifest (start_url "/order"),
// not the default admin one (start_url "/") — otherwise the installed icon opens /login (admin).
export const metadata: Metadata = {
  title: "Messy — Order",
  manifest: "/order-manifest.webmanifest",
};

export default async function MemberLayout({ children }: LayoutProps<"/">) {
  const session = await getMemberSession();
  if (!session) redirect("/order/login");

  await connectDB();
  const person = await PersonModel.findById(session.sub).lean();
  if (!person || person.blocked) return <BlockedScreen />;

  return <MemberShell name={session.name}>{children}</MemberShell>;
}
