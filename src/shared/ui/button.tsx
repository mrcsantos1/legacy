import type { ButtonHTMLAttributes, ReactNode } from "react";

import { clsx } from "clsx";

type ButtonVariant = "danger" | "ghost" | "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  danger:
    "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:bg-red-50",
  ghost:
    "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 disabled:bg-transparent",
  primary:
    "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-400",
  secondary:
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
};

export function Button({
  children,
  className,
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        variants[variant],
        className
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
