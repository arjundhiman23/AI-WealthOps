import { getSessionUser } from "@/server/auth";
import { dataProvider } from "@/services/data/mock-provider";
import { recordAudit } from "@/server/audit";
import { notFound, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/clients/:id — Client 360 (FR-004). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const { id } = await params;
    const detail = await dataProvider.getClient(id);
    if (!detail) return notFound("That client does not exist in the demo dataset.");

    await recordAudit({ userId: user.id, eventType: "client_view", entityType: "client", entityId: id });
    return ok(detail);
  } catch (err) {
    console.error(err);
    return serverError("Could not load that client.");
  }
}
