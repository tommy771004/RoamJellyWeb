import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import HomeTab from './components/HomeTab';
import RedirectModal from './components/RedirectModal';
import { assignDaysBasedOnTimeAndOrder } from './lib/itineraryUtils';

const ItineraryTab = lazy(() => import('./components/ItineraryTab'));
const ToolsTab = lazy(() => import('./components/ToolsTab'));
import BottomTabs, { TABS } from './components/BottomTabs';
import AiLoadingState from './components/AiLoadingState';
import LoginScreen from './components/LoginScreen';
import TripLandingPage from './components/TripLandingPage';
import JellyAssistant from './components/JellyAssistant';
import AiForm from './components/AiForm';
import DynamicItineraryView from './components/DynamicItineraryView';
import { useAppStore } from './store/useAppStore';
import { useSearchStore } from './store/useSearchStore';
import { trackClickOut, getStoredToken, ensureClientAccessToken } from './lib/workflowApi';
import { JellyToast } from './components/JellyToast';

/** Extract /trip/:tripId from the current URL path, null if no match. */
function getTripLandingId(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/trip\/([^/]+)$/);
  return match?.[1] ?? null;
}

export default function App() {
  const {
    activeTab, setActiveTab,
    redirectModal, closeRedirectModal,
    userId, toasts, removeToast, showToast, setAuthenticated,
    isOffline, setOffline,
    isDarkMode, setDarkMode,
    notifications, clearNotifications,
  } = useAppStore();
  const { loadPreferences, toggleSave, savedItems } = useSearchStore();

  // Detect trip landing URL once on mount (before any auth check)
  const [tripLandingId] = useState<string | null>(getTripLandingId);

  // Auth state
  const [authReady, setAuthReady] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isLoggedIn = !!userId;
  const lastActivityRef = useRef<number>(Date.now());
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Auto-logout logic
  useEffect(() => {
    if (!isLoggedIn) return;

    // Load last activity from localStorage to survive page refresh
    const storedLastActivity = localStorage.getItem('last_activity');
    if (storedLastActivity) {
      lastActivityRef.current = parseInt(storedLastActivity, 10);
    }

    const checkSession = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > SESSION_TIMEOUT) {
        console.log('Session expired. Logging out...');
        handleLogout();
        showToast('工作階段已過期，請重新登入。');
      }
    };

    const updateActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('last_activity', now.toString());
    };

    // Events to monitor activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    const interval = setInterval(checkSession, 30000); // Check every 30 seconds

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(interval);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    // Initial check on load
    const storedUserId = localStorage.getItem('user_id');
    const storedLastActivity = localStorage.getItem('last_activity');
    
    if (storedUserId && storedLastActivity) {
      const now = Date.now();
      if (now - parseInt(storedLastActivity, 10) < SESSION_TIMEOUT) {
        setAuthenticated(storedUserId);
      } else {
        localStorage.removeItem('user_id');
        localStorage.removeItem('last_activity');
      }
    }
    setAuthReady(true);
  }, [setAuthenticated]);

  useEffect(() => {
    const bootstrap = async () => {
      let token = getStoredToken();
      // Auto-fetch token for dev API access
      if (!token) {
        const autoLogin =
          (import.meta as any).env?.VITE_DEV_AUTO_LOGIN ?? 'true';
        if (autoLogin.trim().toLowerCase() !== 'false' && (import.meta as any).env.MODE !== 'production') {
          token = await ensureClientAccessToken().catch(() => '');
        }
      }
      
      // Load user preferences only if authenticated
      if (isLoggedIn) {
        void loadPreferences();
      }
      
      setAuthReady(true);
    };
    void bootstrap();
  }, [isLoggedIn]); // Re-run pref loading when login state changes

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    setShowLogin(false);
  }, [activeTab]);

  const handleLogin = (loggedInUserId: string) => {
    localStorage.setItem('user_id', loggedInUserId);
    localStorage.setItem('last_activity', Date.now().toString());
    setAuthenticated(loggedInUserId);
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('last_activity');
    setAuthenticated(null);
    setShowLogoutModal(false);
    if (activeTab !== 'home') {
      setActiveTab('home');
    }
  };

  const handleRedirectConfirm = async () => {
    const current = redirectModal;
    closeRedirectModal();

    await trackClickOut({
      user_id: userId,
      item_id: current.itemId,
      provider: current.provider,
      timestamp: new Date().toISOString(),
      affiliate_url: current.affiliateUrl,
    });

    if (typeof window !== 'undefined' && current.affiliateUrl) {
      window.open(current.affiliateUrl, '_blank', 'noopener,noreferrer');
    }

    showToast(`已導向至 ${current.provider}`);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab />;
      case 'itinerary':
        return <ItineraryTab />;
      case 'tools':
        return <ToolsTab />;
      default:
        return <HomeTab />;
    }
  };

  const prevActiveTabRef = useRef<string>(activeTab);

  // Show nothing while checking localStorage (avoids flash)
  if (!authReady) {
    return (
      <div className="flex-1 justify-center items-center bg-purple-50 flex h-screen w-screen">
        <span style={{ fontSize: 32 }}>✈️</span>
      </div>
    );
  }

  // Trip invitation landing page
  if (tripLandingId) {
    return (
      <TripLandingPage
        tripId={tripLandingId}
        onJoined={() => {
          window.location.href = `/?trip_id=${encodeURIComponent(tripLandingId)}`;
        }}
      />
    );
  }

  // Compute slide direction synchronously before render so framer-motion sees it on the same frame.
  const TAB_SLIDE_ORDER: Record<string, number> = { home: 0, itinerary: 1, ai_form: 1, ai_result: 1, tools: 2 };
  let tabSlideDir = 1;
  if (prevActiveTabRef.current !== activeTab) {
    const prevIdx = TAB_SLIDE_ORDER[prevActiveTabRef.current] ?? 0;
    const currIdx = TAB_SLIDE_ORDER[activeTab] ?? 0;
    tabSlideDir = currIdx >= prevIdx ? 1 : -1;
    prevActiveTabRef.current = activeTab;
  }

  const renderContent = () => {
    if (showLogin) {
      return (
        <LoginScreen
          onLogin={(id) => {
            handleLogin(id);
            setShowLogin(false);
          }}
          onCancel={() => {
            setShowLogin(false);
            if (activeTab !== 'home') setActiveTab('home');
          }}
        />
      );
    }
    if (activeTab === 'home') {
      return <HomeTab onRequireLogin={() => setShowLogin(true)} isLoggedIn={isLoggedIn} />;
    }
    if (!isLoggedIn) {
      return <LoginScreen 
        onLogin={handleLogin} 
        onCancel={() => {
          setActiveTab('home');
        }}
      />;
    }
    if (activeTab === 'ai_form') {
      if (isGenerating) {
        return <AiLoadingState />;
      }
      return <AiForm onSubmit={async (data) => {
        setIsGenerating(true);
        showToast(`正在為您生成旅程：${data.destination}...`);
        try {
          // Simulate a 3-second API call with typing animation as requested
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const suggestions = {
             ui_config: { 
               bg_gradient: data.budget === '奢華' ? 'from-amber-100 to-yellow-100' : 'from-indigo-100 via-purple-50 to-pink-100', 
               font_scale: 'large' 
             },
             summary: { 
               title: `為您專屬規劃：${data.destination} ${data.vibes[0] || '完美'}之旅`, 
               smart_tags: [...data.vibes, ...data.interests, data.companions].filter(Boolean).slice(0, 4) 
             },
             itinerary: Array.from({ length: data.days }).map((_, idx) => ({
               day: idx + 1,
               spots: [
                 { 
                   time: '10:00', 
                   name: idx === 0 ? '抵達與放行李' : '晨間網美打卡點', 
                   emoji: idx === 0 ? '🏨' : '📸', 
                   category: idx === 0 ? 'hotel' : 'landmark', 
                   ai_note: idx === 0 ? '建議先寄放行李，輕鬆開始旅程！' : '早晨光線最棒，適合拍照！',
                   intensity: 'chill',
                   transport_to_next: '大眾運輸約 15 分鐘'
                 },
                 { 
                   time: '13:00', 
                   name: '在地必吃美食推薦', 
                   emoji: '🍜', 
                   category: 'food', 
                   ai_note: `考量到您的${data.dietary.length > 0 ? data.dietary.join('、') : '口味'}需求，精選的高評價餐廳。`,
                   intensity: 'chill',
                   transport_to_next: '步行約 10 分鐘'
                 },
                 { 
                   time: '15:00', 
                   name: '深度體驗行程', 
                   emoji: '🗺️', 
                   category: 'activity', 
                   ai_note: '讓您深度感受在地文化與氛圍的活動。',
                   intensity: 'hardcore',
                   transport_to_next: '預計搭乘計程車'
                 },
                 { 
                   time: '19:00', 
                   name: '經典夜生活與晚餐', 
                   emoji: '🍻', 
                   category: 'nightlife', 
                   ai_note: '在美麗夜景中享受美好的夜晚！',
                   intensity: 'chill'
                 }
               ]
             }))
          };

          // Convert AiResponse itinerary to ItineraryNode[]
          const nodes: any[] = [];
          if (suggestions && suggestions.itinerary) {
            suggestions.itinerary.forEach((dayData: any) => {
              if (dayData.spots) {
                 dayData.spots.forEach((spot: any, i: number) => {
                   nodes.push({
                     node_id: `ai_${Date.now()}_${dayData.day}_${i}`,
                     day: dayData.day || 1,
                     time: spot.time || "10:00",
                     title: String(spot.name || spot.title || '景點'),
                     emoji: spot.emoji || '📍',
                     category: spot.category || 'other',
                     description: spot.ai_note || '',
                     lat: 25.0330 + (Math.random() * 0.1),
                     lng: 121.5654 + (Math.random() * 0.1),
                     source: 'local' as const,
                   });
                 });
              }
            });
          }

          // assign missing days correctly & populate timestamp
          const { assignDaysBasedOnTimeAndOrder } = await import('./lib/itineraryUtils');
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 1);
          const finalNodes = assignDaysBasedOnTimeAndOrder(nodes, startDate.toISOString());

          useAppStore.getState().setAiResult({
             fullResponse: suggestions,
             title: suggestions.summary.title,
             rawSuggestions: finalNodes
          });
          setActiveTab('ai_result');
        } catch (e) {
          showToast('生成失敗，請稍後再試。', 'warning');
        } finally {
          setIsGenerating(false);
        }
      }} />;
    }
    if (activeTab === 'ai_result') {
      const { aiResult } = useAppStore.getState();
      return <DynamicItineraryView 
        result={aiResult} 
        onBack={() => setActiveTab('ai_form')} 
        onSave={async (result) => {
          showToast('正在儲存行程...', 'info');
          
          try {
            const { useItineraryStore } = await import('./store/useItineraryStore');
            const { useAppStore } = await import('./store/useAppStore');
            const { syncItinerary, createTrip } = await import('./lib/workflowApi');
            const { setNodes, addNode } = useItineraryStore.getState();
            const { activeTripId, setActiveTripId } = useAppStore.getState();
            let TRIP_ID = activeTripId || (new URLSearchParams(window.location.search).get('trip_id')) || (import.meta as any).env?.VITE_TRIP_ID || '';

            // If no active trip, create a new one first
            if (!TRIP_ID) {
              const newTrip = await createTrip({ 
                name: result.title || `規劃之旅`, 
                destination: '指定地點'
              });
              TRIP_ID = newTrip.id;
              setActiveTripId(TRIP_ID);
            }

            if (result.rawSuggestions?.length) {
                setNodes([]); // Clear existing
                if (TRIP_ID) {
                  // Fire off all sync requests in parallel
                  await Promise.all(result.rawSuggestions.map(async (node) => {
                     addNode(node);
                     return syncItinerary({ trip_id: TRIP_ID, action: 'add_node', payload: node });
                  }));
                } else {
                  for (const node of result.rawSuggestions) {
                    addNode(node);
                  }
                }
            }
          } catch (err) {
             console.error('Failed to save to server', err);
          }

          showToast('行程已為您準備好！', 'success');
          setActiveTab('itinerary');
        }}
      />;
    }
    if (activeTab === 'itinerary') {
      return <ItineraryTab />;
    }
    if (activeTab === 'tools') {
      return <ToolsTab />;
    }
    return <HomeTab />;
  };

  return (
    <div className="flex-1 jelly-bg w-full h-full flex flex-col min-h-[100dvh] relative overflow-hidden font-body-md text-slate-800 transition-colors duration-500">
      {/* Dev Mode Switches (Top Left outside Header, absolute for dev) */}
      {(import.meta as any).env.MODE !== 'production' && (
        <div className="fixed top-2 left-2 z-[60] flex items-center gap-2 scale-75 origin-top-left opacity-30 hover:opacity-100 transition-opacity bg-white/50 p-2 rounded-xl backdrop-blur-md">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
            <input type="checkbox" checked={isOffline} onChange={e => setOffline(e.target.checked)} className="accent-red-500" />
            斷網
          </label>
        </div>
      )}

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.05)] transition-colors duration-500">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 z-20">
          <h1 className="text-2xl font-black text-pink-500 italic tracking-tight font-plus-jakarta pr-2">RoamJelly</h1>
        </div>
        
        {/* Desktop Navigation (Center, hidden on mobile) */}
        <nav className="hidden md:flex flex-row items-center justify-center gap-2 absolute left-1/2 -translate-x-1/2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-row items-center gap-2 px-5 py-2.5 transition-all rounded-[20px] ${
                  isActive 
                    ? 'bg-white/80 shadow-[0_0_15px_rgba(255,183,206,0.6)] text-pink-600' 
                    : 'text-pink-500/70 hover:bg-white/50 hover:text-pink-500'
                }`}
              >
                <span 
                  className="material-symbols-outlined text-[22px]" 
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {tab.icon}
                </span>
                <span className="font-bold text-sm tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: User Avatar & Greetings */}
        <div className="flex items-center gap-2 sm:gap-3 z-20">
          <button
            onClick={() => setDarkMode(!isDarkMode)}
            className="w-10 h-10 hidden sm:flex items-center justify-center rounded-full bg-white/40 jelly-button text-pink-400"
            aria-label={isDarkMode ? '切換亮色模式' : '切換深色模式'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 jelly-button text-pink-400 relative"
              aria-label="通知"
              aria-expanded={showNotifications}
            >
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            {showNotifications && (
              <div
                className="absolute right-0 top-12 w-72 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 z-50 overflow-hidden"
                role="dialog"
                aria-label="通知面板"
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-[14px] text-slate-700">通知</span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >全部清除</button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 text-[18px] leading-none"
                      aria-label="關閉"
                    >×</button>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
                    <span className="text-3xl">🔔</span>
                    <p className="text-[13px] text-slate-400 text-center font-medium">目前沒有新通知</p>
                    <p className="text-[11px] text-slate-300 text-center">行程更新、協作邀請等訊息<br/>將在這裡顯示</p>
                  </div>
                ) : (
                  <div className="flex flex-col max-h-72 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 border-b border-slate-50 last:border-0">
                        <p className="text-[13px] text-slate-700">{n.text}</p>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {new Date(n.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {showNotifications && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
                aria-hidden="true"
              />
            )}
          </div>
          
          <div 
            onClick={() => {
              if (!isLoggedIn) {
                setShowLogin(true);
              } else {
                setShowLogoutModal(true);
              }
            }}
            className={`flex items-center gap-3 cursor-pointer group rounded-full border shadow-sm transition-all pl-3 pr-1 py-1 ${isLoggedIn ? 'bg-fuchsia-50/80 border-fuchsia-200/50 hover:bg-fuchsia-100/80' : 'bg-slate-50/80 border-slate-200 hover:bg-white/90'}`}
          >
            <span className={`text-[13px] font-black tracking-wide hidden sm:block whitespace-nowrap pl-1 ${isLoggedIn ? 'text-fuchsia-700' : 'text-slate-500'}`}>
              {isLoggedIn ? `${userId} 您好` : '未登入'}
            </span>
            <div className={`relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center pb-1 transition-transform group-hover:scale-105 group-active:scale-95 shadow-inner ${isLoggedIn ? 'bg-pink-100' : 'bg-slate-200'}`}>
              <span className="text-lg pt-1">{isLoggedIn ? '🐴' : '🤫'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-[72px] left-0 right-0 z-40 px-4 pt-2 pb-1 pointer-events-none"
          >
            <div className="max-w-2xl mx-auto bg-red-500/80 dark:bg-red-900/80 backdrop-blur-md rounded-2xl p-2.5 shadow-lg border border-red-400/50 dark:border-red-500/30 flex items-center justify-center gap-2 pointer-events-auto">
              <span className="text-white text-[13px] font-bold tracking-wide">✈️ 目前處於離線狀態，已切換至本機快取模式。</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex-1 relative z-10 w-full overflow-hidden flex flex-col">
        <AnimatePresence mode="wait" custom={tabSlideDir}>
          <motion.div
            key={!isLoggedIn && activeTab !== 'home' ? 'login' : (activeTab === 'ai_form' && isGenerating) ? 'ai_form_loading' : activeTab}
            custom={tabSlideDir}
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: dir * 56, scale: 0.98 }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (dir: number) => ({ opacity: 0, x: -dir * 40, scale: 0.99 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', bounce: 0.12, duration: 0.42 }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            className="pt-[80px]"
          >
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><span className="text-2xl animate-spin">✈️</span></div>}>
              {renderContent()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Fixed Navigation (Mobile Only) */}
      <BottomTabs />
      <JellyAssistant />

      <AnimatePresence>
        {redirectModal.isOpen && (
          <RedirectModal
            provider={redirectModal.provider}
            airline={redirectModal.airline}
            departure={redirectModal.departure}
            arrival={redirectModal.arrival}
            duration={redirectModal.duration}
            stops={redirectModal.stops}
            price={redirectModal.price}
            currency={redirectModal.currency}
            emoji={redirectModal.emoji}
            onClose={closeRedirectModal}
            onConfirm={() => void handleRedirectConfirm()}
            onSave={() => {
              const currentId = redirectModal.itemId;
              toggleSave(currentId);
              const isSaved = savedItems.includes(currentId);
              showToast(!isSaved ? '✨ 已收藏該機票！' : '已從收藏清單移除');
              closeRedirectModal();
            }}
          />
        )}
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowLogoutModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-[480px] bg-white/90 backdrop-blur-2xl border border-white rounded-[32px] p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl mb-4 border border-white shadow-inner animate-pulse shrink-0">
                🐴
              </div>
              <h3 className="font-h2 text-2xl text-slate-800 mb-2">準備要休息一會嗎？</h3>
              <p className="font-body-md text-slate-500 mb-8 px-2 sm:px-6">雖然很捨不得您離開，但 RoamJelly 會一直在這裡等您回來探索世界。</p>
              
              <div className="flex flex-row w-full gap-3 sm:gap-4">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 sm:py-3.5 px-2 sm:px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors whitespace-nowrap text-[15px]"
                >
                  再待一下
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 sm:py-3.5 px-2 sm:px-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-bold transition-colors shadow-md shadow-orange-500/30 whitespace-nowrap text-[15px]"
                >
                  確認登出
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <JellyToast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
