import { useEffect, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, LogOut, Menu, Sparkles, UserRound } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getTabLabelKey } from './navigation';

const ICON_BUTTON =
  'relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[#8a4935] transition-colors hover:bg-[#9a452e]/10 hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 dark:text-[#d59a85] dark:hover:bg-white/10 dark:hover:text-white';

interface TopAppBarProps {
  isLoggedIn: boolean;
  /** Account display name; null until known. Never pass the raw user id. */
  displayName: string | null;
  isMenuOpen: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenMenu: () => void;
  onLogin: () => void;
  onOpenProfile: () => void;
  onRequestLogout: () => void;
}

/**
 * Slim app header: menu button + current tab name on the left, notifications
 * and the account avatar on the right. Brand, language and theme live in the
 * side menu (AppDrawer).
 */
export default function TopAppBar({
  isLoggedIn,
  displayName,
  isMenuOpen,
  menuButtonRef,
  onOpenMenu,
  onLogin,
  onOpenProfile,
  onRequestLogout,
}: TopAppBarProps) {
  const { t } = useTranslation();
  const { activeTab, notifications, clearNotifications, isNavVisible } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!showNotifications && !showUserMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showNotifications, showUserMenu]);

  return (
    <header
      className={`fixed top-0 z-50 flex h-header w-full items-center justify-between gap-2 pt-safe px-1 md:px-3 jelly-surface !rounded-none !border-x-0 !border-t-0 !shadow-sm transition-transform duration-500 transform-gpu ${
        isNavVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex min-w-0 items-center gap-0.5">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onOpenMenu}
          aria-label={t('menu_open')}
          aria-haspopup="dialog"
          aria-expanded={isMenuOpen}
          aria-controls="app-drawer"
          className={ICON_BUTTON}
        >
          <Menu size={22} strokeWidth={2.2} />
        </button>
        <span className="truncate text-[17px] font-extrabold tracking-tight text-[#9a452e] md:text-lg dark:text-[#d59a85]">
          {t(getTabLabelKey(activeTab))}
        </span>
      </div>

      <div className="flex flex-shrink-0 items-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(false);
              setShowNotifications((open) => !open);
            }}
            className={ICON_BUTTON}
            aria-label={t('notifications')}
            aria-expanded={showNotifications}
          >
            <Bell size={21} />
            {notifications.length > 0 && (
              <span
                className="absolute right-2.5 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500 shadow-sm dark:border-[#1d2620]"
                aria-hidden="true"
              />
            )}
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} aria-hidden="true" />
              <div
                className="absolute right-0 top-12 z-50 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1d2620]/95"
                role="dialog"
                aria-label={t('notifications_panel')}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
                  <span className="text-[14px] font-bold text-slate-700 dark:text-slate-100">{t('notifications')}</span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearNotifications}
                        className="min-h-11 px-2 text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        {t('clear_all')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="flex h-11 w-11 items-center justify-center text-[18px] leading-none text-slate-400 hover:text-slate-600"
                      aria-label={t('close')}
                    >
                      ×
                    </button>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
                    <span className="text-3xl" aria-hidden="true">🔔</span>
                    <p className="text-center text-[13px] font-medium text-slate-400">{t('no_new_notifications')}</p>
                    <p className="text-center text-[11px] text-slate-400">{t('notifications_desc')}</p>
                  </div>
                ) : (
                  <div className="flex max-h-72 flex-col overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="border-b border-slate-50 px-4 py-3 last:border-0 dark:border-white/5">
                        <p className="text-[13px] text-slate-700 dark:text-slate-200">{n.text}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {new Date(n.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label={isLoggedIn ? t('account_menu') : t('login_account')}
            aria-expanded={isLoggedIn ? showUserMenu : undefined}
            onClick={() => {
              setShowNotifications(false);
              // Signed-out visitors have only one thing to do here, so skip the menu.
              if (!isLoggedIn) {
                onLogin();
                return;
              }
              setShowUserMenu((open) => !open);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1d0bd] text-[#8a4935] dark:bg-[#3a2a22] dark:text-[#d59a85] md:h-[34px] md:w-[34px]">
              {isLoggedIn ? <UserRound size={17} strokeWidth={2.4} /> : <Sparkles size={16} strokeWidth={2.4} />}
            </span>
          </button>
          {showUserMenu && isLoggedIn && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} aria-hidden="true" />
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 flex w-48 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white/95 py-1 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1d2620]/95">
                <p className="truncate px-4 pb-1 pt-2 text-[12px] font-black text-slate-500 dark:text-slate-400">
                  {t('hello_user', { name: displayName || t('account_default_name') })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenProfile();
                  }}
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <Sparkles size={16} className="text-orange-400" />
                  <span className="text-[14px] font-bold text-slate-700 dark:text-slate-100">{t('ai_preferences')}</span>
                </button>
                <div className="mx-3 h-px bg-slate-100 dark:bg-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onRequestLogout();
                  }}
                  className="group flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <LogOut size={16} className="text-rose-400 transition-colors group-hover:text-rose-500" />
                  <span className="text-[13px] font-bold text-rose-600 transition-colors group-hover:text-rose-700">{t('logout_account')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
