"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Keyboard Shortcuts Hook
// Global keyboard shortcuts for the app.
// Cmd+Enter to submit, Cmd+Shift+C to copy spec, Escape to dismiss.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useCallback } from "react";

interface ShortcutHandlers {
  onSubmit?: () => void;       // Cmd+Enter / Ctrl+Enter
  onCopySpec?: () => void;     // Cmd+Shift+C / Ctrl+Shift+C
  onDismiss?: () => void;      // Escape
  onToggleView?: () => void;   // Cmd+Shift+V / Ctrl+Shift+V
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Cmd+Enter — Submit / Accept
    if (isMod && e.key === "Enter" && handlers.onSubmit) {
      e.preventDefault();
      handlers.onSubmit();
      return;
    }

    // Cmd+Shift+C — Copy Spec
    if (isMod && e.shiftKey && (e.key === "c" || e.key === "C") && handlers.onCopySpec) {
      e.preventDefault();
      handlers.onCopySpec();
      return;
    }

    // Cmd+Shift+V — Toggle View Mode
    if (isMod && e.shiftKey && (e.key === "v" || e.key === "V") && handlers.onToggleView) {
      e.preventDefault();
      handlers.onToggleView();
      return;
    }

    // Escape — Dismiss
    if (e.key === "Escape" && handlers.onDismiss) {
      handlers.onDismiss();
      return;
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
