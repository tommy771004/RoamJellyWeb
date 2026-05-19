import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface EditorialHighlight {
  label: string;
  value: string;
}

interface EditorialSectionIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  highlights?: EditorialHighlight[];
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: ReactNode;
}

export default function EditorialSectionIntro({
  eyebrow,
  title,
  description,
  highlights = [],
  className,
  titleClassName,
  descriptionClassName,
  children,
}: EditorialSectionIntroProps) {
  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      <span className="jelly-chip inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-sky-700 shadow-sm">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 shadow-[0_0_0_4px_rgba(255,255,255,0.55)]" />
        {eyebrow}
      </span>

      <div className="space-y-2.5">
        <h2
          className={cn(
            "candy-title max-w-3xl text-balance text-[27px] font-black tracking-[-0.05em] text-slate-900 sm:text-[33px]",
            titleClassName,
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            "max-w-2xl text-pretty text-[14px] font-medium leading-[1.74] text-slate-600 sm:text-[15px] sm:leading-[1.82]",
            descriptionClassName,
          )}
        >
          {description}
        </p>
      </div>

      {highlights.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {highlights.map((highlight) => (
            <div
              key={`${highlight.label}-${highlight.value}`}
              className="editorial-card-soft hover-float flex items-center gap-2 rounded-full px-3.5 py-2.5"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {highlight.label}
              </span>
              <span className="text-[12px] font-black text-slate-700">
                {highlight.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {children}
    </div>
  );
}
