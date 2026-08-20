import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/schema";
import { getSessionUser } from "@/server/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const existing = await getSessionUser().catch(() => null);
  if (existing) redirect("/dashboard");

  let personas: { id: string; name: string; email: string; role: string; team: string | null }[] = [];
  let dbError = false;

  try {
    personas = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        team: users.team,
      })
      .from(users)
      .orderBy(asc(users.role), asc(users.name));
  } catch {
    dbError = true;
  }

  return <LoginForm personas={personas} dbError={dbError} />;
}
