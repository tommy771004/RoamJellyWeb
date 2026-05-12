import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[2rem] text-sm font-black tracking-wide transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.93]',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-b from-fuchsia-400 to-fuchsia-600 text-white shadow-[0_8px_20px_rgba(217,70,239,0.3)] border border-fuchsia-400/50 hover:shadow-[0_12px_25px_rgba(217,70,239,0.4)] hover:-translate-y-0.5 inset-shadow-sm inset-shadow-white/30',
        destructive: 'bg-gradient-to-b from-red-400 to-red-600 text-white shadow-[0_8px_20px_rgba(239,68,68,0.3)] border border-red-400/50 hover:shadow-[0_12px_25px_rgba(239,68,68,0.4)] hover:-translate-y-0.5',
        outline: 'border-2 border-outline/30 bg-white/60 backdrop-blur-md text-primary shadow-sm hover:bg-white hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5',
        secondary: 'bg-primary-container text-on-primary-container border border-primary-container hover:bg-primary-fixed-dim hover:shadow-md hover:-translate-y-0.5',
        ghost: 'text-primary hover:bg-primary/10 hover:scale-105',
        link: 'text-primary underline-offset-4 hover:underline',
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
