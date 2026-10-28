"use client";

import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "danger" | "link" | "ghost";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-indigo-500 hover:bg-indigo-400 text-white",
  secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100",
  danger: "text-red-400 hover:text-red-300",
  link: "text-indigo-400 hover:text-indigo-300",
  ghost: "text-slate-300 hover:bg-slate-700/60 hover:text-slate-100",
};

const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        aria-busy={isLoading || undefined}
        disabled={disabled || isLoading}
        className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  },
);
