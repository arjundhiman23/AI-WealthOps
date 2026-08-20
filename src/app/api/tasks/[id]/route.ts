import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { tasks } from "@/server/schema";
import { getSessionUser } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  status: z.enum(["open", "in_progress", "done"]).optional(),
  dueDate: z.string().nullable().optional(),
  ownerId: z.string().optional(),
});

/** PATCH /api/tasks/:id — update or complete a task (FR-008). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Those task changes are not valid.", parsed.error.flatten());

    const d = parsed.data;
    const update: Partial<typeof tasks.$inferInsert> = {};
    if (d.title !== undefined) update.title = d.title;
    if (d.description !== undefined) update.description = d.description;
    if (d.priority !== undefined) update.priority = d.priority;
    if (d.ownerId !== undefined) update.ownerId = d.ownerId;
    if (d.dueDate !== undefined) update.dueDate = d.dueDate ? new Date(d.dueDate) : null;
    if (d.status !== undefined) {
      update.status = d.status;
      update.completedAt = d.status === "done" ? new Date() : null;
    }

    if (!Object.keys(update).length) return badRequest("Nothing to update.");

    const [row] = await db.update(tasks).set(update).where(eq(tasks.id, id)).returning();
    if (!row) return notFound("That task no longer exists.");

    await recordAudit({
      userId: user.id,
      eventType: "task_updated",
      entityType: "task",
      entityId: id,
      metadata: { status: row.status },
    });

    return ok({ task: row });
  } catch (err) {
    console.error(err);
    return serverError("Could not update that task.");
  }
}
