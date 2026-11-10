import { SPRING_SNAPPY, bottomBarTransition, layoutIndicatorTransition } from '../lib/motionTokens';
import { useState, useEffect } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { selectionHaptic } from "../lib/haptics";
import { useTranslation } from "react-i18next";
import { MAIN_NAV_ITEMS, isAiFlow as isAiFlowTab, toMainTab } from "./layout/navigation";

/** Wide screens (≥ 1024px) show every tab's label and never collapse the bar. */
const WIDE_QUERY = "(min-width: 1024px)";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/**
 * Floating tab capsule shown at every width. The current tab shows its label
 * next to the icon; on wide screens all labels show. Scrolling down shrinks the
 * capsule instead of hiding it. During the AI flow on narrow screens it folds
 * into a single button so it does not cover the form.
 */
export default function BottomTabs() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, isNavVisible } = useAppStore();
  const prefersReducedMotion = useReducedMotion();
  const isWide = useMediaQuery(WIDE_QUERY);
  const isAiFlow = isAiFlowTab(activeTab);
  const currentTab = toMainTab(activeTab);
  const [isExpanded, setIsExpanded] = useState(() => !isAiFlow || isWide);

  // Snap to the right state whenever the flow or the screen width changes.
  useEffect(() => {
    setIsExpanded(!isAiFlow || isWide);
  }, [isAiFlow, activeTab, isWide]);

  const ActiveIcon = MAIN_NAV_ITEMS.find((item) => item.id === currentTab)?.icon ?? Sparkles;
  const canCollapse = isAiFlow && !isWide;

  return (
    <nav
      className="pointer-events-none fixed bottom-[calc(0.6rem+env(safe-area-inset-bottom,0px))] z-50 flex w-full items-center justify-center px-3.5 md:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]"
      aria-label={t('str_2d2a43a2')}
    >
      {/* Scrolling down (isNavVisible = false) shrinks the bar; it stays usable. */}
      <motion.div
        className="pointer-events-auto flex justify-center"
        style={{ transformOrigin: "bottom center" }}
        initial={false}
        animate={{ scale: isNavVisible ? 1 : 0.85, opacity: isNavVisible ? 1 : 0.92 }}
        transition={prefersReducedMotion ? { duration: 0 } : bottomBarTransition}
      >
        <motion.div
          layout
          className={`flex h-[52px] items-center rounded-full border border-[#9a452e]/10 bg-white/95 p-[3px] shadow-[0_12px_32px_rgba(43,33,28,0.16)] backdrop-blur-xl transform-gpu dark:border-white/10 dark:bg-[#243229]/95 md:h-14 md:p-1 ${
            isExpanded ? "w-[calc(100vw-1.75rem)] max-w-[300px] lg:w-auto lg:max-w-none" : "w-[52px]"
          }`}
          style={{ willChange: "transform" }}
          transition={prefersReducedMotion ? { duration: 0.2 } : SPRING_SNAPPY}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {!isExpanded ? (
              <motion.button
                key="collapsed-btn"
                type="button"
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING_SNAPPY}
                onClick={() => setIsExpanded(true)}
                className="flex h-full w-full items-center justify-center rounded-full text-[#9a452e] transition-colors hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 dark:text-[#d59a85]"
                aria-label={t('str_2c3bfa8c')}
              >
                <ActiveIcon size={22} strokeWidth={2.8} />
              </motion.button>
            ) : (
              <motion.div
                key="expanded-content"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, delay: 0.08 }}
                className="relative flex h-full w-full items-center gap-0.5"
              >
                {canCollapse && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="flex h-full w-9 flex-none items-center justify-center rounded-full text-slate-400 transition-colors hover:text-[#9a452e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
                    aria-label={t('str_3026e6f7')}
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                )}
                {MAIN_NAV_ITEMS.map((tab) => {
                  const isActive = currentTab === tab.id;
                  const showLabel = isActive || isWide;
                  const Icon = tab.icon;
                  const label = t(tab.labelKey);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        // Selection feedback fires on the tap itself, not after the
                        // tab has rendered — that ordering is what makes it read as
                        // native rather than as a reaction to a finished navigation.
                        // Only on an actual change of selection, the way
                        // UISelectionFeedbackGenerator behaves: re-tapping the tab
                        // you are already on moves nothing and so buzzes nothing.
                        if (currentTab !== tab.id) selectionHaptic();
                        setActiveTab(tab.id);
                        if (tab.id === "ai_form" && !isWide) {
                          setIsExpanded(false);
                        }
                      }}
                      className={`ios-press relative flex h-full items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 ${
                        showLabel ? "flex-none gap-1.5 pl-3 pr-3.5 lg:px-4" : "min-w-0 flex-1"
                      } ${
                        isActive
                          ? "text-white"
                          : "text-slate-500 hover:text-[#26342d] dark:text-slate-400 dark:hover:text-white"
                      }`}
                      aria-label={label}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {/* Shared layoutId: the pill springs across to the new tab,
                          stretching to that tab's width (labels differ in length). */}
                      {isActive && (
                        <motion.span
                          layoutId="bottom-tab-indicator"
                          className="absolute inset-0 z-0 bg-[#b25936] shadow-[0_3px_10px_rgba(154,69,46,0.28)]"
                          // Radius set as a style (not a class) so Motion can correct it while
                          // the pill stretches between tabs of different widths.
                          style={{ borderRadius: 9999 }}
                          transition={prefersReducedMotion ? { duration: 0.15 } : layoutIndicatorTransition}
                          aria-hidden="true"
                        />
                      )}
                      {/* Fixed glyph size + animated scale: changing the `size` prop
                          resizes the SVG in one hard step, which no native tab bar does. */}
                      <motion.span
                        className="relative z-10 flex items-center justify-center"
                        animate={{ scale: isActive ? 1 : 0.92 }}
                        transition={prefersReducedMotion ? { duration: 0.15 } : SPRING_SNAPPY}
                      >
                        <Icon size={21} strokeWidth={isActive ? 2.6 : 2.2} />
                      </motion.span>
                      {showLabel && (
                        <span className="relative z-10 whitespace-nowrap text-[14px] font-extrabold leading-none" aria-hidden="true">
                          {label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </nav>
  );
}
