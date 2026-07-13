import React from 'react';
import { AppProvider, useApp } from './AppContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import AuthPage from './AuthPage';
import TradesView from './components/TradesView';
import ShopView from './components/ShopView';
import RulesView from './components/RulesView';
import ProfileView from './components/ProfileView';
import Leaderboard from './components/Leaderboard';
import EconomicCalendar from './components/EconomicCalendar';
import TerminalsHub from './components/TerminalsHub';
import WebTerminal from './components/WebTerminal';
import MarketView from './components/MarketView';
import MyChallengesView from './components/MyChallengesView';
import CompetitionView from './components/CompetitionView';
import PayoutsView from './components/PayoutsView';
import ReferralView from './components/ReferralView';
import EducatorsView from './components/EducatorsView';
import ForcedRegistrationModal from './components/ForcedRegistrationModal';
import SocialProofToast from './components/SocialProofToast';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, isAuthReady, activeView, setActiveView, packages, generateTradingAccount, addNotification, processReferral, incrementPromoUsage, firestoreQuotaExceeded } = useApp();

  React.useEffect(() => {
    console.log("AppContent effect: user=", user, "isAuthReady=", isAuthReady, "queryParams=", window.location.search);
    if (!isAuthReady) return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const status = urlParams.get('status');
    const referredBy = urlParams.get('ref');

    if (referredBy) {
      sessionStorage.setItem('referredBy', referredBy);
    }

    console.log("Checking session:", sessionId, status);

    if (sessionId && status === 'success') {
      if (!user) {
        console.warn("User not logged in, cannot verify checkout.");
        return;
      }
      // Clear URL to prevent re-running
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const verifyCheckout = async () => {
        try {
          console.log("Verifying checkout...");
          const res = await fetch('/api/verify-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const data = await res.json();
          console.log("Verification result:", data);
          if (data.paid && data.packageId) {
            const pkg = packages.find(p => p.id === data.packageId);
            if (pkg) {
              await generateTradingAccount(pkg, data.platform || 'DX', 'evaluation');
              
              if (data.discountCode) {
                await incrementPromoUsage(data.discountCode);
              }

              const storedRef = sessionStorage.getItem('referredBy');
              if (storedRef) {
                await processReferral(storedRef, user.name, pkg.id);
                sessionStorage.removeItem('referredBy');
              }

              addNotification({
                title: "Purchase Successful",
                message: `Your ${pkg.name} challenge account is ready!`,
                type: "success",
                link: '/challenges'
              });
              setActiveView('challenges');
            }
          } else {
            addNotification({
              title: "Verification Failed",
              message: "We couldn't verify your purchase payment.",
              type: "alert"
            });
          }
        } catch (e: any) {
          console.error("Verification error:", e);
          addNotification({
            title: "Verification Error",
            message: e.message,
            type: "alert"
          });
        }
      };
      
      verifyCheckout();
    }
  }, [user, isAuthReady, packages, generateTradingAccount, addNotification, setActiveView]);

  if (!user) {
    return <AuthPage />;
  }

  if (activeView === 'web-terminal') {
    return (
      <div className="w-screen h-screen bg-[#020617] text-slate-200 overflow-hidden select-none relative font-sans">
        <WebTerminal />
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'challenges': return <MyChallengesView />;
      case 'admin': return <AdminPanel />;
      case 'trades': return <TradesView />;
      case 'shop': return <ShopView />;
      case 'rules': return <RulesView />;
      case 'profile': return <ProfileView />;
      case 'leaderboard': return <Leaderboard />;
      case 'calendar': return <EconomicCalendar />;
      case 'terminals': return <TerminalsHub />;
      case 'market': return <MarketView />;
      case 'competition': return <CompetitionView />;
      case 'payouts': return <PayoutsView />;
      case 'referral': return <ReferralView />;
      case 'educators': return <EducatorsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-200">
      {/* Dynamic Background Elements - 3D Violet Lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#020617]">
        {/* Core Violet Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vh] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15)_0%,transparent_60%)] opacity-80" />
        
        {/* Ambient violet/purple spheres */}
        <div className="absolute top-[-20%] left-[10%] w-[60%] h-[60%] rounded-full bg-violet-600/15 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/15 blur-[130px]" />
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.95)_100%)] opacity-80" />
        
        {/* Animated Grid Lines */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col relative z-[80]">
        <Navbar />
        {firestoreQuotaExceeded && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 px-4 py-2.5 text-xs flex justify-between items-center z-[100] gap-4 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>
                <strong>Warning:</strong> The free tier quota for the Firestore database has been exceeded for today. The application is running in asynchronous mode, but some real-time updates might be limited until tomorrow's reset.
              </span>
            </div>
            <a 
              href="https://console.firebase.google.com/project/gen-lang-client-0733629717/firestore/databases/ai-studio-3ac2adee-3d3f-4054-9b45-d756e65c02be/data?openUpgradeDialog=true" 
              target="_blank" 
              rel="noreferrer"
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold rounded-lg transition-all flex-shrink-0 tracking-wide uppercase text-[10px]"
            >
              Configure / Upgrade in Firebase
            </a>
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <ForcedRegistrationModal />
      <SocialProofToast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
