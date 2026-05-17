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
  children?: React.ReactNode;
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
    <div className={cn("flex flex-col gap-3", className)}>
      <span className="inline-flex w-fit items-center rounded-full border border-white/92 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700 shadow-sm">
        {eyebrow}
      </span>

      <div className="space-y-2">
        <h2
          className={cn(
            "max-w-3xl text-balance text-[25px] font-black leading-tight tracking-[-0.035em] text-slate-900 sm:text-[31px]",
            titleClassName,
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            "max-w-2xl text-pretty text-[14px] leading-[1.72] text-slate-600 sm:text-[15px] sm:leading-[1.8]",
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
              className="editorial-card-soft flex items-center gap-2 rounded-full px-3 py-2"
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
