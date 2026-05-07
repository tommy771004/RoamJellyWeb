import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import HomeTab from './components/HomeTab';
import ItineraryTab from './components/ItineraryTab';
import ToolsTab from './components/ToolsTab';
import RedirectModal from './components/RedirectModal';
import BottomTabs, { TABS } from './components/BottomTabs';
import LoginScreen from './components/LoginScreen';
import TripLandingPage from './components/TripLandingPage';
import { useAppStore } from './store/useAppStore';
import { useSearchStore } from './store/useSearchStore';
import { trackClickOut, getStoredToken, ensureClientAccessToken } from './lib/workflowApi';

/** Extract /trip/:tripId from the current URL path, null if no match. */
function getTripLandingId(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/trip\/([^/]+)$/);
  return match?.[1] ?? null;
}

export default function App() {
  const { activeTab, setActiveTab, redirectModal, closeRedirectModal, userId, toastMessage, showToast, setAuthenticated } =
    useAppStore();
  const { loadPreferences } = useSearchStore();

  // Detect trip landing URL once on mount (before any auth check)
  const [tripLandingId] = useState<string | null>(getTripLandingId);

  // Auth state
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      let token = getStoredToken();
      // Auto-login for dev: if VITE_DEV_AUTO_LOGIN is not explicitly false,
      // fetch a dev token on startup so login screen is skipped.
      if (!token) {
        const autoLogin =
          (import.meta as any).env?.VITE_DEV_AUTO_LOGIN ?? 'true';
        if (autoLogin.trim().toLowerCase() !== 'false' && (import.meta as any).env.MODE !== 'production') {
          token = await ensureClientAccessToken().catch(() => '');
        }
      }
      if (token) {
        setIsLoggedIn(true);
        void loadPreferences();
      }
      setAuthReady(true);
    };
    void bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setShowLogin(false);
  }, [activeTab]);

  const handleLogin = (loggedInUserId: string) => {
    setAuthenticated(loggedInUserId);
    setIsLoggedIn(true);
    setShowLogin(false);
    void loadPreferences();
  };

  const handleLogout = () => {
    localStorage.removeItem('amadeus_token_data');
    setAuthenticated(null);
    setIsLoggedIn(false);
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
    });

    if (typeof window !== 'undefined' && current.affiliateUrl) {
      const newWindow = window.open(current.affiliateUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        showToast(`彈窗被封鎖，請點此開啟：${current.affiliateUrl}`);
        return;
      }
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
    if (activeTab === 'itinerary') {
      return <ItineraryTab />;
    }
    if (activeTab === 'tools') {
      return <ToolsTab />;
    }
    return <HomeTab />;
  };

  return (
    <div className="flex-1 jelly-bg w-full h-full flex flex-col min-h-[100dvh] relative overflow-hidden font-body-md text-slate-800">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/30 backdrop-blur-[25px] rounded-b-[40px] border-b border-l border-white/50 shadow-[inset_0_2px_10px_rgba(255,255,255,0.8)]">
        <div 
          onClick={() => {
            if (!isLoggedIn) {
              setShowLogin(true);
            } else {
              setShowLogoutModal(true);
            }
          }}
          className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/60 shadow-[0_2px_8px_rgba(134,77,97,0.15)] flex items-center justify-center bg-pink-100 pb-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 z-20"
        >
          <span className="text-xl pt-1">🐴</span>
        </div>
        
        {/* Desktop Navigation (Center, hidden on mobile) */}
        <nav className="hidden md:flex flex-row items-center justify-center gap-2 absolute left-1/2 -translate-x-1/2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

        <h1 className="text-2xl font-black text-pink-500 italic tracking-tight font-plus-jakarta md:hidden z-20">RoamJelly</h1>
        
        <div className="flex items-center gap-4 z-20">
          <h1 className="hidden md:block text-2xl font-black text-pink-500 italic tracking-tight font-plus-jakarta pr-2">RoamJelly</h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 jelly-button text-pink-400">
            <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
          </button>
        </div>
      </header>
      
      <div className="flex-1 relative z-10 w-full overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={!isLoggedIn && activeTab !== 'home' ? 'login' : activeTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', bounce: 0.18, duration: 0.38 }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            className="pt-[80px]"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomTabs />

      <AnimatePresence>
        {redirectModal.isOpen && (
          <RedirectModal
            provider={redirectModal.provider}
            onClose={closeRedirectModal}
            onConfirm={() => void handleRedirectConfirm()}
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
              className="relative w-full max-w-sm bg-white/90 backdrop-blur-2xl border border-white rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl mb-4 border border-white shadow-inner animate-pulse">
                🐴
              </div>
              <h3 className="font-h2 text-xl text-slate-800 mb-2">準備要休息一會嗎？</h3>
              <p className="font-body-md text-slate-500 mb-6 px-4">雖然很捨不得您離開，但 RoamJelly 會一直在這裡等您回來探索世界。</p>
              
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
                >
                  再待一下
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-bold transition-colors shadow-md shadow-orange-500/30"
                >
                  確認登出
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toastMessage ? (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-800/90 py-3 px-6 rounded-full shadow-2xl z-50">
          <span className="text-white font-bold">{toastMessage}</span>
        </div>
      ) : null}
    </div>
  );
}
