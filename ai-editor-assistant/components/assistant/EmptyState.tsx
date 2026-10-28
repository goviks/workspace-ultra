"use client";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        aria-hidden="true"
        className="text-slate-400"
      >
        <rect
          x="14"
          y="20"
          width="56"
          height="44"
          rx="8"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M26 36h24M26 44h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M70 30l2.6 7.4L80 40l-7.4 2.6L70 50l-2.6-7.4L60 40l7.4-2.6L70 30z"
          className="text-indigo-500/70"
          fill="currentColor"
          stroke="none"
        />
        <path
          d="M34 84h36"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>

      <p className="max-w-[240px] text-sm text-slate-400">
        Выделите текст и нажмите «Улучшить с AI»
      </p>
      <p className="max-w-[240px] text-xs text-slate-400">
        Ответ появится здесь потоком — его можно отменить на полуслове.
      </p>
    </div>
  );
}
