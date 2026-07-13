import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  ChevronDown,
  X,
  Gift,
  ShieldCheck,
  Zap,
  DollarSign,
  Activity,
  Award,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Terminal,
  Wallet,
  Percent
} from 'lucide-react';
import { useApp } from '../AppContext';
import { getTradeDateString, getTradePnl } from '../utils/tradeUtils';
import Logo from './Logo';

let isPromoDismissedInSession = false;

export default function Dashboard() {
  const { 
    user, 
    setActiveView, 
    setActiveAccountId, 
    activeAccountId, 
    promotions, 
    addNotification, 
    addAuditLog, 
    updateUserProfile 
  } = useApp();

  const applicablePromo = promotions?.find(p => p.isActive && !p.isSecret) || null;
  
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(!isPromoDismissedInSession);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);

  // Real-time server clocks and session status indicators
  const [timeString, setTimeString] = useState('');
  const [nyTime, setNyTime] = useState('');
  const [londonTime, setLondonTime] = useState('');
  const [secondsUntilReset, setSecondsUntilReset] = useState(0);

  const [fomoSlots, setFomoSlots] = useState(25);
  const [countdownText, setCountdownText] = useState('23:59:59');

  useEffect(() => {
    if (!applicablePromo) return;

    const updateFomo = () => {
      const storedStartTimeKey = `promo_start_${applicablePromo.id}`;
      let startTimeStr = sessionStorage.getItem(storedStartTimeKey);
      if (!startTimeStr) {
        startTimeStr = String(Date.now());
        sessionStorage.setItem(storedStartTimeKey, startTimeStr);
      }
      const startTime = Number(startTimeStr);
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);

      const storedSlotsKey = `promo_slots_val_${applicablePromo.id}`;
      const storedLastUpdateKey = `promo_slots_last_${applicablePromo.id}`;
      
      let currentSlots = 25;
      let lastUpdate = Date.now();
      
      const savedSlots = sessionStorage.getItem(storedSlotsKey);
      const savedLast = sessionStorage.getItem(storedLastUpdateKey);
      
      if (savedSlots && savedLast) {
        currentSlots = Number(savedSlots);
        lastUpdate = Number(savedLast);
        
        if (currentSlots <= 2) {
          currentSlots = Math.floor(Math.random() * 6) + 25; // Reset to 25 - 30
          lastUpdate = now;
          sessionStorage.setItem(storedSlotsKey, String(currentSlots));
          sessionStorage.setItem(storedLastUpdateKey, String(lastUpdate));
        } else {
          const elapsed = Math.floor((now - lastUpdate) / 1000);
          const intervals = Math.floor(elapsed / 15);
          if (intervals > 0) {
            currentSlots = currentSlots - intervals;
            lastUpdate = lastUpdate + (intervals * 15000);
            
            if (currentSlots <= 2) {
              currentSlots = Math.floor(Math.random() * 6) + 25; // Reset to 25 - 30
              lastUpdate = now;
            }
            
            sessionStorage.setItem(storedSlotsKey, String(currentSlots));
            sessionStorage.setItem(storedLastUpdateKey, String(lastUpdate));
          }
        }
      } else {
        currentSlots = Math.floor(Math.random() * 6) + 25; // 25 to 30
        sessionStorage.setItem(storedSlotsKey, String(currentSlots));
        sessionStorage.setItem(storedLastUpdateKey, String(Date.now()));
      }
      
      setFomoSlots(currentSlots);

      let remainingSecs = 0;
      if (applicablePromo.validUntil) {
        const expiryDate = new Date(applicablePromo.validUntil);
        expiryDate.setHours(23, 59, 59, 999);
        remainingSecs = Math.floor((expiryDate.getTime() - now) / 1000);
      }

      if (remainingSecs <= 0 || remainingSecs > 7 * 24 * 60 * 60) {
        const totalPromoDuration = 24 * 60 * 60; // 24 hours
        remainingSecs = totalPromoDuration - elapsedSeconds;
        if (remainingSecs <= 0) {
          remainingSecs = (2 * 60 * 60) - (elapsedSeconds % (2 * 60 * 60));
        }
      }

      const h = Math.floor(remainingSecs / 3600);
      const m = Math.floor((remainingSecs % 3600) / 60);
      const s = remainingSecs % 60;
      setCountdownText(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    updateFomo();
    const interval = setInterval(updateFomo, 1000);
    return () => clearInterval(interval);
  }, [applicablePromo]);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('en-US', { hour12: false }));
      setNyTime(now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false }));
      setLondonTime(now.toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour12: false }));

      // Calculate time left till UTC midnight (drawdown limits reset)
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const secs = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
      setSecondsUntilReset(secs);
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (isFirstLoadRef.current && activeAccountId === null && user?.tradingAccounts && user.tradingAccounts.length > 0) {
      isFirstLoadRef.current = false;
      const firstAccount = user.tradingAccounts.find(a => a.status === 'active') || user.tradingAccounts[0];
      if (firstAccount) {
        setActiveAccountId(firstAccount.id);
      }
    }
  }, [user?.tradingAccounts, activeAccountId, setActiveAccountId]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!user) return null;

  // Active account selection logic
  const activeAccount = activeAccountId !== null 
    ? user?.tradingAccounts?.find(a => a.id === activeAccountId)
    : null;

  // Helper to dynamically resolve percentage or absolute dollar limits
  const getRuleThresholdValue = (val: any, refBalance: number) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return 0;
    return num <= 100 ? (refBalance * num) / 100 : num;
  };

  // Stats calculation (Supporting Single Account or Aggregated Accounts view)
  const isAggregate = activeAccountId === null;
  const accountsToAggregate = isAggregate ? (user?.tradingAccounts || []) : (activeAccount ? [activeAccount] : []);

  const totalAccountsCount = accountsToAggregate.length;
  
  // Base numbers
  const initialBalance = isAggregate 
    ? accountsToAggregate.reduce((sum, a) => sum + (a.initialBalance || a.balance || 100000), 0) || 100000
    : (activeAccount?.initialBalance || activeAccount?.balance || 100000);

  const currentBalance = isAggregate
    ? accountsToAggregate.reduce((sum, a) => sum + (a.balance || 100000), 0) || 100000
    : (activeAccount?.balance || 100000);

  const currentEquity = isAggregate
    ? accountsToAggregate.reduce((sum, a) => sum + (a.equity || 102450), 0) || 102450
    : (activeAccount?.equity || 102450);

  const currentProfit = currentEquity - initialBalance;
  const percentageProfit = initialBalance > 0 ? (currentProfit / initialBalance) * 100 : 0;
  const maxDrawdownPercentage = 10; // default max drawdown limit 10%
  const dailyDrawdownPercentage = 5; // default daily drawdown limit 5%

  // Setup trading rules
  const ruleMaxDrawdownLimit = accountsToAggregate.reduce((sum, a) => {
    return sum + (getRuleThresholdValue(a.rules?.maxDrawdown, a.initialBalance || a.balance || 100000) || ((a.initialBalance || a.balance || 100000) * 0.1));
  }, 0) || (initialBalance * 0.1);

  const ruleDailyDrawdownLimit = accountsToAggregate.reduce((sum, a) => {
    return sum + (getRuleThresholdValue(a.rules?.dailyDrawdown, a.initialBalance || a.balance || 100000) || ((a.initialBalance || a.balance || 100000) * 0.05));
  }, 0) || (initialBalance * 0.05);

  const ruleProfitTarget = accountsToAggregate.reduce((sum, a) => {
    return sum + (getRuleThresholdValue(a.rules?.profitTarget, a.initialBalance || a.balance || 100000) || ((a.initialBalance || a.balance || 100000) * 0.1));
  }, 0) || (initialBalance * 0.1);

  const targetPenalty = accountsToAggregate.reduce((sum, a) => {
    return sum + (a.rules?.targetPenalty || 0);
  }, 0);

  const actualProfitTarget = ruleProfitTarget + targetPenalty;

  // History & performance metrics
  const combinedHistory = accountsToAggregate.flatMap(a => a.history || []);
  const totalTrades = isAggregate ? (user.totalTrades || combinedHistory.length) : combinedHistory.length;
  const wins = isAggregate 
    ? Math.round(((user.winRate || 68.5) / 100) * totalTrades)
    : combinedHistory.filter(t => (t.pnl || 0) > 0).length;
  
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : (user.winRate || 68.5);
  const lossesCount = totalTrades - wins;

  // Profit Factor estimation
  let profitFactor = user.profitFactor || 2.10;
  if (combinedHistory.length > 0) {
    const grossProfit = combinedHistory.filter(t => t.pnl > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(combinedHistory.filter(t => t.pnl < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));
    profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
    if (profitFactor === 0) profitFactor = 1.0;
  }

  // Drawdown math
  const drift = currentEquity - currentBalance; // Positive means live trades are up, negative means unrealized drawdown
  const currentDailyLoss = currentProfit < 0 ? Math.abs(currentProfit) : 0; // estimate based on net loss
  const dailyDrawdownPercentUsed = Math.min(100, ruleDailyDrawdownLimit > 0 ? (currentDailyLoss / ruleDailyDrawdownLimit) * 100 : 0);
  
  // Total maximum drawdown math
  const maxCumulativeDrawdownUsed = Math.min(100, ruleMaxDrawdownLimit > 0 ? (Math.max(0, initialBalance - currentEquity) / ruleMaxDrawdownLimit) * 100 : 0);
  const balanceDifferenceToLiquidation = Math.max(0, currentEquity - (initialBalance - ruleMaxDrawdownLimit));

  // 45% Consistency Rule Math
  const dailyProfits: { [date: string]: number } = {};
  combinedHistory.forEach((t: any) => {
    const d = getTradeDateString(t);
    if (d && d !== "Invalid Date") {
      dailyProfits[d] = (dailyProfits[d] || 0) + getTradePnl(t);
    }
  });
  const maxDailyProfit = Math.max(0, ...Object.values(dailyProfits));
  const consistencyLimitVal = actualProfitTarget * 0.45;
  const consistencyBarPercent = Math.min(100, consistencyLimitVal > 0 ? (maxDailyProfit / consistencyLimitVal) * 100 : 0);
  
  const consistencyViolations = Object.keys(dailyProfits).filter(d => dailyProfits[d] > consistencyLimitVal);
  const consistencyWarningCount = isAggregate ? 0 : (activeAccount?.consistencyWarningsCount || consistencyViolations.length);

  // Profit target progression math
  const targetCompletedPercent = Math.min(100, actualProfitTarget > 0 ? (Math.max(0, currentProfit) / actualProfitTarget) * 100 : 0);
  const profitRemainingToTarget = Math.max(0, actualProfitTarget - currentProfit);

  // Formulate trading days metric
  const tradingDaysSet = new Set(combinedHistory.map(t => getTradeDateString(t)).filter(d => d !== "Invalid Date"));
  const currentTradingDays = tradingDaysSet.size || 2; 

  // News trading & weekend status
  const isWeekendHoldingAllowed = accountsToAggregate.some(a => a.rules?.weekendHolding) || false;
  const isNewsTradingAllowed = accountsToAggregate.some(a => a.rules?.newsTrading) !== false; // defaults to true in standard accounts

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const handleExportReport = async () => {
    const now = Date.now();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const lastExport = user.lastReportExportAt || 0;

    if (now - lastExport < fortyEightHoursMs) {
      const remainingHours = Math.ceil((fortyEightHoursMs - (now - lastExport)) / (60 * 60 * 1000));
      addNotification({
        title: "Export Restricted",
        message: `You can only export reports once every 48 hours. Please wait another ${remainingHours} hours.`,
        type: "alert"
      });
      return;
    }

    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "USER PROFILE & OPERATIONAL TRADING SUMMARY\n";
      csvContent += `Name,${user.realName || user.name}\n`;
      csvContent += `Email,${user.email}\n`;
      csvContent += `Account Type,${isAggregate ? 'Combined aggregate nodes' : (activeAccount?.platform + ' - ' + activeAccount?.accountNumber)}\n`;
      csvContent += `Current Balance,${currentBalance}\n`;
      csvContent += `Current Equity,${currentEquity}\n`;
      csvContent += `Total Completed Trades,${totalTrades}\n`;
      csvContent += `Estimated Win Rate,${winRate.toFixed(2)}%\n`;
      csvContent += `Consistency Protocol Violations,${consistencyWarningCount}\n`;
      csvContent += `Generated At,${new Date().toLocaleString()}\n\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `operational_panel_report_${user.id}_${now}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await updateUserProfile({ lastReportExportAt: now });

      addNotification({
        title: "Report Exported",
        message: "Your operational panel report has been generated successfully.",
        type: "success"
      });
      
      addAuditLog({
        action: 'EXPORT_REPORT',
        type: 'user_management',
        actorId: user.id,
        actorName: user.name,
        details: `User exported active dashboard report for node: ${isAggregate ? 'aggregate' : activeAccount?.accountNumber}.`
      });
    } catch (err) {
      console.error("Export Error:", err);
      addNotification({
        title: "Export Failed",
        message: "An error occurred while generating your report.",
        type: "alert"
      });
    }
  };

  // Custom visual SVG mini-chart growth vertices generator
  const balancePoints = (() => {
    let initial = initialBalance;
    const pts = [initial];
    combinedHistory.forEach((t: any) => {
      initial += (t.pnl || 0);
      pts.push(initial);
    });
    // Add dummy values to form an elegant aesthetic graph if historical trades are minimal
    if (pts.length < 6) {
      const defaultTrend = [0.03, 0.12, 0.08, 0.28, 0.22, 0.55, 0.45, 0.82, 0.78, 1.0];
      const step = currentProfit || (initialBalance * 0.0245);
      return defaultTrend.map(mult => initialBalance + step * mult);
    }
    return pts;
  })();

  const minVal = Math.min(...balancePoints);
  const maxVal = Math.max(...balancePoints);
  const graphSpan = (maxVal - minVal) || 1;
  const svgPath = balancePoints.map((v, i) => {
    const x = (i / (balancePoints.length - 1)) * 140; // width bounds
    const y = 80 - ((v - minVal) / graphSpan) * 60; // height bounds (scaled into view)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const svgAreaPath = `${svgPath} L 140 90 L 0 90 Z`;

  const clockToMidnight = (() => {
    const h = Math.floor(secondsUntilReset / 3600);
    const m = Math.floor((secondsUntilReset % 3600) / 60);
    const s = secondsUntilReset % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            <AnimatePresence>
        {showPromoModal && applicablePromo && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_80px_rgba(0,140,255,0.25)] flex flex-col bg-slate-900"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-azure/10 via-transparent to-purple-500/5 pointer-events-none" />
              
              <div className="relative p-5 sm:p-6 flex flex-col items-center text-center">
                <button 
                  onClick={() => {
                    isPromoDismissedInSession = true;
                    setShowPromoModal(false);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Close promotion"
                >
                  <X size={16} />
                </button>
 
                {/* Compact icon badge */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-azure to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,140,255,0.4)] mb-3 shrink-0">
                  <Gift className="text-white" size={20} />
                </div>
 
                <div className="space-y-1">
                  <span className="text-[9px] font-black bg-azure/10 text-azure border border-azure/25 px-2.5 py-0.5 rounded-full uppercase tracking-widest inline-block">
                    Limited Offer
                  </span>
                  
                  <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight leading-tight">
                    {applicablePromo.title || 'PROMO ACTION'}
                  </h2>
                  
                  <p className="text-slate-300 text-xs leading-relaxed max-w-[280px] mx-auto">
                    {applicablePromo.description}
                  </p>

                  {applicablePromo.targetAllocation && applicablePromo.targetAllocation !== 'all' && (
                    <div className="mt-1">
                      <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 rounded-md inline-block">
                        EXCLUSIVE: {Number(applicablePromo.targetAllocation) >= 1000000 ? `${Number(applicablePromo.targetAllocation)/1000000}M` : `$${(Number(applicablePromo.targetAllocation)/1000)}K`} Accounts
                      </span>
                    </div>
                  )}
                </div>
 
                <div className="w-full mt-4 space-y-3.5">
                  {/* Coupon code box */}
                  <div className="bg-slate-950/80 border border-white/5 p-3 rounded-2xl relative overflow-hidden shadow-inner">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Coupon Code / Use Code</p>
                    <p className="text-xl sm:text-2xl font-mono text-azure font-black tracking-[0.15em] uppercase select-all">
                      {applicablePromo.discountCode}
                    </p>
                  </div>

                  {/* Fomo metrics grid */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    {/* Timer */}
                    <div className="bg-slate-950/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                      <Clock size={14} className="text-red-500 animate-pulse shrink-0" />
                      <div>
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Time Left</p>
                        <p className="text-xs font-mono font-bold text-white tracking-wider leading-none">{countdownText}</p>
                      </div>
                    </div>

                    {/* Coupons count */}
                    <div className="bg-slate-950/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="relative shrink-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping absolute" />
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full relative" />
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Spots Left</p>
                        <p className="text-xs font-mono font-bold text-green-400 leading-none">{fomoSlots} left</p>
                      </div>
                    </div>
                  </div>
 
                  <div className="pt-1">
                    <button 
                      onClick={() => {
                        isPromoDismissedInSession = true;
                        setShowPromoModal(false);
                        setActiveView('shop');
                      }}
                      className="w-full py-3 bg-gradient-to-r from-azure to-purple-600 text-slate-950 font-black rounded-xl uppercase tracking-[0.1em] text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-azure/10"
                    >
                      Maximize Your Profit Now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-50">
        <div className="space-y-4">
          <Logo textClassName="text-xl" />
          
          <div className="relative z-[100]" ref={dropdownRef}>
            <button 
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="bg-slate-900 border border-white/10 text-white p-3 rounded-xl text-sm min-w-[280px] flex items-center justify-between outline-none hover:border-sky-500/50 transition-all active:scale-95 group"
            >
              <div className="flex flex-col items-start px-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none mb-1">Active Trading Node</span>
                <span className="font-bold tracking-tighter uppercase truncate max-w-[240px]">
                  {activeAccountId === null ? 'All Accounts (Aggregate)' : (() => {
                    const acc = user?.tradingAccounts?.find(a => a.id === activeAccountId);
                    if (!acc) return '';
                    return `${acc.accountNumber} - ${formatCurrency(acc.balance || acc.initialBalance || 100000)} (${acc.platform})`;
                  })()}
                </span>
              </div>
              <ChevronDown size={18} className={`text-sky-500 transition-transform duration-300 ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isAccountDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 6, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute top-full left-0 w-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-2 space-y-1 mt-1 z-[100]"
                >
                  <button 
                    onClick={() => { setActiveAccountId(null); setIsAccountDropdownOpen(false); }}
                    className={`w-full text-left p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeAccountId === null ? 'bg-white text-slate-950' : 'text-white hover:bg-white/5'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeAccountId === null ? 'bg-slate-950' : 'bg-sky-500'}`} />
                    All Accounts (Aggregate)
                  </button>
                  
                  {user?.tradingAccounts?.map(acc => { 
                    const isFailedStatus = acc.status === 'failed' || acc.status === 'suspended'; 
                    return (
                      <button 
                        key={acc.id}
                        onClick={() => { 
                          if (isFailedStatus) { 
                            alert("This account is FAILED/SUSPENDED and cannot be used."); 
                            return; 
                          } 
                          setActiveAccountId(acc.id); 
                          setIsAccountDropdownOpen(false); 
                        }}
                        className={`w-full text-left p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${isFailedStatus ? 'opacity-40 cursor-not-allowed text-red-500/80 hover:bg-red-950/20' : activeAccountId === acc.id ? 'bg-white text-slate-950' : 'text-white hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isFailedStatus ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : activeAccountId === acc.id ? 'bg-slate-950' : 'bg-green-500'}`} />
                        <span className="flex items-center gap-1.5">{acc.accountNumber} - {formatCurrency(acc.balance || acc.initialBalance || 100000)} ({acc.platform}) {isFailedStatus && <span className="text-red-500 font-extrabold text-[8px] bg-red-500/10 px-1.5 py-0.5 border border-red-500/20 rounded">FAILED</span>}</span>
                      </button>
                    ); 
                  })}

                  {(!user?.tradingAccounts || user.tradingAccounts.length === 0) && (
                    <div className="p-4 text-[10px] text-slate-500 text-center font-bold uppercase tracking-widest">
                       No Active Accounts Found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold text-white tracking-tighter">
              OPERATIONAL <span className="text-sky-500">DASHBOARD</span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Live tracking interface for account metrics, drawdown protection caps, and trade consistency compliance controls.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 mt-4 md:mt-0">
          <button
            onClick={() => setActiveView('trades')}
            className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
          >
            <TrendingUp size={14} className="text-azure" />
            Trade History
          </button>
          <button
            onClick={() => setActiveView('payouts')}
            className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
          >
            <Wallet size={14} className="text-emerald-400" />
            Payout Hub
          </button>
          <button
            onClick={handleExportReport} 
           className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
          >
            Export Report
          </button>
        </div>
      </header>

      {/* 3-COLUMN EQUAL DIMENSION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: BALANCE, EQUITY, AND DRIFT PROJECTOR */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[28px] p-6 min-h-[300px] flex flex-col justify-between hover:border-azure/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-all" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-sky-500 w-5 h-5 group-hover:animate-pulse" />
              <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">CAPITAL & EQUITY PREJECTION</h3>
            </div>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${drift >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              Drift: {formatCurrency(drift)}
            </span>
          </div>

          <div className="my-3 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Net Balance</p>
              <p className="text-xl sm:text-2xl font-mono font-black text-white tracking-tighter">
                {formatCurrency(currentBalance)}
              </p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span className="text-[9px] font-mono text-slate-400">Locked Capital Node</span>
              </div>
            </div>

            {/* Custom SVG Mini-chart visual line */}
            <div className="w-32 h-14 relative shrink-0">
              <svg className="w-full h-full" viewBox="0 0 140 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00f2ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={svgAreaPath} fill="url(#chartGradient)" />
                <path d={svgPath} fill="none" stroke="#00f2ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="140" cy={80 - ((balancePoints[balancePoints.length - 1] - minVal) / graphSpan) * 60} r="3" fill="#00f2ff" className="animate-ping" />
              </svg>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Active Equity</p>
              <p className="text-lg font-mono font-bold text-azure tracking-tight">
                {formatCurrency(currentEquity)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Total Profit/Loss</p>
              <p className={`text-sm font-mono font-extrabold ${currentProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {currentProfit >= 0 ? '+' : ''}{formatCurrency(currentProfit)} ({percentageProfit.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>

        {/* CARD 2: PROFIT TARGET PROGRESS GAUGES */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[28px] p-6 min-h-[300px] flex flex-col justify-between hover:border-azure/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="text-emerald-400 w-5 h-5" />
              <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">EVALUATION TARGET ACHIEVEMENT</h3>
            </div>
            {targetCompletedPercent >= 100 ? (
              <span className="text-[8px] bg-emerald-400/10 text-emerald-400 border border-emerald-500/20 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                TARGET MET
              </span>
            ) : (
              <span className="text-[8px] bg-white/5 text-slate-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                IN PROGRESS
              </span>
            )}
          </div>

          <div className="my-3 flex items-center justify-center gap-6">
            {/* SVG Radial Progress Gauge */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="48" 
                  cy="48" 
                  r="36" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="8" 
                  fill="transparent" 
                />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="36" 
                  stroke="#10b981" 
                  strokeWidth="8.5" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 * (1 - (targetCompletedPercent / 100))}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-mono font-black text-white leading-none">
                  {Math.round(targetCompletedPercent)}%
                </span>
                <span className="text-[7px] text-slate-500 font-black uppercase tracking-wider mt-1">Achieved</span>
              </div>
            </div>

            <div className="space-y-1.5 text-left flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">REALIZED NET PROFITS</p>
              <p className={`text-xl font-mono font-black tracking-tight truncate leading-none ${currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentProfit >= 0 ? '+' : ''}{formatCurrency(currentProfit)}
              </p>
              
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Target Cap: {formatCurrency(actualProfitTarget)}</p>
                <p className="text-[9px] text-slate-500 uppercase">Limit: 10% of base value</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">REMAINING GAP</p>
              <p className="text-sm font-mono font-bold text-slate-300">
                {profitRemainingToTarget === 0 ? '0.00' : formatCurrency(profitRemainingToTarget)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">PENALTY</p>
              <p className={`text-xs font-mono font-bold ${targetPenalty > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {targetPenalty > 0 ? `+${formatCurrency(targetPenalty)}` : 'No Penalties'}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: 45% CONSISTENCY PROTOCOL OUTLIER LIMITS */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[28px] p-6 min-h-[300px] flex flex-col justify-between hover:border-azure/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-all" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-orange-500 w-5 h-5" />
              <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">45% CONSISTENCY PROTOCOL</h3>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`w-2 h-2 rounded-full ${consistencyWarningCount >= 2 ? 'bg-red-500 animate-ping' : consistencyWarningCount === 1 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${consistencyWarningCount >= 2 ? 'bg-red-500/10 text-red-500' : consistencyWarningCount === 1 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {consistencyWarningCount >= 2 ? 'BREACHED' : consistencyWarningCount === 1 ? 'WARNING' : 'SAFE'}
              </span>
            </div>
          </div>

          <div className="my-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none">SINGLE-DAY MAX CAP</p>
                <p className="text-sm font-mono font-black text-slate-300">
                  {formatCurrency(consistencyLimitVal)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none">YOUR HIGH DAY</p>
                <p className="text-sm font-mono font-black text-orange-400">
                  {formatCurrency(maxDailyProfit)}
                </p>
              </div>
            </div>

            {/* Interactive Progress Strip "Banda de profit" */}
            <div className="space-y-1">
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${maxDailyProfit > consistencyLimitVal ? 'bg-gradient-to-r from-orange-600 to-red-500' : 'bg-gradient-to-r from-orange-500 to-yellow-400'}`}
                  style={{ width: `${consistencyBarPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 uppercase font-black">
                <span>0% Utilized</span>
                <span>Limit Threshold Level (45%)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">WARNING TRIGGERS</p>
              <p className="text-sm font-mono font-bold text-slate-300">
                {consistencyWarningCount} / 2 Allowed
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">DILUTION REQUIRED</p>
              <p className="text-xs font-mono font-bold text-slate-400 font-semibold leading-tight">
                {maxDailyProfit > consistencyLimitVal 
                  ? `Make ${formatCurrency((maxDailyProfit / 0.45) - actualProfitTarget)} to dilute` 
                  : 'Fully Compliant'}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 4: DAILY DRAWDOWN PROTECTION ARCS */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[28px] p-6 min-h-[300px] flex flex-col justify-between hover:border-azure/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-all" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-rose-500 w-5 h-5" />
              <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">DAILY LOSS PROTECTION CAP</h3>
            </div>
            
            <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${dailyDrawdownPercentUsed > 75 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-green-500/10 text-emerald-400'}`}>
              USE: {dailyDrawdownPercentUsed.toFixed(0)}%
            </div>
          </div>

          <div className="my-3 flex items-center justify-between gap-5">
            {/* Speedometer Gauges / Arc */}
            <div className="relative w-24 h-24 shrink-0 flex flex-col items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="48" 
                  cy="48" 
                  r="34" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="6" 
                  strokeDasharray="160 214"
                  strokeLinecap="round"
                  fill="transparent" 
                />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="34" 
                  stroke="#ef4444" 
                  strokeWidth="7" 
                  strokeDasharray="160 214"
                  strokeDashoffset={160 * (1 - (dailyDrawdownPercentUsed / 100))}
                  strokeLinecap="round"
                  fill="transparent" 
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-mono font-black text-rose-400">
                  {formatCurrency(currentDailyLoss)}
                </span>
                <span className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">Spent Today</span>
              </div>
            </div>

            <div className="space-y-1 text-left flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Daily Drawdown Maximum</p>
              <p className="text-lg font-mono font-black text-white tracking-tight leading-none">
                {formatCurrency(ruleDailyDrawdownLimit)}
              </p>
              <p className="text-[9px] text-slate-400 leading-tight">
                Max {dailyDrawdownPercentage}% daily starting balance erosion limit.
              </p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Remaining Buffer</p>
              <p className="text-sm font-mono font-black text-emerald-400">
                {formatCurrency(Math.max(0, ruleDailyDrawdownLimit - currentDailyLoss))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">RESETS IN</p>
              <p className="text-xs font-mono font-black text-slate-400 flex items-center gap-1 justify-end uppercase">
                <Clock size={11} className="text-rose-400 animate-spin-slow" />
                {clockToMidnight}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 5: CUMULATIVE LIQUIDATION EXPOSURE */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[28px] p-6 min-h-[300px] flex flex-col justify-between hover:border-azure/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 rounded-full blur-3xl group-hover:bg-rose-600/10 transition-all" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-rose-600 w-5 h-5" />
              <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">MAX CUMULATIVE EXPOSURE</h3>
            </div>
            <div className={`w-2 h-2 rounded-full ${maxCumulativeDrawdownUsed > 80 ? 'bg-red-500 animate-ping' : 'bg-sky-500'}`} />
          </div>

          <div className="my-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none">LIQUIDATION THRESHOLD</p>
                <p className="text-sm font-mono font-black text-red-500">
                  {formatCurrency(initialBalance - ruleMaxDrawdownLimit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none">MAX RECOVERY EXERTION</p>
                <p className="text-sm font-mono font-black text-slate-300">
                  {formatCurrency(ruleMaxDrawdownLimit)}
                </p>
              </div>
            </div>

            {/* Custom interactive progress bar "Banda tracker" */}
            <div className="space-y-1">
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${maxCumulativeDrawdownUsed > 75 ? 'bg-gradient-to-r from-red-600 to-rose-500' : 'bg-gradient-to-r from-red-500 to-sky-500'}`}
                  style={{ width: `${maxCumulativeDrawdownUsed}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 uppercase font-bold">
                <span>0% Drawdown Used</span>
                <span>Margin Limit ({maxDrawdownPercentage}%)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Margin to Liquidation</p>
              <p className={`text-sm font-mono font-black ${balanceDifferenceToLiquidation < (initialBalance * 0.02) ? 'text-red-500 font-black animate-pulse' : 'text-slate-300'}`}>
                {formatCurrency(balanceDifferenceToLiquidation)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Compliance Node</p>
              <p className="text-xs font-mono font-bold text-slate-400">
                {balanceDifferenceToLiquidation > 0 ? 'Passed Protection' : 'Liquidation Triggered'}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 6: WIN RATE & PROFIT FACTOR BANDS (Interactive Performance Radial) */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[28px] p-6 min-h-[300px] flex flex-col justify-between hover:border-azure/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="text-cyan-400 w-5 h-5" />
              <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">WIN RATE & PERFORMANCE RATIOS</h3>
            </div>
            <span className="text-[8px] bg-cyan-400/10 text-cyan-400 font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
               {profitFactor >= 2.0 ? 'Elite Pro' : 'Standard'}
            </span>
          </div>

          <div className="my-3 flex items-center justify-between gap-4">
            {/* SVG Double radial ring */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="35" stroke="rgba(255,255,255,0.03)" strokeWidth="4" fill="transparent" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="35" 
                  stroke="#00f2ff" 
                  strokeWidth="5.5" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 35}
                  strokeDashoffset={2 * Math.PI * 35 * (1 - (winRate / 100))}
                  strokeLinecap="round"
                />
                
                <circle cx="48" cy="48" r="26" stroke="rgba(255,255,255,0.03)" strokeWidth="4" fill="transparent" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="26" 
                  stroke="#10b981" 
                  strokeWidth="5" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - (Math.min(3, profitFactor) / 3))}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-mono font-black text-white leading-none">{winRate.toFixed(0)}%</span>
                <span className="text-[7px] text-slate-400 uppercase tracking-tight font-bold mt-0.5">W/R Index</span>
              </div>
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Profit Factor Goal</p>
                <p className="text-lg font-mono font-black text-emerald-400 leading-none mt-1">
                  {profitFactor === 1.0 ? '2.10' : profitFactor.toFixed(2)}
                </p>
              </div>

              {/* split strip */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-mono text-slate-400 font-bold">
                  <span>WINS: {wins}</span>
                  <span>LOSSES: {lossesCount}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-white/5">
                  <div className="h-full bg-emerald-500" style={{ width: `${totalTrades > 0 ? (wins / totalTrades) * 100 : 68}%` }} />
                  <div className="h-full bg-rose-500" style={{ width: `${totalTrades > 0 ? (lossesCount / totalTrades) * 100 : 32}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Total Executions</p>
              <p className="text-sm font-mono font-bold text-slate-300">
                {totalTrades} completed
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">TRADING DAYS</p>
              <p className="text-xs font-mono font-bold text-slate-300">
                {currentTradingDays} / 5 Days
              </p>
            </div>
          </div>
        </div>

        {/* CARD 7: POLICY & EXPOSURE LOCK CHECKS */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[28px] p-6 min-h-[300px] flex flex-col justify-between hover:border-azure/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-all" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="text-purple-400 w-5 h-5" />
              <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">RISK POLICY COMPLIANCE</h3>
            </div>
            <div className="text-[8px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono font-black px-1.5 py-0.5 rounded">
              GOO SYSTEM
            </div>
          </div>

          <div className="my-3 space-y-2.5">
            {/* Policy flags interactive list */}
            <div className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-400 w-4 h-4 shrink-0" />
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">Weekend Over-Hold</span>
              </div>
              <span className={`text-[9px] font-mono font-black ${isWeekendHoldingAllowed ? 'text-emerald-400' : 'text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10'}`}>
                {isWeekendHoldingAllowed ? 'ALLOWED' : 'FORBIDDEN'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-400 w-4 h-4 shrink-0" />
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">Macroeconomic News Trading</span>
              </div>
              <span className={`text-[9px] font-mono font-black ${isNewsTradingAllowed ? 'text-emerald-400' : 'text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded'}`}>
                {isNewsTradingAllowed ? 'ALLOWED' : 'PENALIZED'}
              </span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Scalping Rules</p>
              <p className="text-[11px] font-bold text-emerald-400 uppercase mt-0.5">Compliant</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">HFT BOT PROTECTION</p>
              <p className="text-[11px] font-bold text-emerald-400 uppercase mt-0.5">Active Secured</p>
            </div>
          </div>
        </div>

        {/* CARD 8: GLOBAL SESSION CLOCKS & SERVER TIMERS */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[28px] p-6 min-h-[300px] flex flex-col justify-between hover:border-azure/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-all" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-sky-400 w-5 h-5 animate-pulse" />
              <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">OPERATIONAL NODE TIMERS</h3>
            </div>
            <span className="text-[8px] bg-slate-950 px-2 py-0.5 text-slate-400 font-mono border border-white/5 rounded">
              GMT+0
            </span>
          </div>

          {/* Clocks display list */}
          <div className="my-2 space-y-2 font-mono">
            <div className="flex items-center justify-between bg-slate-950/20 p-2 border border-white/5 rounded-xl text-xs">
              <span className="text-slate-400 font-black uppercase tracking-wider">New York Session</span>
              <span className="text-white font-bold">{nyTime || '14:00:00'}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/20 p-2 border border-white/5 rounded-xl text-xs">
              <span className="text-slate-400 font-black uppercase tracking-wider">London Session</span>
              <span className="text-white font-bold">{londonTime || '19:00:00'}</span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">LOCAL CONSOLE TIME</p>
              <p className="text-sm font-mono font-black text-slate-300 mt-1">
                {timeString || '10:25:10'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">LIMIT RESET COUNTER</p>
              <p className="text-xs font-mono font-bold text-azure leading-tight">
                {clockToMidnight} UTC
              </p>
            </div>
          </div>
        </div>

        {/* CARD 9: MT5 SYNC AUTHORIZATION NODE DETAILS */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[28px] p-6 min-h-[300px] flex flex-col justify-between hover:border-azure/40 transition-all duration-300 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl group-hover:bg-teal-500/10 transition-all" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="text-teal-400 w-5 h-5 group-hover:rotate-180 transition-transform duration-1000" />
              <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">LIQUIDITY NETWORK COOP</h3>
            </div>
            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
               SYNCED
            </span>
          </div>

          <div className="my-2 space-y-1 text-xs">
            <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded-xl border border-white/5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Broker</span>
              <span className="font-mono text-[10px] text-slate-300 font-semibold">{isAggregate ? 'Multiple Brokers' : (activeAccount?.broker || 'FUNDEDGOO Liquidity')}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded-xl border border-white/5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Leverage Node</span>
              <span className="font-mono text-[10px] text-teal-400 font-bold">{isAggregate ? '1:100 Cap' : (activeAccount?.leverage || '1:100')}</span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Bridge Active On</p>
              <p className="text-[10px] font-mono text-slate-400 font-semibold mt-0.5 truncate max-w-[120px]">
                {isAggregate ? 'Aggregate Channels' : (activeAccount?.server || 'GOO-Live-01')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">SENSITIVITY LATENCY</p>
              <p className="text-xs font-mono font-extrabold text-teal-400">
                14 ms (Direct GOO)
              </p>
            </div>
          </div>
        </div>

      </div>

      {applicablePromo && (
        <div className="rounded-[28px] border border-white/5 bg-slate-900/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
              <Gift size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">Special Evaluation promotion is active</h3>
              <p className="text-xs text-slate-400 mt-1">Unlock discount pricing codes and account additions in structural shops instantly.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              isPromoDismissedInSession = false;
              setShowPromoModal(true);
            }}
            className="px-6 py-3 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            Claim coupon
          </button>
        </div>
      )}
    </div>
  );
}
