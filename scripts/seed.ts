/**
 * Seed generator — BRD §18.
 *
 * Produces ~80 synthetic clients, 12 users, and enough holdings, interactions,
 * tasks and opportunities to make every screen look real. The first eight
 * clients are hand-pinned to the demo scenarios the BRD calls for, so the
 * storyboard lands the same way on every reset instead of depending on luck.
 *
 * Deterministic: a fixed PRNG seed means the same dataset every run, which
 * matters when a demo is being rehearsed against specific client names.
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import {
  aiConversations,
  aiMessages,
  auditEvents,
  clients,
  documents,
  holdings,
  interactions,
  opportunities,
  portfolios,
  reviewBriefs,
  tasks,
  transactions,
  users,
} from "../src/server/schema";
import {
  DEFAULT_WEIGHTS,
  OPPORTUNITY_LABEL,
  deriveOpportunities,
  scoreClient,
  type ScoringInput,
} from "../src/services/priority/engine";

/* ------------------------------------------------------------ PRNG ------- */

let seed = 20260820;
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

/* ------------------------------------------------------- Name pools ------ */

const FIRST = [
  "Rajesh", "Neha", "Arjun", "Priya", "Vikram", "Ananya", "Sanjay", "Kavita",
  "Rohit", "Meera", "Aditya", "Divya", "Karthik", "Sneha", "Manish", "Pooja",
  "Suresh", "Ritu", "Nikhil", "Lakshmi", "Amit", "Shreya", "Deepak", "Anjali",
  "Harsh", "Tanvi", "Gaurav", "Ishita", "Prakash", "Nandini", "Varun", "Swati",
  "Rakesh", "Aarti", "Mohan", "Preeti", "Siddharth", "Rekha", "Naveen", "Sunita",
];

const LAST = [
  "Sharma", "Shah", "Mehta", "Patel", "Reddy", "Iyer", "Nair", "Kulkarni",
  "Desai", "Joshi", "Rao", "Verma", "Kapoor", "Malhotra", "Bansal", "Chopra",
  "Agarwal", "Gupta", "Menon", "Pillai", "Sethi", "Trivedi", "Bhatt", "Saxena",
];

const CITIES = [
  "Mumbai", "Pune", "Bengaluru", "Delhi", "Hyderabad", "Chennai",
  "Ahmedabad", "Kolkata", "Surat", "Jaipur", "Nagpur", "Indore",
];

const FUNDS = [
  ["HDFC Balanced Advantage Fund", "Hybrid"],
  ["ICICI Prudential Bluechip Fund", "Equity"],
  ["SBI Small Cap Fund", "Equity"],
  ["Axis Midcap Fund", "Equity"],
  ["Kotak Corporate Bond Fund", "Debt"],
  ["Nippon India Liquid Fund", "Liquid"],
  ["Mirae Asset Large Cap Fund", "Equity"],
  ["Parag Parikh Flexi Cap Fund", "Equity"],
  ["Aditya Birla Sun Life Gold ETF", "Gold"],
  ["UTI Nifty Index Fund", "Equity"],
  ["HDFC Short Term Debt Fund", "Debt"],
  ["Quant Active Fund", "Equity"],
  ["Franklin India Feeder US Opportunities", "International"],
  ["SBI Magnum Gilt Fund", "Debt"],
];

const GOAL_LABELS = [
  "Child's higher education", "Retirement corpus", "Home purchase",
  "Daughter's wedding", "Second property", "Business expansion capital",
  "Sabbatical fund", "Legacy planning",
];

const INTERACTION_NOTES: Record<string, string[]> = {
  call: [
    "Discussed market volatility; client comfortable holding position.",
    "Client asked about tax-loss harvesting before year end.",
    "Quick check-in. No action requested.",
    "Client raised concerns about small-cap exposure.",
  ],
  meeting: [
    "Annual review completed. Allocation rebalanced towards debt.",
    "Discussed goal funding progress; on track for education corpus.",
    "Reviewed portfolio performance and agreed to increase SIP.",
    "Introduced family office services. Client considering.",
  ],
  email: [
    "Sent quarterly statement and fund factsheets.",
    "Shared research note on debt fund positioning.",
    "Followed up on pending KYC documentation.",
  ],
  review: [
    "Formal portfolio review. Rebalancing recommendations documented.",
    "Reviewed asset allocation drift and corrected overweight equity.",
  ],
  whatsapp: [
    "Client acknowledged receipt of statement.",
    "Shared SIP due date reminder.",
  ],
};

/* --------------------------------------------------- Demo scenarios ------ */

