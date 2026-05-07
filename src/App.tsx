import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import HomeTab from './components/HomeTab';
import ItineraryTab from './components/ItineraryTab';
import ToolsTab from './components/ToolsTab';
import RedirectModal from './components/RedirectModal';
import BottomTabs from './components/BottomTabs';
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
    void loadPreferences();
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
    <div className="flex-1 bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100 w-full h-full flex flex-col min-h-screen">
      <div className="flex-1 pb-24 relative z-10 w-full overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={!isLoggedIn && activeTab !== 'home' ? 'login' : activeTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', bounce: 0.18, duration: 0.38 }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
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
      </AnimatePresence>

      {toastMessage ? (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-800/90 py-3 px-6 rounded-full shadow-2xl z-50">
          <span className="text-white font-bold">{toastMessage}</span>
        </div>
      ) : null}
    </div>
  );
}
