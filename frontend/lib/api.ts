/**
 * API Client for NeoBudget Backend
 *
 * Provides typed functions for all CRUD operations.
 * Handles snake_case <-> camelCase conversion automatically.
 * Includes Clerk authentication token in all requests.
 */

import { Account, Budget, Category, Transaction } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Token getter function - will be set by the auth provider
let getAuthToken: (() => Promise<string | null>) | null = null;

/**
 * Set the auth token getter function.
 * Called by the useApiAuth hook to provide token access.
 */
export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  getAuthToken = getter;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert snake_case keys to camelCase
 */
function snakeToCamel(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== "object") return obj;

  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    converted[camelKey] = snakeToCamel(value);
  }
  return converted;
}

/**
 * Convert camelCase keys to snake_case
 */
function camelToSnake(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (typeof obj !== "object") return obj;

  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    converted[snakeKey] = camelToSnake(value);
  }
  return converted;
}

/**
 * Handle API response - parse JSON and throw on error
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }
  const data = await response.json();
  return snakeToCamel(data) as T;
}

/**
 * Make API request with proper headers and authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get auth token if available
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  return handleResponse<T>(response);
}

// =============================================================================
// Dashboard API
// =============================================================================

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>("/api/dashboard/stats");
}

export async function getRecentTransactions(): Promise<Transaction[]> {
  return apiRequest<Transaction[]>("/api/dashboard/recent");
}

// =============================================================================
// Accounts API
// =============================================================================

export async function getAccounts(): Promise<Account[]> {
  return apiRequest<Account[]>("/api/accounts");
}

export async function getAccount(id: string): Promise<Account> {
  return apiRequest<Account>(`/api/accounts/${id}`);
}

export async function createAccount(
  data: Omit<Account, "id">
): Promise<Account> {
  return apiRequest<Account>("/api/accounts", {
    method: "POST",
    body: JSON.stringify(camelToSnake(data)),
  });
}

export async function updateAccount(
  id: string,
  data: Partial<Omit<Account, "id">>
): Promise<Account> {
  return apiRequest<Account>(`/api/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(camelToSnake(data)),
  });
}

export async function deleteAccount(id: string): Promise<void> {
  const headers: Record<string, string> = {};
  
  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  await fetch(`${API_BASE_URL}/api/accounts/${id}`, {
    method: "DELETE",
    headers,
  });
}

// =============================================================================
// Categories API
// =============================================================================

export async function getCategories(type?: string): Promise<Category[]> {
  const params = type ? `?type=${type}` : "";
  return apiRequest<Category[]>(`/api/categories${params}`);
}

export async function getCategoriesHierarchical(): Promise<Category[]> {
  return apiRequest<Category[]>("/api/categories/hierarchical");
}

export async function getCategory(id: string): Promise<Category> {
  return apiRequest<Category>(`/api/categories/${id}`);
}

export async function createCategory(
  data: Omit<Category, "id">
): Promise<Category> {
  return apiRequest<Category>("/api/categories", {
    method: "POST",
    body: JSON.stringify(camelToSnake(data)),
  });
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<Category, "id">>
): Promise<Category> {
  return apiRequest<Category>(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(camelToSnake(data)),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const headers: Record<string, string> = {};
  
  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  await fetch(`${API_BASE_URL}/api/categories/${id}`, {
    method: "DELETE",
    headers,
  });
}

// =============================================================================
// Budgets API
// =============================================================================

// API response shape (before transformation to frontend Budget type)
interface BudgetApiResponse {
  id: string;
  categoryId: string;
  month: string; // Date string from backend
  limitAmount: number;
  spentAmount: number;
  percentageUsed: number;
  status: string;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  createdAt: string;
  updatedAt: string;
}

// Transform API response to frontend Budget type
function transformBudget(apiBudget: BudgetApiResponse): Budget {
  // Extract YYYY-MM from date string
  const monthStr =
    typeof apiBudget.month === "string"
      ? apiBudget.month.substring(0, 7)
      : apiBudget.month;

  return {
    id: apiBudget.id,
    categoryId: apiBudget.categoryId,
    month: monthStr,
    limit: apiBudget.limitAmount,
    spent: apiBudget.spentAmount,
  };
}

export async function getBudgets(month?: string): Promise<Budget[]> {
  const params = month ? `?month=${month}` : "";
  const response = await apiRequest<BudgetApiResponse[]>(
    `/api/budgets${params}`
  );
  return response.map(transformBudget);
}

export async function getBudget(id: string): Promise<Budget> {
  const response = await apiRequest<BudgetApiResponse>(`/api/budgets/${id}`);
  return transformBudget(response);
}

export async function createBudget(
  data: Omit<Budget, "id" | "spent">
): Promise<Budget> {
  const payload = {
    category_id: data.categoryId,
    month: data.month,
    limit_amount: data.limit,
  };
  const response = await apiRequest<BudgetApiResponse>("/api/budgets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return transformBudget(response);
}

export async function updateBudget(
  id: string,
  data: { limit?: number }
): Promise<Budget> {
  const payload = data.limit !== undefined ? { limit_amount: data.limit } : {};
  const response = await apiRequest<BudgetApiResponse>(`/api/budgets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return transformBudget(response);
}

export async function deleteBudget(id: string): Promise<void> {
  const headers: Record<string, string> = {};
  
  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  await fetch(`${API_BASE_URL}/api/budgets/${id}`, {
    method: "DELETE",
    headers,
  });
}

// =============================================================================
// Transactions API
// =============================================================================

export interface TransactionFilters {
  search?: string;
  type?: string;
  categoryId?: string;
  accountId?: string;
  month?: string; // YYYY-MM format
  skip?: number;
  limit?: number;
}

export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<Transaction[]> {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.categoryId && filters.categoryId !== "all")
    params.set("category_id", filters.categoryId);
  if (filters.accountId && filters.accountId !== "all")
    params.set("account_id", filters.accountId);
  if (filters.month) params.set("month", filters.month);
  if (filters.skip !== undefined) params.set("skip", String(filters.skip));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/transactions?${queryString}`
    : "/api/transactions";

  return apiRequest<Transaction[]>(endpoint);
}

export async function getTransaction(id: string): Promise<Transaction> {
  return apiRequest<Transaction>(`/api/transactions/${id}`);
}

export async function createTransaction(
  data: Omit<Transaction, "id">
): Promise<Transaction> {
  return apiRequest<Transaction>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(camelToSnake(data)),
  });
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<Transaction, "id">>
): Promise<Transaction> {
  return apiRequest<Transaction>(`/api/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(camelToSnake(data)),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const headers: Record<string, string> = {};
  
  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
    method: "DELETE",
    headers,
  });
}

// =============================================================================
// Tags API
// =============================================================================

export interface Tag {
  id: string;
  name: string;
}

export async function getTags(): Promise<Tag[]> {
  return apiRequest<Tag[]>("/api/tags");
}

// =============================================================================
// Onboarding API
// =============================================================================

export interface OnboardingStatus {
  hasCompletedOnboarding: boolean;
}

export interface OnboardingPayload {
  accounts: Omit<Account, "id" | "createdAt" | "updatedAt">[];
  categories: Omit<Category, "id" | "createdAt" | "updatedAt" | "isSystem">[];
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return apiRequest<OnboardingStatus>("/api/onboarding/status");
}

export async function completeOnboarding(
  data: OnboardingPayload
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/onboarding/complete", {
    method: "POST",
    body: JSON.stringify(camelToSnake(data)),
  });
}
