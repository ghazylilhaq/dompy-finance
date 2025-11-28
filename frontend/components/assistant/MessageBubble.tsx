"use client";

import { User, Bot } from "lucide-react";
import type { ConversationMessage } from "@/types/assistant";
import { ToolIndicator } from "./ToolIndicator";

interface MessageBubbleProps {
  message: ConversationMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  // Don't render tool messages directly
  if (message.role === "tool" || message.role === "system") {
    return null;
  }

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-base border-2 border-border flex items-center justify-center ${
          isUser
            ? "bg-main text-main-foreground"
            : "bg-secondary-background text-foreground"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex flex-col max-w-[80%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-4 py-3 rounded-base border-2 border-border shadow-shadow ${
            isUser
              ? "bg-main text-main-foreground"
              : "bg-secondary-background text-foreground"
          }`}
        >
          {/* Text content */}
          {message.content && (
            <div className="text-sm whitespace-pre-wrap font-base">
              {message.content}
            </div>
          )}

          {/* Image if present */}
          {message.imageUrl && (
            <div className="mt-2">
              <img
                src={message.imageUrl}
                alt="Attached image"
                className="max-w-full max-h-48 rounded-base border-2 border-border"
              />
            </div>
          )}
        </div>

        {/* Tool indicators for assistant messages */}
        {isAssistant && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolIndicator toolCalls={message.toolCalls} />
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground mt-1 font-base">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}


