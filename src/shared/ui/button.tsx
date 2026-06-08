import type { ButtonHTMLAttributes, ReactNode } from "react";

import { clsx } from "clsx";

type ButtonVariant = "danger" | "ghost" | "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  danger:
    "border-red-300 bg-red-50 text-red-800 hover:bg-red-100 disabled:bg-red-50",
  ghost:
    "border-transparent bg-transparent text-[#4A504B] hover:bg-[#E7DFD2] disabled:bg-transparent",
  primary:
    "border-[var(--legacy-rust)] bg-[var(--legacy-rust)] text-white hover:bg-[#98552F] disabled:bg-[#C99270]",
  secondary:
    "border-[#C3BAAA] bg-[#FBF7EF] text-[var(--legacy-ink)] hover:bg-[#EFE6D8] disabled:bg-[#EFE6D8]"
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
