import { randomUUID } from "node:crypto";
import { desc } from "drizzle-orm";
import { db } from "./db";
import { auditEvents } from "./schema";

/** FR-014 — records the prototype actions that matter for the demo's audit view. */
export async function recordAudit(input: {
  userId: string | null;
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditEvents).values({
      id: randomUUID(),
      userId: input.userId,
      eventType: input.eventType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    // Audit must never break the user-facing action in a prototype.
    console.error("audit write failed", err);
  }
}

export async function recentAudit(limit = 100) {
  return db.select().from(auditEvents).orderBy(desc(auditEvents.timestamp)).limit(limit);
}
