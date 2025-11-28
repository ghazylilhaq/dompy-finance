/**
 * Custom hook for managing Dompy Assistant state and interactions.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useAssistantApi } from "@/lib/assistant-api";
import type {
  ConversationMessage,
  Proposal,
} from "@/types/assistant";

interface UseAssistantOptions {
  initialConversationId?: string;
}

interface UseAssistantReturn {
  // State
  conversationId: string | null;
  messages: ConversationMessage[];
  proposals: Map<string, Proposal>;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (message: string, imageUrl?: string) => Promise<void>;
  confirmProposal: (proposalId: string, payload?: Record<string, unknown>) => Promise<void>;
  discardProposal: (proposalId: string) => Promise<void>;
  reviseProposal: (proposalId: string, payload: Record<string, unknown>) => void;
  clearConversation: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
}

export function useAssistant(options: UseAssistantOptions = {}): UseAssistantReturn {
  const { initialConversationId } = options;
  
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [proposals, setProposals] = useState<Map<string, Proposal>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useAssistantApi();

  // Load initial conversation if provided
  useEffect(() => {
    if (initialConversationId && api.isLoaded && api.isSignedIn) {
      loadConversation(initialConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, api.isLoaded, api.isSignedIn]);

  // Send a message to the assistant
  const sendMessage = useCallback(
    async (message: string, imageUrl?: string) => {
      if (!message.trim()) return;

      setIsLoading(true);
      setError(null);

      // Optimistically add user message
      const userMessage: ConversationMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: message,
        imageUrl: imageUrl || null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await api.sendMessage({
          conversationId,
          message,
          imageUrl,
        });

        // Update conversation ID
        setConversationId(response.conversationId);

        // Update messages (replace temp user message with real one, add assistant)
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== userMessage.id);
          return [
            ...filtered,
            {
              ...userMessage,
              id: `user-${response.messageId}`, // Use a derived ID
            },
            {
              id: response.messageId,
              role: "assistant" as const,
              content: response.content,
              toolCalls: response.toolCalls,
              createdAt: new Date().toISOString(),
            },
          ];
        });

        // Add proposals
        if (response.proposals.length > 0) {
          setProposals((prev) => {
            const updated = new Map(prev);
            for (const proposal of response.proposals) {
              updated.set(proposal.id, proposal);
            }
            return updated;
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [api, conversationId]
  );

  // Confirm a proposal
  const confirmProposal = useCallback(
    async (proposalId: string, payload?: Record<string, unknown>) => {
      setIsLoading(true);
      setError(null);

      try {
        const request = {
          proposalIds: [proposalId],
          revisions: payload ? { [proposalId]: payload } : undefined,
        };

        const response = await api.applyProposals(request);
        const result = response.results[0];

        if (result.success) {
          // Update proposal status
          setProposals((prev) => {
            const updated = new Map(prev);
            const proposal = updated.get(proposalId);
            if (proposal) {
              updated.set(proposalId, {
                ...proposal,
                status: "confirmed",
                resultId: result.entityId,
                appliedAt: new Date().toISOString(),
              });
            }
            return updated;
          });
        } else {
          setError(result.error || "Failed to apply proposal");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to confirm proposal");
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  // Discard a proposal
  const discardProposal = useCallback(
    async (proposalId: string) => {
      try {
        await api.updateProposal(proposalId, { status: "discarded" });

        // Update local state
        setProposals((prev) => {
          const updated = new Map(prev);
          const proposal = updated.get(proposalId);
          if (proposal) {
            updated.set(proposalId, { ...proposal, status: "discarded" });
          }
          return updated;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to discard proposal");
      }
    },
    [api]
  );

  // Revise a proposal locally (before confirming)
  const reviseProposal = useCallback(
    (proposalId: string, payload: Record<string, unknown>) => {
      setProposals((prev) => {
        const updated = new Map(prev);
        const proposal = updated.get(proposalId);
        if (proposal) {
          updated.set(proposalId, {
            ...proposal,
            payload,
            revisedPayload: payload,
            status: "revised",
          });
        }
        return updated;
      });
    },
    []
  );

  // Clear the current conversation
  const clearConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setProposals(new Map());
    setError(null);
  }, []);

  // Load an existing conversation
  const loadConversation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const conversation = await api.getConversation(id);

        setConversationId(conversation.id);
        setMessages(conversation.messages);

        // Convert proposals array to map
        const proposalMap = new Map<string, Proposal>();
        for (const proposal of conversation.proposals) {
          proposalMap.set(proposal.id, proposal);
        }
        setProposals(proposalMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conversation");
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  return {
    conversationId,
    messages,
    proposals,
    isLoading,
    error,
    sendMessage,
    confirmProposal,
    discardProposal,
    reviseProposal,
    clearConversation,
    loadConversation,
  };
}

