"use client";

import { X, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistant } from "@/lib/hooks/useAssistant";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversationId?: string;
}

export function AssistantPanel({
  isOpen,
  onClose,
  initialConversationId,
}: AssistantPanelProps) {
  const {
    messages,
    proposals,
    isLoading,
    error,
    sendMessage,
    confirmProposal,
    discardProposal,
    reviseProposal,
    clearConversation,
  } = useAssistant({ initialConversationId });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[450px] bg-background border-l-2 border-border z-50 flex flex-col shadow-shadow">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border bg-secondary-background">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-main" />
            <h2 className="font-heading font-bold text-lg">Dompy Assistant</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearConversation}
              title="New conversation"
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b-2 border-red-200 text-red-700 text-sm font-base">
            {error}
          </div>
        )}

        {/* Messages */}
        <MessageList
          messages={messages}
          proposals={proposals}
          isLoading={isLoading}
          onConfirmProposal={confirmProposal}
          onDiscardProposal={discardProposal}
          onReviseProposal={reviseProposal}
        />

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          placeholder="Ask Dompy anything..."
        />
      </div>
    </>
  );
}


