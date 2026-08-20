import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";

/**
 * Data model — BRD §11.
 * All records here are synthetic demo data. No production PII is stored.
 */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(), // rm | manager | operations | admin | executive
  team: text("team"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    city: text("city"),
    segment: text("segment").notNull(), // Platinum | Gold | Silver | Emerging
    rmId: text("rm_id").references(() => users.id),
    riskProfileDemo: text("risk_profile_demo"), // demo field only, not advice
    goals: jsonb("goals").$type<{ label: string; targetYear: number; targetAmount: number }[]>().default([]),
    status: text("status").notNull().default("active"),
    onboardedAt: timestamp("onboarded_at"),
    lastReviewAt: timestamp("last_review_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("clients_rm_idx").on(t.rmId), index("clients_segment_idx").on(t.segment)],
);

export const portfolios = pgTable("portfolios", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  totalValue: numeric("total_value", { precision: 16, scale: 2 }).notNull(),
  investedValue: numeric("invested_value", { precision: 16, scale: 2 }).notNull(),
  assetAllocation: jsonb("asset_allocation").$type<Record<string, number>>().notNull(),
  returnPctDemo: numeric("return_pct_demo", { precision: 8, scale: 2 }),
  xirrPctDemo: numeric("xirr_pct_demo", { precision: 8, scale: 2 }),
  asOfDate: timestamp("as_of_date").notNull(),
});

export const holdings = pgTable(
  "holdings",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    instrumentName: text("instrument_name").notNull(),
    category: text("category").notNull(),
    value: numeric("value", { precision: 16, scale: 2 }).notNull(),
    weight: numeric("weight", { precision: 6, scale: 2 }).notNull(),
  },
  (t) => [index("holdings_portfolio_idx").on(t.portfolioId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // purchase | redemption | sip | switch | dividend
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    date: timestamp("date").notNull(),
    instrument: text("instrument").notNull(),
  },
  (t) => [index("transactions_client_idx").on(t.clientId)],
);

export const interactions = pgTable(
  "interactions",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    rmId: text("rm_id").references(() => users.id),
    type: text("type").notNull(), // call | meeting | email | review | whatsapp
    date: timestamp("date").notNull(),
    notes: text("notes"),
    nextAction: text("next_action"),
    followUpDate: timestamp("follow_up_date"),
  },
  (t) => [index("interactions_client_idx").on(t.clientId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority").notNull().default("medium"), // high | medium | low
    status: text("status").notNull().default("open"), // open | in_progress | done
    dueDate: timestamp("due_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [index("tasks_owner_idx").on(t.ownerId), index("tasks_status_idx").on(t.status)],
);

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // kyc | statement | agreement | report | other
    date: timestamp("date").notNull(),
    storageRef: text("storage_ref"), // S3 key, or null for simulated records
    sizeBytes: integer("size_bytes"),
    status: text("status").notNull().default("available"), // available | pending | expired
    uploaded: boolean("uploaded").notNull().default(false),
  },
  (t) => [index("documents_client_idx").on(t.clientId)],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // overdue_review | engagement_gap | sip_inactive | service_issue | goal_milestone
    priority: text("priority").notNull(),
    score: integer("score").notNull(),
    rationale: jsonb("rationale").$type<{ factor: string; detail: string; points: number }[]>().notNull(),
    status: text("status").notNull().default("open"), // open | actioned | dismissed
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("opportunities_client_idx").on(t.clientId), index("opportunities_status_idx").on(t.status)],
);

export const aiConversations = pgTable("ai_conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant
    content: text("content").notNull(),
    sourcesDemo: jsonb("sources_demo").$type<{ label: string; href?: string }[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ai_messages_conversation_idx").on(t.conversationId)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (t) => [index("audit_timestamp_idx").on(t.timestamp)],
);

export const reviewBriefs = pgTable("review_briefs", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  generatedBy: text("generated_by").references(() => users.id),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type DocumentRecord = typeof documents.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type AiConversation = typeof aiConversations.$inferSelect;
export type AiMessage = typeof aiMessages.$inferSelect;
