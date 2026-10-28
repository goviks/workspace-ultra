"use client";

import { AlertTriangle } from "lucide-react";
import { forwardRef } from "react";

import type { AIError } from "@/types/ai";

export const ErrorState = forwardRef<HTMLDivElement, { error: AIError }>(
  function ErrorState({ error }, ref) {
    return (
      <div
        ref={ref}
        role="alert"
        tabIndex={-1}
        className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 focus:outline-none"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="font-medium text-red-200">{error.message}</p>
            {error.hint && (
              <p className="text-xs leading-relaxed text-red-300/70">
                {error.hint}
              </p>
            )}
            <p className="pt-1 font-mono text-[11px] uppercase tracking-wide text-red-400/60">
              {error.code}
              {error.status ? ` · HTTP ${error.status}` : ""}
            </p>
          </div>
        </div>
      </div>
    );
  },
);
