import * as React from "react";
import { cn } from "../../lib/utils";

export type InputAppearance = "form" | "inline" | "search";
export type InputSize = "compact" | "default";

export interface InputProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "size"> {
  appearance?: InputAppearance;
  size?: InputSize;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

const appearanceClasses: Record<InputAppearance, string> = {
  form: "rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
  inline: "rounded-lg border-transparent bg-slate-100/80 text-slate-900 shadow-none dark:bg-slate-800 dark:text-slate-100",
  search: "rounded-full border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
};

const sizeClasses: Record<InputSize, string> = {
  compact: "h-10 px-3",
  default: "h-11 px-3.5",
};

export function Input({
  appearance = "form",
  className,
  description,
  error,
  id,
  label,
  ref,
  size = "default",
  type,
  "aria-describedby": ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = React.useId().replace(/:/g, "");
  const inputId = id ?? `input-${generatedId}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium leading-5 text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
      ) : null}
      <input
        {...props}
        id={inputId}
        ref={ref}
        type={type}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          "flex w-full border py-2 text-base font-medium leading-6 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 dark:disabled:bg-slate-900 transition-colors duration-150",
          appearanceClasses[appearance],
          sizeClasses[size],
          error && "border-rose-500 bg-rose-50 text-rose-950 focus-visible:ring-rose-500 dark:bg-rose-950/30 dark:text-rose-100",
          className,
        )}
      />
      {description ? (
        <p id={descriptionId} className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm font-medium leading-5 text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
