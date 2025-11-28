"use client";

import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { Account, Category, Budget, Transaction } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Re-export types for convenience
export type { Account, Category, Budget, Transaction };

// Utility functions
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

// Create a fetcher that includes auth token
function useAuthFetcher<T>() {
  const { getToken, isSignedIn } = useAuth();

  const fetcher = async (url: string): Promise<T> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isSignedIn) {
      const token = await getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}${url}`, { headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }
    const data = await response.json();
    return snakeToCamel(data) as T;
  };

  return fetcher;
}

// --- Accounts ---

export function useAccounts() {
  const { isLoaded, isSignedIn } = useAuth();
  const fetcher = useAuthFetcher<Account[]>();

  const { data, error, isLoading, mutate } = useSWR<Account[]>(
    isLoaded && isSignedIn ? "/api/accounts" : null,
    fetcher,
    {
      keepPreviousData: true,
    }
  );

  return {
    accounts: data || [],
    isLoading: !isLoaded || isLoading,
    error,
    mutate,
  };
}

// --- Categories ---

export function useCategories() {
  const { isLoaded, isSignedIn } = useAuth();
  const fetcher = useAuthFetcher<Category[]>();

  const { data, error, isLoading, mutate } = useSWR<Category[]>(
    isLoaded && isSignedIn ? "/api/categories" : null,
    fetcher,
    {
      keepPreviousData: true,
    }
  );

  return {
    categories: data || [],
    isLoading: !isLoaded || isLoading,
    error,
    mutate,
  };
}

// --- Budgets ---

export function useBudgets(month?: string) {
  const { isLoaded, isSignedIn } = useAuth();
  const fetcher = useAuthFetcher<BudgetApiResponse[]>();

  // Include month in the key if it exists so it refetches when month changes
  const key = isLoaded && isSignedIn 
    ? (month ? `/api/budgets?month=${month}` : "/api/budgets")
    : null;

  const { data, error, isLoading, mutate } = useSWR<BudgetApiResponse[]>(
    key,
    fetcher,
    {
      keepPreviousData: true,
    }
  );

  return {
    budgets: data ? data.map(transformBudget) : [],
    isLoading: !isLoaded || isLoading,
    error,
    mutate,
  };
}

// --- Transactions ---

export function useTransactions(filters: TransactionFilters = {}) {
  const { isLoaded, isSignedIn } = useAuth();
  const fetcher = useAuthFetcher<Transaction[]>();

  // Build URL with filters
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
  const url = queryString ? `/api/transactions?${queryString}` : "/api/transactions";

  const key = isLoaded && isSignedIn ? url : null;

  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(key, fetcher, {
    keepPreviousData: true,
  });

  return {
    transactions: data || [],
    isLoading: !isLoaded || isLoading,
    error,
    mutate,
  };
}
