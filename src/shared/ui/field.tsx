import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

import { clsx } from "clsx";

export function FieldLabel({
  children,
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { readonly children: ReactNode }) {
  return (
    <label
      className={clsx("text-xs font-medium uppercase text-slate-500", className)}
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
        "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100",
        className
      )}
      {...props}
    />
  );
}
