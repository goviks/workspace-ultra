"use client";

interface StreamingTextProps {
  text: string;
  showCursor?: boolean;
}

export function StreamingText({ text, showCursor = true }: StreamingTextProps) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
      {text}
      {showCursor && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-caret-blink bg-indigo-400 motion-reduce:animate-none"
        />
      )}
    </p>
  );
}
