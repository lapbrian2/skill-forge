"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Error Boundary
// Catches React rendering errors and shows graceful recovery UI.
// Prevents full-page crashes.
// ═══════════════════════════════════════════════════════════════

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isApiKeyError = this.state.error?.message?.includes("API") ||
        this.state.error?.message?.includes("key") ||
        this.state.error?.message?.includes("ANTHROPIC");

      return (
        <div className="rounded-xl border border-white/8 bg-[#111] p-8 text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
          <h3 className="text-[15px] font-semibold">
            {isApiKeyError ? "API Key Required" : "Something went wrong"}
          </h3>
          <p className="text-[13px] text-white/40 max-w-md mx-auto">
            {isApiKeyError ? (
              <>
                Set your <code className="text-orange-300 bg-white/5 px-1 rounded text-[12px]">ANTHROPIC_API_KEY</code> environment variable
                to enable AI features. Add it to your <code className="text-orange-300 bg-white/5 px-1 rounded text-[12px]">.env.local</code> file
                and restart the dev server.
              </>
            ) : (
              this.props.fallbackMessage || this.state.error?.message || "An unexpected error occurred."
            )}
          </p>
          <Button
            onClick={this.handleRetry}
            variant="outline"
            className="border-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
