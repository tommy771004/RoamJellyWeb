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
  controlsVisibilityClass = "hidden md:flex",
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
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 items-center",
          controlsVisibilityClass,
        )}
      >
        <button
          type="button"
          aria-label={`上一組${label}`}
          disabled={!canScrollLeft}
          onClick={() => scrollByDirection("left")}
          className={cn(
            "pointer-events-auto ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/90 bg-white/92 text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:text-sky-700 disabled:pointer-events-none disabled:opacity-35",
            buttonClassName,
          )}
        >
          <ChevronLeft size={18} strokeWidth={2.8} />
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
          "pointer-events-none absolute inset-y-0 right-0 z-10 items-center",
          controlsVisibilityClass,
        )}
      >
        <button
          type="button"
          aria-label={`下一組${label}`}
          disabled={!canScrollRight}
          onClick={() => scrollByDirection("right")}
          className={cn(
            "pointer-events-auto mr-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/90 bg-white/92 text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:text-sky-700 disabled:pointer-events-none disabled:opacity-35",
            buttonClassName,
          )}
        >
          <ChevronRight size={18} strokeWidth={2.8} />
        </button>
      </div>
    </div>
  );
}
