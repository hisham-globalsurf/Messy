import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/feature/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
