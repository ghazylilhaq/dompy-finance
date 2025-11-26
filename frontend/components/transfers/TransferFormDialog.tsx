"use client";

import React, { useState, useEffect } from "react";
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
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Account } from "@/types";
import { useApi } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import * as Icons from "lucide-react";
import { CalendarIcon, ArrowRight, Loader2 } from "lucide-react";

interface TransferFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fromAccount: Account;
  accounts: Account[];
  onSuccess: () => void;
}

export function TransferFormDialog({
  isOpen,
  onOpenChange,
  fromAccount,
  accounts,
  onSuccess,
}: TransferFormDialogProps) {
  const { createTransfer } = useApi();

  const [toAccountId, setToAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState<string>("");
  const [hideFromSummary, setHideFromSummary] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out the source account from destination options
  const destinationAccounts = accounts.filter(
    (acc) => acc.id !== fromAccount.id
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setToAccountId("");
      setAmount("");
      setDate(new Date());
      setDescription("");
      setHideFromSummary(true);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!toAccountId) {
      setError("Please select a destination account");
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    try {
      setIsSubmitting(true);
      await createTransfer({
        fromAccountId: fromAccount.id,
        toAccountId,
        amount: numAmount,
        date: date.toISOString(),
        description: description || "Transfer",
        hideFromSummary,
      });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Transfer error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create transfer"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get icon component for an account
  const getAccountIcon = (iconName: string) => {
    const IconComponent =
      (
        Icons as unknown as Record<
          string,
          React.ComponentType<{ className?: string }>
        >
      )[iconName] || Icons.HelpCircle;
    return IconComponent;
  };

  const FromIcon = getAccountIcon(fromAccount.icon);
  const toAccount = destinationAccounts.find((acc) => acc.id === toAccountId);
  const ToIcon = toAccount ? getAccountIcon(toAccount.icon) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.ArrowLeftRight className="h-5 w-5" />
            Transfer Funds
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Visual Transfer Flow */}
          <div className="flex items-center justify-center gap-3 p-4 bg-secondary-background rounded-base border-2 border-border">
            {/* From Account */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="p-3 rounded-base border-2 border-border"
                style={{ backgroundColor: fromAccount.color }}
              >
                <FromIcon className="h-6 w-6 text-black" />
              </div>
              <span className="text-sm font-medium truncate max-w-[100px]">
                {fromAccount.name}
              </span>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />

            {/* To Account */}
            <div className="flex flex-col items-center gap-1">
              {toAccount ? (
                <>
                  <div
                    className="p-3 rounded-base border-2 border-border"
                    style={{ backgroundColor: toAccount.color }}
                  >
                    {ToIcon && <ToIcon className="h-6 w-6 text-black" />}
                  </div>
                  <span className="text-sm font-medium truncate max-w-[100px]">
                    {toAccount.name}
                  </span>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-base border-2 border-dashed border-muted-foreground bg-muted">
                    <Icons.HelpCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Select</span>
                </>
              )}
            </div>
          </div>

          {/* To Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="toAccount">To Account</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                {destinationAccounts.map((account) => {
                  const AccIcon = getAccountIcon(account.icon);
                  return (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="p-1 rounded-sm"
                          style={{ backgroundColor: account.color }}
                        >
                          <AccIcon className="h-3 w-3 text-black" />
                        </div>
                        <span>{account.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                Rp
              </span>
              <Input
                id="amount"
                type="number"
                step="1"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Note/Memo */}
          <div className="space-y-2">
            <Label htmlFor="description">Note (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transfer"
              maxLength={500}
            />
          </div>

          {/* Hide from Summary Checkbox */}
          <div className="flex items-center gap-3 p-3 bg-secondary-background rounded-base border-2 border-border">
            <input
              type="checkbox"
              id="hideFromSummary"
              checked={hideFromSummary}
              onChange={(e) => setHideFromSummary(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-border"
            />
            <Label
              htmlFor="hideFromSummary"
              className="text-sm font-normal cursor-pointer"
            >
              Exclude this transfer from income/expense summary
            </Label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-base border-2 border-red-200">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Icons.ArrowLeftRight className="mr-2 h-4 w-4" />
                  Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
