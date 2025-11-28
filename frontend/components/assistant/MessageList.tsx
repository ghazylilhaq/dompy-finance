"use client";

import { useRef, useEffect } from "react";
import type { ConversationMessage, Proposal } from "@/types/assistant";
import { MessageBubble } from "./MessageBubble";
import { ProposalCard } from "./proposals/ProposalCard";
import { Loader2, Sparkles } from "lucide-react";

interface MessageListProps {
  messages: ConversationMessage[];
  proposals: Map<string, Proposal>;
  isLoading?: boolean;
  onConfirmProposal: (proposalId: string, payload?: Record<string, unknown>) => void;
  onDiscardProposal: (proposalId: string) => void;
  onReviseProposal: (proposalId: string, payload: Record<string, unknown>) => void;
}

export function MessageList({
  messages,
  proposals,
  isLoading,
  onConfirmProposal,
  onDiscardProposal,
  onReviseProposal,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, proposals]);

  // Group proposals by message ID
  const proposalsByMessage = new Map<string, Proposal[]>();
  proposals.forEach((proposal) => {
    // We don't have message ID in the proposal, so show pending ones at the end
    if (proposal.status === "pending" || proposal.status === "revised") {
      const key = "pending";
      const existing = proposalsByMessage.get(key) || [];
      proposalsByMessage.set(key, [...existing, proposal]);
    }
  });

  const pendingProposals = proposalsByMessage.get("pending") || [];

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {/* Welcome message if no messages */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
          <div className="w-16 h-16 rounded-full bg-main/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-main" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold text-foreground">
              Hi! I&apos;m Dompy 👋
            </h3>
            <p className="text-sm text-muted-foreground font-base mt-1 max-w-sm">
              Your personal finance assistant. Ask me about your transactions,
              budgets, or tell me to add new entries!
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {[
              "Show my spending this month",
              "Add coffee expense 35k",
              "How's my budget looking?",
            ].map((suggestion) => (
              <span
                key={suggestion}
                className="px-3 py-1.5 text-xs rounded-base border-2 border-border bg-secondary-background text-muted-foreground font-base"
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Pending proposals */}
      {pendingProposals.length > 0 && (
        <div className="space-y-3 pt-2">
          {pendingProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onConfirm={onConfirmProposal}
              onDiscard={onDiscardProposal}
              onRevise={onReviseProposal}
            />
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-base">Dompy is thinking...</span>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}


