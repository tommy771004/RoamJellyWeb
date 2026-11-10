import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  Globe,
  Languages,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  SunMoon,
  UserRound,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { HOME_SECTION_IDS, PORTFOLIO_PROJECTS } from './navigation';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  /** Account display name; null until known. Never pass the raw user id. */
  displayName: string | null;
  onLogin: () => void;
  onOpenProfile: () => void;
  onRequestLogout: () => void;
}

const ROW =
  'flex min-h-11 w-full items-center gap-3.5 px-5 py-2 text-left text-slate-800 transition-colors hover:bg-black/[0.04] focus-visible:bg-[#9a452e]/10 focus-visible:outline-none dark:text-slate-100 dark:hover:bg-white/5';
const ROW_ICON = 'flex-shrink-0 text-slate-400 dark:text-slate-500';
const ROW_LABEL = 'min-w-0 flex-1 text-[15px] font-medium';
const SECTION = 'border-b border-black/5 pb-1 dark:border-white/10';
const SECTION_LABEL = 'px-5 pb-1 pt-4 text-[11px] font-extrabold tracking-[0.12em] text-slate-400';
const SEGMENT = 'flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a3472b]/40';
const SEGMENT_ON = 'bg-white text-[#9a452e] shadow-sm dark:bg-white/15 dark:text-[#f0c2ae]';
const SEGMENT_OFF = 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white';

