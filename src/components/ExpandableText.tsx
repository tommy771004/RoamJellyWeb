import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { shouldShowExpandableText } from "../lib/expandableText";
import { cn } from "../lib/utils";

const PREVIEW_LINE_CLASS: Record<number, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
};

interface ExpandableTextProps {
  text: string;
  label?: string;
  previewLines?: 2 | 3 | 4 | 5 | 6;
  minCharacters?: number;
  minLineBreaks?: number;
  className?: string;
  labelClassName?: string;
  textClassName?: string;
  buttonClassName?: string;
  collapsedLabel?: string;
  expandedLabel?: string;
  preserveWhitespace?: boolean;
  stopPropagation?: boolean;
}

export default function ExpandableText({
  text,
  label,
  previewLines = 3,
  minCharacters = 96,
  minLineBreaks = 1,
  className,
  labelClassName,
  textClassName,
  buttonClassName,
  collapsedLabel = "看更多",
  expandedLabel = "收起內容",
  preserveWhitespace = false,
  stopPropagation = false,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const normalized = text.trim();
  const canExpand = shouldShowExpandableText(normalized, {
    minCharacters,
    minLineBreaks,
  });

  if (!normalized) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <p
          className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] text-slate-400",
            labelClassName,
          )}
        >
          {label}
        </p>
      ) : null}

      <p
        className={cn(
          "text-pretty",
          preserveWhitespace && "whitespace-pre-line",
          !isExpanded && canExpand && PREVIEW_LINE_CLASS[previewLines],
          textClassName,
        )}
      >
        {normalized}
      </p>

      {canExpand ? (
        <button
          type="button"
          onClick={(event) => {
            if (stopPropagation) event.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          className={cn(
            "editorial-toggle inline-flex w-fit items-center gap-1.5",
            buttonClassName,
          )}
        >
          {isExpanded ? expandedLabel : collapsedLabel}
          <ChevronDown
            size={14}
            strokeWidth={2.6}
            className={cn(
              "transition-transform duration-300",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      ) : null}
    </div>
  );
}
