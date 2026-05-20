import { SPRING_SMOOTH, SPRING_SNAPPY, SPRING_BOUNCY } from './lib/motionTokens';
import { useState, useEffect, useCallback, useRef, lazy, Suspense, type ComponentType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import HomeTab from './components/HomeTab';
import RedirectModal from './components/RedirectModal';
import { assignDaysBasedOnTimeAndOrder } from './lib/itineraryUtils';

const ItineraryTab = lazy(() => import('./components/ItineraryTab'));
const ToolsTab = lazy(() => import('./components/ToolsTab'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const TripLandingPage = lazy(() => import('./components/TripLandingPage'));
const UserProfileModal = lazy(() => import('./components/UserProfileModal'));
const JellyAssistant = lazy(() => import('./components/JellyAssistant'));
const AiForm = lazy(() => import('./components/AiForm'));
const DynamicItineraryView = lazy(() => import('./components/DynamicItineraryView'));
import { 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  Settings,
  Settings2,
  Menu,
  ChevronDown,
  Home as HomeIcon,
  Sparkles as SparklesIcon,
  CalendarDays as CalendarDaysIcon,
  Luggage as LuggageIcon,
  PlaneTakeoff,
  UserRound,
} from 'lucide-react';
import BottomTabs, { TABS } from './components/BottomTabs';

const TAB_ICON_MAP: Record<string, ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  home: HomeIcon,
  ai_form: SparklesIcon,
  itinerary: CalendarDaysIcon,
  tools: LuggageIcon,
};
import AiLoadingState from './components/AiLoadingState';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { useAppStore } from './store/useAppStore';
import { useSearchStore } from './store/useSearchStore';
import { trackClickOut, getStoredToken, ensureClientAccessToken, geocodeSpot, getNativeMapUrl, createGuestSession, clearClientSession } from './lib/workflowApi';
import { suggestItineraryWithForm } from './lib/openrouterApi';
import { getCategoryMeta } from './lib/itineraryUtils';
import { JellyToast } from './components/JellyToast';
type LoginPromptMode = 'default' | 'guest-first';

const AUTO_GUEST_TABS = new Set(['ai_form', 'itinerary', 'tools']);

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
    activeTripId,
    isOffline, setOffline,
    isDarkMode, setDarkMode,
    notifications, clearNotifications,
    isNavVisible,
  } = useAppStore();
  const { loadPreferences, toggleSave, savedItems } = useSearchStore();

  useEffect(() => {
    const handleMapOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { lat, lng, title } = customEvent.detail;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const mapUrl = getNativeMapUrl(lat, lng, title, isIOS);
      window.open(mapUrl, '_blank', 'noopener,noreferrer');
    };
    window.addEventListener('open-map', handleMapOpen);
    return () => window.removeEventListener('open-map', handleMapOpen);
  }, []);

  // Detect trip landing URL once on mount (before any auth check)
  const [tripLandingId] = useState<string | null>(getTripLandingId);

  // Auth state
  const [authReady, setAuthReady] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loginPromptMode, setLoginPromptMode] = useState<LoginPromptMode>('default');
  const [guestBootstrapState, setGuestBootstrapState] = useState<'idle' | 'loading' | 'error'>('idle');

  const isLoggedIn = !!userId;
  const shouldAutoGuestBootstrap = false;
    // !isLoggedIn &&
    // !showLogin &&
    // AUTO_GUEST_TABS.has(activeTab) &&
    // !(activeTab === 'tools' && !activeTripId);
  const lastActivityRef = useRef<number>(Date.now());
  const lastPersistedActivityRef = useRef<number>(Date.now());
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const ACTIVITY_PERSIST_INTERVAL = 15 * 1000;
  const prefersReducedMotion = useReducedMotion();

  // Auto-logout logic
  useEffect(() => {
    if (!isLoggedIn) return;

    // Load last activity from localStorage to survive page refresh
    const storedLastActivity = localStorage.getItem('last_activity');
    if (storedLastActivity) {
      const parsedLastActivity = parseInt(storedLastActivity, 10);
      lastActivityRef.current = parsedLastActivity;
      lastPersistedActivityRef.current = parsedLastActivity;
    }

    const persistActivity = (timestamp: number, force = false) => {
      if (!force && timestamp - lastPersistedActivityRef.current < ACTIVITY_PERSIST_INTERVAL) {
        return;
      }

      lastPersistedActivityRef.current = timestamp;
      localStorage.setItem('last_activity', timestamp.toString());
    };

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
      persistActivity(now);
    };

    const flushActivity = () => {
      persistActivity(lastActivityRef.current || Date.now(), true);
    };

    // Events to monitor activity
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    const passiveEvents = new Set(['wheel', 'touchstart']);
    events.forEach(event =>
      window.addEventListener(event, updateActivity, passiveEvents.has(event) ? { passive: true } : undefined)
    );
    window.addEventListener('pagehide', flushActivity);
    document.addEventListener('visibilitychange', flushActivity);

    const interval = setInterval(checkSession, 30000); // Check every 30 seconds

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      window.removeEventListener('pagehide', flushActivity);
      document.removeEventListener('visibilitychange', flushActivity);
      clearInterval(interval);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    // Initial check on load
    const storedUserId = localStorage.getItem('user_id');
    const storedLastActivity = localStorage.getItem('last_activity');
    const storedToken = getStoredToken();
    
    if (storedUserId && storedLastActivity && storedToken) {
      const now = Date.now();
      if (now - parseInt(storedLastActivity, 10) < SESSION_TIMEOUT) {
        setAuthenticated(storedUserId);
      } else {
        clearClientSession();
      }
    } else if (storedUserId || storedLastActivity || storedToken) {
      clearClientSession();
    }
    setAuthReady(true);
  }, [setAuthenticated]);

  useEffect(() => {
    const bootstrap = async () => {
      const token = getStoredToken();
      const autoLogin = ((import.meta as any).env?.VITE_DEV_AUTO_LOGIN ?? 'false').trim().toLowerCase();
      if (!token && (import.meta as any).env?.DEV && autoLogin === 'true') {
        await ensureClientAccessToken().catch(() => '');
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
    const now = Date.now();
    localStorage.setItem('user_id', loggedInUserId);
    localStorage.setItem('last_activity', now.toString());
    lastActivityRef.current = now;
    lastPersistedActivityRef.current = now;
    setAuthenticated(loggedInUserId);
    setLoginPromptMode('default');
    setShowLogin(false);
  };

  const handleLogout = () => {
    clearClientSession();
    setAuthenticated(null);
    setShowLogoutModal(false);
    if (activeTab !== 'home') {
      setActiveTab('home');
    }
  };

  useEffect(() => {
    if (!shouldAutoGuestBootstrap) {
      setGuestBootstrapState('idle');
      return;
    }

    let cancelled = false;
    setGuestBootstrapState('loading');

    void createGuestSession()
      .then((guest) => {
        if (cancelled) return;
        handleLogin(guest.user_id);
        setGuestBootstrapState('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setGuestBootstrapState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [shouldAutoGuestBootstrap]);

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

  const getGuestLoginCopy = (tab: typeof activeTab) => {
    switch (tab) {
      case 'tools':
        return {
          contextLabel: '旅途工具包',
          title: '先開一趟訪客旅程，再把清單、天氣與分帳接上工具包',
          description: '不用先註冊，先用訪客身分建立或挑一份行程，工具包就會立刻拿到這趟旅程的上下文。',
          guestCtaLabel: '先用訪客身分開一趟旅程',
        };
      case 'itinerary':
        return {
          contextLabel: '你的行程',
          title: '先選一趟旅程，再把 AI 草稿與共編安排接回手帳',
          description: '先用訪客身分體驗行程的主線，再決定是否正式註冊。',
          guestCtaLabel: '先用訪客身分開始規劃',
        };
      case 'ai_form':
        return {
          contextLabel: 'AI 旅程規劃',
          title: '先讓 AI 起草一版旅程，再回到手帳慢慢補完',
          description: '先用訪客身分生成可編輯的第一版旅程，確認方向對了，再登入同步與保存。',
          guestCtaLabel: '先用訪客身分交給 AI',
        };
      default:
        return {
          contextLabel: '快速體驗',
          title: '先把旅程流程跑順，喜歡再註冊也不遲',
          description: '首頁搜尋、AI 起草、手帳與工具包都可以先用訪客身分走過一遍，不必一開始就進入註冊流程。',
          guestCtaLabel: '先用訪客身分體驗',
        };
    }
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
  const canRenderPublicToolsEntry = false;
  const isAuthSurfaceVisible = showLogin || (!isLoggedIn && activeTab !== 'home' && !canRenderPublicToolsEntry);
  const shouldShowAssistant =
      !isAuthSurfaceVisible &&
      activeTab !== 'ai_form' &&
      activeTab !== 'ai_result' &&
      !((activeTab === 'tools' || activeTab === 'itinerary') && !activeTripId);

  // Show nothing while checking localStorage (avoids flash)
  if (!authReady) {
    return (
      <div className="flex-1 justify-center items-center bg-purple-50 flex h-full w-full">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg shadow-pink-100/80">
          <PlaneTakeoff size={22} className="text-pink-500 animate-pulse" strokeWidth={2.5} />
        </div>
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
      const loginCopy = loginPromptMode === 'guest-first' ? getGuestLoginCopy(activeTab) : undefined;
      return (
        <LoginScreen
          onLogin={(id) => {
            handleLogin(id);
            setShowLogin(false);
          }}
          onCancel={() => {
            setLoginPromptMode('default');
            setShowLogin(false);
            if (activeTab !== 'home') setActiveTab('home');
          }}
          guestFirst={loginPromptMode === 'guest-first'}
          {...loginCopy}
        />
      );
    }
    if (activeTab === 'home') {
      return <HomeTab onRequireLogin={() => {
        setLoginPromptMode('guest-first');
        setShowLogin(true);
      }} isLoggedIn={isLoggedIn} />;
    }
    if (shouldAutoGuestBootstrap && guestBootstrapState === 'loading') {
      const bootstrapCopy = getGuestLoginCopy(activeTab);
      return (
        <div className="flex min-h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.2),transparent_34%),radial-gradient(circle_at_bottom,rgba(251,146,60,0.16),transparent_36%),#f8fafc] px-5 py-10">
          <div className="w-full max-w-[560px] rounded-[32px] border border-white/80 bg-white/85 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8">
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-sky-700">
              Guest Access
            </div>
            <h2 className="mt-4 text-balance text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              正在幫你開一個訪客旅程入口
            </h2>
            <p className="mt-3 text-pretty text-sm font-bold leading-6 text-slate-600 sm:text-base sm:leading-7">
              {bootstrapCopy.description}
            </p>
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <PlaneTakeoff size={18} strokeWidth={2.5} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {bootstrapCopy.contextLabel}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    建立訪客身分後，會直接帶你進入新的入口畫面。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (canRenderPublicToolsEntry) {
      return <ToolsTab />;
    }
    if (!isLoggedIn) {
      return <LoginScreen
        onLogin={handleLogin}
        onCancel={() => {
          setLoginPromptMode('default');
          setActiveTab('home');
        }}
        guestFirst
        {...getGuestLoginCopy(activeTab)}
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
          const suggestions = await suggestItineraryWithForm({
            destination: data.destination,
            planner: {
              days: data.days,
              departureFrom: data.departure,
              arrivalTo: data.destination,
              flightDate: '',
              countries: [],
              mustVisitSpots: [],
              mustEatFoods: [],
              autoFlightSegments: [],
              travelFactsContext: '',
              notes: '',
              companions: data.companions,
              vibes: data.vibes,
              interests: data.interests,
              budget: data.budget,
              dietary: data.dietary,
              transport: data.transport,
            }
          });

          // Convert AiResponse itinerary to ItineraryNode[]
          const nodes: any[] = [];
          if (suggestions && suggestions.itinerary) {
            suggestions.itinerary.forEach((dayData: any) => {
              if (dayData.spots) {
                 dayData.spots.forEach((spot: any, i: number) => {
                   nodes.push({
                     node_id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${dayData.day}_${i}`,
                     day: dayData.day || 1,
                     time: spot.time || "10:00",
                     title: String(spot.name || spot.title || '景點'),
                     emoji: spot.emoji || getCategoryMeta(spot.category).emoji,
                     category: spot.category || 'other',
                     description: spot.ai_note || '',
                     ai_note: spot.ai_note || '',
                     intensity: spot.intensity,
                     lat: spot.lat,
                     lng: spot.lng,
                     source: 'local' as const,
                   });
                 });
              }
            });
          } else if (Array.isArray(suggestions)) {
            suggestions.forEach((spot: any, i: number) => {
              nodes.push({
                node_id: spot.node_id || `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${spot.day || 1}_${i}`,
                day: spot.day || 1,
                time: spot.time || "10:00",
                title: String(spot.name || spot.title || '景點'),
                emoji: spot.emoji || getCategoryMeta(spot.category).emoji,
                category: spot.category || 'other',
                description: spot.ai_note || '',
                ai_note: spot.ai_note || '',
                intensity: spot.intensity,
                lat: spot.lat,
                lng: spot.lng,
                source: 'local' as const,
              });
            });
          }

          // Priorities AI generated lat/lng, otherwise Geocode spots in parallel; fall back silently if any fail
          const geocodeResults = await Promise.allSettled(
            nodes.map(n => (n.lat && n.lng) ? Promise.resolve({ lat: n.lat, lng: n.lng }) : geocodeSpot(n.title, data.destination))
          );
          geocodeResults.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value) {
              nodes[i].lat = r.value.lat;
              nodes[i].lng = r.value.lng;
            }
          });

          // assign missing days correctly & populate timestamp
          const { assignDaysBasedOnTimeAndOrder } = await import('./lib/itineraryUtils');
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 1);
          let finalNodes = assignDaysBasedOnTimeAndOrder(nodes, startDate.toISOString());
          
          const maxGeneratedDay = finalNodes.length > 0 ? Math.max(...finalNodes.map(n => n.day)) : 0;
          const requestedDays = data.days || 3;
          
          if (maxGeneratedDay < requestedDays) {
            for (let d = maxGeneratedDay + 1; d <= requestedDays; d++) {
              finalNodes.push({
                 node_id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_empty_day_${d}`,
                 day: d,
                 time: '10:00',
                 title: '自由活動',
                 emoji: '🏖️',
                 category: 'activity',
                 description: '這天尚未安排具體行程，您可以自行填加喜愛的口袋名單景點！',
                 ai_note: '這天尚未安排具體行程，您可以自行填加喜愛的口袋名單景點！',
                 intensity: 'chill',
                 source: 'local'
              } as any);
            }
            finalNodes = assignDaysBasedOnTimeAndOrder(finalNodes, startDate.toISOString());
          }

          useAppStore.getState().setAiResult({
             fullResponse: suggestions,
             title: suggestions?.summary?.title || data.destination || '行程規劃',
             destination: data.destination,
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
            const { syncItinerary, createTrip, ensureClientAccessToken } = await import('./lib/workflowApi');
            
            // Ensure we have a token before doing operations
            await ensureClientAccessToken().catch(() => null);
            
            const { setNodes, addNode } = useItineraryStore.getState();
            const { activeTripId, setActiveTripId } = useAppStore.getState();
            let TRIP_ID = activeTripId || (new URLSearchParams(window.location.search).get('trip_id')) || '';
            let canEdit = true;
            let nodesToProcess = result.rawSuggestions || [];

            if (TRIP_ID && nodesToProcess.length > 0) {
              const testNode = nodesToProcess[0];
              try {
                await syncItinerary({ trip_id: TRIP_ID, action: 'add_node', payload: testNode });
                // Success! First node is stored. We will process the rest.
                nodesToProcess = nodesToProcess.slice(1);
                setNodes([testNode]);
              } catch {
                canEdit = false;
              }
            }

            // If no active trip or permission denied, create a new one first
            if (!TRIP_ID || !canEdit) {
              const newTrip = await createTrip({
                name: result.title || `規劃之旅`,
                destination: result.destination || result.title || '旅遊行程'
              });
              const newTripId = newTrip?.data?.id || newTrip?.id;
              if (newTrip && newTripId) {
                TRIP_ID = newTripId;
                // Defer setting activeTripId until after the insert to avoid fetch overriding local updates
                // and to avoid premature loading.
                // Redirect user parameter
                const url = new URL(window.location.href);
                url.searchParams.set('trip_id', TRIP_ID);
                window.history.replaceState({}, '', url.toString());
              }
              setNodes([]); // Start fresh for the new trip
            }

            if (nodesToProcess.length > 0 && TRIP_ID) {
              const results = await Promise.allSettled(nodesToProcess.map(async (node: any) => {
                  addNode(node);
                  return syncItinerary({ trip_id: TRIP_ID, action: 'add_node', payload: node });
               }));
              const failed = results.filter(result => result.status === 'rejected').length;
              if (failed > 0) {
                const failedNodeIds = results.flatMap((result, index) =>
                 result.status === 'rejected' ? [nodesToProcess[index]?.node_id] : [],
                );
                const currentNodes = useItineraryStore.getState().nodes;
                setNodes(currentNodes.filter((node: any) => !failedNodeIds.includes(node.node_id)));
                console.warn(`${failed} node(s) failed to sync`);
              }
            } else if (!TRIP_ID) {
               for (const node of nodesToProcess) {
                 addNode(node);
               }
            }
            
            // Set activeTripId here so that ItineraryTab starts with the latest trip ID securely.
            if (TRIP_ID) {
               setActiveTripId(TRIP_ID);
            }
          } catch (err) {
             console.error('Failed to save to server', err);
             showToast('行程儲存失敗，請重試。', 'warning');
             return;
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
    <div className="flex-1 jelly-bg w-full h-full flex flex-col relative overflow-hidden font-body-md text-slate-800 dark:text-slate-100 transition-colors duration-500">
      <div className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-500 bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`} />
      <div className="noise-overlay absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20 transition-opacity duration-500" />
      {/* Dev Mode Switches (Top Left outside Header, absolute for dev) */}
      {(import.meta as any).env.MODE !== 'production' && (
        <div className="fixed top-2 left-2 z-floating flex items-center gap-2 scale-75 origin-top-left opacity-30 hover:opacity-100 transition-opacity bg-white/50 p-2 rounded-xl backdrop-blur-md">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
            <input type="checkbox" checked={isOffline} onChange={e => setOffline(e.target.checked)} className="accent-red-500" />
            斷網
          </label>
        </div>
      )}

      {/* TopAppBar */}
      <header className={`fixed top-0 w-full z-50 px-3 sm:px-6 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-2 sm:pb-4 flex justify-between items-center jelly-surface !rounded-none !border-x-0 !border-t-0 !shadow-sm transition-transform duration-500 transform-gpu ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        {/* Left: Logo */}
        <div className="flex items-center gap-2 z-20 hover:animate-none">
          <div className="flex items-center justify-center bg-white/80 dark:bg-slate-800/80 shadow-[0_4px_12px_rgba(236,72,153,0.15)] rounded-[18px] w-9 h-9 sm:w-11 sm:h-11 rotate-[-8deg] hover:rotate-[8deg] transition-transform duration-300 animate-cute-bounce">
            <span className="text-[20px] sm:text-[24px] drop-shadow-sm">🍓</span>
          </div>
          <h1 className="text-gradient text-[22px] sm:text-3xl font-black italic tracking-tighter font-plus-jakarta pr-2 drop-shadow-[0_4px_12px_rgba(244,114,182,0.3)]">RoamJelly</h1>
        </div>
        
        {/* Desktop Navigation (Center, hidden on mobile) */}
        <nav className="hidden md:flex flex-row items-center justify-center gap-2 absolute left-1/2 -translate-x-1/2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = TAB_ICON_MAP[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-row items-center gap-2 px-5 py-2.5 transition-all rounded-[24px] border ${
                  isActive 
                    ? 'border-white/90 bg-white shadow-[0_12px_24px_rgba(236,72,153,0.14)] text-pink-600' 
                    : 'border-transparent text-slate-500 hover:bg-white/75 hover:border-white/80 hover:text-pink-500'
                }`}
              >
                {Icon && <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'opacity-100' : 'opacity-60'} />}
                <span className="font-bold text-sm tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: User Avatar & Greetings */}
        <div className="flex items-center gap-2 sm:gap-3 z-20">
          {isLoggedIn && (
            <button
              onClick={() => setShowUserProfile(true)}
              className="w-10 h-10 hidden sm:flex items-center justify-center rounded-full jelly-button text-orange-400"
              aria-label="偏好設定"
            >
              <Settings2 size={20} />
            </button>
          )}
          <button
            onClick={() => setDarkMode(!isDarkMode)}
            className="w-10 h-10 flex items-center justify-center rounded-full jelly-button text-sky-500"
            aria-label={isDarkMode ? '切換亮色模式' : '切換深色模式'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-full jelly-button text-pink-400 relative"
              aria-label="通知"
              aria-expanded={showNotifications}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white shadow-sm" />
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
          
          <div className="relative z-30">
            <button
              type="button"
              aria-label={isLoggedIn ? '帳號選單' : '登入選單'}
              onClick={() => setShowUserMenu(v => !v)}
              className={`flex items-center gap-3 group rounded-full border shadow-sm transition-colors pl-3 pr-1 py-1 ${isLoggedIn ? 'border-white/90 bg-[linear-gradient(135deg,rgba(254,242,248,0.95),rgba(240,249,255,0.88))] hover:bg-white/95' : 'border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88),rgba(254,242,248,0.76))] hover:bg-white/95'}`}
            >
              <span className={`text-[13px] font-black tracking-wide hidden sm:block whitespace-nowrap pl-1 ${isLoggedIn ? 'text-pink-700' : 'text-slate-600'}`}>
                {isLoggedIn ? `${userId} 您好` : '未登入'}
              </span>
              <div className={`relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-[0.97] shadow-inner ${isLoggedIn ? 'bg-[linear-gradient(135deg,#fce7f3,#e0f2fe)] text-pink-500' : 'bg-[linear-gradient(135deg,#f8fafc,#fce7f3)] text-sky-500'}`}>
                {isLoggedIn ? <UserRound size={17} strokeWidth={2.4} /> : <SparklesIcon size={16} strokeWidth={2.4} />}
              </div>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-40 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col py-1">
                {!isLoggedIn ? (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setLoginPromptMode('default');
                      setShowLogin(true);
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left w-full"
                  >
                    <UserRound size={16} className="text-slate-400" />
                    <span className="text-[14px] font-bold text-slate-700">登入帳號</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowUserProfile(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left w-full"
                    >
                      <SparklesIcon size={16} className="text-orange-400" />
                      <span className="text-[14px] font-bold text-slate-700">AI 偏好設定</span>
                    </button>
                    <div className="mx-3 h-px bg-slate-100" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowLogoutModal(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50 transition-colors text-left w-full group"
                    >
                      <LogOut size={16} className="text-rose-400 group-hover:text-rose-500 transition-colors" />
                      <span className="text-[13px] font-bold text-rose-600 group-hover:text-rose-700 transition-colors">登出帳號</span>
                    </button>
                  </>
                )}
              </div>
            )}
            {showUserMenu && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
                aria-hidden="true"
              />
            )}
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
            className="fixed top-[72px] left-0 right-0 w-full z-40 px-4 pt-2 pb-1 pointer-events-none"
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
            key={showLogin ? `login-${loginPromptMode}` : isAuthSurfaceVisible ? `login-${activeTab}` : (activeTab === 'ai_form' && isGenerating) ? 'ai_form_loading' : activeTab}
            custom={tabSlideDir}
            variants={{
              enter: (dir: number) => prefersReducedMotion ? ({ opacity: 0 }) : ({ opacity: 0, scale: 0.96, y: 8 }),
              center: { opacity: 1, scale: 1, y: 0 },
              exit: (dir: number) => prefersReducedMotion ? ({ opacity: 0 }) : ({ opacity: 0, scale: 0.98, y: -4 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0.16 } : SPRING_SMOOTH}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            className="pt-[calc(56px+env(safe-area-inset-top,0px))] sm:pt-[calc(80px+env(safe-area-inset-top,0px))] pb-0"
          >
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg shadow-pink-100/80"><PlaneTakeoff size={22} className="text-pink-500 animate-spin" strokeWidth={2.5} /></div></div>}>
              {renderContent()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Fixed Navigation (Mobile Only) */}
      <BottomTabs />
      <PwaInstallPrompt />
      {shouldShowAssistant ? <JellyAssistant /> : null}

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
          <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
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
              className="relative z-modal-above w-full max-w-[480px] bg-white/90 backdrop-blur-2xl border border-white rounded-[32px] p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center"
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
      <Suspense fallback={null}>
        <UserProfileModal isOpen={showUserProfile} onClose={() => setShowUserProfile(false)} />
      </Suspense>
    </div>
  );
}
