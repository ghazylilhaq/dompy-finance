/**
 * Auth-aware API utilities for use in React components.
 * Uses Clerk's useAuth hook to get tokens on-demand.
 */

"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import { Account, Budget, Category, Transaction } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// =============================================================================
// Utility Functions
// =============================================================================

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }
  const data = await response.json();
  return snakeToCamel(data) as T;
}

// =============================================================================
// API Request Function Factory
// =============================================================================

type TokenGetter = () => Promise<string | null>;

function createApiRequest(getToken: TokenGetter) {
  return async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = await getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    return handleResponse<T>(response);
  };
}

// =============================================================================
// Hook: useApi
// =============================================================================

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

interface BudgetApiResponse {
  id: string;
  categoryId: string;
  month: string;
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

function transformBudget(apiBudget: BudgetApiResponse): Budget {
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

export interface TransactionFilters {
  search?: string;
  type?: string;
  categoryId?: string;
  accountId?: string;
  month?: string;
  skip?: number;
  limit?: number;
}

export interface Tag {
  id: string;
  name: string;
}

/**
 * Hook that provides authenticated API functions.
 * Must be used within ClerkProvider.
 */
export function useApi() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const apiRequest = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const url = `${API_BASE_URL}${endpoint}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (isSignedIn) {
        const token = await getToken();
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
    },
    [getToken, isSignedIn]
  );

  // Dashboard
  const getDashboardStats = useCallback(
    () => apiRequest<DashboardStats>("/api/dashboard/stats"),
    [apiRequest]
  );

  const getRecentTransactions = useCallback(
    () => apiRequest<Transaction[]>("/api/dashboard/recent"),
    [apiRequest]
  );

  // Accounts
  const getAccounts = useCallback(
    () => apiRequest<Account[]>("/api/accounts"),
    [apiRequest]
  );

  const getAccount = useCallback(
    (id: string) => apiRequest<Account>(`/api/accounts/${id}`),
    [apiRequest]
  );

  const createAccount = useCallback(
    (data: Omit<Account, "id">) =>
      apiRequest<Account>("/api/accounts", {
        method: "POST",
        body: JSON.stringify(camelToSnake(data)),
      }),
    [apiRequest]
  );

  const updateAccount = useCallback(
    (id: string, data: Partial<Omit<Account, "id">>) =>
      apiRequest<Account>(`/api/accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(camelToSnake(data)),
      }),
    [apiRequest]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      const headers: Record<string, string> = {};
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
      await fetch(`${API_BASE_URL}/api/accounts/${id}`, {
        method: "DELETE",
        headers,
      });
    },
    [getToken, isSignedIn]
  );

  // Categories
  const getCategories = useCallback(
    (type?: string) => {
      const params = type ? `?type=${type}` : "";
      return apiRequest<Category[]>(`/api/categories${params}`);
    },
    [apiRequest]
  );

  const getCategoriesHierarchical = useCallback(
    () => apiRequest<Category[]>("/api/categories/hierarchical"),
    [apiRequest]
  );

  const getCategory = useCallback(
    (id: string) => apiRequest<Category>(`/api/categories/${id}`),
    [apiRequest]
  );

  const createCategory = useCallback(
    (data: Omit<Category, "id">) =>
      apiRequest<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify(camelToSnake(data)),
      }),
    [apiRequest]
  );

  const updateCategory = useCallback(
    (id: string, data: Partial<Omit<Category, "id">>) =>
      apiRequest<Category>(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(camelToSnake(data)),
      }),
    [apiRequest]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const headers: Record<string, string> = {};
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
      await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: "DELETE",
        headers,
      });
    },
    [getToken, isSignedIn]
  );

  // Budgets
  const getBudgets = useCallback(
    async (month?: string) => {
      const params = month ? `?month=${month}` : "";
      const response = await apiRequest<BudgetApiResponse[]>(
        `/api/budgets${params}`
      );
      return response.map(transformBudget);
    },
    [apiRequest]
  );

  const getBudget = useCallback(
    async (id: string) => {
      const response = await apiRequest<BudgetApiResponse>(`/api/budgets/${id}`);
      return transformBudget(response);
    },
    [apiRequest]
  );

  const createBudget = useCallback(
    async (data: Omit<Budget, "id" | "spent">) => {
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
    },
    [apiRequest]
  );

  const updateBudget = useCallback(
    async (id: string, data: { limit?: number }) => {
      const payload = data.limit !== undefined ? { limit_amount: data.limit } : {};
      const response = await apiRequest<BudgetApiResponse>(`/api/budgets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return transformBudget(response);
    },
    [apiRequest]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      const headers: Record<string, string> = {};
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
      await fetch(`${API_BASE_URL}/api/budgets/${id}`, {
        method: "DELETE",
        headers,
      });
    },
    [getToken, isSignedIn]
  );

  // Transactions
  const getTransactions = useCallback(
    (filters: TransactionFilters = {}) => {
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
    },
    [apiRequest]
  );

  const getTransaction = useCallback(
    (id: string) => apiRequest<Transaction>(`/api/transactions/${id}`),
    [apiRequest]
  );

  const createTransaction = useCallback(
    (data: Omit<Transaction, "id">) =>
      apiRequest<Transaction>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(camelToSnake(data)),
      }),
    [apiRequest]
  );

  const updateTransaction = useCallback(
    (id: string, data: Partial<Omit<Transaction, "id">>) =>
      apiRequest<Transaction>(`/api/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(camelToSnake(data)),
      }),
    [apiRequest]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const headers: Record<string, string> = {};
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
      await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
        method: "DELETE",
        headers,
      });
    },
    [getToken, isSignedIn]
  );

  // Tags
  const getTags = useCallback(
    () => apiRequest<Tag[]>("/api/tags"),
    [apiRequest]
  );

  return {
    isLoaded,
    isSignedIn,
    // Dashboard
    getDashboardStats,
    getRecentTransactions,
    // Accounts
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    // Categories
    getCategories,
    getCategoriesHierarchical,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    // Budgets
    getBudgets,
    getBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    // Transactions
    getTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    // Tags
    getTags,
  };
}