/** Waits for a home-page section to mount (HomeTab is lazy), then scrolls to it. */
function scrollToSectionWhenReady(id: string, smooth: boolean) {
  const startedAt = performance.now();
  const tick = () => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      return;
    }
    if (performance.now() - startedAt < 3000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Side menu opened from the header's menu button: account, shortcuts into the
 * home page, language / theme / AI preferences, and the author's other sites.
 * A floating left panel on every width.
 */
export default function AppDrawer({
  open,
  onClose,
  isLoggedIn,
  displayName,
  onLogin,
  onOpenProfile,
  onRequestLogout,
}: AppDrawerProps) {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { setActiveTab, isDarkMode, setDarkMode } = useAppStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isEnglish = i18n.language?.startsWith('en');

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  // Keep Tab / Shift+Tab inside the panel while it is open.
  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const goToHomeSection = (id: string) => {
    onClose();
    setActiveTab('home');
    scrollToSectionWhenReady(id, !reduceMotion);
  };

  const runAndClose = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <AnimatePresence>
      {open && (
        <div key="app-drawer" className="fixed inset-0 z-sheet">
          <motion.div
            className="absolute inset-0 bg-[#1f1511]/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            id="app-drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('menu_title')}
            onKeyDown={trapFocus}
            initial={reduceMotion ? { opacity: 0 } : { x: '-105%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '-105%' }}
            transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] left-2 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] flex w-[80vw] min-w-[280px] max-w-[320px] flex-col overflow-y-auto overscroll-contain rounded-[28px] border border-black/5 bg-[#fbfaf7] shadow-[0_24px_60px_rgba(20,12,8,0.35)] dark:border-white/10 dark:bg-[#1d2620]"
          >
            {/* Brand header */}
            <div className="flex flex-shrink-0 items-center justify-between gap-2 bg-[#2b211c] py-3.5 pl-5 pr-2 text-white">
              <div className="flex min-w-0 items-center gap-2.5">
                <img src="/icon-app.svg" alt="" className="h-10 w-10 flex-shrink-0 rounded-[11px]" />
                <span className="truncate font-heading text-[23px] font-black italic tracking-tighter">RoamJelly</span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={t('menu_close')}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <X size={22} strokeWidth={2.2} />
              </button>
            </div>

            {/* Account */}
            <div className="px-3 pb-1 pt-3">
              {isLoggedIn ? (
                <div className="flex items-center gap-3 rounded-[18px] bg-[#f6ece4] px-3 py-2.5 dark:bg-white/5">
                  <AccountAvatar>
                    <UserRound size={18} strokeWidth={2.4} />
                  </AccountAvatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <strong className="truncate text-[15px] text-slate-800 dark:text-slate-100">{t('hello_user', { name: displayName || t('account_default_name') })}</strong>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">{t('drawer_signed_in')}</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => runAndClose(onLogin)}
                  className="flex w-full items-center gap-3 rounded-[18px] bg-[#f6ece4] px-3 py-2.5 text-left transition-colors hover:bg-[#f1e2d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a3472b]/40 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <AccountAvatar>
                    <Sparkles size={17} strokeWidth={2.4} />
                  </AccountAvatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <strong className="text-[15px] text-slate-800 dark:text-slate-100">{t('login_account')}</strong>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">{t('not_logged_in')}</span>
                  </div>
                  <ChevronRight size={18} className={ROW_ICON} />
                </button>
              )}
            </div>

            {/* Browse */}
            <section className={SECTION}>
              <h2 className={SECTION_LABEL}>{t('drawer_browse')}</h2>
              <button type="button" onClick={() => goToHomeSection(HOME_SECTION_IDS.featuredGuides)} className={ROW}>
                <Globe size={20} className={ROW_ICON} />
                <span className={ROW_LABEL}>{t('str_11552810')}</span>
                <ChevronRight size={18} className={ROW_ICON} />
              </button>
              <button type="button" onClick={() => goToHomeSection(HOME_SECTION_IDS.expertItineraries)} className={ROW}>
                <BookOpen size={20} className={ROW_ICON} />
                <span className={ROW_LABEL}>{t('str_7f35ed14')}</span>
                <ChevronRight size={18} className={ROW_ICON} />
              </button>
            </section>

            {/* Settings */}
            <section className={SECTION}>
              <h2 className={SECTION_LABEL}>{t('drawer_settings')}</h2>
              <div className="flex min-h-[3.25rem] items-center gap-3.5 py-1 pl-5 pr-3">
                <Languages size={20} className={ROW_ICON} />
                <span className={`${ROW_LABEL} text-slate-800 dark:text-slate-100`}>{t('drawer_language')}</span>
                <div role="group" aria-label={t('drawer_language')} className="flex flex-shrink-0 rounded-[14px] bg-black/[0.05] p-0.5 dark:bg-white/10">
                  <button
                    type="button"
                    lang="zh-Hant"
                    aria-pressed={!isEnglish}
                    onClick={() => void i18n.changeLanguage('zh')}
                    className={`${SEGMENT} ${!isEnglish ? SEGMENT_ON : SEGMENT_OFF}`}
                  >
                    中文
                  </button>
                  <button
                    type="button"
                    lang="en"
                    aria-pressed={isEnglish}
                    onClick={() => void i18n.changeLanguage('en')}
                    className={`${SEGMENT} ${isEnglish ? SEGMENT_ON : SEGMENT_OFF}`}
                  >
                    EN
                  </button>
                </div>
              </div>
              <div className="flex min-h-[3.25rem] items-center gap-3.5 py-1 pl-5 pr-3">
                <SunMoon size={20} className={ROW_ICON} />
                <span className={`${ROW_LABEL} text-slate-800 dark:text-slate-100`}>{t('drawer_appearance')}</span>
                <div role="group" aria-label={t('drawer_appearance')} className="flex flex-shrink-0 rounded-[14px] bg-black/[0.05] p-0.5 dark:bg-white/10">
                  <button
                    type="button"
                    aria-pressed={!isDarkMode}
                    aria-label={t('theme_light')}
                    title={t('theme_light')}
                    onClick={() => setDarkMode(false)}
                    className={`${SEGMENT} ${!isDarkMode ? SEGMENT_ON : SEGMENT_OFF}`}
                  >
                    <Sun size={18} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    aria-pressed={isDarkMode}
                    aria-label={t('theme_dark')}
                    title={t('theme_dark')}
                    onClick={() => setDarkMode(true)}
                    className={`${SEGMENT} ${isDarkMode ? SEGMENT_ON : SEGMENT_OFF}`}
                  >
                    <Moon size={18} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
              {isLoggedIn && (
                <button type="button" onClick={() => runAndClose(onOpenProfile)} aria-haspopup="dialog" className={ROW}>
                  <Sparkles size={20} className={ROW_ICON} />
                  <span className={ROW_LABEL}>{t('ai_preferences')}</span>
                  <ChevronRight size={18} className={ROW_ICON} />
                </button>
              )}
            </section>

            {/* The author's other sites */}
            <section className={SECTION}>
              <h2 className={SECTION_LABEL}>{t('drawer_more_tools')}</h2>
              <ul>
                {PORTFOLIO_PROJECTS.map((project) => (
                  <li key={project.url}>
                    <a href={project.url} target="_blank" rel="noopener noreferrer" className={ROW}>
                      <span className="w-5 flex-shrink-0 text-center text-lg leading-none" aria-hidden="true">
                        {project.icon}
                      </span>
                      <span className={ROW_LABEL}>
                        {project.title}
                        <span className="sr-only"> {t('opens_in_new_tab')}</span>
                      </span>
                      <ExternalLink size={16} className={ROW_ICON} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {isLoggedIn && (
              <div className="mt-auto px-2 pb-2 pt-1">
                <button
                  type="button"
                  onClick={() => runAndClose(onRequestLogout)}
                  className="flex min-h-11 w-full items-center gap-3.5 rounded-2xl px-3 py-2 text-left text-[15px] font-bold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <LogOut size={20} />
                  {t('logout_account')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function AccountAvatar({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-[#f1d0bd] text-[#8a4935] dark:bg-[#3a2a22] dark:text-[#d59a85]">
      {children}
    </span>
  );
}
