export type TransactionType = 'income' | 'expense';

export type AccountType = 'cash' | 'bank' | 'e-wallet' | 'credit card' | 'credit_card';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  parentId?: string;
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
  // API enriched fields
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  accountName?: string;
  createdAt?: string;
  updatedAt?: string;
}
