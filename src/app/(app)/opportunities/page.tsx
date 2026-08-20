import { desc, eq } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { db } from "@/server/db";
import { clients, opportunities, portfolios, users } from "@/server/schema";
import { requireUser } from "@/server/auth";
import { OPPORTUNITY_ACTION, OPPORTUNITY_LABEL, type OpportunityType } from "@/services/priority/engine";
import { EmptyState, Panel, PageHeader } from "@/components/ui/primitives";
import { OpportunityFilters } from "./opportunity-filters";
import { OpportunityCard } from "./opportunity-card";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function OpportunitiesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const p = await searchParams;
  const status = one(p.status) ?? "open";
  const type = one(p.type);

  const rows = await db
    .select({
      opportunity: opportunities,
      clientName: clients.name,
      clientSegment: clients.segment,
      rmName: users.name,
      portfolioValue: portfolios.totalValue,
    })
    .from(opportunities)
    .leftJoin(clients, eq(opportunities.clientId, clients.id))
    .leftJoin(users, eq(clients.rmId, users.id))
    .leftJoin(portfolios, eq(portfolios.clientId, clients.id))
    .where(status === "all" ? undefined : eq(opportunities.status, status))
    .orderBy(desc(opportunities.score));

  const filtered = type && type !== "all" ? rows.filter((r) => r.opportunity.type === type) : rows;

  const byType = Object.entries(
    filtered.reduce<Record<string, number>>((acc, r) => {
      acc[r.opportunity.type] = (acc[r.opportunity.type] ?? 0) + 1;
      return acc;
    }, {}),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Opportunities"
        description={`${filtered.length} signal${filtered.length === 1 ? "" : "s"} across the book, ranked by priority score`}
      />

      <div className="flex flex-wrap gap-2">
        {byType.map(([t, count]) => (
          <span key={t} className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {OPPORTUNITY_LABEL[t as OpportunityType] ?? t}: <span className="font-medium text-foreground">{count}</span>
          </span>
        ))}
      </div>

      <OpportunityFilters />

      {filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Sparkles className="size-5" />}
            title="No opportunities match this view"
            description="Try clearing filters, or check back after the next data refresh."
          />
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <OpportunityCard
              key={row.opportunity.id}
              id={row.opportunity.id}
              clientId={row.opportunity.clientId}
              clientName={row.clientName ?? "Unknown client"}
              clientSegment={row.clientSegment ?? "—"}
              rmName={row.rmName}
              portfolioValue={row.portfolioValue ? Number(row.portfolioValue) : null}
              type={row.opportunity.type as OpportunityType}
              score={row.opportunity.score}
              status={row.opportunity.status}
              action={OPPORTUNITY_ACTION[row.opportunity.type as OpportunityType] ?? ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}
