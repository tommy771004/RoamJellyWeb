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
          'flex h-14 w-full rounded-[24px] border-2 border-slate-200/70 bg-white/80 backdrop-blur-xl text-slate-800 px-5 py-3 text-[15px] font-bold shadow-[inset_0_2px_8px_rgba(0,0,0,0.02),0_2px_8px_rgba(0,0,0,0.02)] ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 placeholder:font-medium focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-sky-400/30 focus-visible:border-sky-400/60 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-white hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.01),0_6px_16px_rgba(14,165,233,0.06)] hover:border-sky-200 focus:bg-white',
          error && 'border-red-300/80 focus-visible:ring-red-400/30 focus-visible:border-red-400 bg-red-50/60 text-red-900',
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
