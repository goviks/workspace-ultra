"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-4 px-6 py-16">
      <div className="flex items-center gap-2 text-red-400">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-slate-100">Что-то сломалось на странице</h1>
      </div>

      <p className="max-w-prose text-sm leading-relaxed text-slate-400">
        Интерфейс не смог отрисоваться. Попробуйте обновить экран — текст в редакторе
        хранится только в памяти вкладки, поэтому при перезагрузке он сбросится.
      </p>

      {error.digest && (
        <p className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
          digest: {error.digest}
        </p>
      )}

      <Button
        onClick={reset}
        icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
      >
        Попробовать снова
      </Button>
    </main>
  );
}
