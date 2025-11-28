"use client";

import { useState } from "react";
import { Check, X, Edit2, Calendar, CreditCard, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Proposal, TransactionProposalPayload } from "@/types/assistant";
import { formatIDR } from "@/lib/formatCurrency";

interface TransactionProposalProps {
  proposal: Proposal;
  onConfirm: (proposalId: string, payload?: Record<string, unknown>) => void;
  onDiscard: (proposalId: string) => void;
  onRevise: (proposalId: string, payload: Record<string, unknown>) => void;
}

export function TransactionProposal({
  proposal,
  onConfirm,
  onDiscard,
  onRevise,
}: TransactionProposalProps) {
  const payload = proposal.payload as unknown as TransactionProposalPayload;
  const [isEditing, setIsEditing] = useState(false);
  const [editedPayload, setEditedPayload] = useState(payload);

  const isConfirmed = proposal.status === "confirmed";
  const isDiscarded = proposal.status === "discarded";
  const isDisabled = isConfirmed || isDiscarded;

  const handleConfirm = () => {
    onConfirm(proposal.id, isEditing ? (editedPayload as Record<string, unknown>) : undefined);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    onRevise(proposal.id, editedPayload as Record<string, unknown>);
    setIsEditing(false);
  };

  const typeColor = payload.type === "income" ? "text-green-600" : "text-red-600";
  const typeBg = payload.type === "income" ? "bg-green-50" : "bg-red-50";

  return (
    <div
      className={`border-2 border-border rounded-base overflow-hidden ${
        isDisabled ? "opacity-60" : ""
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-2 ${typeBg} border-b-2 border-border flex items-center justify-between`}>
        <span className={`text-sm font-bold font-heading ${typeColor}`}>
          {payload.type === "income" ? "Income" : "Expense"} Transaction
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

      {/* Content */}
      <div className="p-4 space-y-3 bg-secondary-background">
        {isEditing ? (
          // Edit mode
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-base">Amount</label>
              <Input
                type="number"
                value={editedPayload.amount}
                onChange={(e) =>
                  setEditedPayload({ ...editedPayload, amount: parseFloat(e.target.value) || 0 })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-base">Description</label>
              <Input
                value={editedPayload.description}
                onChange={(e) =>
                  setEditedPayload({ ...editedPayload, description: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-base">Date</label>
              <Input
                type="date"
                value={editedPayload.date}
                onChange={(e) =>
                  setEditedPayload({ ...editedPayload, date: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          // View mode
          <>
            {/* Amount */}
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold font-heading ${typeColor}`}>
                {payload.type === "expense" ? "-" : "+"}
                {formatIDR(payload.amount)}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground font-base">{payload.description}</p>

            {/* Details */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(payload.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>{payload.categoryName || "Uncategorized"}</span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                <span>{payload.accountName || "Unknown"}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {!isDisabled && (
        <div className="px-4 py-3 border-t-2 border-border bg-background flex gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSaveEdit} className="flex-1">
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditedPayload(payload);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={handleConfirm} className="flex-1">
                <Check className="h-4 w-4 mr-1" />
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDiscard(proposal.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}


