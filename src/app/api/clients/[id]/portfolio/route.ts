import { getSessionUser } from "@/server/auth";
import { dataProvider } from "@/services/data/mock-provider";
import { notFound, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const { id } = await params;
    const detail = await dataProvider.getClient(id);
    if (!detail) return notFound("That client does not exist in the demo dataset.");
    return ok({
      portfolio: detail.portfolio,
      holdings: detail.holdings,
      transactions: detail.transactions,
    });
  } catch (err) {
    console.error(err);
    return serverError("Could not load portfolio data.");
  }
}
