"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Edit, Trash2, CalendarIcon, Wallet, Tag } from "lucide-react";
import { format } from "date-fns";
import { formatIDR } from "@/lib/formatCurrency";
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

import { Transaction, Category, Account } from "@/types";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import { useApi } from "@/lib/auth-api";

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const { 
    isLoaded, 
    isSignedIn, 
    getTransaction, 
    getCategories, 
    getAccounts, 
    updateTransaction, 
    deleteTransaction 
  } = useApi();
  
  const [transaction, setTransaction] = useState<Transaction | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Editing State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [txData, categoriesData, accountsData] = await Promise.all([
          getTransaction(id),
          getCategories(),
          getAccounts(),
        ]);

        setTransaction(txData);
        setCategories(categoriesData);
        setAccounts(accountsData);

        // Set category and account from fetched data
        setCategory(categoriesData.find((c) => c.id === txData.categoryId));
        setAccount(accountsData.find((a) => a.id === txData.accountId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transaction");
        console.error("Transaction fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, isLoaded, isSignedIn, getTransaction, getCategories, getAccounts]);

  if (!isLoaded || loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 rounded-base" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push("/transactions")} 
          className="pl-0 hover:bg-transparent hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Transactions
        </Button>
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-base border-2 border-red-200">
          <p className="font-bold">{error || "Transaction not found"}</p>
        </div>
      </div>
    );
  }

  const isExpense = transaction.type === "expense";

  const handleUpdate = async (updatedData: Omit<Transaction, "id"> | Transaction) => {
    try {
      setIsSubmitting(true);
      const updated = await updateTransaction(transaction.id, updatedData);
      setTransaction(updated);

      // Update derived data if category/account changed
      if ("categoryId" in updatedData) {
        setCategory(categories.find((c) => c.id === updated.categoryId));
      }
      if ("accountId" in updatedData) {
        setAccount(accounts.find((a) => a.id === updated.accountId));
      }
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Update transaction error:", err);
      alert(err instanceof Error ? err.message : "Failed to update transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await deleteTransaction(transaction.id);
      router.push("/transactions");
    } catch (err) {
      console.error("Delete transaction error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete transaction");
      setIsSubmitting(false);
    }
  };

  const confirmDelete = () => {
    setIsDialogOpen(false);
    setIsAlertOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/transactions")} className="pl-0 hover:bg-transparent hover:text-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Transactions
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">Details</span>
      </div>

      <PageHeader 
        title="Transaction Details" 
        description={`ID: ${transaction.id}`}
      >
        <div className="flex gap-2">
             <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
             </Button>
             <Button variant="destructive" onClick={() => setIsAlertOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
             </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2 bg-secondary-background border-2 border-border shadow-shadow">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Amount</CardTitle>
                <div className={`text-4xl font-bold ${isExpense ? "text-red-600" : "text-green-600"}`}>
                    {isExpense ? "-" : "+"}{formatIDR(Math.abs(transaction.amount))}
                </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" /> Date
                    </span>
                    <p className="text-lg font-medium">
                        {format(new Date(transaction.date), "PPPP")}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Tag className="h-4 w-4" /> Category
                    </span>
                    <div className="flex items-center gap-2">
                        {category && (
                            <Badge 
                                variant="outline" 
                                className="bg-white text-base py-1 px-3"
                                style={{ backgroundColor: category.color }}
                            >
                                {category.name}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="space-y-1">
                     <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> Account
                    </span>
                    <p className="text-lg font-medium">{account?.name || "Unknown Account"}</p>
                </div>

                 <div className="space-y-1 md:col-span-2">
                     <span className="text-sm font-medium text-muted-foreground">Description</span>
                     <p className="text-xl">{transaction.description}</p>
                </div>
            </CardContent>
        </Card>
      </div>

      <TransactionFormDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => setIsDialogOpen(open)}
        categories={categories}
        accounts={accounts}
        onAddTransaction={handleUpdate}
        initialData={transaction}
        onDelete={confirmDelete}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
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
