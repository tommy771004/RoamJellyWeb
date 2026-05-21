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
          'flex h-14 w-full rounded-[24px] border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg text-slate-800 dark:text-slate-100 px-5 py-3 text-[15px] font-bold shadow-[0_4px_12px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-medium focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-sky-400/30 dark:focus-visible:ring-sky-500/20 focus-visible:border-sky-400/70 dark:focus-visible:border-sky-400/60 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-white/60 dark:hover:bg-black/45 hover:shadow-[0_6px_16px_rgba(14,165,233,0.06)] hover:border-sky-300 dark:hover:border-sky-500/40 focus:bg-white/70 dark:focus:bg-black/45',
          error && 'border-rose-300/80 focus-visible:ring-rose-400/30 focus-visible:border-rose-400 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200',
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
