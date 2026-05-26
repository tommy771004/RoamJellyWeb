import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  getHorizontalRailStep,
  hasHorizontalOverflow,
} from "../lib/horizontalRail";
import { cn } from "../lib/utils";

interface HorizontalScrollRailProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  controlsVisibilityClass?: string;
  buttonClassName?: string;
}

export default function HorizontalScrollRail({
  children,
  label = "卡片列表",
  className,
  viewportClassName,
  contentClassName,
  controlsVisibilityClass = "flex",
  buttonClassName,
}: HorizontalScrollRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const syncScrollState = () => {
      setCanScrollLeft(node.scrollLeft > 8);
      setCanScrollRight(
        hasHorizontalOverflow(node.scrollWidth, node.clientWidth) &&
          node.scrollLeft + node.clientWidth < node.scrollWidth - 8,
      );
    };

    syncScrollState();
    node.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(syncScrollState);
      observer.observe(node);
      if (node.firstElementChild) observer.observe(node.firstElementChild);
    }

    return () => {
      node.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
      observer?.disconnect();
    };
  }, []);

  const scrollByDirection = (direction: "left" | "right") => {
    const node = viewportRef.current;
    if (!node) return;
    const delta = getHorizontalRailStep(node.clientWidth);
    node.scrollBy({
      left: direction === "left" ? -delta : delta,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative group/rail", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center transition-all duration-500 pl-4 bg-gradient-to-r from-white/40 via-white/5 to-transparent dark:from-slate-950/40 dark:via-slate-950/5",
          controlsVisibilityClass,
          !canScrollLeft && "opacity-15"
        )}
      >
        <button
          type="button"
          aria-label={`上一組${label}`}
          disabled={!canScrollLeft}
          onClick={() => scrollByDirection("left")}
          className={cn(
            "pointer-events-auto inline-flex h-[50px] w-[50px] items-center justify-center rounded-full border border-white/50 dark:border-white/20 bg-white/40 dark:bg-slate-950/40 text-slate-800 dark:text-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-lg transition-all hover:bg-white/75 dark:hover:bg-slate-950/75 hover:scale-110 hover:shadow-lg ios-press disabled:pointer-events-none disabled:opacity-30 duration-300",
            buttonClassName,
          )}
        >
          <ChevronLeft size={22} strokeWidth={2.75} />
        </button>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "overflow-x-auto scrollbar-hide scroll-smooth",
          viewportClassName,
        )}
      >
        <div className={cn("flex min-w-max gap-6", contentClassName)}>
          {children}
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center transition-all duration-500 pr-4 bg-gradient-to-l from-white/40 via-white/5 to-transparent dark:from-slate-950/40 dark:via-slate-950/5",
          controlsVisibilityClass,
          !canScrollRight && "opacity-15"
        )}
      >
        <button
          type="button"
          aria-label={`下一組${label}`}
          disabled={!canScrollRight}
          onClick={() => scrollByDirection("right")}
          className={cn(
            "pointer-events-auto inline-flex h-[50px] w-[50px] items-center justify-center rounded-full border border-white/50 dark:border-white/20 bg-white/40 dark:bg-slate-950/40 text-slate-800 dark:text-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-lg transition-all hover:bg-white/75 dark:hover:bg-slate-950/75 hover:scale-110 hover:shadow-lg ios-press disabled:pointer-events-none disabled:opacity-30 duration-300",
            buttonClassName,
          )}
        >
          <ChevronRight size={22} strokeWidth={2.75} />
        </button>
      </div>
    </div>
  );
}
