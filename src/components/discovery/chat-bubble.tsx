"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Bot, User } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isAI = message.role === "ai";
  const isSystem = message.role === "system";

  if (isSystem) {
    return null; // System messages handled by PhaseSummaryCard
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isAI ? "justify-start" : "justify-end"}`}
    >
      {isAI && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center mt-1">
          <Bot className="h-4 w-4 text-blue-400" />
        </div>
      )}

      <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
        isAI
          ? "bg-white/[0.04] border border-white/6"
          : "bg-orange-500/10 border border-orange-500/20"
      }`}>
        <p className={`text-[13px] leading-relaxed ${
          isAI ? "text-white/80" : "text-orange-200"
        }`}>
          {message.content}
        </p>

        {message.why && message.type === "question" && (
          <p className="text-[11px] text-white/25 mt-1.5 italic">{message.why}</p>
        )}

        {message.user_action && (
          <Badge variant="outline" className="mt-2 text-[10px] border-white/10 text-white/30">
            {message.user_action === "accept" ? "Accepted suggestion"
              : message.user_action === "edit" ? "Edited suggestion"
              : "Custom answer"}
          </Badge>
        )}
      </div>

      {!isAI && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center mt-1">
          <User className="h-4 w-4 text-orange-400" />
        </div>
      )}
    </motion.div>
  );
}
