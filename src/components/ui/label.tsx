import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const labelVariants = cva(
  'text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-on-surface'
);

export function Label({
  className,
  ref,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { ref?: React.Ref<HTMLLabelElement> }) {
  return (
    <label ref={ref} className={cn(labelVariants(), className)} {...props} />
  );
}
