"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { formatIDR } from "@/lib/formatCurrency";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityChart } from "@/components/dashboard/ActivityChart";

import { Transaction, Category, Account } from "@/types";
import { useApi, DashboardStats } from "@/lib/auth-api";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    isLoaded,
    isSignedIn,
    getDashboardStats,
    getRecentTransactions,
    getCategories,
    getAccounts,
    createTransaction,
  } = useApi();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Don't set loading to true here to avoid full page flicker on refresh
      setError(null);

      const [statsData, transactionsData, categoriesData, accountsData] =
        await Promise.all([
          getDashboardStats(),
          getRecentTransactions(),
          getCategories(),
          getAccounts(),
        ]);

      setStats(statsData);
      setRecentTransactions(transactionsData);
      setCategories(categoriesData);
      setAccounts(accountsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to be ready
    if (!isLoaded || !isSignedIn) {
      return;
    }

    setLoading(true);
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoaded,
    isSignedIn,
  ]);

  const handleAddTransaction = async (
    txData: Omit<Transaction, "id"> | Transaction
  ) => {
    try {
      setIsSubmitting(true);
      await createTransaction(txData as Omit<Transaction, "id">);
      await fetchDashboardData(); // Refresh all data
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Save transaction error:", err);
      alert(err instanceof Error ? err.message : "Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current month name
  const currentMonthName = new Date().toLocaleString("default", {
    month: "short",
  });

  // Show loading while auth is loading
  if (!isLoaded) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Overview of your financial health"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-base" />
          <Skeleton className="h-32 rounded-base" />
          <Skeleton className="h-32 rounded-base" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Overview of your financial health"
        />
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-base border-2 border-red-200">
          <p className="font-bold">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your financial health"
      >
        <Button onClick={() => setIsDialogOpen(true)}>
          <div className="flex items-center">
            <Plus className="mr-2 h-4 w-4" /> Add Transaction
          </div>
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-base" />
            <Skeleton className="h-32 rounded-base" />
            <Skeleton className="h-32 rounded-base" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Balance"
              value={formatIDR(stats?.totalBalance || 0)}
              icon={Wallet}
              description="Across all accounts"
              iconColor="bg-chart-2-blue"
            />
            <StatCard
              title={`Income (${currentMonthName})`}
              value={formatIDR(stats?.monthlyIncome || 0)}
              icon={TrendingUp}
              description="This month"
              iconColor="bg-chart-1-green"
            />
            <StatCard
              title={`Expense (${currentMonthName})`}
              value={formatIDR(stats?.monthlyExpense || 0)}
              icon={TrendingDown}
              description="This month"
              iconColor="bg-chart-4-red"
            />
          </>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        {/* Charts Section */}
        <div className="col-span-4 rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-heading font-bold">Monthly Activity</h3>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          {loading || !stats ? (
            <div className="h-[300px] flex items-center justify-center">
              <Skeleton className="h-full w-full rounded-base" />
            </div>
          ) : (
            <ActivityChart data={stats.chartData} />
          )}
        </div>

        {/* Recent Transactions */}
        <div className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-heading font-bold">
              Recent Transactions
            </h3>
            <Link
              href="/transactions"
              className="text-sm text-main hover:underline font-bold"
            >
              View All
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-base" />
              <Skeleton className="h-16 rounded-base" />
              <Skeleton className="h-16 rounded-base" />
            </div>
          ) : (
            <TransactionTable
              transactions={recentTransactions}
              categories={categories}
              accounts={accounts}
              compact={true}
            />
          )}
        </div>
      </div>

      <TransactionFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categories={categories}
        accounts={accounts}
        onAddTransaction={handleAddTransaction}
      />
    </div>
  );
}
