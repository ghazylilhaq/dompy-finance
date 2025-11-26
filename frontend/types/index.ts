export type TransactionType = "income" | "expense";

export type AccountType =
  | "cash"
  | "bank"
  | "e-wallet"
  | "credit card"
  | "credit_card";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  parentId?: string;
  isSystem?: boolean;
  // API response fields
  createdAt?: string;
  updatedAt?: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  // API response fields
  createdAt?: string;
  updatedAt?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  month: string; // Format: "YYYY-MM"
  limit: number;
  spent: number;
  // API enriched fields
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO Date string
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  description: string;
  tags: string[];
  // Transfer fields
  isTransfer?: boolean;
  transferGroupId?: string;
  hideFromSummary?: boolean;
  // API enriched fields
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  accountName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// =============================================================================
// Transfer Types
// =============================================================================

export interface TransferCreate {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
  hideFromSummary?: boolean;
}

export interface TransferResponse {
  transferGroupId: string;
  outgoingTransaction: Transaction;
  incomingTransaction: Transaction;
}

// =============================================================================
// Import Types
// =============================================================================

export interface ImportProfile {
  id: string;
  name: string;
  columnMapping: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedRow {
  rowIndex: number;
  externalId: string;
  date: string;
  categoryValue: string;
  accountValue: string;
  amount: number;
  description: string;
}

export interface ParseResult {
  profileId: string;
  totalRows: number;
  parsedRows: ParsedRow[];
  unmappedCategories: string[];
  unmappedAccounts: string[];
  existingCategoryMappings: Record<string, string>;
  existingAccountMappings: Record<string, string>;
}

export interface MappingItem {
  csvValue: string;
  internalId: string;
}

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  transferCount: number;
  errors: string[];
}

// =============================================================================
// Preview Types
// =============================================================================

export interface PreviewRow {
  rowIndex: number;
  externalId: string;
  date: string;
  parsedDate: string | null;
  amount: number;
  type: "income" | "expense" | "transfer";
  description: string;

  categoryValue: string;
  categoryId: string | null;
  categoryName: string | null;

  accountValue: string;
  accountId: string | null;
  accountName: string | null;

  isValid: boolean;
  validationErrors: string[];

  isTransfer: boolean;
  transferPairIndex: number | null;
}

export interface PreviewResult {
  profileId: string;
  rows: PreviewRow[];
  totalValid: number;
  totalInvalid: number;
  totalTransfers: number;
  warnings: string[];
}
