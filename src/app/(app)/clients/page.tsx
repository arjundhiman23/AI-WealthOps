import Link from "next/link";
import { asc } from "drizzle-orm";
import { Users } from "lucide-react";
import { db } from "@/server/db";
import { users } from "@/server/schema";
import { requireUser } from "@/server/auth";
import { dataProvider } from "@/services/data/mock-provider";
import { EmptyState, Panel, PageHeader, TableShell, Td, Th } from "@/components/ui/primitives";
import { PriorityBadge, SegmentBadge } from "@/components/ui/priority-badge";
import { compactINR, formatPct, relativeDays } from "@/lib/format";
import { ClientFilters } from "./client-filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const p = await searchParams;

  const filter = {
    search: one(p.search),
    segment: one(p.segment),
    rmId: one(p.rmId),
    band: one(p.band),
    sort: (one(p.sort) as "priority" | "value" | "name" | "lastContact") ?? "priority",
  };

  const [clients, rmRows] = await Promise.all([
    dataProvider.listClients(filter),
    db.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name)),
  ]);

  const rms = rmRows.filter((r) => r.id.startsWith("u-rm"));
  const totalValue = clients.reduce((s, c) => s + c.portfolioValue, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        description={`${clients.length} client${clients.length === 1 ? "" : "s"} · ₹${compactINR(totalValue)} under management in this view`}
      />

      <ClientFilters rms={rms} />

      <Panel bodyClassName="p-0">
        {clients.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No clients match these filters"
            description="Widen the search or clear the filters to see the full book."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Segment</Th>
                <Th className="text-right">Portfolio</Th>
                <Th className="text-right">Return</Th>
                <Th>Last contact</Th>
                <Th>Relationship manager</Th>
                <Th className="text-right">Priority</Th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-muted/60">
                  <Td>
                    <Link href={`/clients/${c.id}`} className="group block min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground group-hover:text-brand">
                        {c.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {c.city ?? "—"}
                        {c.openTasks > 0 && ` · ${c.openTasks} open task${c.openTasks === 1 ? "" : "s"}`}
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <SegmentBadge segment={c.segment} />
                  </Td>
                  <Td className="tabular text-right text-sm text-foreground">
                    ₹{compactINR(c.portfolioValue)}
                  </Td>
                  <Td
                    className={`tabular text-right text-sm ${
                      (c.returnPctDemo ?? 0) >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {formatPct(c.returnPctDemo)}
                  </Td>
                  <Td className="text-sm text-muted-foreground">{relativeDays(c.lastContactAt)}</Td>
                  <Td className="text-sm text-muted-foreground">{c.rmName ?? "Unassigned"}</Td>
                  <Td className="text-right">
                    <PriorityBadge band={c.priorityBand} score={c.priorityScore} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Panel>
    </div>
  );
}
