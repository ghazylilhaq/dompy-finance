"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Edit,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BudgetFormDialog } from "@/components/budgets/BudgetFormDialog";
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
import * as Icons from "lucide-react";
import { formatIDR } from "@/lib/formatCurrency";

import { Budget } from "@/types";
import { useBudgets, useCategories } from "@/lib/hooks";
import { useApi } from "@/lib/auth-api";

// Helper to get icon component
const getIcon = (
  iconName: string
): React.ComponentType<{ className?: string }> => {
  return (
    (
      Icons as unknown as Record<
        string,
        React.ComponentType<{ className?: string }>
      >
    )[iconName] || Icons.HelpCircle
  );
};

export default function BudgetsPage() {
  const router = useRouter();
  const {
    budgets,
    isLoading: budgetsLoading,
    error: budgetsError,
    mutate: mutateBudgets,
  } = useBudgets();
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();
  const { createBudget, updateBudget, deleteBudget } = useApi();

  const loading = budgetsLoading || categoriesLoading;
  const error = budgetsError || categoriesError;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for Edit/Delete
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>(
    undefined
  );
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const getCategory = (id: string) => categories.find((c) => c.id === id);

  const handleAddOrUpdateBudget = async (
    budgetData: Omit<Budget, "id" | "spent">
  ) => {
    try {
      setIsSubmitting(true);
      if (selectedBudget) {
        // Update existing
        await updateBudget(selectedBudget.id, {
          limit: budgetData.limit,
        });
      } else {
        // Create new
        await createBudget(budgetData);
      }
      mutateBudgets(); // Refresh list
      setSelectedBudget(undefined);
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Save budget error:", err);
      alert(err instanceof Error ? err.message : "Failed to save budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedBudget(undefined);
    setIsDialogOpen(true);
  };

  const openEditDialog = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    setIsDialogOpen(false);
    setIsAlertOpen(true);
  };

  const handleDeleteBudget = async () => {
    if (!selectedBudget) return;

    try {
      setIsSubmitting(true);
      await deleteBudget(selectedBudget.id);
      mutateBudgets(); // Refresh list
      setIsAlertOpen(false);
      setSelectedBudget(undefined);
    } catch (err) {
      console.error("Delete budget error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort budgets
  const sortedBudgets = [...budgets].sort((a, b) => {
    const pctA = a.spent / a.limit;
    const pctB = b.spent / b.limit;
    return pctB - pctA;
  });

  const BudgetListItem = ({ budget }: { budget: Budget }) => {
    const category = getCategory(budget.categoryId);
    const percentage = Math.min(100, (budget.spent / budget.limit) * 100);
    const isOverBudget = budget.spent > budget.limit;

    const IconComponent = getIcon(category?.icon || "HelpCircle");

    let statusColor = "bg-chart-1-green";
    let statusText = "Safe";
    let StatusIcon = CheckCircle2;

    if (percentage >= 80 && percentage < 100) {
      statusColor = "bg-chart-5-yellow";
      statusText = "Warning";
      StatusIcon = AlertCircle;
    } else if (percentage >= 100) {
      statusColor = "bg-chart-4-red";
      statusText = "Over Budget";
      StatusIcon = AlertTriangle;
    }

    return (
      <Card className="relative group overflow-hidden flex flex-col md:flex-row md:items-center p-4 gap-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
        {/* Left: Icon & Category Info */}
        <div className="flex items-center gap-4 md:w-1/4 min-w-0">
          <div
            className="p-3 rounded-base border-2 border-border shrink-0"
            style={{ backgroundColor: category?.color || "#ccc" }}
          >
            <IconComponent className="h-6 w-6 text-black" />
          </div>
          <div className="min-w-0 overflow-hidden">
            <h3 className="font-bold text-lg truncate">
              {category?.name || "Unknown"}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              Budget: {budget.month}
            </p>
          </div>
        </div>

        {/* Middle: Progress & Amounts */}
        <div className="flex-1 space-y-2 md:px-4">
          <div className="flex justify-between text-sm font-medium mb-1">
            <span className={isOverBudget ? "text-red-600 font-bold" : ""}>
              {formatIDR(budget.spent)}
            </span>
            <span className="text-muted-foreground">
              Limit: {formatIDR(budget.limit)}
            </span>
          </div>

          <div className="relative h-4 w-full rounded-full border-2 border-border bg-secondary-background overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${statusColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex justify-end">
            <span className="text-xs font-bold text-muted-foreground">
              {percentage.toFixed(0)}% Used
            </span>
          </div>
        </div>

        {/* Right: Status Badge & Actions */}
        <div className="flex items-center justify-between md:justify-end gap-4 md:w-1/5">
          <Badge
            variant={isOverBudget ? "destructive" : "outline"}
            className={`flex items-center gap-1 ${
              !isOverBudget ? "bg-white" : ""
            }`}
          >
            <StatusIcon className="h-3 w-3" />
            <span className="hidden sm:inline">{statusText}</span>
          </Badge>
        </div>

        {/* Drawer / Overlay Actions */}
        <div className="absolute bottom-0 right-0 h-full w-1/3 bg-linear-to-l from-secondary-background via-secondary-background to-transparent flex justify-end items-center gap-2 pr-4 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-in-out z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-main/20"
            onClick={() =>
              router.push(`/transactions?category=${budget.categoryId}`)
            }
            title="View Transactions"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-main/20"
            onClick={() => openEditDialog(budget)}
            title="Edit Budget"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader title="Budgets" description="Track your spending limits" />
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-base border-2 border-red-200">
          <p className="font-bold">Error loading budgets</p>
          <p className="text-sm">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Budgets" description="Track your spending limits">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Create Budget
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b-2 border-border pb-2">
          <h2 className="text-xl font-bold">Current Month</h2>
          <span className="text-sm text-muted-foreground">
            {sortedBudgets.length} Active Budgets
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-base" />
            <Skeleton className="h-24 rounded-base" />
            <Skeleton className="h-24 rounded-base" />
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedBudgets.map((budget) => (
              <BudgetListItem key={budget.id} budget={budget} />
            ))}

            {sortedBudgets.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-base bg-main/5">
                <p className="text-muted-foreground font-bold">
                  No active budgets found.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create one to start tracking your spending.
                </p>
                <Button onClick={openCreateDialog} variant="neutral">
                  Create your first budget
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <BudgetFormDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedBudget(undefined); // Reset on close
        }}
        onSubmit={handleAddOrUpdateBudget}
        categories={categories}
        existingBudgets={budgets}
        initialData={selectedBudget}
        onDelete={selectedBudget ? confirmDelete : undefined}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the budget for
              <span className="font-bold text-foreground">
                {" "}
                {getCategory(selectedBudget?.categoryId || "")?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
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