type Scenario = {
  name: string;
  segment: string;
  city: string;
  daysSinceContact: number | null;
  daysSinceReview: number | null;
  sipStopped: boolean;
  serviceIssues: number;
  goalYearOffset: number | null;
  portfolioValue: number;
  returnPct: number;
  note: string;
};

/** The eight scenarios BRD §18 requires the seed to contain. */
const SCENARIOS: Scenario[] = [
  {
    name: "Rajesh Sharma",
    segment: "Platinum",
    city: "Mumbai",
    daysSinceContact: 142,
    daysSinceReview: 505,
    sipStopped: false,
    serviceIssues: 1,
    goalYearOffset: 1,
    portfolioValue: 84_500_000,
    returnPct: 12.4,
    note: "High-value client with overdue review — the storyboard's opening case.",
  },
  {
    name: "Neha Shah",
    segment: "Platinum",
    city: "Ahmedabad",
    daysSinceContact: 198,
    daysSinceReview: 240,
    sipStopped: false,
    serviceIssues: 0,
    goalYearOffset: 3,
    portfolioValue: 61_200_000,
    returnPct: 9.8,
    note: "High-value client with a long engagement gap.",
  },
  {
    name: "Arjun Mehta",
    segment: "Gold",
    city: "Pune",
    daysSinceContact: 62,
    daysSinceReview: 190,
    sipStopped: true,
    serviceIssues: 0,
    goalYearOffset: 5,
    portfolioValue: 27_800_000,
    returnPct: -3.2,
    note: "SIP activity change — contributions stopped four months ago.",
  },
  {
    name: "Priya Nair",
    segment: "Gold",
    city: "Bengaluru",
    daysSinceContact: 45,
    daysSinceReview: 150,
    sipStopped: false,
    serviceIssues: 3,
    goalYearOffset: 8,
    portfolioValue: 19_400_000,
    returnPct: 15.1,
    note: "Open document and service issues stacking up.",
  },
  {
    name: "Vikram Reddy",
    segment: "Platinum",
    city: "Hyderabad",
    daysSinceContact: 4,
    daysSinceReview: 40,
    sipStopped: false,
    serviceIssues: 0,
    goalYearOffset: 9,
    portfolioValue: 52_300_000,
    returnPct: 11.2,
    note: "Recently engaged, nothing outstanding — the control case that should rank low.",
  },
  {
    name: "Ananya Iyer",
    segment: "Silver",
    city: "Chennai",
    daysSinceContact: 30,
    daysSinceReview: 120,
    sipStopped: false,
    serviceIssues: 5,
    goalYearOffset: 6,
    portfolioValue: 8_600_000,
    returnPct: 6.7,
    note: "Multiple open tasks against one relationship.",
  },
  {
    name: "Sanjay Kulkarni",
    segment: "Gold",
    city: "Pune",
    daysSinceContact: 55,
    daysSinceReview: 200,
    sipStopped: false,
    serviceIssues: 1,
    goalYearOffset: 1,
    portfolioValue: 23_100_000,
    returnPct: 8.3,
    note: "Goal milestone maturing within the year.",
  },
  {
    name: "Kavita Desai",
    segment: "Platinum",
    city: "Mumbai",
    daysSinceContact: 410,
    daysSinceReview: 730,
    sipStopped: true,
    serviceIssues: 2,
    goalYearOffset: 2,
    portfolioValue: 47_900_000,
    returnPct: -8.4,
    note: "Worst-case relationship: every signal firing at once.",
  },
];

