import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.ComponentProps<"input"> {
  error?: string;
}

export function Input({ className, type, error, ref, ...props }: InputProps) {
  return (
    <div className="relative w-full">
      <input
        type={type}
        className={cn(
          'flex h-14 w-full rounded-2xl border-2 border-outline/20 bg-white/70 backdrop-blur-md text-on-surface px-5 py-3 text-[15px] font-bold shadow-sm ring-offset-surface file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 placeholder:font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-out hover:bg-white',
          error && 'border-error/50 focus-visible:ring-error/30 focus-visible:border-error bg-red-50/50',
          className
        )}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
      {error && (
        <p
          id={`${props.id}-error`}
          className="mt-1.5 text-xs font-bold text-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
