import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

export type ButtonEmphasis = "strong" | "neutral" | "quiet";
export type ButtonIntent = "default" | "danger";
export type ButtonSize = "compact" | "default" | "prominent";

const buttonVariants = cva(
  // Press feedback mirrors SwiftUI's default button style: the scale-down is
  // near-instant on touch-down (80ms) and eases back out slowly on release,
  // rather than using one symmetric duration for both directions.
  // Press feedback comes from `ios-press` rather than being re-inlined here, so
  // Button presses the same way as the ~100 other tappable surfaces in the app
  // and there is one place to tune it. Suppressing the press while disabled is
  // handled in the `ios-press` rule itself — a Tailwind `disabled:active:` variant
  // cannot do it, because `ios-press` is un-layered and outranks every utility.
  "ios-press inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "border border-sky-700 bg-sky-600 text-white hover:border-sky-800 hover:bg-sky-700",
        destructive: "border border-rose-700 bg-rose-600 text-white hover:border-rose-800 hover:bg-rose-700",
        outline: "border border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
        secondary: "border border-orange-200 bg-orange-50 text-orange-800 hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
        macaron: "border border-slate-200 bg-white text-slate-800 hover:border-pink-300 hover:bg-pink-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
        ghost: "border border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
        link: "border border-transparent text-sky-700 underline-offset-4 hover:underline dark:text-sky-300",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-11 px-3 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  emphasis?: ButtonEmphasis;
  intent?: ButtonIntent;
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

function resolveVariant({
  emphasis,
  intent,
  variant,
}: Pick<ButtonProps, "emphasis" | "intent" | "variant">) {
  if (intent === "danger") return "destructive";
  if (variant) return variant;
  if (emphasis === "neutral") return "outline";
  if (emphasis === "quiet") return "ghost";
  return "default";
}

export function Button({
  asChild = false,
  children,
  className,
  disabled,
  emphasis,
  intent = "default",
  loading = false,
  ref,
  size,
  type,
  variant,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled || loading;
  const resolvedVariant = resolveVariant({ emphasis, intent, variant });

  return (
    <Comp
      {...props}
      ref={ref}
      type={asChild ? undefined : type ?? "button"}
      disabled={asChild ? undefined : isDisabled}
      aria-disabled={asChild && isDisabled ? true : undefined}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant: resolvedVariant, size, className }))}
    >
      {loading && !asChild ? <LoaderCircle size={16} className="shrink-0 animate-spin" aria-hidden="true" /> : null}
      {children}
    </Comp>
  );
}
