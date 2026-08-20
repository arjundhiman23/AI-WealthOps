import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  clients,
  holdings,
  interactions,
  portfolios,
  tasks,
  transactions,
  users,
  documents,
  opportunities,
} from "@/server/schema";
import {
  DEFAULT_WEIGHTS,
  scoreClient,
  type ScoringInput,
  type PriorityResult,
} from "@/services/priority/engine";
import type {
  ClientFilter,
  ClientSummary,
  DashboardKpis,
  DataProvider,
  ProviderStatus,
} from "./provider";

/**
 * MockDataProvider — reads the seeded synthetic dataset from Postgres.
 *
 * Scoring happens here rather than in the database so the rules stay in
 * TypeScript where they are testable and swappable, and so the same code path
 * serves a future NJWealthProvider without a schema migration.
 */

const num = (v: string | number | null): number => (v === null ? 0 : Number(v));

export type ClientDetail = {
  client: typeof clients.$inferSelect;
  rm: typeof users.$inferSelect | null;
  portfolio: typeof portfolios.$inferSelect | null;
  holdings: (typeof holdings.$inferSelect)[];
  transactions: (typeof transactions.$inferSelect)[];
  interactions: (typeof interactions.$inferSelect)[];
  tasks: (typeof tasks.$inferSelect)[];
  documents: (typeof documents.$inferSelect)[];
  opportunities: (typeof opportunities.$inferSelect)[];
  priority: PriorityResult;
  scoring: ScoringInput;
};

