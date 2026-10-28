"use client";

export function LoadingState() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Генерирую ответ">
      <div className="space-y-2" aria-hidden="true">
        <div className="h-3 w-full animate-pulse rounded bg-slate-700/60 motion-reduce:animate-none" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-slate-700/60 motion-reduce:animate-none" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-700/60 motion-reduce:animate-none" />
      </div>

      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 animate-dots-bounce rounded-full bg-indigo-500 motion-reduce:animate-none"
              style={{ animationDelay: `${index * 160}ms` }}
            />
          ))}
        </span>
        <span className="text-xs text-slate-400">Генерирую ответ…</span>
      </div>
    </div>
  );
}
