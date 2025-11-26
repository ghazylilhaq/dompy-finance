"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Budget, Category } from "@/types";
import { formatIDR } from "@/lib/formatCurrency";

interface BudgetFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (budget: Omit<Budget, "id" | "spent">) => void;
  onDelete?: () => void;
  categories: Category[];
  existingBudgets: Budget[];
  initialData?: Budget; // Optional for edit mode
}

export function BudgetFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  onDelete,
  categories,
  existingBudgets,
  initialData,
}: BudgetFormDialogProps) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  // We keep 'month' internally to satisfy API, but won't show it to user if creating new
  const [month, setMonth] = useState("");
  const [frequency, setFrequency] = useState("monthly");

  // Reset or populate form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode
        setCategoryId(initialData.categoryId);
        setAmount(initialData.limit.toString());
        setMonth(initialData.month);
        setFrequency("monthly");
      } else {
        // Create Mode
        setCategoryId("");
        setAmount("");
        setFrequency("monthly");
        const now = new Date();
        // Default to current month
        setMonth(
          `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
        );
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || !month) return;

    onSubmit({
      categoryId,
      limit: parseFloat(amount),
      month,
    });
    onOpenChange(false);
  };

  // Filter logic:
  // If in edit mode, we should include the current category in the list even if it "has a budget" (which is this one).
  // Otherwise, exclude used categories and system categories.
  const availableCategories = categories.filter((cat) => {
    // Always exclude system categories (transfer categories)
    if (cat.isSystem) return false;
    
    if (initialData && cat.id === initialData.categoryId) return true;

    const hasBudget = existingBudgets.some(
      (b) => b.categoryId === cat.id && b.month === month
    );
    return !hasBudget;
  });

  const expenseCategories = availableCategories.filter(
    (c) => c.type === "expense"
  );
  const incomeCategories = availableCategories.filter(
    (c) => c.type === "income"
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Budget" : "Create Budget"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Frequency Selection */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <ToggleGroup
              type="single"
              value={frequency}
              onValueChange={(val) => val && setFrequency(val)}
              className="justify-start border-2 border-border rounded-base p-1"
            >
              <ToggleGroupItem
                value="monthly"
                className="flex-1 data-[state=on]:bg-main data-[state=on]:text-white"
              >
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="weekly"
                disabled
                className="flex-1 opacity-50 cursor-not-allowed"
                title="Weekly budgets coming soon"
              >
                Weekly
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              required
              disabled={!!initialData} // Disable category change in edit mode
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Expenses</SelectLabel>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {incomeCategories.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Income</SelectLabel>
                    {incomeCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {/* If editing and the current category is somehow filtered out (shouldn't happen due to filter logic above), force show it */}
                {initialData &&
                  !availableCategories.find(
                    (c) => c.id === initialData.categoryId
                  ) && (
                    <SelectItem value={initialData.categoryId}>
                      {categories.find((c) => c.id === initialData.categoryId)
                        ?.name || "Current Category"}
                    </SelectItem>
                  )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Limit Amount (IDR)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                Rp
              </span>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {amount && !isNaN(parseFloat(amount)) && (
              <p className="text-xs text-muted-foreground text-right">
                {formatIDR(parseFloat(amount))}
              </p>
            )}
          </div>

          <DialogFooter className="flex-col sm:justify-between gap-2">
            {initialData && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="w-full sm:w-auto"
              >
                Delete Budget
              </Button>
            )}
            <Button type="submit" className="w-full sm:w-auto">
              {initialData ? "Update Budget" : "Set Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
