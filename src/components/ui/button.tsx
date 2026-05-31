import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-black tracking-wide transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 ios-press',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-b from-sky-400 to-sky-600 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_24px_rgba(14,165,233,0.35)] border border-sky-400/50 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(14,165,233,0.45)] hover:-translate-y-1',
        destructive: 'bg-gradient-to-b from-red-400 to-red-600 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_24px_rgba(239,68,68,0.35)] border border-red-400/50 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(239,68,68,0.45)] hover:-translate-y-1',
        outline: 'border-2 border-slate-200/60 bg-white/70 backdrop-blur-md text-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:bg-white hover:border-sky-300/60 hover:text-sky-700 hover:shadow-[0_8px_20px_rgba(14,165,233,0.12)] hover:-translate-y-1',
        secondary: 'bg-gradient-to-b from-orange-50 to-orange-100/80 text-orange-700 border border-orange-200/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_6px_16px_rgba(249,115,22,0.12)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_10px_20px_rgba(249,115,22,0.18)] hover:-translate-y-1 hover:bg-orange-100',
        macaron: 'macaron-gradient text-slate-800 border-2 border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_8px_24px_rgba(244,114,182,0.15)] hover:shadow-[0_12px_28px_rgba(244,114,182,0.25)] hover:-translate-y-1',
        ghost: 'text-slate-600 hover:bg-sky-50/80 hover:text-sky-700 hover:scale-105',
        link: 'text-sky-600 underline-offset-4 hover:underline hover:text-sky-700 hover:scale-105',
      },
      size: {
        default: 'h-12 px-6 py-3 text-[15px]',
        sm: 'h-10 px-4 text-[13px]',
        lg: 'h-14 px-8 text-[16px]',
        icon: 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
}
