import { SPRING_SNAPPY, bottomBarTransition, layoutIndicatorTransition } from '../lib/motionTokens';
import { useState, useEffect } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Home, Sparkles, CalendarDays, Luggage, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { triggerHapticFeedback } from "../lib/haptics";
import { useTranslation } from "react-i18next";

const TAB_ICONS = {
  home: Home,
  ai_form: Sparkles,
  itinerary: CalendarDays,
  tools: Luggage,
} as const;

export const TABS = [
  { id: "home", label: "探索首頁", iconName: "compass" },
  { id: "ai_form", label: "AI 行程", iconName: "hot-air-balloon" },
  { id: "itinerary", label: "你的行程", iconName: "calendar" },
  { id: "tools", label: "行前準備", iconName: "backpack" },
];

export default function BottomTabs() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, isNavVisible } = useAppStore();
  const prefersReducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);

  const isAiFlow = activeTab === "ai_form" || activeTab === "ai_result";

  // Automatically snap to expanded or collapsed based on the current flow
  useEffect(() => {
    if (isAiFlow) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [isAiFlow, activeTab]);

  const ActiveIcon =
    TAB_ICONS[
      (activeTab === "ai_result"
        ? "ai_form"
        : activeTab) as keyof typeof TAB_ICONS
    ] || Sparkles;

  return (
    <motion.nav
      className="md:hidden fixed w-full z-50 flex justify-center items-center px-3.5 pointer-events-none"
      style={{ bottom: "calc(0.6rem + env(safe-area-inset-bottom, 0px))" }}
      initial={{ opacity: 1, y: 0 }}
      animate={{
        y: isNavVisible ? 0 : 100,
        opacity: isNavVisible ? 1 : 0,
        pointerEvents: isNavVisible ? "auto" : "none",
      }}
      transition={
        prefersReducedMotion ? { duration: 0.16 } : bottomBarTransition
      }
      aria-label={t('str_2d2a43a2')}
    >
      <motion.div
        layout
        className={`p-1 pointer-events-auto flex items-center transform-gpu mx-auto rounded-[16px] ${
          isExpanded
            ? "bg-white/95 dark:bg-[#243229]/95"
            : "bg-transparent"
        }`}
        style={{
          width: "100%",
          maxWidth: isExpanded ? "280px" : "52px",
          height: "52px",
          willChange: "transform, opacity",
        }}
        transition={prefersReducedMotion ? { duration: 0.2 } : SPRING_SNAPPY}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isExpanded ? (
            <motion.button
              key="collapsed-btn"
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={SPRING_SNAPPY}
              onClick={() => setIsExpanded(true)}
              className="flex h-full w-full items-center justify-center text-[#9a452e] transition-colors hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
              aria-label={t('str_2c3bfa8c')}
            >
              <ActiveIcon
                size={22}
                strokeWidth={2.8}
              />
            </motion.button>
          ) : (
            <motion.div
              key="expanded-content"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: 0.08 }}
              className="flex justify-between items-center w-full relative h-full px-1"
            >
              {isAiFlow && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="absolute -left-1.5 z-20 flex h-11 w-11 items-center justify-center text-slate-400 transition-colors hover:text-[#9a452e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
                  aria-label={t('str_3026e6f7')}
                >
                  <X size={14} strokeWidth={3} />
                </button>
              )}
              {TABS.map((tab) => {
                const isActive =
                  activeTab === tab.id ||
                  (activeTab === "ai_result" && tab.id === "ai_form");
                const Icon = TAB_ICONS[tab.id as keyof typeof TAB_ICONS];
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      // Selection feedback fires on the tap itself, not after the
                      // tab has rendered — that ordering is what makes it read as
                      // native rather than as a reaction to a finished navigation.
                      // Only on an actual change of selection, the way
                      // UISelectionFeedbackGenerator behaves: re-tapping the tab
                      // you are already on moves nothing and so buzzes nothing.
                      if (activeTab !== tab.id) triggerHapticFeedback(12);
                      setActiveTab(tab.id as any);
                      if (tab.id === "ai_form") {
                        setIsExpanded(false);
                      }
                    }}
                    className={`ios-press relative flex h-full min-w-0 flex-1 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 ${
                      isActive
                        ? "text-[#9a452e] dark:text-[#d59a85]"
                        : "text-slate-500 hover:text-[#26342d] dark:text-slate-400 dark:hover:text-white"
                    }`}
                    aria-label={t(`tab_${tab.id}`)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {/* Shared layoutId: the pill springs across to the new tab
                        instead of disappearing here and reappearing there. */}
                    {isActive && (
                      <motion.span
                        layoutId="bottom-tab-indicator"
                        className="absolute inset-y-1 inset-x-1 z-0 rounded-[12px] bg-[#9a452e]/10 dark:bg-[#d59a85]/15"
                        transition={prefersReducedMotion ? { duration: 0.15 } : layoutIndicatorTransition}
                        aria-hidden="true"
                      />
                    )}
                    {Icon ? (
                      // Fixed glyph size + animated scale: changing the `size` prop
                      // resizes the SVG in one hard step, which no native tab bar does.
                      <motion.span
                        className="relative z-10 flex items-center justify-center"
                        animate={{ scale: isActive ? 1 : 0.92 }}
                        transition={prefersReducedMotion ? { duration: 0.15 } : SPRING_SNAPPY}
                      >
                        <Icon size={22} strokeWidth={isActive ? 2.6 : 2.2} />
                      </motion.span>
                    ) : null}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.nav>
  );
}
