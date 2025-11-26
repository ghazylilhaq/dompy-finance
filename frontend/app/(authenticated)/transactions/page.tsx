"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FilterX, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Transaction } from "@/types";
import { useTransactions, useCategories, useAccounts } from "@/lib/hooks";
import { useApi } from "@/lib/auth-api";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function TransactionsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { createTransaction, updateTransaction, deleteTransaction } = useApi();

  // Initialize filters from URL params
  const today = new Date();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState<string>(
    searchParams.get("type") || "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get("category") || "all"
  );
  const [accountFilter, setAccountFilter] = useState<string>(
    searchParams.get("account") || "all"
  );
  const [selectedMonth, setSelectedMonth] = useState(
    searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : today.getMonth()
  );
  const [selectedYear, setSelectedYear] = useState(
    searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : today.getFullYear()
  );

  // Format month as YYYY-MM for API
  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(
    2,
    "0"
  )}`;

  // Use Hooks
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    mutate: mutateTransactions,
  } = useTransactions({
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
    accountId: accountFilter !== "all" ? accountFilter : undefined,
    month: monthStr,
  });

  const { categories, isLoading: categoriesLoading } = useCategories();
  const { accounts, isLoading: accountsLoading } = useAccounts();

  const loading = transactionsLoading || categoriesLoading || accountsLoading;
  const error = transactionsError;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<
    Transaction | undefined
  >(undefined);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (accountFilter !== "all") params.set("account", accountFilter);
    params.set("month", selectedMonth.toString());
    params.set("year", selectedYear.toString());

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(newUrl, { scroll: false });
  }, [
    search,
    typeFilter,
    categoryFilter,
    accountFilter,
    selectedMonth,
    selectedYear,
    pathname,
    router,
  ]);

  const handleAddOrUpdateTransaction = async (
    txData: Omit<Transaction, "id"> | Transaction
  ) => {
    try {
      setIsSubmitting(true);
      if (editingTransaction) {
        // Update
        await updateTransaction(editingTransaction.id, txData);
      } else {
        // Add
        await createTransaction(txData as Omit<Transaction, "id">);
      }
      mutateTransactions(); // Refresh list
      setEditingTransaction(undefined);
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Save transaction error:", err);
      alert(err instanceof Error ? err.message : "Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = () => {
    if (editingTransaction) {
      setDeleteId(editingTransaction.id);
      setIsDialogOpen(false);
      setIsAlertOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setIsSubmitting(true);
      await deleteTransaction(deleteId);
      mutateTransactions(); // Refresh list
      setDeleteId(null);
      setIsAlertOpen(false);
      setEditingTransaction(undefined);
    } catch (err) {
      console.error("Delete transaction error:", err);
      alert(
        err instanceof Error ? err.message : "Failed to delete transaction"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTransaction(undefined);
    setIsDialogOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setAccountFilter("all");
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Transactions"
          description="Manage your income and expenses"
        />
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-base border-2 border-red-200">
          <p className="font-bold">Error loading transactions</p>
          <p className="text-sm">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Transactions"
        description="Manage your income and expenses"
      >
        <Button onClick={openCreateDialog}>
          <div className="flex items-center">
            <Search className="mr-2 h-4 w-4" /> Add Transaction
          </div>
        </Button>
      </PageHeader>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 bg-secondary-background p-4 rounded-base border-2 border-border shadow-shadow">
        <Button
          variant="neutral"
          size="icon"
          onClick={goToPreviousMonth}
          title="Previous Month"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-[200px] text-center">
          <h3 className="text-lg font-heading">
            {monthNames[selectedMonth]} {selectedYear}
          </h3>
        </div>
        <Button
          variant="neutral"
          size="icon"
          onClick={goToNextMonth}
          title="Next Month"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-secondary-background p-4 rounded-base border-2 border-border shadow-shadow">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search ||
          typeFilter !== "all" ||
          categoryFilter !== "all" ||
          accountFilter !== "all") && (
          <Button
            variant="neutral"
            onClick={clearFilters}
            size="icon"
            title="Clear Filters"
          >
            <FilterX className="h-4 w-4" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-base" />
          <Skeleton className="h-16 rounded-base" />
          <Skeleton className="h-16 rounded-base" />
          <Skeleton className="h-16 rounded-base" />
        </div>
      ) : (
        <TransactionTable
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          onEdit={openEditDialog}
        />
      )}

      <TransactionFormDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingTransaction(undefined);
        }}
        categories={categories}
        accounts={accounts}
        onAddTransaction={handleAddOrUpdateTransaction}
        initialData={editingTransaction}
        onDelete={editingTransaction ? confirmDelete : undefined}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TransactionsLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-16 rounded-base" />
      <Skeleton className="h-16 rounded-base" />
      <div className="space-y-2">
        <Skeleton className="h-16 rounded-base" />
        <Skeleton className="h-16 rounded-base" />
        <Skeleton className="h-16 rounded-base" />
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsLoadingSkeleton />}>
      <TransactionsPageContent />
    </Suspense>
  );
}