/** Builds the scoring inputs for every client in one pass of aggregate queries. */
async function buildScoringInputs(): Promise<Map<string, ScoringInput & { rmName: string | null }>> {
  const rows = await db
    .select({
      id: clients.id,
      segment: clients.segment,
      lastReviewAt: clients.lastReviewAt,
      goals: clients.goals,
      rmName: users.name,
      portfolioValue: portfolios.totalValue,
      returnPct: portfolios.returnPctDemo,
    })
    .from(clients)
    .leftJoin(users, eq(clients.rmId, users.id))
    .leftJoin(portfolios, eq(portfolios.clientId, clients.id));

  const lastContact = await db
    .select({
      clientId: interactions.clientId,
      last: sql<string>`max(${interactions.date})`,
    })
    .from(interactions)
    .groupBy(interactions.clientId);
  const contactMap = new Map(lastContact.map((r) => [r.clientId, r.last ? new Date(r.last) : null]));

  const lastSip = await db
    .select({
      clientId: transactions.clientId,
      last: sql<string>`max(${transactions.date})`,
    })
    .from(transactions)
    .where(eq(transactions.type, "sip"))
    .groupBy(transactions.clientId);
  const sipMap = new Map(lastSip.map((r) => [r.clientId, r.last ? new Date(r.last) : null]));

  const openIssues = await db
    .select({
      clientId: tasks.clientId,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(inArray(tasks.status, ["open", "in_progress"]))
    .groupBy(tasks.clientId);
  const issueMap = new Map(openIssues.map((r) => [r.clientId ?? "", r.count]));

  const now = Date.now();
  const out = new Map<string, ScoringInput & { rmName: string | null }>();

  for (const r of rows) {
    const contact = contactMap.get(r.id) ?? null;
    const sipDate = sipMap.get(r.id) ?? null;

    // "Stopped" means the client has SIP history but nothing in the last 75 days.
    const sipStopped = sipDate !== null && (now - sipDate.getTime()) / 86_400_000 > 75;

    const goals = (r.goals ?? []) as { targetYear: number }[];
    const nearestGoalYear = goals.length ? Math.min(...goals.map((g) => g.targetYear)) : null;
    const monthsToGoal =
      nearestGoalYear === null
        ? null
        : Math.max(0, Math.round((new Date(nearestGoalYear, 0, 1).getTime() - now) / (86_400_000 * 30)));

    out.set(r.id, {
      segment: r.segment,
      daysSinceContact: contact ? Math.floor((now - contact.getTime()) / 86_400_000) : null,
      daysSinceReview: r.lastReviewAt
        ? Math.floor((now - new Date(r.lastReviewAt).getTime()) / 86_400_000)
        : null,
      sipStopped,
      openServiceIssues: issueMap.get(r.id) ?? 0,
      monthsToGoalMilestone: monthsToGoal,
      largeRecentMovementPct: r.returnPct === null ? null : num(r.returnPct),
      portfolioValue: num(r.portfolioValue),
      rmName: r.rmName ?? null,
    });
  }

  return out;
}

export class MockDataProvider implements DataProvider {
  readonly kind = "mock" as const;

  async status(): Promise<ProviderStatus> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(clients);
    return {
      kind: "mock",
      label: "MockDataProvider",
      connected: true,
      description: `Seeded synthetic dataset — ${row?.count ?? 0} clients.`,
      lastSyncedAt: new Date(),
    };
  }

  async listClients(filter: ClientFilter = {}): Promise<ClientSummary[]> {
    const conditions = [];
    if (filter.search) {
      conditions.push(
        or(ilike(clients.name, `%${filter.search}%`), ilike(clients.city, `%${filter.search}%`)),
      );
    }
    if (filter.segment && filter.segment !== "all") conditions.push(eq(clients.segment, filter.segment));
    if (filter.rmId && filter.rmId !== "all") conditions.push(eq(clients.rmId, filter.rmId));
    if (filter.status && filter.status !== "all") conditions.push(eq(clients.status, filter.status));

    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        segment: clients.segment,
        city: clients.city,
        rmId: clients.rmId,
        rmName: users.name,
        status: clients.status,
        lastReviewAt: clients.lastReviewAt,
        portfolioValue: portfolios.totalValue,
        returnPct: portfolios.returnPctDemo,
      })
      .from(clients)
      .leftJoin(users, eq(clients.rmId, users.id))
      .leftJoin(portfolios, eq(portfolios.clientId, clients.id))
      .where(conditions.length ? and(...conditions) : undefined);

    const scoringMap = await buildScoringInputs();

    const openTaskRows = await db
      .select({ clientId: tasks.clientId, count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(inArray(tasks.status, ["open", "in_progress"]))
      .groupBy(tasks.clientId);
    const openTaskMap = new Map(openTaskRows.map((r) => [r.clientId ?? "", r.count]));

    const lastContactRows = await db
      .select({ clientId: interactions.clientId, last: sql<string>`max(${interactions.date})` })
      .from(interactions)
      .groupBy(interactions.clientId);
    const contactMap = new Map(lastContactRows.map((r) => [r.clientId, r.last ? new Date(r.last) : null]));

    let summaries: ClientSummary[] = rows.map((r) => {
      const scoring = scoringMap.get(r.id)!;
      const priority = scoreClient(scoring, DEFAULT_WEIGHTS);
      return {
        id: r.id,
        name: r.name,
        segment: r.segment,
        city: r.city,
        rmId: r.rmId,
        rmName: r.rmName ?? null,
        status: r.status,
        portfolioValue: num(r.portfolioValue),
        returnPctDemo: r.returnPct === null ? null : num(r.returnPct),
        lastContactAt: contactMap.get(r.id) ?? null,
        lastReviewAt: r.lastReviewAt,
        priorityScore: priority.score,
        priorityBand: priority.band,
        openTasks: openTaskMap.get(r.id) ?? 0,
        scoring,
      };
    });

    if (filter.band && filter.band !== "all") {
      summaries = summaries.filter((s) => s.priorityBand === filter.band);
    }
    if (filter.minValue !== undefined) {
      summaries = summaries.filter((s) => s.portfolioValue >= filter.minValue!);
    }
    if (filter.maxValue !== undefined) {
      summaries = summaries.filter((s) => s.portfolioValue <= filter.maxValue!);
    }

    const sort = filter.sort ?? "priority";
    summaries.sort((a, b) => {
      if (sort === "value") return b.portfolioValue - a.portfolioValue;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "lastContact") {
        return (a.lastContactAt?.getTime() ?? 0) - (b.lastContactAt?.getTime() ?? 0);
      }
      return b.priorityScore - a.priorityScore;
    });

    return filter.limit ? summaries.slice(0, filter.limit) : summaries;
  }

  async getClient(id: string): Promise<ClientDetail | null> {
    const [row] = await db
      .select()
      .from(clients)
      .leftJoin(users, eq(clients.rmId, users.id))
      .leftJoin(portfolios, eq(portfolios.clientId, clients.id))
      .where(eq(clients.id, id))
      .limit(1);

    if (!row) return null;

    const portfolio = row.portfolios;
    const [holdingRows, txnRows, interactionRows, taskRows, docRows, oppRows] = await Promise.all([
      portfolio
        ? db.select().from(holdings).where(eq(holdings.portfolioId, portfolio.id)).orderBy(desc(holdings.value))
        : Promise.resolve([]),
      db.select().from(transactions).where(eq(transactions.clientId, id)).orderBy(desc(transactions.date)).limit(30),
      db.select().from(interactions).where(eq(interactions.clientId, id)).orderBy(desc(interactions.date)),
      db.select().from(tasks).where(eq(tasks.clientId, id)).orderBy(desc(tasks.createdAt)),
      db.select().from(documents).where(eq(documents.clientId, id)).orderBy(desc(documents.date)),
      db.select().from(opportunities).where(eq(opportunities.clientId, id)).orderBy(desc(opportunities.score)),
    ]);

    const scoringMap = await buildScoringInputs();
    const scoring = scoringMap.get(id)!;
    const priority = scoreClient(scoring, DEFAULT_WEIGHTS);

    return {
      client: row.clients,
      rm: row.users,
      portfolio,
      holdings: holdingRows,
      transactions: txnRows,
      interactions: interactionRows,
      tasks: taskRows,
      documents: docRows,
      opportunities: oppRows,
      priority,
      scoring,
    };
  }

  async dashboardKpis(rmId?: string): Promise<DashboardKpis> {
    const summaries = await this.listClients(rmId ? { rmId } : {});
    const totalAum = summaries.reduce((s, c) => s + c.portfolioValue, 0);

    const [openFollowUps] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(inArray(tasks.status, ["open", "in_progress"]));

    const [openOpps] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(opportunities)
      .where(eq(opportunities.status, "open"));

    // Synthetic 12-point AUM trend for the stat-tile sparkline. Deterministic:
    // derived from the real total so it never contradicts the headline figure.
    const aumTrend = Array.from({ length: 12 }, (_, i) => {
      const drift = 1 - (11 - i) * 0.012;
      const wobble = 1 + Math.sin(i * 1.7) * 0.008;
      return Math.round(totalAum * drift * wobble);
    });

    return {
      totalAum,
      clientCount: summaries.length,
      clientsNeedingAttention: summaries.filter(
        (c) => c.priorityBand === "critical" || c.priorityBand === "high",
      ).length,
      overdueReviews: summaries.filter(
        (c) => c.scoring.daysSinceReview === null || c.scoring.daysSinceReview > 365,
      ).length,
      openFollowUps: openFollowUps?.count ?? 0,
      openOpportunities: openOpps?.count ?? 0,
      avgPortfolioValue: summaries.length ? totalAum / summaries.length : 0,
      aumTrend,
    };
  }
}

export const dataProvider = new MockDataProvider();
