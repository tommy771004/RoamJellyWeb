import { useState, useEffect } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Home, Sparkles, CalendarDays, Luggage, Menu, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { bottomBarTransition, subtlePressableClass } from "../lib/motionTokens";

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
    ] || Menu;

  return (
    <motion.nav
      className="md:hidden fixed w-full z-50 flex justify-center items-center px-3.5 pointer-events-none"
      style={{ bottom: "calc(0.6rem + env(safe-area-inset-bottom, 0px))" }}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{
        y: isNavVisible ? 0 : 100,
        opacity: isNavVisible ? 1 : 0,
        pointerEvents: isNavVisible ? "auto" : "none",
      }}
      transition={
        prefersReducedMotion ? { duration: 0.16 } : bottomBarTransition
      }
      aria-label="底部導覽"
    >
      <motion.div
        layout
        className={`p-1 pointer-events-auto flex items-center transform-gpu mx-auto rounded-full transition-all duration-300 ${
          isExpanded
            ? "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl backdrop-saturate-[150%] shadow-[0_8px_32px_-8px_rgba(244,114,182,0.15)] dark:shadow-[0_10px_20px_-8px_rgba(0,0,0,0.5)] border border-white/50 dark:border-white/10"
            : "bg-transparent border-transparent shadow-none backdrop-blur-none"
        }`}
        style={{
          width: "100%",
          maxWidth: isExpanded ? "340px" : "48px",
          height: isExpanded ? "3.5rem" : "48px",
          willChange: "transform, opacity, width, height",
        }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isExpanded ? (
            <motion.button
              key="collapsed-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsExpanded(true)}
              className="flex items-center justify-center w-full h-full rounded-full text-pink-500 hover:text-pink-600 transition-all active:scale-90 bg-transparent border-transparent shadow-none"
              aria-label="展開選單"
            >
              <ActiveIcon
                size={22}
                strokeWidth={2.8}
                className="drop-shadow-sm"
              />
            </motion.button>
          ) : (
            <motion.div
              key="expanded-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex justify-between items-center w-full relative h-full"
            >
              {isAiFlow && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="absolute -left-1 p-1 text-slate-400 hover:text-sky-500 rounded-full z-20 transition-colors active:scale-90"
                  aria-label="收起選單"
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
                      setActiveTab(tab.id as any);
                      if (tab.id === "ai_form") {
                        setIsExpanded(false);
                      }
                    }}
                    className={`flex flex-col items-center justify-center flex-1 min-w-0 h-full rounded-full relative transition-all duration-300 transform-gpu active:scale-[0.85] ${
                      isActive
                        ? "text-pink-500"
                        : "opacity-70 hover:opacity-100 text-slate-500 dark:text-slate-400"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full -z-10 shadow-[0_2px_12px_-2px_rgba(244,114,182,0.15)] dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.2)] border border-pink-50 dark:border-pink-900/30"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                          mass: 0.8,
                        }}
                      />
                    )}
                    {Icon ? (
                      <motion.div
                        className="transform-gpu flex items-center justify-center relative"
                        animate={
                          isActive ? { y: -2, scale: 1.15 } : { y: 0, scale: 1 }
                        }
                      >
                        <Icon
                          size={isActive ? 20 : 18}
                          strokeWidth={isActive ? 2.8 : 2.2}
                          className={`mb-0.5 transition-all ${isActive ? "text-pink-500 fill-pink-500/10" : "text-slate-400 dark:text-slate-400"}`}
                        />
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-1 w-1 h-1 rounded-full bg-pink-400"
                          />
                        )}
                      </motion.div>
                    ) : null}
                    <span
                      className={`text-[9px] font-black tracking-widest whitespace-nowrap z-10 transition-colors ${isActive ? "text-pink-600 dark:text-pink-400" : "opacity-80"}`}
                    >
                      {tab.label}
                    </span>
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
