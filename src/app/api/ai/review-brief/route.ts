import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { reviewBriefs } from "@/server/schema";
import { getSessionUser } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { aiService } from "@/services/ai/mock-ai-service";
import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

const schema = z.object({ clientId: z.string().min(1) });

/** POST /api/ai/review-brief — deterministic brief generation (FR-007). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Provide a client to generate a brief for.");

    const brief = await aiService.generateReviewBrief(parsed.data.clientId, user.id);

    await db.insert(reviewBriefs).values({
      id: randomUUID(),
      clientId: parsed.data.clientId,
      generatedBy: user.id,
      content: brief as unknown as Record<string, unknown>,
    });

    await recordAudit({
      userId: user.id,
      eventType: "brief_generated",
      entityType: "client",
      entityId: parsed.data.clientId,
    });

    return ok({ brief });
  } catch (err) {
    if (err instanceof Error && err.message === "CLIENT_NOT_FOUND") {
      return notFound("That client does not exist in the demo dataset.");
    }
    console.error(err);
    return serverError("Could not generate the review brief.");
  }
}
