import { desc, eq, sql } from "drizzle-orm";
import { AlertTriangle, IndianRupee, Users } from "lucide-react";
import { db } from "@/server/db";
import { clients, portfolios, tasks, users } from "@/server/schema";
import { requireUser } from "@/server/auth";
import { dataProvider } from "@/services/data/mock-provider";
import { StatTile } from "@/components/ui/stat-tile";
import { Panel, PageHeader, TableShell, Td, Th } from "@/components/ui/primitives";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { compactINR } from "@/lib/format";
import { SegmentChart } from "./segment-chart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireUser();

  const [kpis, allClients, rmRows] = await Promise.all([
    dataProvider.dashboardKpis(),
    dataProvider.listClients({}),
    db
      .select({ id: users.id, name: users.name, team: users.team })
      .from(users)
      .where(eq(users.role, "rm")),
  ]);

  const bySegment = ["Platinum", "Gold", "Silver", "Emerging"].map((segment) => {
    const inSegment = allClients.filter((c) => c.segment === segment);
    return {
      segment,
      count: inSegment.length,
      value: inSegment.reduce((s, c) => s + c.portfolioValue, 0),
    };
  });

  const byRm = rmRows
    .map((rm) => {
      const clientsFor = allClients.filter((c) => c.rmId === rm.id);
      const attention = clientsFor.filter((c) => c.priorityBand === "critical" || c.priorityBand === "high").length;
      return {
        rm,
        count: clientsFor.length,
        value: clientsFor.reduce((s, c) => s + c.portfolioValue, 0),
        attention,
        topBand:
          clientsFor.length && attention / clientsFor.length > 0.4
            ? "high"
            : attention > 0
              ? "medium"
              : "low",
      };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Organisation-wide workload, book distribution and opportunity patterns."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Total AUM"
          value={kpis.totalAum}
          displayValue={<span className="tabular">₹{compactINR(kpis.totalAum)}</span>}
          icon={<IndianRupee className="size-[18px]" />}
          iconColor="var(--chart-1)"
        />
        <StatTile label="Relationship managers" value={rmRows.length} icon={<Users className="size-[18px]" />} iconColor="var(--chart-2)" />
        <StatTile
          label="Clients needing attention"
          value={kpis.clientsNeedingAttention}
          icon={<AlertTriangle className="size-[18px]" />}
          iconColor="var(--warning)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Book by segment" description="Client count and AUM">
          <SegmentChart data={bySegment} />
        </Panel>

        <Panel title="Workload by relationship manager" bodyClassName="p-0">
          <TableShell>
            <thead>
              <tr>
                <Th>RM</Th>
                <Th className="text-right">Clients</Th>
                <Th className="text-right">AUM</Th>
                <Th className="text-right">Attention</Th>
              </tr>
            </thead>
            <tbody>
              {byRm.map((r) => (
                <tr key={r.rm.id}>
                  <Td className="text-sm text-foreground">{r.rm.name}</Td>
                  <Td className="tabular text-right text-sm text-muted-foreground">{r.count}</Td>
                  <Td className="tabular text-right text-sm text-muted-foreground">₹{compactINR(r.value)}</Td>
                  <Td className="text-right">
                    <PriorityBadge band={r.topBand} score={r.attention} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Panel>
      </div>
    </div>
  );
}
