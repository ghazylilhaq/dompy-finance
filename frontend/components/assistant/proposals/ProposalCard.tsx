"use client";

import type { Proposal } from "@/types/assistant";
import { TransactionProposal } from "./TransactionProposal";
import { BudgetProposal } from "./BudgetProposal";
import { CategoryProposal } from "./CategoryProposal";

interface ProposalCardProps {
  proposal: Proposal;
  onConfirm: (proposalId: string, payload?: Record<string, unknown>) => void;
  onDiscard: (proposalId: string) => void;
  onRevise: (proposalId: string, payload: Record<string, unknown>) => void;
}

export function ProposalCard({
  proposal,
  onConfirm,
  onDiscard,
  onRevise,
}: ProposalCardProps) {
  switch (proposal.proposalType) {
    case "transaction":
      return (
        <TransactionProposal
          proposal={proposal}
          onConfirm={onConfirm}
          onDiscard={onDiscard}
          onRevise={onRevise}
        />
      );
    case "budget":
      return (
        <BudgetProposal
          proposal={proposal}
          onConfirm={onConfirm}
          onDiscard={onDiscard}
          onRevise={onRevise}
        />
      );
    case "category":
      return (
        <CategoryProposal
          proposal={proposal}
          onConfirm={onConfirm}
          onDiscard={onDiscard}
        />
      );
    default:
      return (
        <div className="p-4 border-2 border-border rounded-base bg-secondary-background">
          <p className="text-sm text-muted-foreground font-base">
            Unknown proposal type: {proposal.proposalType}
          </p>
        </div>
      );
  }
}


