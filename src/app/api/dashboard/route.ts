import { getSessionUser } from "@/server/auth";
import { dataProvider } from "@/services/data/mock-provider";
import { ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/dashboard — KPIs and prioritized clients (FR-002). */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const scope = new URL(request.url).searchParams.get("scope");
    const rmId = scope === "mine" && user.role === "rm" ? user.id : undefined;

    const [kpis, priorities] = await Promise.all([
      dataProvider.dashboardKpis(rmId),
      dataProvider.listClients({ rmId, sort: "priority", limit: 8 }),
    ]);

    return ok({ kpis, priorities });
  } catch (err) {
    console.error(err);
    return serverError("Could not load dashboard data.");
  }
}
