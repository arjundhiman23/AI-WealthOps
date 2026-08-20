import { dataProvider } from "@/services/data/mock-provider";
import { compactINR, formatDate, formatPct, relativeDays } from "@/lib/format";
import {
  OPPORTUNITY_ACTION,
  OPPORTUNITY_LABEL,
  deriveOpportunities,
  type OpportunityType,
} from "@/services/priority/engine";
import {
  AI_DISCLAIMER,
  type AIService,
  type AssistantReply,
  type BriefSection,
  type ReviewBrief,
} from "./ai-service";

/**
 * MockAIService — deterministic, template-driven, grounded in the synthetic DB.
 * Same output for the same data every time, which is what makes it demo-safe.
 */
export class MockAIService implements AIService {
  readonly kind = "mock" as const;

  suggestedQuestions(): string[] {
    return [
      "Which high-value clients have not been contacted recently?",
      "Which clients have overdue portfolio reviews?",
      "Show me clients with recent engagement drops.",
      "What should I follow up on today?",
    ];
  }

  async generateReviewBrief(clientId: string, _userId?: string): Promise<ReviewBrief> {
    const detail = await dataProvider.getClient(clientId);
    if (!detail) throw new Error("CLIENT_NOT_FOUND");

    const { client, portfolio, holdings, interactions, tasks, priority, scoring } = detail;
    const sections: BriefSection[] = [];

    // Client snapshot
    sections.push({
      heading: "Client snapshot",
      kind: "keyvalue",
      pairs: [
        { label: "Segment", value: client.segment },
        { label: "Relationship manager", value: detail.rm?.name ?? "Unassigned" },
        { label: "Location", value: client.city ?? "—" },
        { label: "Client since", value: formatDate(client.onboardedAt) },
        { label: "Last review", value: formatDate(client.lastReviewAt) },
        { label: "Priority", value: `${priority.score}/100 (${priority.band})` },
      ],
    });

    // Portfolio summary
    if (portfolio) {
      const gain = Number(portfolio.totalValue) - Number(portfolio.investedValue);
      sections.push({
        heading: "Portfolio summary",
        kind: "keyvalue",
        pairs: [
          { label: "Current value", value: `₹${compactINR(portfolio.totalValue)}` },
          { label: "Invested", value: `₹${compactINR(portfolio.investedValue)}` },
          { label: "Unrealized gain", value: `₹${compactINR(gain)}` },
          { label: "Return (demo)", value: formatPct(portfolio.returnPctDemo) },
          { label: "XIRR (demo)", value: formatPct(portfolio.xirrPctDemo) },
          { label: "Valued as of", value: formatDate(portfolio.asOfDate) },
        ],
      });

      const alloc = portfolio.assetAllocation ?? {};
      sections.push({
        heading: "Asset allocation",
        kind: "list",
        items: Object.entries(alloc)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k} — ${v.toFixed(1)}%`),
      });
    }

    // Top holdings
    if (holdings.length) {
      sections.push({
        heading: "Largest holdings",
        kind: "list",
        items: holdings
          .slice(0, 5)
          .map((h) => `${h.instrumentName} (${h.category}) — ₹${compactINR(h.value)}, ${Number(h.weight).toFixed(1)}% of book`),
      });
    }

    // Recent activity
    sections.push({
      heading: "Recent activity",
      kind: "list",
      items: interactions.length
        ? interactions
            .slice(0, 5)
            .map((i) => `${formatDate(i.date)} — ${i.type}: ${i.notes ?? "no notes recorded"}`)
        : ["No interactions recorded for this client."],
    });

    // What changed / why this client surfaced
    sections.push({
      heading: "Why this client needs attention",
      kind: "list",
      items: priority.factors.map((f) => `${f.factor}: ${f.detail} (${f.points > 0 ? "+" : ""}${f.points})`),
    });

    // Open items
    const openTasks = tasks.filter((t) => t.status !== "done");
    sections.push({
      heading: "Open tasks and issues",
      kind: "list",
      items: openTasks.length
        ? openTasks.map((t) => `${t.title} — ${t.priority} priority, due ${formatDate(t.dueDate)}`)
        : ["Nothing outstanding."],
    });

    // Goals
    const goals = (client.goals ?? []) as { label: string; targetYear: number; targetAmount: number }[];
    sections.push({
      heading: "Stated goals",
      kind: "list",
      items: goals.length
        ? goals.map((g) => `${g.label} — target ₹${compactINR(g.targetAmount)} by ${g.targetYear}`)
        : ["No goals captured yet — worth establishing in this meeting."],
    });

    // Questions to validate — this is where the brief earns its keep
    sections.push({
      heading: "Questions to validate with the client",
      kind: "list",
      items: buildQuestions(scoring, client.segment, goals.length > 0),
    });

    // Suggested agenda
    const opportunities = deriveOpportunities(scoring);
    sections.push({
      heading: "Suggested meeting agenda",
      kind: "list",
      items: buildAgenda(opportunities, portfolio !== null),
    });

    // Recommended follow-ups
    sections.push({
      heading: "Recommended follow-up actions",
      kind: "list",
      items: opportunities.length
        ? opportunities.map((o) => OPPORTUNITY_ACTION[o])
        : ["Confirm the client is satisfied with current servicing and log the interaction."],
    });

    return {
      clientId: client.id,
      clientName: client.name,
      generatedAt: new Date().toISOString(),
      headline: buildHeadline(client.name, priority.band, opportunities),
      sections,
      disclaimer: AI_DISCLAIMER,
    };
  }

  async answer(question: string, _userId?: string): Promise<AssistantReply> {
    const q = question.toLowerCase().trim();

    // "Prepare a review brief for <name>" — resolve the name against real records.
    if (/(review brief|prepare a brief|brief for)/.test(q)) {
      const clients = await dataProvider.listClients({});
      const match = clients.find((c) => q.includes(c.name.toLowerCase().split(" ")[0]));
      if (match) {
        return {
          content: `Opening the review brief for ${match.name}. Their priority score is ${match.priorityScore}/100 (${match.priorityBand}), portfolio ₹${compactINR(match.portfolioValue)}, last contact ${relativeDays(match.lastContactAt)}.`,
          sources: [{ label: match.name, href: `/clients/${match.id}?brief=1` }],
          matched: true,
        };
      }
      return {
        content:
          "I can generate a review brief, but I could not match that name against the demo dataset. Try a client from the client list.",
        sources: [{ label: "All clients", href: "/clients" }],
        matched: false,
      };
    }

    if (/(not been contacted|engagement drop|engagement gap|haven't contacted|not contacted)/.test(q)) {
      const clients = await dataProvider.listClients({ sort: "lastContact" });
      const stale = clients
        .filter((c) => (c.scoring.daysSinceContact ?? 999) > 60)
        .filter((c) => (q.includes("high-value") || q.includes("high value") ? c.segment === "Platinum" || c.segment === "Gold" : true))
        .slice(0, 6);
      return {
        content: stale.length
          ? `${stale.length} client${stale.length === 1 ? "" : "s"} match. Ranked by how long the gap has run, with the reason each one surfaced.`
          : "No clients currently exceed the 60-day contact threshold.",
        table: {
          columns: ["Client", "Segment", "Last contact", "Portfolio", "Priority"],
          rows: stale.map((c) => [
            c.name,
            c.segment,
            relativeDays(c.lastContactAt),
            `₹${compactINR(c.portfolioValue)}`,
            `${c.priorityScore}`,
          ]),
        },
        sources: stale.map((c) => ({ label: c.name, href: `/clients/${c.id}` })),
        matched: true,
      };
    }

    if (/(overdue|due for review|portfolio review)/.test(q)) {
      const clients = await dataProvider.listClients({});
      const overdue = clients
        .filter((c) => c.scoring.daysSinceReview === null || c.scoring.daysSinceReview > 365)
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 6);
      return {
        content: overdue.length
          ? `${overdue.length} client${overdue.length === 1 ? " has" : "s have"} a portfolio review older than twelve months.`
          : "Every client has been reviewed within the last twelve months.",
        table: {
          columns: ["Client", "Last review", "Portfolio", "Priority"],
          rows: overdue.map((c) => [
            c.name,
            c.lastReviewAt ? relativeDays(c.lastReviewAt) : "never",
            `₹${compactINR(c.portfolioValue)}`,
            `${c.priorityScore} (${c.priorityBand})`,
          ]),
        },
        sources: overdue.map((c) => ({ label: c.name, href: `/clients/${c.id}` })),
        matched: true,
      };
    }

    if (/(follow up|followup|today|what should i)/.test(q)) {
      const clients = await dataProvider.listClients({ sort: "priority", limit: 5 });
      return {
        content:
          "Ranked by priority score. Each row shows the single strongest factor driving that client up the list.",
        table: {
          columns: ["Client", "Score", "Top reason"],
          rows: clients.map((c) => {
            const top = c.priorityScore > 0 ? topFactorFor(c.scoring) : "No open signals";
            return [c.name, `${c.priorityScore}`, top];
          }),
        },
        sources: clients.map((c) => ({ label: c.name, href: `/clients/${c.id}` })),
        matched: true,
      };
    }

    if (/(summar|recent activity|what's happening with|whats happening with)/.test(q)) {
      const clients = await dataProvider.listClients({});
      const match = clients.find((c) => q.includes(c.name.toLowerCase().split(" ")[0]));
      if (match) {
        const detail = await dataProvider.getClient(match.id);
        const recent = detail?.interactions.slice(0, 3) ?? [];
        return {
          content: `${match.name} — ₹${compactINR(match.portfolioValue)} portfolio, ${match.segment} segment, priority ${match.priorityScore}/100. Last contact ${relativeDays(match.lastContactAt)}. ${
            recent.length
              ? `Most recent: ${recent.map((i) => `${i.type} on ${formatDate(i.date)}`).join(", ")}.`
              : "No interactions on record."
          } Open tasks: ${match.openTasks}.`,
          sources: [{ label: match.name, href: `/clients/${match.id}` }],
          matched: true,
        };
      }
    }

    if (/(aum|total assets|book size|how much)/.test(q)) {
      const kpis = await dataProvider.dashboardKpis();
      return {
        content: `The demo book holds ₹${compactINR(kpis.totalAum)} across ${kpis.clientCount} clients, averaging ₹${compactINR(kpis.avgPortfolioValue)} per relationship. ${kpis.clientsNeedingAttention} clients are flagged as needing attention and ${kpis.overdueReviews} have overdue reviews.`,
        sources: [{ label: "Dashboard", href: "/dashboard" }],
        matched: true,
      };
    }

    return {
      content:
        "That question is outside what this prototype answers. The demo supports questions about contact gaps, overdue reviews, follow-up priorities, client summaries and book-level AUM. In production this becomes a Bedrock-backed assistant with permission-aware retrieval over authorized data, so the supported question set would not be fixed like this.",
      sources: [],
      matched: false,
    };
  }
}

function topFactorFor(scoring: {
  daysSinceReview: number | null;
  daysSinceContact: number | null;
  sipStopped: boolean;
  openServiceIssues: number;
}): string {
  if (scoring.daysSinceReview === null || scoring.daysSinceReview > 365) return "Review overdue";
  if ((scoring.daysSinceContact ?? 999) > 90) return "Long engagement gap";
  if (scoring.sipStopped) return "SIP stopped";
  if (scoring.openServiceIssues > 0) return "Open service item";
  return "High relationship value";
}

function buildHeadline(name: string, band: string, opportunities: OpportunityType[]): string {
  if (!opportunities.length) return `${name} is well-serviced — no open signals against this relationship.`;
  const labels = opportunities.map((o) => OPPORTUNITY_LABEL[o].toLowerCase());
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `${name} is a ${band}-priority relationship carrying ${list}.`;
}

function buildQuestions(
  scoring: { daysSinceContact: number | null; daysSinceReview: number | null; sipStopped: boolean },
  segment: string,
  hasGoals: boolean,
): string[] {
  const out: string[] = [];
  if ((scoring.daysSinceContact ?? 999) > 90) {
    out.push("Has anything changed in their circumstances since we last spoke?");
  }
  if (scoring.sipStopped) {
    out.push("Was the SIP paused deliberately, or is there a cash-flow constraint we should know about?");
  }
  if (scoring.daysSinceReview === null || scoring.daysSinceReview > 365) {
    out.push("Does the current allocation still match their risk comfort and time horizon?");
  }
  if (!hasGoals) {
    out.push("What are they actually investing towards, and by when?");
  }
  if (segment === "Platinum" || segment === "Gold") {
    out.push("Are they holding assets elsewhere that we are not seeing?");
  }
  out.push("What would make them recommend us to someone else?");
  return out;
}

function buildAgenda(opportunities: OpportunityType[], hasPortfolio: boolean): string[] {
  const out = ["Open with what has changed since the last conversation."];
  if (hasPortfolio) out.push("Walk the portfolio position and allocation against the stated goals.");
  for (const o of opportunities) out.push(OPPORTUNITY_ACTION[o] + ".");
  out.push("Agree concrete next steps and set a date for the following review.");
  return out;
}

export const aiService = new MockAIService();
