import { z } from "zod";
import { getSessionUser } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { aiService } from "@/services/ai/mock-ai-service";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

const schema = z.object({ question: z.string().min(1).max(500) });

/** POST /api/ai/chat — mock assistant (FR-010). Deterministic, DB-grounded. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest("Ask a question to continue.");

    const reply = await aiService.answer(parsed.data.question, user.id);

    await recordAudit({
      userId: user.id,
      eventType: "assistant_query",
      metadata: { matched: reply.matched },
    });

    return ok({ reply });
  } catch (err) {
    console.error(err);
    return serverError("The assistant could not answer that.");
  }
}
