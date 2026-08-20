import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getSessionUser().catch(() => null);
  redirect(user ? "/dashboard" : "/login");
}
