/**
 * AIService — BRD §13.
 *
 * The prototype never calls a model to invent facts about the book of business;
 * every figure in a brief or an assistant reply is read from the synthetic
 * database and formatted by template. That constraint is deliberate (§13) and it
 * is also what makes the swap safe: BedrockAIService implements this same
 * interface with grounded retrieval and tool calling, and the UI contracts below
 * do not change.
 */

export type BriefSection = {
  heading: string;
  kind: "text" | "list" | "keyvalue";
  body?: string;
  items?: string[];
  pairs?: { label: string; value: string }[];
};

export type ReviewBrief = {
  clientId: string;
  clientName: string;
  generatedAt: string;
  headline: string;
  sections: BriefSection[];
  disclaimer: string;
};

export type AssistantSource = { label: string; href?: string };

export type AssistantReply = {
  content: string;
  sources: AssistantSource[];
  /** Rows the UI can render as a compact table when the answer is a list. */
  table?: { columns: string[]; rows: string[][] };
  matched: boolean;
};

export interface AIService {
  readonly kind: "mock" | "bedrock";
  generateReviewBrief(clientId: string, userId?: string): Promise<ReviewBrief>;
  answer(question: string, userId?: string): Promise<AssistantReply>;
  suggestedQuestions(): string[];
}

/**
 * Every generated surface carries this. FR-007 and §9 both require generated
 * content to be labelled as RM assistance and never presented as advice.
 */
export const AI_DISCLAIMER =
  "Generated to assist the relationship manager's preparation. This is not personalized investment advice and has not been reviewed by a licensed adviser. Figures are drawn from synthetic demonstration data.";
