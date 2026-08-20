/**
 * Priority & opportunity engine — BRD §8, FR-005, FR-006.
 *
 * Deliberately rule-based and fully explainable: every point a client scores is
 * traceable to a named factor with a human-readable reason. The BRD's production
 * direction is an LLM-assisted model, but explainability is the demo's whole
 * point, so the reasons array is a first-class output rather than a by-product.
 *
 * Weights live here as configuration, not hard-coded into UI components (§8).
 */

export type PriorityWeights = {
  segmentPlatinum: number;
  segmentGold: number;
  segmentSilver: number;
  contactGapPerMonth: number;
  contactGapCap: number;
  reviewOverduePerMonth: number;
  reviewOverdueCap: number;
  sipStopped: number;
  openServiceIssue: number;
  goalMilestoneNear: number;
  largeRecentMovement: number;
  recentlyEngagedRelief: number;
};

export const DEFAULT_WEIGHTS: PriorityWeights = {
  segmentPlatinum: 26,
  segmentGold: 16,
  segmentSilver: 8,
  contactGapPerMonth: 7,
  contactGapCap: 28,
  reviewOverduePerMonth: 8,
  reviewOverdueCap: 30,
  sipStopped: 14,
  openServiceIssue: 12,
  goalMilestoneNear: 10,
  largeRecentMovement: 9,
  recentlyEngagedRelief: -12,
};

export type PriorityBand = "critical" | "high" | "medium" | "low";

export type PriorityFactor = {
  factor: string;
  detail: string;
  points: number;
};

export type PriorityResult = {
  score: number;
  band: PriorityBand;
  factors: PriorityFactor[];
};

export type ScoringInput = {
  segment: string;
  daysSinceContact: number | null;
  daysSinceReview: number | null;
  sipStopped: boolean;
  openServiceIssues: number;
  monthsToGoalMilestone: number | null;
  largeRecentMovementPct: number | null;
  portfolioValue: number;
};

export function scoreClient(input: ScoringInput, weights: PriorityWeights = DEFAULT_WEIGHTS): PriorityResult {
  const factors: PriorityFactor[] = [];

  // Relationship value — the base weight everything else compounds on.
  const segmentPoints =
    input.segment === "Platinum"
      ? weights.segmentPlatinum
      : input.segment === "Gold"
        ? weights.segmentGold
        : input.segment === "Silver"
          ? weights.segmentSilver
          : 0;
  if (segmentPoints > 0) {
    factors.push({
      factor: "Relationship value",
      detail: `${input.segment} segment client`,
      points: segmentPoints,
    });
  }

  // Engagement gap.
  if (input.daysSinceContact !== null) {
    const months = Math.floor(input.daysSinceContact / 30);
    if (months >= 2) {
      const points = Math.min(months * weights.contactGapPerMonth, weights.contactGapCap);
      factors.push({
        factor: "Engagement gap",
        detail: `No recorded contact for ${input.daysSinceContact} days`,
        points,
      });
    }
  } else {
    factors.push({
      factor: "Engagement gap",
      detail: "No interaction has ever been recorded",
      points: weights.contactGapCap,
    });
  }

  // Review recency — a review older than a year is the classic overdue case.
  if (input.daysSinceReview !== null && input.daysSinceReview > 365) {
    const monthsOverdue = Math.floor((input.daysSinceReview - 365) / 30);
    const points = Math.min(
      Math.max(monthsOverdue, 1) * weights.reviewOverduePerMonth,
      weights.reviewOverdueCap,
    );
    factors.push({
      factor: "Portfolio review overdue",
      detail: `Last review was ${input.daysSinceReview} days ago`,
      points,
    });
  } else if (input.daysSinceReview === null) {
    factors.push({
      factor: "Portfolio review overdue",
      detail: "No portfolio review on record",
      points: weights.reviewOverdueCap,
    });
  }

  if (input.sipStopped) {
    factors.push({
      factor: "SIP activity change",
      detail: "Systematic investment contributions have stopped",
      points: weights.sipStopped,
    });
  }

  if (input.openServiceIssues > 0) {
    factors.push({
      factor: "Open service action",
      detail: `${input.openServiceIssues} unresolved service or document item${input.openServiceIssues > 1 ? "s" : ""}`,
      points: weights.openServiceIssue,
    });
  }

  if (input.monthsToGoalMilestone !== null && input.monthsToGoalMilestone <= 12) {
    factors.push({
      factor: "Goal milestone approaching",
      detail: `A stated client goal matures in about ${input.monthsToGoalMilestone} months`,
      points: weights.goalMilestoneNear,
    });
  }

  if (input.largeRecentMovementPct !== null && Math.abs(input.largeRecentMovementPct) >= 10) {
    factors.push({
      factor: "Significant portfolio movement",
      detail: `Portfolio moved ${input.largeRecentMovementPct > 0 ? "up" : "down"} ${Math.abs(input.largeRecentMovementPct).toFixed(1)}% recently`,
      points: weights.largeRecentMovement,
    });
  }

  // Relief: a client contacted in the last fortnight does not need chasing.
  if (input.daysSinceContact !== null && input.daysSinceContact <= 14) {
    factors.push({
      factor: "Recently engaged",
      detail: `Contacted ${input.daysSinceContact} day${input.daysSinceContact === 1 ? "" : "s"} ago — no action needed yet`,
      points: weights.recentlyEngagedRelief,
    });
  }

  const raw = factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.max(0, Math.min(100, raw));

  return { score, band: bandFor(score), factors: factors.sort((a, b) => b.points - a.points) };
}

export function bandFor(score: number): PriorityBand {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export const BAND_LABEL: Record<PriorityBand, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const BAND_VARIANT: Record<PriorityBand, "danger" | "warning" | "info" | "muted"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "muted",
};

/** Opportunity types the engine can raise — BRD FR-006. */
export type OpportunityType =
  | "overdue_review"
  | "engagement_gap"
  | "sip_inactive"
  | "service_issue"
  | "goal_milestone";

export const OPPORTUNITY_LABEL: Record<OpportunityType, string> = {
  overdue_review: "Overdue review",
  engagement_gap: "Engagement gap",
  sip_inactive: "SIP stopped",
  service_issue: "Open service issue",
  goal_milestone: "Goal milestone near",
};

export const OPPORTUNITY_ACTION: Record<OpportunityType, string> = {
  overdue_review: "Schedule a portfolio review",
  engagement_gap: "Reach out to re-establish contact",
  sip_inactive: "Discuss restarting the SIP",
  service_issue: "Close the outstanding service item",
  goal_milestone: "Review goal funding progress",
};

/** Derives the opportunities implied by a scoring input. */
export function deriveOpportunities(input: ScoringInput): OpportunityType[] {
  const out: OpportunityType[] = [];
  if (input.daysSinceReview === null || input.daysSinceReview > 365) out.push("overdue_review");
  if (input.daysSinceContact === null || input.daysSinceContact > 90) out.push("engagement_gap");
  if (input.sipStopped) out.push("sip_inactive");
  if (input.openServiceIssues > 0) out.push("service_issue");
  if (input.monthsToGoalMilestone !== null && input.monthsToGoalMilestone <= 12) out.push("goal_milestone");
  return out;
}
