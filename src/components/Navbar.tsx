import React, { useState, useEffect } from 'react';
import { Bell, User, Menu, X, LogOut, CheckCircle, Zap, ShieldAlert, Key, Award, Lightbulb, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useApp, AppView } from '../AppContext';
import { motion, AnimatePresence } from 'motion/react';
import CertificateModal from './CertificateModal';
import { TradingAccount, Certificate } from '../types';

const TRADING_TIPS = [
  "Greed and fear are a trader's worst enemies. Stay rational.",
  "Always protect your capital. Risk management is key.",
  "Avoid FOMO: there will always be another trading setup.",
  "Keep your losses small. Cut losing trades quickly.",
  "Check the economic calendar; high-impact news causes slippage.",
  "Plan your trade and trade your plan. Consistency is key.",
  "Don't overtrade. Sometimes the best trade is no trade.",
  "Respect the 45% consistency rule: distribute your profits.",
  "Never risk more than 1-2% of your equity on a single setup.",
  "Let winners run, but manage your trailing stops wisely.",
  "Never trade when you are tired, frustrated, or emotional.",
  "Analyze your losing trades to learn where you can improve.",
  "Keep a trading journal to build professional trading habits.",
  "Understand market structure: always trade with the trend.",
  "Watch your daily drawdown limit carefully to preserve capital.",
  "Avoid revenge trading. Step away from the screen after a loss.",
  "Patience is a premium skill. Wait for your exact criteria.",
  "Do not assume a market is too high to buy or too low to sell.",
  "Focus on your execution process, not the monetary outcome.",
  "Markets evolve continuously. Keep learning and adapt daily.",
  "The market transfers wealth from the impatient to the patient.",
  "Every trade must have a clear exit plan before execution."
];

