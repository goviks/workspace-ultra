"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { EditorCard } from "@/components/editor/EditorCard";
import { useAIStream } from "@/lib/hooks/use-ai-stream";
import { useAssistantStore } from "@/lib/store/assistant-store";

export function Workspace() {
  const status = useAssistantStore((state) => state.status);
  const insertResult = useAssistantStore((state) => state.insertResult);

  const { run, cancel, retry } = useAIStream();
  const [panelOpen, setPanelOpen] = useState(false);

  const isBusy = status === "loading" || status === "streaming";

  const handleImprove = useCallback(() => {
    setPanelOpen(true);
    void run();
  }, [run]);

  const handleInsert = useCallback(() => {
    insertResult();
    setPanelOpen(false);
  }, [insertResult]);

  useEffect(() => {
    if (!isBusy) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isBusy, cancel]);

  return (
    <>
      <div className="flex flex-col gap-6 pb-24 md:flex-row md:items-start md:pb-0">
        <EditorCard onImprove={handleImprove} isBusy={isBusy} />

        <AssistantPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onCancel={cancel}
          onRetry={retry}
          onInsert={handleInsert}
        />
      </div>

      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 md:hidden"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          AI-ассистент
        </button>
      )}
    </>
  );
}
