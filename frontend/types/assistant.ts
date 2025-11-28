/**
 * TypeScript types for Dompy Assistant.
 */

// =============================================================================
// Enums and Types
// =============================================================================

export type MessageRole = "user" | "assistant" | "system" | "tool";
export type ProposalType = "transaction" | "budget" | "category" | "transfer";
export type ProposalStatus = "pending" | "confirmed" | "revised" | "discarded";

// =============================================================================
// Tool Call Types
// =============================================================================

export interface ToolCallInfo {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

// =============================================================================
// Message Types
// =============================================================================

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string | null;
  imageUrl?: string | null;
  toolCalls?: ToolCallInfo[] | null;
  toolCallId?: string | null;
  toolName?: string | null;
  createdAt: string;
}

// =============================================================================
// Proposal Types
// =============================================================================

export interface Proposal {
  id: string;
  proposalType: ProposalType;
  status: ProposalStatus;
  payload: Record<string, unknown>;
  originalPayload: Record<string, unknown>;
  revisedPayload?: Record<string, unknown> | null;
  appliedAt?: string | null;
  resultId?: string | null;
  createdAt: string;
}

// Transaction proposal payload
export interface TransactionProposalPayload {
  date: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string | null;
  categoryName: string | null;
  accountId: string | null;
  accountName: string | null;
  description: string;
  tags: string[];
}

// Budget proposal payload
export interface BudgetProposalPayload {
  month: string;
  income: number;
  targetSavings: number;
  mandatoryPayments: { name: string; amount: number }[];
  availableForBudgets: number;
  allocations: {
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    suggestedAmount: number;
    hasExisting: boolean;
  }[];
}

// Category proposal payload
export interface CategoryProposalPayload {
  action: "create" | "rename" | "delete" | "merge";
  categoryId?: string;
  categoryName?: string;
  name?: string;
  newName?: string;
  type?: "income" | "expense";
  color?: string;
  icon?: string;
  sourceCategoryId?: string;
  sourceCategoryName?: string;
  targetCategoryId?: string;
  targetCategoryName?: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface MessageRequest {
  conversationId?: string | null;
  message: string;
  imageUrl?: string | null;
}

export interface MessageResponse {
  conversationId: string;
  messageId: string;
  content: string;
  toolCalls: ToolCallInfo[];
  proposals: Proposal[];
}

export interface ApplyProposalRequest {
  proposalIds: string[];
  revisions?: Record<string, Record<string, unknown>>;
}

export interface ApplyProposalResult {
  proposalId: string;
  success: boolean;
  entityId?: string | null;
  error?: string | null;
}

export interface ApplyProposalsResponse {
  results: ApplyProposalResult[];
}

export interface ProposalUpdate {
  revisedPayload?: Record<string, unknown>;
  status?: "revised" | "discarded";
}

// =============================================================================
// Conversation Types
// =============================================================================

export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationDetail {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
  proposals: Proposal[];
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
  total: number;
  skip: number;
  limit: number;
}


