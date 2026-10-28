"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { useAssistantStore } from "@/lib/store/assistant-store";

interface EditorCardProps {
  onImprove: () => void;
  isBusy: boolean;
}

export function EditorCard({ onImprove, isBusy }: EditorCardProps) {
  const documentText = useAssistantStore((state) => state.documentText);
  const selection = useAssistantStore((state) => state.selection);
  const caretRequest = useAssistantStore((state) => state.caretRequest);
  const setDocumentText = useAssistantStore((state) => state.setDocumentText);
  const setSelection = useAssistantStore((state) => state.setSelection);
  const clearCaretRequest = useAssistantStore((state) => state.clearCaretRequest);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (caretRequest === null) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(caretRequest, caretRequest);
    clearCaretRequest();
  }, [caretRequest, clearCaretRequest]);

  const syncSelection = useCallback(
    (el: HTMLTextAreaElement) => {
      const { selectionStart, selectionEnd } = el;
      setSelection(
        selectionStart === selectionEnd
          ? null
          : { start: selectionStart, end: selectionEnd },
      );
    },
    [setSelection],
  );

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocumentText(event.target.value);
    syncSelection(event.target);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (selection && !isBusy) onImprove();
    }
  };

  const selectedChars = selection ? selection.end - selection.start : 0;
  const words = documentText.trim() ? documentText.trim().split(/\s+/).length : 0;
  const canImprove = selectedChars > 0 && !isBusy;

  return (
    <section
      aria-labelledby="editor-heading"
      className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-800 p-4"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="editor-heading" className="text-lg font-semibold text-slate-100">
            Черновик
          </h2>
          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-400">
            {words} слов · {documentText.length} симв.
          </span>
        </div>

        <p
          className={cn(
            "text-xs",
            selectedChars > 0 ? "text-indigo-300" : "text-slate-400",
          )}
        >
          {selectedChars > 0
            ? `Выделено ${selectedChars} симв.`
            : "Выделите фрагмент мышью или Shift + стрелками"}
        </p>
      </header>

      <textarea
        ref={textareaRef}
        value={documentText}
        onChange={handleChange}
        onSelect={(event) => syncSelection(event.currentTarget)}
        onKeyUp={(event) => syncSelection(event.currentTarget)}
        onMouseUp={(event) => syncSelection(event.currentTarget)}
        onKeyDown={handleKeyDown}
        aria-label="Черновик заметки или письма"
        aria-describedby="editor-hint"
        placeholder="Напишите заметку или черновик письма, затем выделите фрагмент и нажмите «Улучшить с AI»…"
        spellCheck={false}
        className={cn(
          "scrollbar-thin min-h-[300px] w-full flex-1 resize-none rounded-lg border border-slate-700/80 bg-slate-900/60 p-3",
          "text-sm leading-relaxed text-slate-100 placeholder:text-slate-400",
          "transition-colors focus:border-indigo-500 focus:outline-none",
          "focus-visible:ring-2 focus-visible:ring-indigo-500/60",
        )}
      />

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p id="editor-hint" className="text-xs text-slate-400">
          Ctrl + Enter — запустить улучшение выделенного
        </p>

        <Button
          onClick={onImprove}
          disabled={!canImprove}
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          title={
            selectedChars === 0
              ? "Сначала выделите фрагмент текста"
              : "Улучшить выделенный фрагмент"
          }
        >
          Улучшить с AI
        </Button>
      </footer>
    </section>
  );
}
