import { SPRING_SNAPPY, bottomBarTransition } from '../lib/motionTokens';
import { useState, useEffect } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Home, Sparkles, CalendarDays, Luggage, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useTranslation } from "react-i18next";
import { GlowingIcon } from "./ui/GlowingIcon";

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

const PILL_SPRING = {
  type: "spring" as const,
  stiffness: 480,
  damping: 30,
  mass: 0.7,
};

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
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
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
        className={`p-1 pointer-events-auto flex items-center transform-gpu mx-auto rounded-full ${
          isExpanded
            ? "bg-white/72 dark:bg-slate-900/72 backdrop-blur-2xl backdrop-saturate-[160%] shadow-[0_8px_32px_-8px_rgba(244,114,182,0.18),0_2px_8px_rgba(15,23,42,0.06)] dark:shadow-[0_10px_20px_-8px_rgba(0,0,0,0.55)] border border-white/60 dark:border-white/10"
            : "bg-transparent border-transparent shadow-none backdrop-blur-none"
        }`}
        style={{
          width: "100%",
          maxWidth: isExpanded ? "340px" : "48px",
          height: isExpanded ? "3.5rem" : "48px",
          willChange: "transform, opacity",
        }}
        transition={prefersReducedMotion ? { duration: 0.2 } : SPRING_SNAPPY}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isExpanded ? (
            <motion.button
              key="collapsed-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={SPRING_SNAPPY}
              onClick={() => setIsExpanded(true)}
              className="flex items-center justify-center w-full h-full rounded-full text-pink-500 hover:text-pink-600 ios-press"
              aria-label={t('str_2c3bfa8c')}
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
              transition={{ duration: 0.18, delay: 0.08 }}
              className="flex justify-between items-center w-full relative h-full"
            >
              {isAiFlow && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="absolute -left-1 p-1 text-slate-400 hover:text-sky-500 rounded-full z-20 ios-press"
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
                      setActiveTab(tab.id as any);
                      if (tab.id === "ai_form") {
                        setIsExpanded(false);
                      }
                    }}
                    className={`flex flex-col items-center justify-center flex-1 min-w-0 h-full rounded-full relative ios-press ${
                      isActive
                        ? "text-pink-500"
                        : "opacity-70 hover:opacity-100 text-slate-500 dark:text-slate-400"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 bg-white dark:bg-slate-800 rounded-[20px] -z-10 clay-btn border-pink-100 dark:border-slate-700"
                        transition={prefersReducedMotion ? { duration: 0.12 } : PILL_SPRING}
                      />
                    )}
                    {Icon ? (
                      <motion.div
                        className="transform-gpu flex items-center justify-center relative"
                        animate={
                          isActive ? { y: -2, scale: 1.15 } : { y: 0, scale: 1 }
                        }
                        transition={prefersReducedMotion ? { duration: 0.12 } : SPRING_SNAPPY}
                      >
                        {isActive ? (
                          <GlowingIcon
                            icon={Icon}
                            size={20}
                            glowColor="bg-pink-400"
                            iconColor="text-pink-500 fill-pink-500/10"
                            className="mb-0.5"
                          />
                        ) : (
                          <Icon
                            size={18}
                            strokeWidth={2.2}
                            className="mb-0.5 text-slate-400 dark:text-slate-400"
                          />
                        )}
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={SPRING_SNAPPY}
                            className="absolute -bottom-1 w-1 h-1 rounded-full bg-pink-400"
                          />
                        )}
                      </motion.div>
                    ) : null}
                    <span
                      className={`text-[9px] font-black tracking-widest whitespace-nowrap z-10 ${isActive ? "text-pink-600 dark:text-pink-400" : "opacity-80"}`}
                    >
                      {t(`tab_${tab.id}`)}
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
