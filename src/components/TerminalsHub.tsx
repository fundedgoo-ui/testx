import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Terminal, ExternalLink, RefreshCw, Cpu, Wifi, Activity, TrendingUp, Zap } from 'lucide-react';
import Logo from './Logo';
import { TradingPlatform, ShopPackage } from '../types';

export default function TerminalsHub() {
  const { user, generateTradingAccount, setActiveView, setActiveAccountId, activeAccountId } = useApp();
  const [isProvisioning, setIsProvisioning] = useState<TradingPlatform | null>(null);
  const [provisionProgress, setProvisionProgress] = useState(0);

  // Simulate loading progress during backend account sync
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProvisioning) {
      setProvisionProgress(0);
      interval = setInterval(() => {
        setProvisionProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.floor(Math.random() * 15) + 8;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isProvisioning]);

  const handleLaunch = () => {
    setIsProvisioning('GOO');
    
    // Check if secure GOO account already exists
    const existing = user?.tradingAccounts?.find(a => a.platform === 'GOO');
    
    if (existing) {
      setTimeout(() => {
        setIsProvisioning(null);
        setActiveAccountId(existing.id);
        setActiveView('web-terminal');
      }, 1500);
    } else {
      const demoPkg: ShopPackage = {
        id: 'demo-package',
        name: 'Free Demo Access',
        allocation: user?.balance || 50000,
        price: 0,
        leverage: '1:100',
        profitTarget: 10,
        dailyDrawdown: 5,
        totalDrawdown: 10,
      };
      
      setTimeout(() => {
        generateTradingAccount(demoPkg, 'GOO', 'evaluation').then((newAcc) => {
          setIsProvisioning(null);
          if (newAcc) {
            setActiveAccountId(newAcc.id);
          }
          setActiveView('web-terminal');
        }).catch((err) => {
          console.error("Failed to generate demo trading account:", err);
          setIsProvisioning(null);
        });
      }, 2000);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto flex flex-col justify-center min-h-[80vh]">
      
      {/* Header with ultra-modern node tagline */}
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-3 justify-center">
          <div className="w-10 h-10 bg-azure/10 rounded-2xl flex items-center justify-center text-azure glow-azure border border-azure/20">
            <Cpu size={20} className="animate-pulse" />
          </div>
          <div className="space-y-0.5 text-left">
            <Logo textClassName="text-2xl sm:text-3xl" />
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Ultra Low Latency Hub</p>
          </div>
        </div>
      </header>

      {/* Futuristic Trading Terminal Card Mockup */}
      <div className="relative group rounded-[32px] overflow-hidden border border-azure/20 bg-slate-950 shadow-[0_0_50px_rgba(0,183,255,0.08)]">
        {/* Dynamic neon vector decor */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-azure/5 rounded-full blur-3xl pointer-events-none" />

        {/* Shiny top neon pipeline */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-azure to-transparent" />

        {/* Window Chrome Mock Tab Headers */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-b border-white/5 bg-slate-900/40 relative z-10 gap-3">
          <div className="flex items-center gap-4">
            {/* Standard terminal buttons */}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 animate-pulse" />
            </div>
            
            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
            
            {/* Terminal Executable Name */}
            <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Terminal size={12} className="text-azure" />
              <span>goo_prop_terminal_v4.2.sys</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5"><Wifi size={10} className="text-azure" /> Net Link: Stable</span>
            <span className="flex items-center gap-1.5"><Activity size={10} className="text-green-400" /> Ping: 4ms</span>
          </div>
        </div>

        {/* Card Canvas Interior */}
        <div className="p-6 sm:p-10 space-y-8 relative z-10">
          
          {/* Futuristic Data Visualization Layout */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            
            {/* Candle Live Graph Feed Simulator */}
            <div className="md:col-span-3 space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-white/5 backdrop-blur-md relative overflow-hidden h-44 flex flex-col justify-between">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:10px_10px]" />
              
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 relative z-10">
                <span className="flex items-center gap-1 text-azure"><TrendingUp size={10} /> GOO/USD CORE GRAPH</span>
                <span>TYPE: HEURISTIC</span>
              </div>

              {/* Glowing decorative columns */}
              <div className="flex items-end justify-between h-24 px-1 relative z-10">
                <Candle peak={82} bottom={30} bodyTop={72} bodyBottom={45} color="green" />
                <Candle peak={92} bottom={40} bodyTop={88} bodyBottom={58} color="green" />
                <Candle peak={72} bottom={22} bodyTop={62} bodyBottom={32} color="red" />
                <Candle peak={62} bottom={12} bodyTop={52} bodyBottom={28} color="red" />
                <Candle peak={87} bottom={32} bodyTop={82} bodyBottom={48} color="green" />
                <Candle peak={97} bottom={52} bodyTop={92} bodyBottom={68} color="green" />
                <Candle peak={77} bottom={32} bodyTop={72} bodyBottom={42} color="red" />
                <Candle peak={94} bottom={62} bodyTop={87} bodyBottom={67} color="green" />
                <Candle peak={100} bottom={72} bodyTop={97} bodyBottom={82} color="green" />
                <Candle peak={87} bottom={42} bodyTop={77} bodyBottom={52} color="red" />
                <Candle peak={97} bottom={52} bodyTop={92} bodyBottom={62} color="green" />
                <Candle peak={100} bottom={72} bodyTop={98} bodyBottom={87} color="green" className="animate-pulse" />
              </div>

              {/* Feed Pricing Info Footer */}
              <div className="flex justify-between items-center text-[10px] text-azure font-mono border-t border-white/5 pt-1.5 relative z-10">
                <span>FEED INDEX:</span>
                <span className="font-bold tracking-widest text-white glow-azure">142,398.92 USD (+1.28%)</span>
              </div>
            </div>

            {/* Bridge Metadata Panel */}
            <div className="md:col-span-2 space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5 h-44 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block border-b border-white/5 pb-1.5">
                SECURE BRIDGE METRICS
              </span>
              
              <div className="space-y-2.5 font-mono text-[11px] flex-1 flex flex-col justify-center">
                <div className="flex justify-between">
                  <span className="text-slate-500">ENGINE:</span>
                  <span className="text-azure font-bold">GOO ENGINE FX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">HOST SERVER:</span>
                  <span className="text-white">GOO-DEMO-LIVE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ACCOUNT FEED:</span>
                  <span className="text-green-400 font-bold">${user?.balance?.toLocaleString() || '100,000'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SECURITY:</span>
                  <span className="text-amber-500 uppercase flex items-center gap-1 text-[10px]">
                    <Zap size={10} className="text-amber-500" /> SECURE LINK
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Action Call for Launching the Goo Terminal */}
          <div className="flex flex-col items-center justify-center text-center space-y-6 pt-4">
            
            {isProvisioning ? (
              <div className="w-full max-w-sm bg-slate-900/80 border border-azure/30 rounded-2xl p-6 space-y-4 text-center">
                <div className="flex items-center justify-center gap-3">
                  <RefreshCw size={20} className="text-azure animate-spin" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-widest animate-pulse">
                    LINKING PORT: {Math.min(provisionProgress, 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div 
                    className="bg-gradient-to-r from-azure to-blue-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_#00f2ff]"
                    style={{ width: `${Math.min(provisionProgress, 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-lg space-y-5">
                <button
                  onClick={handleLaunch}
                  className="w-full py-5 rounded-2xl bg-azure text-slate-950 hover:bg-white text-base font-display font-black uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_40px_rgba(0,242,255,0.35)] flex items-center justify-center gap-3 relative overflow-hidden group/btn"
                >
                  <ExternalLink size={20} className="text-slate-950 stroke-[2.5]" />
                  <span>Launch GOO Terminal</span>
                </button>
                
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-md mx-auto font-medium font-sans">
                  Open the built-in live trading terminal to manage open positions, customize interactive charts, view trading histories and start scaling your balance.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Bottom pipeline color glow */}
        <div className="h-1 bg-gradient-to-r from-cyan-500/10 via-azure/30 to-blue-500/10" />

      </div>
    </div>
  );
}

// Spark candles visualization
interface CandleProps {
  peak: number;
  bottom: number;
  bodyTop: number;
  bodyBottom: number;
  color: 'green' | 'red';
  className?: string;
}

function Candle({ peak, bottom, bodyTop, bodyBottom, color, className = '' }: CandleProps) {
  const isGreen = color === 'green';
  return (
    <div className={`flex flex-col items-center justify-end h-full w-2.5 sm:w-4 ${className}`}>
      <div className="w-[1px] bg-slate-600" style={{ height: `${100 - peak}%` }} />
      <div 
        className={`w-full rounded-[2px] transition-all duration-1000 ${
          isGreen 
            ? 'bg-green-500 border border-green-400/50 shadow-[0_0_6px_rgba(34,197,94,0.2)]' 
            : 'bg-red-500 border border-red-400/50 shadow-[0_0_6px_rgba(239,68,68,0.2)]'
        }`}
        style={{ height: `${bodyTop - bodyBottom}%` }}
      />
      <div className="w-[1px] bg-slate-600" style={{ height: `${bodyBottom - bottom}%` }} />
      <div style={{ height: `${bottom}%` }} />
    </div>
  );
}