/* ------------------------------------------------------------ Seed ------- */

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  console.log("Clearing existing demo data…");
  await db.execute(sql`
    TRUNCATE TABLE
      ai_messages, ai_conversations, audit_events, review_briefs,
      opportunities, documents, tasks, interactions, transactions,
      holdings, portfolios, clients, users
    RESTART IDENTITY CASCADE
  `);

  /* Users ---------------------------------------------------------------- */

  const userRows = [
    { id: "u-rm-01", name: "Ravi Menon", email: "ravi.menon@vijaywealth.demo", role: "rm", team: "West" },
    { id: "u-rm-02", name: "Shalini Rao", email: "shalini.rao@vijaywealth.demo", role: "rm", team: "West" },
    { id: "u-rm-03", name: "Imran Qureshi", email: "imran.qureshi@vijaywealth.demo", role: "rm", team: "South" },
    { id: "u-rm-04", name: "Deepa Krishnan", email: "deepa.krishnan@vijaywealth.demo", role: "rm", team: "South" },
    { id: "u-rm-05", name: "Aakash Jain", email: "aakash.jain@vijaywealth.demo", role: "rm", team: "North" },
    { id: "u-rm-06", name: "Farah Sheikh", email: "farah.sheikh@vijaywealth.demo", role: "rm", team: "North" },
    { id: "u-rm-07", name: "Nitin Chandra", email: "nitin.chandra@vijaywealth.demo", role: "rm", team: "East" },
    { id: "u-rm-08", name: "Leela Vasudevan", email: "leela.v@vijaywealth.demo", role: "rm", team: "East" },
    { id: "u-mgr-01", name: "Sunita Balakrishnan", email: "sunita.b@vijaywealth.demo", role: "manager", team: "West" },
    { id: "u-ops-01", name: "Tarun Gill", email: "tarun.gill@vijaywealth.demo", role: "operations", team: "Ops" },
    { id: "u-adm-01", name: "Priyanka Bose", email: "priyanka.bose@vijaywealth.demo", role: "admin", team: "Ops" },
    { id: "u-exe-01", name: "Vijay Ramaswamy", email: "vijay.r@vijaywealth.demo", role: "executive", team: "Exec" },
  ];
  await db.insert(users).values(userRows.map((u) => ({ ...u, status: "active" })));
  const rmIds = userRows.filter((u) => u.role === "rm").map((u) => u.id);
  console.log(`  ${userRows.length} users`);

  /* Clients -------------------------------------------------------------- */

  type Built = { scoring: ScoringInput; clientId: string; rmId: string };
  const built: Built[] = [];

  const clientRows: (typeof clients.$inferInsert)[] = [];
  const portfolioRows: (typeof portfolios.$inferInsert)[] = [];
  const holdingRows: (typeof holdings.$inferInsert)[] = [];
  const txnRows: (typeof transactions.$inferInsert)[] = [];
  const interactionRows: (typeof interactions.$inferInsert)[] = [];
  const taskRows: (typeof tasks.$inferInsert)[] = [];
  const docRows: (typeof documents.$inferInsert)[] = [];

  const TOTAL = 80;
  const usedNames = new Set<string>();

  for (let i = 0; i < TOTAL; i++) {
    const scenario: Scenario | null = i < SCENARIOS.length ? SCENARIOS[i] : null;

    let name: string;
    if (scenario) {
      name = scenario.name;
    } else {
      do {
        name = `${pick(FIRST)} ${pick(LAST)}`;
      } while (usedNames.has(name));
    }
    usedNames.add(name);

    const clientId = `c-${String(i + 1).padStart(3, "0")}`;
    const rmId = scenario ? rmIds[i % rmIds.length] : pick(rmIds);
    const segment =
      scenario?.segment ??
      (rand() < 0.12 ? "Platinum" : rand() < 0.35 ? "Gold" : rand() < 0.75 ? "Silver" : "Emerging");
    const city = scenario?.city ?? pick(CITIES);

    const portfolioValue =
      scenario?.portfolioValue ??
      (segment === "Platinum"
        ? between(35_000_000, 90_000_000)
        : segment === "Gold"
          ? between(12_000_000, 34_000_000)
          : segment === "Silver"
            ? between(3_000_000, 11_000_000)
            : between(400_000, 2_800_000));

    const returnPct = scenario?.returnPct ?? between(-9, 22);
    const investedValue = portfolioValue / (1 + returnPct / 100);

    const daysSinceContact =
      scenario?.daysSinceContact ?? (rand() < 0.08 ? null : intBetween(2, 260));
    const daysSinceReview = scenario?.daysSinceReview ?? (rand() < 0.06 ? null : intBetween(20, 700));
    const sipStopped = scenario?.sipStopped ?? rand() < 0.18;
    const serviceIssues = scenario?.serviceIssues ?? (rand() < 0.35 ? intBetween(1, 3) : 0);

    const goalCount = scenario?.goalYearOffset !== null && scenario ? 2 : intBetween(0, 3);
    const nowYear = new Date().getFullYear();
    const goals = Array.from({ length: goalCount }, (_, gi) => ({
      label: pick(GOAL_LABELS),
      targetYear:
        scenario && gi === 0 && scenario.goalYearOffset !== null
          ? nowYear + scenario.goalYearOffset
          : nowYear + intBetween(2, 15),
      targetAmount: Math.round(between(2_000_000, 40_000_000)),
    }));

    clientRows.push({
      id: clientId,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.demo`,
      phone: `+91 ${intBetween(70, 99)}${String(intBetween(10_000_000, 99_999_999)).slice(0, 8)}`,
      city,
      segment,
      rmId,
      riskProfileDemo: pick(["Conservative", "Moderate", "Balanced", "Growth", "Aggressive"]),
      goals,
      status: "active",
      onboardedAt: daysAgo(intBetween(200, 2600)),
      lastReviewAt: daysSinceReview === null ? null : daysAgo(daysSinceReview),
    });

    /* Portfolio + holdings */
    const portfolioId = `p-${clientId}`;
    const equityPct = between(35, 72);
    const debtPct = between(12, 38);
    const goldPct = between(2, 9);
    const liquidPct = Math.max(1, 100 - equityPct - debtPct - goldPct);
    const allocation = {
      Equity: Number(equityPct.toFixed(1)),
      Debt: Number(debtPct.toFixed(1)),
      Gold: Number(goldPct.toFixed(1)),
      Liquid: Number(liquidPct.toFixed(1)),
    };

    portfolioRows.push({
      id: portfolioId,
      clientId,
      totalValue: portfolioValue.toFixed(2),
      investedValue: investedValue.toFixed(2),
      assetAllocation: allocation,
      returnPctDemo: returnPct.toFixed(2),
      xirrPctDemo: (returnPct * between(0.75, 1.15)).toFixed(2),
      asOfDate: daysAgo(1),
    });

    const holdingCount = intBetween(4, 9);
    const chosen = [...FUNDS].sort(() => rand() - 0.5).slice(0, holdingCount);
    const rawWeights = chosen.map(() => between(1, 10));
    const weightSum = rawWeights.reduce((a, b) => a + b, 0);
    chosen.forEach(([instrument, category], hi) => {
      const weight = (rawWeights[hi] / weightSum) * 100;
      holdingRows.push({
        id: `h-${clientId}-${hi}`,
        portfolioId,
        instrumentName: instrument,
        category,
        value: ((portfolioValue * weight) / 100).toFixed(2),
        weight: weight.toFixed(2),
      });
    });

    /* Transactions — SIP history stops early for the sipStopped cases */
    const sipMonths = intBetween(6, 18);
    const sipAmount = Math.round(portfolioValue * between(0.002, 0.01));
    const sipGapStart = sipStopped ? intBetween(4, 8) : 0;
    for (let m = sipGapStart; m < sipMonths; m++) {
      txnRows.push({
        id: `t-${clientId}-sip-${m}`,
        clientId,
        type: "sip",
        amount: sipAmount.toFixed(2),
        date: daysAgo(m * 30 + intBetween(0, 4)),
        instrument: chosen[0][0],
      });
    }
    for (let k = 0; k < intBetween(2, 6); k++) {
      txnRows.push({
        id: `t-${clientId}-x-${k}`,
        clientId,
        type: pick(["purchase", "redemption", "switch", "dividend"]),
        amount: (portfolioValue * between(0.01, 0.09)).toFixed(2),
        date: daysAgo(intBetween(10, 500)),
        instrument: pick(chosen)[0],
      });
    }

    /* Interactions */
    if (daysSinceContact !== null) {
      const count = intBetween(2, 7);
      for (let k = 0; k < count; k++) {
        const type = pick(["call", "meeting", "email", "review", "whatsapp"]);
        const offset = k === 0 ? daysSinceContact : daysSinceContact + intBetween(20, 200) * k;
        interactionRows.push({
          id: `i-${clientId}-${k}`,
          clientId,
          rmId,
          type,
          date: daysAgo(offset),
          notes: pick(INTERACTION_NOTES[type]),
          nextAction: rand() < 0.4 ? "Send updated fund factsheet" : null,
          followUpDate: rand() < 0.3 ? daysAgo(-intBetween(3, 40)) : null,
        });
      }
    }

    /* Tasks */
    for (let k = 0; k < serviceIssues; k++) {
      taskRows.push({
        id: `k-${clientId}-${k}`,
        clientId,
        ownerId: rmId,
        title: pick([
          "Collect updated KYC documents",
          "Resolve failed SIP mandate",
          "Send revised nomination form",
          "Follow up on redemption request",
          "Reconcile statement discrepancy",
          "Schedule portfolio review call",
        ]),
        description: "Raised from the client's open service queue.",
        priority: pick(["high", "medium", "low"]),
        status: rand() < 0.35 ? "in_progress" : "open",
        dueDate: daysAgo(-intBetween(-20, 25)),
      });
    }
    if (rand() < 0.5) {
      taskRows.push({
        id: `k-${clientId}-done`,
        clientId,
        ownerId: rmId,
        title: "Share quarterly performance summary",
        priority: "low",
        status: "done",
        dueDate: daysAgo(intBetween(10, 60)),
        completedAt: daysAgo(intBetween(1, 9)),
      });
    }

    /* Documents — metadata only; uploads land in S3 when configured */
    const docCount = intBetween(2, 5);
    for (let k = 0; k < docCount; k++) {
      const type = pick(["kyc", "statement", "agreement", "report"]);
      docRows.push({
        id: `d-${clientId}-${k}`,
        clientId,
        name: `${type.toUpperCase()}_${name.split(" ")[0]}_${2024 + intBetween(0, 2)}.pdf`,
        type,
        date: daysAgo(intBetween(5, 600)),
        storageRef: null,
        sizeBytes: intBetween(80_000, 3_400_000),
        status: rand() < 0.12 ? "pending" : "available",
        uploaded: false,
      });
    }

    built.push({
      clientId,
      rmId,
      scoring: {
        segment,
        daysSinceContact,
        daysSinceReview,
        sipStopped,
        openServiceIssues: serviceIssues,
        monthsToGoalMilestone: goals.length
          ? Math.max(0, Math.round((new Date(Math.min(...goals.map((g) => g.targetYear)), 0, 1).getTime() - Date.now()) / (86_400_000 * 30)))
          : null,
        largeRecentMovementPct: returnPct,
        portfolioValue,
      },
    });
  }

  await db.insert(clients).values(clientRows);
  await db.insert(portfolios).values(portfolioRows);
  await db.insert(holdings).values(holdingRows);
  await db.insert(transactions).values(txnRows);
  if (interactionRows.length) await db.insert(interactions).values(interactionRows);
  if (taskRows.length) await db.insert(tasks).values(taskRows);
  if (docRows.length) await db.insert(documents).values(docRows);

  console.log(`  ${clientRows.length} clients, ${holdingRows.length} holdings`);
  console.log(`  ${txnRows.length} transactions, ${interactionRows.length} interactions`);
  console.log(`  ${taskRows.length} tasks, ${docRows.length} documents`);

  /* Opportunities -------------------------------------------------------- */

  const oppRows: (typeof opportunities.$inferInsert)[] = [];
  for (const b of built) {
    const result = scoreClient(b.scoring, DEFAULT_WEIGHTS);
    const types = deriveOpportunities(b.scoring);
    types.forEach((type, idx) => {
      oppRows.push({
        id: `o-${b.clientId}-${idx}`,
        clientId: b.clientId,
        type,
        priority: result.band,
        score: result.score,
        rationale: result.factors,
        status: "open",
      });
    });
  }
  if (oppRows.length) await db.insert(opportunities).values(oppRows);
  console.log(`  ${oppRows.length} opportunities`);

  /* A little seeded assistant history and audit trail --------------------- */

  await db.insert(aiConversations).values({
    id: "conv-demo-01",
    userId: "u-rm-01",
    title: "Morning triage",
  });
  await db.insert(aiMessages).values([
    {
      id: "msg-01",
      conversationId: "conv-demo-01",
      role: "user",
      content: "What should I follow up on today?",
      sourcesDemo: [],
    },
    {
      id: "msg-02",
      conversationId: "conv-demo-01",
      role: "assistant",
      content:
        "Ranked by priority score. Each row shows the single strongest factor driving that client up the list.",
      sourcesDemo: [{ label: "Kavita Desai", href: "/clients/c-008" }],
    },
  ]);

  const auditRows = Array.from({ length: 24 }, (_, i) => ({
    id: `a-${i}`,
    userId: pick(userRows).id,
    eventType: pick(["login", "client_view", "brief_generated", "task_updated", "csv_imported"]),
    entityType: "client",
    entityId: pick(clientRows).id,
    timestamp: daysAgo(intBetween(0, 14)),
    metadata: {},
  }));
  await db.insert(auditEvents).values(auditRows);

  const scenarioSummary = SCENARIOS.map((s, i) => {
    const b = built[i];
    const r = scoreClient(b.scoring, DEFAULT_WEIGHTS);
    const opps = deriveOpportunities(b.scoring).map((o) => OPPORTUNITY_LABEL[o]);
    return `    ${s.name.padEnd(20)} score ${String(r.score).padStart(3)} (${r.band.padEnd(8)}) — ${opps.join(", ") || "no open signals"}`;
  }).join("\n");

  console.log("\nDemo scenarios seeded:");
  console.log(scenarioSummary);
  console.log("\nSeed complete.");

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
