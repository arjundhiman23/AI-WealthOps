import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  FileText,
  IndianRupee,
  ListChecks,
  MapPin,
  Phone,
  Target,
  TrendingUp,
} from "lucide-react";
import { requireUser } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { dataProvider } from "@/services/data/mock-provider";
import { OPPORTUNITY_ACTION, OPPORTUNITY_LABEL, type OpportunityType } from "@/services/priority/engine";
import {
  Badge,
  Card,
  Divider,
  EmptyState,
  IconChip,
  Panel,
  ProgressBar,
} from "@/components/ui/primitives";
import { PriorityBadge, SegmentBadge } from "@/components/ui/priority-badge";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { compactINR, formatDate, formatINR, formatPct, relativeDays } from "@/lib/format";
import { ClientActions } from "./client-actions";

export const dynamic = "force-dynamic";

const ALLOCATION_COLORS: Record<string, string> = {
  Equity: "var(--chart-1)",
  Debt: "var(--chart-2)",
  Gold: "var(--chart-3)",
  Liquid: "var(--chart-5)",
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const detail = await dataProvider.getClient(id);
  if (!detail) notFound();

  await recordAudit({ userId: user.id, eventType: "client_view", entityType: "client", entityId: id });

  const { client, rm, portfolio, holdings, interactions, tasks, documents, opportunities, priority } = detail;

  const gain = portfolio ? Number(portfolio.totalValue) - Number(portfolio.investedValue) : 0;
  const openTasks = tasks.filter((t) => t.status !== "done");
  const goals = (client.goals ?? []) as { label: string; targetYear: number; targetAmount: number }[];
  const allocation = portfolio?.assetAllocation ?? {};

  return (
    <div className="space-y-5">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to clients
      </Link>

      {/* Identity header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{client.name}</h1>
              <SegmentBadge segment={client.segment} />
              <PriorityBadge band={priority.band} score={priority.score} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {client.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {client.city}
                </span>
              )}
              {client.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {client.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3.5" />
                Last review {formatDate(client.lastReviewAt)}
              </span>
              <span>Managed by {rm?.name ?? "Unassigned"}</span>
              <span>Risk profile (demo): {client.riskProfileDemo ?? "—"}</span>
            </div>
          </div>

          <ClientActions clientId={client.id} clientName={client.name} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Portfolio */}
          <Panel
            title="Portfolio"
            description={portfolio ? `Valued as of ${formatDate(portfolio.asOfDate)}` : undefined}
            icon={<IndianRupee className="size-4" />}
          >
            {!portfolio ? (
              <EmptyState
                title="No portfolio on record"
                description="This client has no holdings in the demo dataset yet."
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-4">
                  <Metric label="Current value" value={formatINR(portfolio.totalValue)} />
                  <Metric label="Invested" value={formatINR(portfolio.investedValue)} />
                  <Metric
                    label="Unrealized gain"
                    value={formatINR(gain)}
                    tone={gain >= 0 ? "success" : "danger"}
                  />
                  <Metric
                    label="Return (demo)"
                    value={formatPct(portfolio.returnPctDemo)}
                    tone={Number(portfolio.returnPctDemo) >= 0 ? "success" : "danger"}
                  />
                </div>

                <Divider className="my-5" />

                <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
                  <AllocationChart
                    data={Object.entries(allocation).map(([name, value]) => ({
                      name,
                      value,
                      color: ALLOCATION_COLORS[name] ?? "var(--chart-8)",
                    }))}
                  />
                  <div>
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Largest holdings
                    </p>
                    <ul className="space-y-2.5">
                      {holdings.slice(0, 6).map((h) => (
                        <li key={h.id}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-sm text-foreground">
                              {h.instrumentName}
                            </span>
                            <span className="tabular shrink-0 text-xs text-muted-foreground">
                              ₹{compactINR(h.value)} · {Number(h.weight).toFixed(1)}%
                            </span>
                          </div>
                          <ProgressBar value={Number(h.weight)} max={40} className="mt-1.5" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </Panel>

          {/* Activity timeline */}
          <Panel
            title="Interaction history"
            description={`${interactions.length} recorded`}
            icon={<TrendingUp className="size-4" />}
            bodyClassName="p-0"
          >
            {interactions.length === 0 ? (
              <EmptyState
                title="No interactions recorded"
                description="Log a call or meeting to start building this client's history."
              />
            ) : (
              <ul className="divide-y divide-border">
                {interactions.slice(0, 10).map((i) => (
                  <li key={i.id} className="flex gap-3 px-5 py-3">
                    <IconChip size="sm" color="var(--chart-2)">
                      <TrendingUp className="size-4" />
                    </IconChip>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium capitalize text-foreground">{i.type}</span>
                        <span className="text-[11px] text-subtle-foreground">
                          {formatDate(i.date)} · {relativeDays(i.date)}
                        </span>
                      </div>
                      {i.notes && <p className="mt-0.5 text-xs text-muted-foreground">{i.notes}</p>}
                      {i.nextAction && (
                        <p className="mt-1 text-[11px] text-brand">Next: {i.nextAction}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Documents */}
          <Panel
            title="Documents"
            description={`${documents.length} on file`}
            icon={<FileText className="size-4" />}
            bodyClassName="p-0"
          >
            {documents.length === 0 ? (
              <EmptyState title="No documents" description="Nothing filed against this client." />
            ) : (
              <ul className="divide-y divide-border">
                {documents.slice(0, 8).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <IconChip size="sm" color="var(--chart-8)">
                        <FileText className="size-4" />
                      </IconChip>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{d.name}</p>
                        <p className="text-[11px] text-subtle-foreground">
                          {d.type} · {formatDate(d.date)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={d.status === "available" ? "muted" : "warning"}>{d.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Why this score — the explainability panel */}
          <Panel title="Why this client scored this way" description="Every point is traceable">
            <div className="mb-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[26px] font-semibold leading-none tracking-tight text-foreground tabular">
                  {priority.score}
                </span>
                <PriorityBadge band={priority.band} />
              </div>
              <ProgressBar
                value={priority.score}
                className="mt-3"
                color={
                  priority.band === "critical"
                    ? "var(--danger)"
                    : priority.band === "high"
                      ? "var(--warning)"
                      : "var(--brand)"
                }
              />
            </div>

            <ul className="space-y-2.5">
              {priority.factors.map((f, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{f.factor}</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">{f.detail}</p>
                  </div>
                  <span
                    className={`tabular shrink-0 text-xs font-medium ${
                      f.points >= 0 ? "text-warning" : "text-success"
                    }`}
                  >
                    {f.points > 0 ? "+" : ""}
                    {f.points}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Opportunities */}
          {opportunities.length > 0 && (
            <Panel title="Open opportunities" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {opportunities.map((o) => (
                  <li key={o.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {OPPORTUNITY_LABEL[o.type as OpportunityType] ?? o.type}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {OPPORTUNITY_ACTION[o.type as OpportunityType] ?? ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Goals */}
          <Panel title="Stated goals" icon={<Target className="size-4" />} bodyClassName="p-0">
            {goals.length === 0 ? (
              <EmptyState title="No goals captured" description="Worth establishing at the next review." />
            ) : (
              <ul className="divide-y divide-border">
                {goals.map((g, i) => (
                  <li key={i} className="px-5 py-3">
                    <p className="text-sm text-foreground">{g.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground tabular">
                      ₹{compactINR(g.targetAmount)} by {g.targetYear}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Open tasks */}
          <Panel
            title="Open tasks"
            description={`${openTasks.length} outstanding`}
            icon={<ListChecks className="size-4" />}
            bodyClassName="p-0"
          >
            {openTasks.length === 0 ? (
              <EmptyState title="Nothing outstanding" description="No open follow-ups for this client." />
            ) : (
              <ul className="divide-y divide-border">
                {openTasks.map((t) => (
                  <li key={t.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm text-foreground">{t.title}</p>
                      <Badge
                        variant={
                          t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "muted"
                        }
                      >
                        {t.priority}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-subtle-foreground">
                      Due {formatDate(t.dueDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`tabular mt-1.5 text-base font-semibold tracking-tight ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
