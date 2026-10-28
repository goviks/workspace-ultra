"use client";

import {
  ArrowDownToLine,
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { useAssistantStore } from "@/lib/store/assistant-store";
import { createAIError } from "@/lib/errors";
import type { AssistantStatus } from "@/types/ai";

import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { ModeSelector } from "./ModeSelector";
import { StreamingText } from "./StreamingText";

const STATUS_LABEL: Record<AssistantStatus, string> = {
  idle: "Готов к работе",
  loading: "Отправляю запрос…",
  streaming: "Печатаю ответ…",
  success: "Готово",
  error: "Не получилось",
  aborted: "Отменено",
};

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onInsert: () => void;
}

export function AssistantPanel({
  open,
  onClose,
  onCancel,
  onRetry,
  onInsert,
}: AssistantPanelProps) {
  const status = useAssistantStore((state) => state.status);
  const result = useAssistantStore((state) => state.result);
  const error = useAssistantStore((state) => state.error);
  const meta = useAssistantStore((state) => state.meta);

  const errorRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "error") errorRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
    } catch {
    }
  }, [result]);

  const isBusy = status === "loading" || status === "streaming";
  const showResultActions = status === "success" || status === "aborted";

  return (
    <aside
      aria-labelledby="assistant-heading"
      className={cn(
        "z-40 flex flex-col gap-3 rounded-t-2xl border border-slate-700 bg-slate-800 p-4",
        "shadow-2xl shadow-black/40",
        "fixed inset-x-0 bottom-0 max-h-[82vh] max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
        "md:static md:max-h-none md:w-[360px] md:shrink-0 md:rounded-xl md:shadow-none",
        "md:sticky md:top-6 md:h-fit",
        open ? "max-md:flex max-md:animate-sheet-in" : "max-md:hidden",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15",
              isBusy && "animate-pulse motion-reduce:animate-none",
            )}
          >
            <Sparkles className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="assistant-heading"
              className="text-lg font-semibold leading-tight text-slate-100"
            >
              AI-ассистент
            </h2>
            <p className="text-xs text-slate-400">{STATUS_LABEL[status]}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть панель ассистента"
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 md:hidden"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <ModeSelector />

      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-busy={isBusy}
        className="scrollbar-thin max-h-[400px] min-h-[180px] overflow-y-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-200"
      >
        {status === "idle" && <EmptyState />}
        {status === "loading" && <LoadingState />}
        {status === "streaming" && <StreamingText text={result} />}
        {status === "success" && <StreamingText text={result} showCursor={false} />}

        {status === "aborted" && (
          <div className="space-y-2">
            <p className="text-xs text-amber-400/90">
              Генерация прервана — ниже неполный ответ.
            </p>
            {result ? (
              <StreamingText text={result} showCursor={false} />
            ) : (
              <p className="text-xs text-slate-400">
                Модель не успела вернуть ни одного токена.
              </p>
            )}
          </div>
        )}

        {status === "error" && (
          <ErrorState ref={errorRef} error={error ?? createAIError("server")} />
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {status === "success"
          ? `Ответ готов. ${result.length} символов.`
          : status === "aborted"
            ? "Генерация отменена."
            : ""}
      </p>

      {status === "success" && meta && (
        <p className="text-[11px] text-slate-400">
          {meta.model} · {(meta.durationMs / 1000).toFixed(1)} с
          {meta.completionTokens ? ` · ${meta.completionTokens} токенов` : ""}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {isBusy && (
          <Button variant="danger" size="sm" onClick={onCancel}>
            Отменить
          </Button>
        )}

        {showResultActions && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={onInsert}
              icon={<ArrowDownToLine className="h-4 w-4" aria-hidden="true" />}
            >
              Вставить в редактор
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              icon={
                copied ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )
              }
            >
              {copied ? "Скопировано" : "Копировать"}
            </Button>
            <Button
              variant="link"
              size="sm"
              onClick={onRetry}
              icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Повторить
            </Button>
          </>
        )}

        {status === "error" && (
          <Button
            variant="link"
            size="sm"
            onClick={onRetry}
            icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Повторить
          </Button>
        )}
      </div>
    </aside>
  );
}
