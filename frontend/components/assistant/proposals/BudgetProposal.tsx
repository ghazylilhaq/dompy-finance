"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Proposal, BudgetProposalPayload } from "@/types/assistant";
import { formatIDR } from "@/lib/formatCurrency";

interface BudgetProposalProps {
  proposal: Proposal;
  onConfirm: (proposalId: string, payload?: Record<string, unknown>) => void;
  onDiscard: (proposalId: string) => void;
  onRevise: (proposalId: string, payload: Record<string, unknown>) => void;
}

export function BudgetProposal({
  proposal,
  onConfirm,
  onDiscard,
}: BudgetProposalProps) {
  const payload = proposal.payload as unknown as BudgetProposalPayload;

  const isConfirmed = proposal.status === "confirmed";
  const isDiscarded = proposal.status === "discarded";
  const isDisabled = isConfirmed || isDiscarded;

  const handleConfirm = () => {
    // Convert allocations to the format expected by apply_budget_plan
    const allocations = payload.allocations.map((alloc) => ({
      category_id: alloc.categoryId,
      amount: alloc.suggestedAmount,
    }));

    onConfirm(proposal.id, {
      month: payload.month,
      allocations,
    });
  };

  return (
    <div
      className={`border-2 border-border rounded-base overflow-hidden ${
        isDisabled ? "opacity-60" : ""
      }`}
    >
      {/* Header */}
      <div className="px-4 py-2 bg-blue-50 border-b-2 border-border flex items-center justify-between">
        <span className="text-sm font-bold font-heading text-blue-600">
          Budget Plan for {payload.month}
        </span>
        {isConfirmed && (
          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-base">
            Applied
          </span>
        )}
        {isDiscarded && (
          <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded-base">
            Discarded
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="p-4 bg-secondary-background border-b-2 border-border">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground font-base">Income:</span>
            <span className="ml-2 font-bold text-green-600">{formatIDR(payload.income)}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-base">Savings:</span>
            <span className="ml-2 font-bold text-blue-600">{formatIDR(payload.targetSavings)}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground font-base">Available for budgets:</span>
            <span className="ml-2 font-bold">{formatIDR(payload.availableForBudgets)}</span>
          </div>
        </div>
      </div>

      {/* Allocations */}
      <div className="max-h-48 overflow-y-auto bg-background">
        {payload.allocations.map((alloc) => (
          <div
            key={alloc.categoryId}
            className="px-4 py-2 border-b border-border/50 flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: alloc.categoryColor }}
              />
              <span className="font-base">{alloc.categoryName}</span>
            </div>
            <span className="font-bold font-base">{formatIDR(alloc.suggestedAmount)}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {!isDisabled && (
        <div className="px-4 py-3 border-t-2 border-border bg-background flex gap-2">
          <Button size="sm" onClick={handleConfirm} className="flex-1">
            <Check className="h-4 w-4 mr-1" />
            Apply All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDiscard(proposal.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}