export default function Navbar() {
  const { user, notifications, markNotifAsRead, activeView, setActiveView, setMobileMenuOpen, logout } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeCert, setActiveCert] = useState<{account: TradingAccount, cert: Certificate} | null>(null);

  const [tipIndex, setTipIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TRADING_TIPS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrevTip = () => {
    setTipIndex((prev) => (prev - 1 + TRADING_TIPS.length) % TRADING_TIPS.length);
  };

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % TRADING_TIPS.length);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) return null;

  return (
    <>
    <nav className="h-20 border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-[100]">
      <div className="flex items-center gap-4 lg:hidden">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="hidden md:flex flex-1 max-w-2xl lg:max-w-3xl xl:max-w-4xl md:mx-6 lg:mx-8 relative">
        <div 
          className="w-full bg-[#090d1f]/30 border border-white/5 rounded-xl h-11 px-3.5 flex items-center justify-between gap-3 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.01),_0_4px_12px_rgba(0,0,0,0.2)] relative group transition-all duration-300 hover:border-violet-500/15 hover:shadow-[0_0_15px_rgba(139,92,246,0.03)]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex items-center gap-1 shrink-0 bg-violet-500/5 text-violet-400/90 px-2 py-0.5 rounded border border-violet-500/10 text-[10px] font-bold uppercase tracking-wider select-none">
              <Lightbulb size={11} className="animate-pulse text-violet-400" />
              <span>Pro Tip</span>
            </div>
            
            <div className="flex-1 relative h-5 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tipIndex}
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -15, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="absolute inset-0 text-xs text-slate-300 font-medium truncate flex items-center pr-8 select-none"
                >
                  {TRADING_TIPS[tipIndex]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation Controls (fades in on hover) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevTip();
              }}
              className="p-1 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Previous Tip"
            >
              <ChevronLeft size={11} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextTip();
              }}
              className="p-1 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Next Tip"
            >
              <ChevronRight size={11} />
            </button>
          </div>

          {/* Progress bar at the bottom */}
          <div className="absolute bottom-0 left-0 h-[2px] bg-white/[0.02] w-full overflow-hidden">
            <motion.div 
              key={`${tipIndex}-${isPaused}`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={isPaused ? { duration: 0 } : { duration: 10, ease: "linear" }}
              className="h-full bg-violet-500/40 shadow-[0_0_8px_rgba(139,92,246,0.2)]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="p-2.5 rounded-[14px] bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all relative group"
          >
            <Bell size={20} className="group-active:scale-90 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-azure border-2 border-[#020617] rounded-full animate-pulse" />
            )}
          </button>

          <AnimatePresence>
             {notifOpen && (
               <>
                 <div className="fixed inset-0 z-[110]" onClick={() => setNotifOpen(false)} />
                 <motion.div 
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   className="absolute right-0 mt-4 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl p-4 z-[120] max-h-[500px] overflow-y-auto scrollbar-hide"
                 >
                    <div className="flex items-center justify-between mb-4 px-2">
                       <h3 className="text-xs font-bold text-white uppercase tracking-widest">Protocol Alerts</h3>
                       {unreadCount > 0 && <span className="text-[10px] text-azure font-bold leading-none">{unreadCount} New</span>}
                    </div>
                    
                    <div className="space-y-2">
                       {notifications.length > 0 ? notifications.map((n) => (
                         <div 
                           key={n.id} 
                           onClick={() => {
                             markNotifAsRead(n.id);
                             setNotifOpen(false);
                             if (n.link) {
                                let view = n.link;
                                if (view.startsWith('/')) {
                                  view = view.substring(1);
                                }
                                console.log("Setting active view to:", view);
                                setActiveView(view as AppView);
                                setNotifOpen(false);
                            } else if (n.data?.openCertificate) {
                                setNotifOpen(false);
                                const acc = user.tradingAccounts?.find(a => a.id === n.data.accountId);
                                const cert = acc?.certificates?.find(c => c.id === n.data.certificateId);
                                if (acc && cert) {
                                  setActiveCert({ account: acc, cert });
                                } else if (acc) {
                                  setActiveView('challenges');
                                }
                            } else if (n.type === 'credential') {
                               // Simulate redirect to credentials or show them
                               setNotifOpen(false);
                               alert(`ACCOUNT PROVISIONED\n\nLogin: trader_${n.id.slice(0,5)}\nPass: institutional_fundedgoo_2024\n\nRedirecting to secure terminal...`);
                             }
                           }}
                           className={`p-4 rounded-2xl border transition-all cursor-pointer ${n.read ? 'bg-transparent border-transparent opacity-50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                         >
                            <div className="flex gap-3">
                               <div className={`p-2 rounded-xl h-fit ${n.type === 'success' ? 'bg-green-500/10 text-green-400' : n.type === 'credential' ? 'bg-azure/10 text-azure' : 'bg-white/10 text-white'}`}>
                                  {n.type === 'credential' ? <Key size={14} /> : n.data?.openCertificate ? <Award size={14} /> : <CheckCircle size={14} />}
                               </div>
                               <div>
                                  <p className="text-xs font-bold text-white mb-1 leading-tight">{n.title}</p>
                                  <p className="text-[10px] text-slate-500 leading-normal">{n.message}</p>
                               </div>
                            </div>
                         </div>
                       )) : (
                         <div className="py-8 text-center text-slate-600 text-xs font-bold uppercase tracking-widest opacity-50">Silence Protocol Active</div>
                       )}
                    </div>
                 </motion.div>
               </>
             )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="relative">
          <button 
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-3 p-1 sm:pr-4 sm:pl-1 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:bg-white/10 group"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-azure p-[2px]">
              <div className="w-full h-full rounded-full border-2 border-[#020617] bg-azure/20 flex items-center justify-center text-azure overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="group-hover:scale-110 transition-transform" />
                )}
              </div>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-white leading-none mb-1 line-clamp-1">{user?.name}</p>
              <p className="text-[10px] font-mono text-azure leading-none">Trader ID</p>
            </div>
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-[110]" onClick={() => setProfileOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-64 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl overflow-hidden p-2 z-[120]"
                >
                  <div className="p-4 border-b border-white/5 mb-1">
                    <p className="text-xs font-bold text-white line-clamp-1 uppercase tracking-widest">{user?.name}</p>
                    <p className="text-[10px] text-slate-500">{user?.email}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <button 
                      onClick={() => {
                        setActiveView('profile');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm group"
                    >
                      <User size={18} className="group-hover:text-azure transition-colors" /> Profiler Settings
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm group">
                      <Zap size={18} className="group-hover:text-toxic-orange transition-colors" /> System Status
                    </button>
                    {user?.role === 'admin' && (
                      <button 
                        onClick={() => {
                          setActiveView('admin');
                          setProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm group"
                      >
                        <ShieldAlert size={18} className="text-azure" /> Admin Terminal
                      </button>
                    )}
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm group font-medium"
                    >
                      <LogOut size={18} /> Signal Logout
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>

    {/* Certificate Modal Overlay */}
    <AnimatePresence>
      {activeCert && (
        <CertificateModal 
          account={activeCert.account} 
          certificate={activeCert.cert} 
          onClose={() => setActiveCert(null)} 
        />
      )}
    </AnimatePresence>
    </>
  );
}
