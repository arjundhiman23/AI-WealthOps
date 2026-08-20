import type { ScoringInput } from "@/services/priority/engine";

/**
 * DataProvider — BRD §12.
 *
 * The UI and business logic depend on this interface, never on a concrete
 * source. Today the only implementation reads seeded synthetic records from
 * Postgres. NJWealthProvider, CRMProvider and MarketDataProvider implement the
 * same surface against an authorized export/API once one is contractually
 * available; no caller changes.
 */

export type ProviderKind = "mock" | "csv" | "nj_wealth" | "crm" | "market_data";

export type ProviderStatus = {
  kind: ProviderKind;
  label: string;
  connected: boolean;
  description: string;
  lastSyncedAt: Date | null;
};

export type ClientSummary = {
  id: string;
  name: string;
  segment: string;
  city: string | null;
  rmId: string | null;
  rmName: string | null;
  status: string;
  portfolioValue: number;
  returnPctDemo: number | null;
  lastContactAt: Date | null;
  lastReviewAt: Date | null;
  priorityScore: number;
  priorityBand: string;
  openTasks: number;
  scoring: ScoringInput;
};

export type DashboardKpis = {
  totalAum: number;
  clientCount: number;
  clientsNeedingAttention: number;
  overdueReviews: number;
  openFollowUps: number;
  openOpportunities: number;
  avgPortfolioValue: number;
  aumTrend: number[];
};

export interface DataProvider {
  readonly kind: ProviderKind;
  status(): Promise<ProviderStatus>;
  listClients(filter: ClientFilter): Promise<ClientSummary[]>;
}

export type ClientFilter = {
  search?: string;
  segment?: string;
  rmId?: string;
  status?: string;
  band?: string;
  minValue?: number;
  maxValue?: number;
  sort?: "priority" | "value" | "name" | "lastContact";
  limit?: number;
};

export const PROVIDER_REGISTRY: ProviderStatus[] = [
  {
    kind: "mock",
    label: "MockDataProvider",
    connected: true,
    description: "Seeded synthetic client, portfolio and activity records backing this prototype.",
    lastSyncedAt: null,
  },
  {
    kind: "csv",
    label: "CSVDataProvider",
    connected: true,
    description: "Validated CSV import for refreshing demo data or loading a prospect's sample extract.",
    lastSyncedAt: null,
  },
  {
    kind: "nj_wealth",
    label: "NJWealthProvider",
    connected: false,
    description:
      "Future adapter. Requires the customer's authorized export, SFTP or API mechanism — a public website does not imply a public API.",
    lastSyncedAt: null,
  },
  {
    kind: "crm",
    label: "CRMProvider",
    connected: false,
    description: "Future CRM integration for interactions, tasks and communication history.",
    lastSyncedAt: null,
  },
  {
    kind: "market_data",
    label: "MarketDataProvider",
    connected: false,
    description: "Future approved market-data source for live valuations and benchmarks.",
    lastSyncedAt: null,
  },
];
