import { getSessionUser } from "@/server/auth";
import { dataProvider } from "@/services/data/mock-provider";
import { ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/clients — search and filter (FR-003). */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const p = new URL(request.url).searchParams;
    const clients = await dataProvider.listClients({
      search: p.get("search") ?? undefined,
      segment: p.get("segment") ?? undefined,
      rmId: p.get("rmId") ?? undefined,
      status: p.get("status") ?? undefined,
      band: p.get("band") ?? undefined,
      minValue: p.get("minValue") ? Number(p.get("minValue")) : undefined,
      maxValue: p.get("maxValue") ? Number(p.get("maxValue")) : undefined,
      sort: (p.get("sort") as "priority" | "value" | "name" | "lastContact") ?? undefined,
      limit: p.get("limit") ? Number(p.get("limit")) : undefined,
    });
    return ok({ clients, count: clients.length });
  } catch (err) {
    console.error(err);
    return serverError("Could not load clients.");
  }
}
