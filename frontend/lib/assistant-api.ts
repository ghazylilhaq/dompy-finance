/**
 * Assistant API utilities.
 * Provides authenticated API functions for the Dompy Assistant.
 */

"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import type {
  MessageRequest,
  MessageResponse,
  Proposal,
  ProposalUpdate,
  ApplyProposalRequest,
  ApplyProposalsResponse,
  ConversationDetail,
  ConversationListResponse,
} from "@/types/assistant";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// =============================================================================
// Utility Functions
// =============================================================================

function snakeToCamel(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== "object") return obj;

  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    converted[camelKey] = snakeToCamel(value);
  }
  return converted;
}

function camelToSnake(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (typeof obj !== "object") return obj;

  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    converted[snakeKey] = camelToSnake(value);
  }
  return converted;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }
  const data = await response.json();
  return snakeToCamel(data) as T;
}

// =============================================================================
// Hook: useAssistantApi
// =============================================================================

/**
 * Hook that provides authenticated API functions for the assistant.
 * Must be used within ClerkProvider.
 */
export function useAssistantApi() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const apiRequest = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const url = `${API_BASE_URL}${endpoint}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });
      return handleResponse<T>(response);
    },
    [getToken, isSignedIn]
  );

  // Send message to assistant
  const sendMessage = useCallback(
    (request: MessageRequest) =>
      apiRequest<MessageResponse>("/api/assistant/message", {
        method: "POST",
        body: JSON.stringify(camelToSnake(request)),
      }),
    [apiRequest]
  );

  // Apply proposals
  const applyProposals = useCallback(
    (request: ApplyProposalRequest) =>
      apiRequest<ApplyProposalsResponse>("/api/assistant/apply", {
        method: "POST",
        body: JSON.stringify(camelToSnake(request)),
      }),
    [apiRequest]
  );

  // Update a proposal
  const updateProposal = useCallback(
    (proposalId: string, update: ProposalUpdate) =>
      apiRequest<Proposal>(`/api/assistant/proposals/${proposalId}`, {
        method: "PATCH",
        body: JSON.stringify(camelToSnake(update)),
      }),
    [apiRequest]
  );

  // Get a single proposal
  const getProposal = useCallback(
    (proposalId: string) =>
      apiRequest<Proposal>(`/api/assistant/proposals/${proposalId}`),
    [apiRequest]
  );

  // Get conversations list
  const getConversations = useCallback(
    (skip: number = 0, limit: number = 20) =>
      apiRequest<ConversationListResponse>(
        `/api/assistant/conversations?skip=${skip}&limit=${limit}`
      ),
    [apiRequest]
  );

  // Get a single conversation
  const getConversation = useCallback(
    (conversationId: string) =>
      apiRequest<ConversationDetail>(
        `/api/assistant/conversations/${conversationId}`
      ),
    [apiRequest]
  );

  // Delete a conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      const headers: Record<string, string> = {};
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
      await fetch(`${API_BASE_URL}/api/assistant/conversations/${conversationId}`, {
        method: "DELETE",
        headers,
      });
    },
    [getToken, isSignedIn]
  );

  return {
    isLoaded,
    isSignedIn,
    sendMessage,
    applyProposals,
    updateProposal,
    getProposal,
    getConversations,
    getConversation,
    deleteConversation,
  };
}

