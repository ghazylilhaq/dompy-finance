"use client";

import { Wrench, Database, PiggyBank, CreditCard, BarChart3, Tags } from "lucide-react";
import type { ToolCallInfo } from "@/types/assistant";

interface ToolIndicatorProps {
  toolCalls: ToolCallInfo[];
}

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  get_transactions: Database,
  get_budget_overview: PiggyBank,
  get_cashflow_summary: BarChart3,
  get_accounts: CreditCard,
  get_categories: Tags,
  propose_transaction: Database,
  propose_budget_plan: PiggyBank,
  propose_category_changes: Tags,
};

const TOOL_LABELS: Record<string, string> = {
  get_transactions: "Transactions",
  get_budget_overview: "Budgets",
  get_cashflow_summary: "Cashflow",
  get_accounts: "Accounts",
  get_categories: "Categories",
  propose_transaction: "New Transaction",
  propose_budget_plan: "Budget Plan",
  propose_category_changes: "Categories",
};

export function ToolIndicator({ toolCalls }: ToolIndicatorProps) {
  if (!toolCalls || toolCalls.length === 0) return null;

  // Get unique tool names
  const uniqueTools = [...new Set(toolCalls.map((tc) => tc.toolName))];

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {uniqueTools.map((toolName) => {
        const Icon = TOOL_ICONS[toolName] || Wrench;
        const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");

        return (
          <span
            key={toolName}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-base bg-main/10 text-main border border-main/20 font-base"
          >
            <Icon className="h-3 w-3" />
            {label}
          </span>
        );
      })}
    </div>
  );
}


