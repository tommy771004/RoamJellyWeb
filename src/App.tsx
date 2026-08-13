import { SPRING_SNAPPY, SPRING_MODAL } from './lib/motionTokens';
import { useState, useEffect, useRef, lazy, Suspense, type ComponentType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
const HomeTab = lazy(() => import('./components/HomeTab'));
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
import { trackClickOut, getStoredToken, setClientAccessToken, ensureClientAccessToken, geocodeSpot, geocodeSpotWithAI, getNativeMapUrl, createGuestSession, clearClientSession, fetchDirections, createTrip, fetchItinerary } from './lib/workflowApi';
import { suggestItineraryWithForm } from './lib/openrouterApi';
import { startItineraryAiJob, waitForAiJob, type AiJobState } from './lib/aiJobApi';
import { haversineKm, estimateTransport, formatMinutes } from './lib/geoUtils';
import { getCategoryMeta } from './lib/itineraryUtils';
import { JellyToast } from './components/JellyToast';
import { useTranslation } from 'react-i18next';
import { logoutAppSession, refreshAppSession } from './features/auth/authClient';
type LoginPromptMode = 'default' | 'guest-first';

const AUTO_GUEST_TABS = new Set(['ai_form', 'itinerary', 'tools']);
const AI_ASYNC_JOB_ENABLED = import.meta.env.VITE_AI_ASYNC_JOB_ENABLED === 'true';

/** Extract /trip/:tripId from the current URL path, null if no match. */
function getTripLandingId(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/trip\/([^/]+)$/);
  return match?.[1] ?? null;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const {
    activeTab, setActiveTab,
    redirectModal, closeRedirectModal,
    userId, toasts, removeToast, showToast, setAuthenticated,
    activeTripId, setActiveTripId,
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

  useEffect(() => {
    const handleOpenLogin = () => {
      setLoginPromptMode('default');
      setShowLogin(true);
    };
    window.addEventListener('open-login', handleOpenLogin);
    return () => window.removeEventListener('open-login', handleOpenLogin);
  }, []);

  // Detect trip landing URL once on mount (before any auth check)
  const [tripLandingId] = useState<string | null>(getTripLandingId);

  // Auth state
  const [authReady, setAuthReady] = useState(false);
  const [showLogin, setShowLogin] = useState(
    () => typeof window !== 'undefined' && ['/auth/callback', '/forgot-password', '/reset-password'].includes(window.location.pathname),
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newAiJobState, setNewAiJobState] = useState<AiJobState | 'preparing' | 'sync-fallback' | null>(null);
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
        showToast(t('guest_session_expired'));
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
    let cancelled = false;
    const restore = async () => {
      const storedUserId = localStorage.getItem('user_id');
      const storedLastActivity = localStorage.getItem('last_activity');
      const storedToken = getStoredToken();
      const now = Date.now();
      if (storedUserId && storedLastActivity && storedToken
        && now - parseInt(storedLastActivity, 10) < SESSION_TIMEOUT) {
        if (!cancelled) setAuthenticated(storedUserId);
      } else {
        const session = await refreshAppSession();
        const token = session?.accessToken || session?.access_token;
        if (session?.user?.id && token) {
          setClientAccessToken(token);
          localStorage.setItem('user_id', session.user.id);
          localStorage.setItem('last_activity', now.toString());
          if (!cancelled) setAuthenticated(session.user.id);
        } else {
          clearClientSession();
        }
      }
      if (!cancelled) setAuthReady(true);
    };
    void restore();
    const match = typeof window !== 'undefined' ? window.location.pathname.match(/^\/trips\/([^\/]+)$/) : null;
    if (match) {
      setActiveTripId(match[1]);
      setActiveTab('itinerary');
    }
    const handleLoginRequest = () => {
      setLoginPromptMode('default');
      setShowLogin(true);
    };
    window.addEventListener('request-login', handleLoginRequest);
    return () => { cancelled = true; window.removeEventListener('request-login', handleLoginRequest); };
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
    if (typeof window === 'undefined' || !['/auth/callback', '/forgot-password', '/reset-password'].includes(window.location.pathname)) {
      setShowLogin(false);
    }
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
    void logoutAppSession();
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

    showToast(t('redirected_to', { provider: current.provider }));
  };

  const getGuestLoginCopy = (tab: typeof activeTab) => {
    switch (tab) {
      case 'tools':
        return {
          contextLabel: t('tool_kit_context'),
          title: t('tool_kit_title'),
          description: t('tool_kit_desc'),
          guestCtaLabel: t('tool_kit_cta'),
        };
      case 'itinerary':
        return {
          contextLabel: t('itinerary_context'),
          title: t('itinerary_title'),
          description: t('itinerary_desc'),
          guestCtaLabel: t('itinerary_cta'),
        };
      case 'ai_form':
        return {
          contextLabel: t('ai_context'),
          title: t('ai_title'),
          description: t('ai_desc'),
          guestCtaLabel: t('ai_cta'),
        };
      default:
        return {
          contextLabel: t('quick_context'),
          title: t('quick_title'),
          description: t('quick_desc'),
          guestCtaLabel: t('quick_cta'),
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
              {t('creating_guest_entry')}
            </h2>
            <p className="mt-3 text-pretty text-sm font-bold leading-6 text-slate-600 sm:text-base sm:leading-7">
              {bootstrapCopy.description}
            </p>
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-sm">
                  <PlaneTakeoff size={18} strokeWidth={2.5} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {bootstrapCopy.contextLabel}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {t('guest_entry_desc')}
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
        return <AiLoadingState jobState={newAiJobState} />;
      }
      return <AiForm onSubmit={async (data) => {
        setNewAiJobState('preparing');
        setIsGenerating(true);
        showToast(t('generating_journey', { destination: data.destination }));
        try {
          const planner = {
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
            pace: data.pace,
            accommodation: data.accommodation,
          };

          let suggestions: any;
          let generatedTripId = '';
          let persistedByAsyncJob = false;

          if (AI_ASYNC_JOB_ENABLED) {
            try {
              const draftTrip = await createTrip({
                name: `${data.destination} ${t('travel_itinerary')}`,
                destination: data.destination,
              });
              generatedTripId = String(draftTrip?.data?.id || draftTrip?.id || '');
              if (!generatedTripId) throw new Error('AI_DRAFT_TRIP_ID_MISSING');

              const startedJob = await startItineraryAiJob({
                tripId: generatedTripId,
                destination: data.destination,
                planner,
                aiMode: { mode: 'overwrite_all' },
              });
              setNewAiJobState(startedJob.status);
              const completedJob = await waitForAiJob(startedJob.jobId, {
                timeoutMs: 10 * 60_000,
                onStatus: (job) => setNewAiJobState(job.status),
              });
              setNewAiJobState('completed');
              suggestions = completedJob.result;
              if (!suggestions?.itinerary) throw new Error('AI_ASYNC_RESULT_MISSING');
              persistedByAsyncJob = true;
              setActiveTripId(generatedTripId);
            } catch (asyncError) {
              console.warn('[AI Job] New-trip async generation unavailable, using synchronous rollback path.', asyncError);
              setNewAiJobState('sync-fallback');
              showToast(t('ai_job.sync_fallback_notice'), 'warning');
              suggestions = await suggestItineraryWithForm({
                destination: data.destination,
                planner,
              });
              if (generatedTripId) setActiveTripId(generatedTripId);
            }
          } else {
            suggestions = await suggestItineraryWithForm({
              destination: data.destination,
              planner,
            });
          }

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
                     title: String(spot.name || spot.title || t('default_spot')),
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
                title: String(spot.name || spot.title || t('default_spot')),
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

          // AI Fallback Loop for blank coordinates inside App.tsx
          const aiGeocodePromises = nodes.map(async (n) => {
            if (!n.lat || !n.lng) {
              try {
                const aiCoords = await geocodeSpotWithAI(n.title, data.destination);
                if (aiCoords) {
                  n.lat = aiCoords.lat;
                  n.lng = aiCoords.lng;
                  console.log(`[AI Fallback Geocode App] Resolved "${n.title}" in "${data.destination}" to: ${aiCoords.lat}, ${aiCoords.lng}`);
                }
              } catch (err) {
                console.warn(`[AI Fallback Geocode App] Failed for "${n.title}":`, err);
              }
            }
          });
          await Promise.allSettled(aiGeocodePromises);

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
                 title: t('free_time'),
                 emoji: '🏖️',
                 category: 'activity',
                 description: t('free_time_desc'),
                 ai_note: t('free_time_desc'),
                 intensity: 'chill',
                 source: 'local'
              } as any);
            }
            finalNodes = assignDaysBasedOnTimeAndOrder(finalNodes, startDate.toISOString());
          }

          // Loop to calculate the distance and estimate/fetch transport times (transport_to_next) before outputting
          const transportPromises = [];
          for (let i = 0; i < finalNodes.length - 1; i++) {
            const curr = finalNodes[i];
            const next = finalNodes[i + 1];
            if (
              curr.day === next.day &&
              curr.lat != null &&
              curr.lng != null &&
              next.lat != null &&
              next.lng != null
            ) {
              const lat1 = curr.lat;
              const lng1 = curr.lng;
              const lat2 = next.lat;
              const lng2 = next.lng;
              const km = haversineKm(lat1, lng1, lat2, lng2);

              if (km > 0 && !curr.transport_to_next) {
                const promise = fetchDirections(lng1, lat1, lng2, lat2)
                  .then((apiDuration) => {
                    if (apiDuration && km > 1) {
                      curr.transport_to_next = t('drive_time', { duration: formatMinutes(apiDuration) });
                    } else {
                      const est = estimateTransport(km);
                      curr.transport_to_next = est.label;
                    }
                  })
                  .catch(() => {
                    const est = estimateTransport(km);
                    curr.transport_to_next = est.label;
                  });
                transportPromises.push(promise);
              }
            }
          }
          if (transportPromises.length > 0) {
            await Promise.allSettled(transportPromises);
          }

          useAppStore.getState().setAiResult({
             fullResponse: suggestions,
             title: suggestions?.summary?.title || data.destination || t('itinerary_planning'),
             destination: data.destination,
             rawSuggestions: finalNodes,
             persistedByAsyncJob,
             generatedTripId,
          });
          setActiveTab('ai_result');
        } catch (e) {
          showToast(t('generate_failed'), 'warning');
        } finally {
          setIsGenerating(false);
          setNewAiJobState(null);
        }
      }} />;
    }
    if (activeTab === 'ai_result') {
      const { aiResult } = useAppStore.getState();
      return <DynamicItineraryView 
        result={aiResult} 
        onBack={() => setActiveTab('ai_form')} 
        onSave={async (result) => {
          showToast(t('saving_itinerary'), 'info');
          
          try {
            const { useItineraryStore } = await import('./store/useItineraryStore');
            const { useAppStore } = await import('./store/useAppStore');
            const { syncItinerary, createTrip, ensureClientAccessToken } = await import('./lib/workflowApi');
            
            // Ensure we have a token before doing operations
            await ensureClientAccessToken().catch(() => null);
            
            const { setNodes, addNode } = useItineraryStore.getState();
            const { activeTripId, setActiveTripId } = useAppStore.getState();

            if (result.persistedByAsyncJob && result.generatedTripId) {
              const persistedNodes = await fetchItinerary(result.generatedTripId);
              if (!Array.isArray(persistedNodes) || persistedNodes.length === 0) {
                throw new Error('ASYNC_ITINERARY_RELOAD_EMPTY');
              }
              setNodes(persistedNodes);
              setActiveTripId(result.generatedTripId);
              showToast(t('itinerary_ready'), 'success');
              setActiveTab('itinerary');
              return;
            }

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
                name: result.title || t('planned_trip'),
                destination: result.destination || result.title || t('travel_itinerary')
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
                  const res = await syncItinerary({ trip_id: TRIP_ID, action: 'add_node', payload: node });
                  // wait a bit between requests to avoid connection pooling issues
                  await new Promise(r => setTimeout(r, 50));
                  return res;
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
             showToast(t('save_failed'), 'warning');
             return;
          }

          showToast(t('itinerary_ready'), 'success');
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
    <div className="dark-transition flex-1 jelly-bg w-full h-full flex flex-col relative overflow-hidden font-body-md text-slate-800 dark:text-slate-100">
      <div className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-500 bg-gradient-to-br from-[#030712] via-[#090b18] to-[#0f172a] ${isDarkMode ? 'opacity-[0.93]' : 'opacity-0'}`} />
      <div className="noise-overlay absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20 transition-opacity duration-500" />
      {/* Dev Mode Switches (Top Left outside Header, absolute for dev) */}
      {(import.meta as any).env.MODE !== 'production' && (
        <div className="fixed top-2 left-2 z-floating flex items-center gap-2 scale-75 origin-top-left opacity-30 hover:opacity-100 transition-opacity bg-white/50 p-2 rounded-xl backdrop-blur-md">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
            <input type="checkbox" checked={isOffline} onChange={e => setOffline(e.target.checked)} className="accent-red-500" />
            {t('offline')}
          </label>
        </div>
      )}

      {/* TopAppBar */}
      <header className={`fixed top-0 w-full z-50 px-3 sm:px-6 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-2 sm:pb-4 flex justify-between items-center jelly-surface !rounded-none !border-x-0 !border-t-0 !shadow-sm transition-transform duration-500 transform-gpu ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        {/* Left: Logo */}
        <div className="flex items-center gap-2 z-20 hover:animate-none">
          <img src="/icon-app.svg" alt="" className="h-10 w-10 rounded-[11px] sm:h-11 sm:w-11" />
          <h1 className="text-primary dark:text-accent text-[22px] sm:text-3xl font-black italic tracking-tighter font-heading pr-2">RoamJelly</h1>
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
                className={`flex min-h-11 flex-row items-center gap-2 px-4 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 ${
                  isActive 
                    ? 'font-black text-[#9a452e] dark:text-[#d59a85]' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#26342d] dark:hover:text-white'
                }`}
              >
                {Icon && <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'opacity-100' : 'opacity-60'} />}
                <span className="font-bold text-sm tracking-wide">{t(`tab_${tab.id}`)}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: User Avatar & Greetings */}
        <div className="flex items-center gap-2 sm:gap-3 z-20">
          {isLoggedIn && (
            <button
              onClick={() => setShowUserProfile(true)}
              className="hidden h-11 w-11 items-center justify-center text-[#8a4935] transition-colors hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 dark:text-[#d59a85] sm:flex"
              aria-label={t('preferences')}
            >
              <Settings2 size={20} />
            </button>
          )}
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'zh' : 'en')}
            className="flex h-11 w-11 items-center justify-center text-sm font-bold text-[#6b756e] transition-colors hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 dark:text-[#c8d2cb] dark:hover:text-white"
            aria-label={t('language_toggle_label')}
          >
            {t('language_toggle')}
          </button>
          <button
            onClick={() => setDarkMode(!isDarkMode)}
            className="flex h-11 w-11 items-center justify-center text-[#8a4935] transition-colors hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 dark:text-[#d59a85] dark:hover:text-white"
            aria-label={isDarkMode ? t('switch_light_mode') : t('switch_dark_mode')}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="relative flex h-11 w-11 items-center justify-center text-[#8a4935] transition-colors hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 dark:text-[#d59a85] dark:hover:text-white"
              aria-label={t('notifications')}
              aria-expanded={showNotifications}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white shadow-sm" />
              )}
            </button>
            {showNotifications && (
              <div
                className="absolute right-0 top-12 w-72 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 z-50 overflow-hidden"
                role="dialog"
                aria-label={t('notifications_panel')}
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-[14px] text-slate-700">{t('notifications')}</span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >{t('clear_all')}</button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 text-[18px] leading-none"
                      aria-label="{t('close')}"
                    >×</button>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
                    <span className="text-3xl">🔔</span>
                    <p className="text-[13px] text-slate-400 text-center font-medium">{t('no_new_notifications')}</p>
                    <p className="text-[11px] text-slate-300 text-center">{t('notifications_desc')}</p>
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
              aria-label={t('account_menu')}
              onClick={() => setShowUserMenu(v => !v)}
              className="group flex min-h-11 items-center gap-2 px-2 text-[#59665e] transition-colors hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 dark:text-[#c8d2cb] dark:hover:text-white"
            >
              <span className="hidden whitespace-nowrap pl-1 text-[13px] font-black tracking-wide sm:block">
                {isLoggedIn ? t('hello_user', { userId }) : t('not_logged_in')}
              </span>
              <div className="relative flex h-11 w-11 items-center justify-center text-[#8a4935] dark:text-[#d59a85]">
                {isLoggedIn ? <UserRound size={17} strokeWidth={2.4} /> : <SparklesIcon size={16} strokeWidth={2.4} />}
              </div>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-40 bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col py-1">
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
                    <span className="text-[14px] font-bold text-slate-700">{t('login_account')}</span>
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
                      <span className="text-[14px] font-bold text-slate-700">{t('ai_preferences')}</span>
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
                      <span className="text-[13px] font-bold text-rose-600 group-hover:text-rose-700 transition-colors">{t('logout_account')}</span>
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
            <div className="max-w-2xl mx-auto bg-red-500/80 dark:bg-red-900/80 backdrop-blur-md rounded-3xl p-2.5 shadow-lg border border-red-400/50 dark:border-red-500/30 flex items-center justify-center gap-2 pointer-events-auto">
              <span className="text-white text-[13px] font-bold tracking-wide">{t("offline_mode_msg")}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex-1 relative z-10 w-full overflow-hidden flex flex-col">
        <AnimatePresence mode="wait" custom={tabSlideDir}>
          <motion.div
            key={isAuthSurfaceVisible ? `login-${activeTab}` : (activeTab === 'ai_form' && isGenerating) ? 'ai_form_loading' : activeTab}
            custom={tabSlideDir}
            variants={{
              // No opacity in `enter`: this wrapper holds every tab, and on first
              // mount `initial="enter"` would start the whole app transparent. A
              // hidden tab throttles rAF, so it can be stranded there and render
              // blank. The outgoing tab still fades via `exit`; the incoming one
              // slides and scales in, which reads the same but can never hide content.
              enter: (dir: number) => prefersReducedMotion ? ({}) : ({ scale: 0.984, x: dir * 24 }),
              center: { opacity: 1, scale: 1, x: 0 },
              exit: { opacity: 0, transition: { duration: 0.15, ease: "easeOut" } },
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0.16 } : SPRING_SNAPPY}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
            className="w-full pt-[calc(56px+env(safe-area-inset-top,0px))] sm:pt-[calc(80px+env(safe-area-inset-top,0px))] pb-0"
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
        {showLogin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-2 sm:p-4 backdrop-blur-sm shadow-2xl"
          >
            <div className="w-full max-w-[420px] max-h-full overflow-y-auto rounded-[32px] bg-white shadow-xl no-scrollbar overflow-hidden relative">
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
                {...(loginPromptMode === 'guest-first' ? getGuestLoginCopy(activeTab) : {})}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              showToast(!isSaved ? t('saved_flight') : t('removed_flight'));
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
              className="absolute inset-0 modal-backdrop"
              onClick={() => setShowLogoutModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={SPRING_MODAL}
              className="relative z-modal-above w-full max-w-[480px] bg-white/90 backdrop-blur-2xl border border-white rounded-[32px] p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl mb-4 border border-white shadow-inner animate-pulse shrink-0">
                🐴
              </div>
              <h3 className="font-h2 text-2xl text-slate-800 mb-2">{t('rest_awhile')}</h3>
              <p className="font-body-md text-slate-500 mb-8 px-2 sm:px-6">{t('rest_desc')}</p>
              
              <div className="flex flex-row w-full gap-3 sm:gap-4">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 sm:py-3.5 px-2 sm:px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors whitespace-nowrap text-[15px]"
                >
                  {t('stay_longer')}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 sm:py-3.5 px-2 sm:px-4 rounded-full bg-gradient-to-r from-orange-700 to-amber-700 hover:opacity-90 text-white font-bold transition-colors shadow-md shadow-orange-500/30 whitespace-nowrap text-[15px]"
                >
                  {t('confirm_logout')}
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
