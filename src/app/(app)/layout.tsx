import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionUser } from "@/server/auth";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <AppShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AppShell>;
}
