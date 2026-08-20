import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { clients, tasks, users } from "@/server/schema";
import { getSessionUser } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/tasks — task list with filters (FR-008). */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const p = new URL(request.url).searchParams;
    const status = p.get("status");
    const owner = p.get("owner");
    const priority = p.get("priority");

    const conditions = [];
    if (status && status !== "all") {
      conditions.push(status === "open" ? inArray(tasks.status, ["open", "in_progress"]) : eq(tasks.status, status));
    }
    if (owner === "mine") conditions.push(eq(tasks.ownerId, user.id));
    else if (owner && owner !== "all") conditions.push(eq(tasks.ownerId, owner));
    if (priority && priority !== "all") conditions.push(eq(tasks.priority, priority));

    const rows = await db
      .select({
        task: tasks,
        clientName: clients.name,
        ownerName: users.name,
      })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .leftJoin(users, eq(tasks.ownerId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(tasks.createdAt));

    return ok({ tasks: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    return serverError("Could not load tasks.");
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  clientId: z.string().optional(),
  ownerId: z.string().optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  dueDate: z.string().optional(),
});

/** POST /api/tasks — create a follow-up (FR-008). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return badRequest("Give the task a title before saving.", parsed.error.flatten());
    }

    const d = parsed.data;
    const [row] = await db
      .insert(tasks)
      .values({
        id: randomUUID(),
        title: d.title,
        clientId: d.clientId ?? null,
        ownerId: d.ownerId ?? user.id,
        description: d.description ?? null,
        priority: d.priority,
        status: "open",
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
      })
      .returning();

    await recordAudit({
      userId: user.id,
      eventType: "task_created",
      entityType: "task",
      entityId: row.id,
      metadata: { clientId: d.clientId ?? null },
    });

    return ok({ task: row }, { status: 201 });
  } catch (err) {
    console.error(err);
    return serverError("Could not create that task.");
  }
}
