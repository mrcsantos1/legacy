import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

import { clsx } from "clsx";

export function FieldLabel({
  children,
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { readonly children: ReactNode }) {
  return (
    <label
      className={clsx("text-xs font-medium uppercase text-[#6F675C]", className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-9 w-full rounded-md border border-[#C3BAAA] bg-[#FBF7EF] px-3 text-sm text-[var(--legacy-ink)] outline-none transition placeholder:text-[#8E8578] focus:border-[var(--legacy-rust)] focus:ring-2 focus:ring-[#E8C4AA]",
        className
      )}
      {...props}
    />
  );
}
