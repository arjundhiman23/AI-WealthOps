import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { auditEvents, users } from "@/server/schema";
import { getSessionUser } from "@/server/auth";
import { ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/audit — prototype activity log (FR-014). */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
    const rows = await db
      .select({ event: auditEvents, userName: users.name })
      .from(auditEvents)
      .leftJoin(users, eq(auditEvents.userId, users.id))
      .orderBy(desc(auditEvents.timestamp))
      .limit(Math.min(limit, 500));

    return ok({ events: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    return serverError("Could not load the activity log.");
  }
}
