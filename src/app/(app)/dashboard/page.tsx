import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  IndianRupee,
  ListChecks,
  Sparkles,
  Users,
} from "lucide-react";
import { db } from "@/server/db";
import { auditEvents, clients, opportunities, tasks, users } from "@/server/schema";
import { requireUser } from "@/server/auth";
import { dataProvider } from "@/services/data/mock-provider";
import { OPPORTUNITY_ACTION, OPPORTUNITY_LABEL, type OpportunityType } from "@/services/priority/engine";
import { StatTile } from "@/components/ui/stat-tile";
import {
  Badge,
  buttonClasses,
  EmptyState,
  Panel,
  PageHeader,
  ProgressBar,
} from "@/components/ui/primitives";
import { PriorityBadge, SegmentBadge } from "@/components/ui/priority-badge";
import { compactINR, formatDate, relativeDays } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const scopeToMe = user.role === "rm";

  const [kpis, priorities] = await Promise.all([
    dataProvider.dashboardKpis(scopeToMe ? user.id : undefined),
    dataProvider.listClients({
      rmId: scopeToMe ? user.id : undefined,
      sort: "priority",
      limit: 6,
    }),
  ]);

  const topOpportunities = await db
    .select({
      opportunity: opportunities,
      clientName: clients.name,
      clientSegment: clients.segment,
    })
    .from(opportunities)
    .leftJoin(clients, eq(opportunities.clientId, clients.id))
    .where(eq(opportunities.status, "open"))
    .orderBy(desc(opportunities.score))
    .limit(4);

  const recentActivity = await db
    .select({ event: auditEvents, userName: users.name })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.userId, users.id))
    .orderBy(desc(auditEvents.timestamp))
    .limit(6);

  const dueTasks = await db
    .select({ task: tasks, clientName: clients.name })
    .from(tasks)
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .where(inArray(tasks.status, ["open", "in_progress"]))
    .orderBy(tasks.dueDate)
    .limit(5);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, ${firstName}`}
        description={
          scopeToMe
            ? "Your book, ranked by what needs attention today."
            : "Organisation-wide view across every relationship manager."
        }
        actions={
          <Link href="/assistant" className={buttonClasses("primary", "sm")}>
            <Sparkles className="size-4" />
            Ask the assistant
          </Link>
        }
      />

      {/* KPIs — FR-002 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Assets under management"
          value={kpis.totalAum}
          displayValue={<span className="tabular">₹{compactINR(kpis.totalAum)}</span>}
          icon={<IndianRupee className="size-[18px]" />}
          iconColor="var(--chart-1)"
          spark={kpis.aumTrend}
          delta={4.2}
          footnote="vs last quarter"
          accent="var(--chart-1)"
        />
        <StatTile
          label="Clients needing attention"
          value={kpis.clientsNeedingAttention}
          icon={<AlertTriangle className="size-[18px]" />}
          iconColor="var(--warning)"
          footnote={`of ${kpis.clientCount} clients`}
          accent="var(--warning)"
        />
        <StatTile
          label="Overdue reviews"
          value={kpis.overdueReviews}
          icon={<CalendarClock className="size-[18px]" />}
          iconColor="var(--danger)"
          footnote="review older than 12 months"
          accent="var(--danger)"
        />
        <StatTile
          label="Open follow-ups"
          value={kpis.openFollowUps}
          icon={<ListChecks className="size-[18px]" />}
          iconColor="var(--chart-2)"
          footnote={`${kpis.openOpportunities} open opportunities`}
          accent="var(--chart-2)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Priority queue — the heart of the demo */}
        <Panel
          className="lg:col-span-2"
          title="Who needs attention"
          description="Ranked by the priority engine. Every score is explained."
          icon={<Users className="size-4" />}
          action={
            <Link
              href="/clients"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              All clients
              <ArrowRight className="size-3.5" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {priorities.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title="No clients in this view"
              description="Seed the demo dataset to populate the workspace."
            />
          ) : (
            <ul className="divide-y divide-border">
              {priorities.map((client, i) => (
                <li
                  key={client.id}
                  className="animate-fade-up px-5 py-3.5"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Link href={`/clients/${client.id}`} className="group flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground group-hover:text-brand">
                          {client.name}
                        </span>
                        <SegmentBadge segment={client.segment} />
                        <PriorityBadge band={client.priorityBand} score={client.priorityScore} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ₹{compactINR(client.portfolioValue)} · last contact {relativeDays(client.lastContactAt)}
                        {client.rmName && ` · ${client.rmName}`}
                      </p>
                      <div className="mt-2 max-w-xs">
                        <ProgressBar
                          value={client.priorityScore}
                          color={
                            client.priorityBand === "critical"
                              ? "var(--danger)"
                              : client.priorityBand === "high"
                                ? "var(--warning)"
                                : "var(--brand)"
                          }
                        />
                      </div>
                    </div>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          {/* Opportunities */}
          <Panel
            title="Opportunities"
            description="Signals worth acting on"
            icon={<Sparkles className="size-4" />}
            bodyClassName="p-0"
          >
            {topOpportunities.length === 0 ? (
              <EmptyState title="Nothing flagged" description="No open opportunities in the dataset." />
            ) : (
              <ul className="divide-y divide-border">
                {topOpportunities.map((row) => (
                  <li key={row.opportunity.id} className="px-5 py-3">
                    <Link href={`/clients/${row.opportunity.clientId}`} className="group block">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground group-hover:text-brand">
                          {row.clientName}
                        </span>
                        <Badge variant="warning">{row.opportunity.score}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-brand">
                        {OPPORTUNITY_LABEL[row.opportunity.type as OpportunityType] ?? row.opportunity.type}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {OPPORTUNITY_ACTION[row.opportunity.type as OpportunityType] ?? ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Due follow-ups */}
          <Panel
            title="Due soon"
            description="Your next follow-ups"
            icon={<ListChecks className="size-4" />}
            bodyClassName="p-0"
          >
            {dueTasks.length === 0 ? (
              <EmptyState title="Nothing due" description="No open tasks with a due date." />
            ) : (
              <ul className="divide-y divide-border">
                {dueTasks.map((row) => (
                  <li key={row.task.id} className="px-5 py-2.5">
                    <p className="truncate text-sm text-foreground">{row.task.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.clientName ?? "Unassigned"} · {formatDate(row.task.dueDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* Recent activity */}
      <Panel title="Recent activity" description="Prototype audit trail" bodyClassName="p-0">
        {recentActivity.length === 0 ? (
          <EmptyState title="No activity yet" description="Actions taken in the workspace appear here." />
        ) : (
          <ul className="divide-y divide-border">
            {recentActivity.map((row) => (
              <li key={row.event.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <p className="min-w-0 truncate text-sm text-foreground">
                  <span className="font-medium">{row.userName ?? "System"}</span>{" "}
                  <span className="text-muted-foreground">
                    {row.event.eventType.replace(/_/g, " ")}
                  </span>
                </p>
                <span className="shrink-0 text-[11px] text-subtle-foreground">
                  {relativeDays(row.event.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-[11px] leading-relaxed text-subtle-foreground">
        All figures are synthetic demonstration data. Priority scores are produced by a transparent rule
        engine, not a model, and are not investment advice.
      </p>
    </div>
  );
}
