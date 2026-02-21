"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
        <Bot className="h-4 w-4 text-blue-400" />
      </div>
      <div className="rounded-xl bg-white/[0.04] border border-white/6 px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/30"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
