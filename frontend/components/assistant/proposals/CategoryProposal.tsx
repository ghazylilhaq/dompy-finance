"use client";

import { Check, X, Plus, Edit2, Trash2, Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Proposal, CategoryProposalPayload } from "@/types/assistant";

interface CategoryProposalProps {
  proposal: Proposal;
  onConfirm: (proposalId: string, payload?: Record<string, unknown>) => void;
  onDiscard: (proposalId: string) => void;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  create: Plus,
  rename: Edit2,
  delete: Trash2,
  merge: Merge,
};

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  create: { bg: "bg-green-50", text: "text-green-600" },
  rename: { bg: "bg-blue-50", text: "text-blue-600" },
  delete: { bg: "bg-red-50", text: "text-red-600" },
  merge: { bg: "bg-purple-50", text: "text-purple-600" },
};

const ACTION_LABELS: Record<string, string> = {
  create: "Create Category",
  rename: "Rename Category",
  delete: "Delete Category",
  merge: "Merge Categories",
};

export function CategoryProposal({
  proposal,
  onConfirm,
  onDiscard,
}: CategoryProposalProps) {
  const payload = proposal.payload as unknown as CategoryProposalPayload;
  const action = payload.action || "create";

  const isConfirmed = proposal.status === "confirmed";
  const isDiscarded = proposal.status === "discarded";
  const isDisabled = isConfirmed || isDiscarded;

  const Icon = ACTION_ICONS[action] || Plus;
  const colors = ACTION_COLORS[action] || ACTION_COLORS.create;
  const label = ACTION_LABELS[action] || "Category Change";

  const getDescription = () => {
    switch (action) {
      case "create":
        return `Create new ${payload.type} category "${payload.name}"`;
      case "rename":
        return `Rename "${payload.categoryName}" to "${payload.newName}"`;
      case "delete":
        return `Delete category "${payload.categoryName}"`;
      case "merge":
        return `Merge "${payload.sourceCategoryName}" into "${payload.targetCategoryName}"`;
      default:
        return "Unknown action";
    }
  };

  return (
    <div
      className={`border-2 border-border rounded-base overflow-hidden ${
        isDisabled ? "opacity-60" : ""
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-2 ${colors.bg} border-b-2 border-border flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colors.text}`} />
          <span className={`text-sm font-bold font-heading ${colors.text}`}>
            {label}
          </span>
        </div>
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
      <div className="p-4 bg-secondary-background">
        <p className="text-sm font-base text-foreground">{getDescription()}</p>
        
        {action === "create" && payload.color && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border-2 border-border"
              style={{ backgroundColor: payload.color }}
            />
            <span className="text-xs text-muted-foreground font-base">
              Color: {payload.color}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isDisabled && (
        <div className="px-4 py-3 border-t-2 border-border bg-background flex gap-2">
          <Button
            size="sm"
            onClick={() => onConfirm(proposal.id)}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Confirm
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


