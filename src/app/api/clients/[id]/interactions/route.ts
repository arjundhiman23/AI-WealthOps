import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { clients, interactions } from "@/server/schema";
import { getSessionUser } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET — interaction history for a client. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const { id } = await params;
    const rows = await db
      .select()
      .from(interactions)
      .where(eq(interactions.clientId, id))
      .orderBy(desc(interactions.date));
    return ok({ interactions: rows });
  } catch (err) {
    console.error(err);
    return serverError("Could not load interactions.");
  }
}

const createSchema = z.object({
  type: z.enum(["call", "meeting", "email", "review", "whatsapp"]),
  date: z.string().optional(),
  notes: z.string().max(2000).optional(),
  nextAction: z.string().max(500).optional(),
  followUpDate: z.string().optional(),
});

/** POST — record an interaction (FR-009). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const { id } = await params;
    const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!client) return notFound("That client does not exist in the demo dataset.");

    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return badRequest("Check the interaction details and try again.", parsed.error.flatten());
    }

    const { type, date, notes, nextAction, followUpDate } = parsed.data;
    const [row] = await db
      .insert(interactions)
      .values({
        id: randomUUID(),
        clientId: id,
        rmId: user.id,
        type,
        date: date ? new Date(date) : new Date(),
        notes: notes ?? null,
        nextAction: nextAction ?? null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      })
      .returning();

    await recordAudit({
      userId: user.id,
      eventType: "interaction_recorded",
      entityType: "client",
      entityId: id,
      metadata: { type },
    });

    return ok({ interaction: row }, { status: 201 });
  } catch (err) {
    console.error(err);
    return serverError("Could not record that interaction.");
  }
}
