import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { clients, opportunities, portfolios, users } from "@/server/schema";
import { getSessionUser } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/opportunities — prioritized opportunity queue (FR-006). */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const p = new URL(request.url).searchParams;
    const status = p.get("status") ?? "open";
    const type = p.get("type");

    const rows = await db
      .select({
        opportunity: opportunities,
        clientName: clients.name,
        clientSegment: clients.segment,
        rmName: users.name,
        portfolioValue: portfolios.totalValue,
      })
      .from(opportunities)
      .leftJoin(clients, eq(opportunities.clientId, clients.id))
      .leftJoin(users, eq(clients.rmId, users.id))
      .leftJoin(portfolios, eq(portfolios.clientId, clients.id))
      .where(status === "all" ? undefined : eq(opportunities.status, status))
      .orderBy(desc(opportunities.score));

    const filtered = type && type !== "all" ? rows.filter((r) => r.opportunity.type === type) : rows;
    return ok({ opportunities: filtered, count: filtered.length });
  } catch (err) {
    console.error(err);
    return serverError("Could not load opportunities.");
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "actioned", "dismissed"]),
});

/** PATCH — action or dismiss an opportunity. */
export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Provide an opportunity id and a valid status.");

    const [row] = await db
      .update(opportunities)
      .set({ status: parsed.data.status })
      .where(eq(opportunities.id, parsed.data.id))
      .returning();

    if (!row) return badRequest("That opportunity no longer exists.");

    await recordAudit({
      userId: user.id,
      eventType: "opportunity_updated",
      entityType: "opportunity",
      entityId: row.id,
      metadata: { status: parsed.data.status },
    });

    return ok({ opportunity: row });
  } catch (err) {
    console.error(err);
    return serverError("Could not update that opportunity.");
  }
}
