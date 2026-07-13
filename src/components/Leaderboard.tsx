import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { Trophy, TrendingUp, Target, Zap, User, X, Award, Activity, BarChart3, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ThreeDCard from './ThreeDCard';
import Logo from './Logo';

const COUNTRY_NAMES: { [key: string]: string } = {
  RO: 'Romania',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan'
};

export default function Leaderboard() {
  const { leaderboard, user } = useApp();
  const [selectedTrader, setSelectedTrader] = useState<any>(null);

  // Ensure leaderboard is sorted by rank
  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => a.rank - b.rank);
  }, [leaderboard]);

  return (
    <div className="p-4 sm:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 glow-amber">
            <Trophy size={24} />
          </div>
          <div className="space-y-1">
            <Logo textClassName="text-3xl sm:text-4xl" />
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Global Elite Consistency Rankings</p>
          </div>
        </div>
      </header>

      {/* Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
        {/* Silver - 2nd */}
        <div className="order-2 md:order-1 h-full flex flex-col justify-end">
          <PodiumCard 
            entry={sortedLeaderboard[1]} 
            rank={2} 
            color="text-slate-400" 
            bgColor="bg-slate-400/10" 
            borderColor="border-slate-400/20" 
            onSelect={setSelectedTrader}
          />
        </div>
        
        {/* Gold - 1st */}
        <div className="order-1 md:order-2">
          <PodiumCard 
            entry={sortedLeaderboard[0]} 
            rank={1} 
            color="text-amber-400" 
            bgColor="bg-amber-400/10" 
            borderColor="border-amber-400/20" 
            isMain={true} 
            onSelect={setSelectedTrader}
          />
        </div>

        {/* Bronze - 3rd */}
        <div className="order-3 h-full flex flex-col justify-end">
          <PodiumCard 
            entry={sortedLeaderboard[2]} 
            rank={3} 
            color="text-orange-400" 
            bgColor="bg-orange-400/10" 
            borderColor="border-orange-400/20" 
            onSelect={setSelectedTrader}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="glass rounded-[40px] border-white/5 overflow-hidden">
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Protocol Consistency Ranks</h3>
          <div className="flex gap-4">
             <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Sort: Consistency Score</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rank</th>
                <th className="p-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trader Entity</th>
                <th className="p-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Allocation P&L</th>
                <th className="p-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Win Rate</th>
                <th className="p-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Consistency Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedLeaderboard.slice(0, 10).map((entry) => {
                const isCurrentUser = user && (entry.userId === user.id || (entry.userId === 'u3' && user.email?.includes('lupascu')));
                const trName = isCurrentUser ? user.name : (entry.userName || entry.name || 'Unknown');
                const trAvatar = isCurrentUser ? user.avatar : entry.avatar;
                const trPnl = entry.pnlPercentage || (entry.pnl ? Number(((entry.pnl / 100000) * 100).toFixed(1)) : 25.4);
                const trWinRate = entry.winRate || 65;
                const trConsistency = entry.consistencyScore || 82;
                const countryCode = isCurrentUser ? (user.country || 'RO') : (entry.country || 'RO');

                return (
                  <tr 
                    key={entry.userId || entry.id || `${entry.rank}-${trName}`} 
                    onClick={() => setSelectedTrader(entry)}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  >
                    <td className="p-8">
                      <span className={`text-sm font-mono font-bold ${entry.rank <= 3 ? 'text-azure' : 'text-slate-500'}`}>
                        #{entry.rank.toString().padStart(2, '0')}
                      </span>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center shrink-0 z-10 shadow-md">
                           <img 
                             src={`https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`} 
                             alt={countryCode} 
                             className="w-full h-full object-cover scale-110"
                             referrerPolicy="no-referrer"
                           />
                         </div>
                         <p className="text-sm font-bold text-white group-hover:text-azure transition-colors">{trName}</p>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-2">
                         <TrendingUp size={14} className="text-green-400" />
                         <span className="text-sm font-bold text-green-400">+{trPnl}%</span>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-2">
                         <Target size={14} className="text-slate-400" />
                         <span className="text-sm font-medium text-slate-300">{trWinRate}%</span>
                      </div>
                    </td>
                    <td className="p-8 text-right">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-azure/5 border border-azure/20">
                         <Zap size={12} className="text-azure" />
                         <span className="text-xs font-bold text-azure font-mono">{trConsistency}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Trader Profile Modal */}
      <AnimatePresence>
        {selectedTrader && (() => {
          const isCurrentUser = user && (selectedTrader.userId === user.id || (selectedTrader.userId === 'u3' && user.email?.includes('lupascu')));
          const trName = isCurrentUser ? user.name : (selectedTrader.userName || selectedTrader.name || 'Unknown Trader');
          const trAvatar = isCurrentUser ? user.avatar : selectedTrader.avatar;
          const trPnl = selectedTrader.pnlPercentage || (selectedTrader.pnl ? Number(((selectedTrader.pnl / 100000) * 100).toFixed(1)) : 25.4);
          const trWinRate = selectedTrader.winRate || 65;
          const trConsistency = selectedTrader.consistencyScore || 82;
          const countryCode = isCurrentUser ? (user.country || 'RO') : (selectedTrader.country || 'RO');
          const countryName = COUNTRY_NAMES[countryCode] || 'Romania';
          
          const totalTr = selectedTrader.totalTrades || 120;
          const wonTr = selectedTrader.wonTrades || Math.round((trWinRate / 100) * totalTr);
          const lostTr = selectedTrader.lostTrades || (totalTr - wonTr);
          const favPairs = selectedTrader.favoritePairs || ['EUR/USD', 'GBP/USD', 'XAU/USD'];

          return (
            <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 overflow-y-auto">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTrader(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              
              {/* Modal Card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.92, y: 25 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 25 }}
                className={`bg-slate-900 border border-slate-800 rounded-[36px] w-full max-w-xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] relative z-10 flex flex-col text-slate-300 border-t-4 ${
                  selectedTrader.rank === 1 ? 'border-t-amber-400' :
                  selectedTrader.rank === 2 ? 'border-t-slate-400' :
                  selectedTrader.rank === 3 ? 'border-t-orange-400' : 'border-t-azure'
                }`}
              >
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-950/20">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase font-mono ${
                      selectedTrader.rank === 1 ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                      selectedTrader.rank === 2 ? 'bg-slate-400/10 text-slate-400 border border-slate-400/20' :
                      selectedTrader.rank === 3 ? 'bg-orange-400/10 text-orange-400 border border-orange-400/20' :
                      'bg-azure/10 text-azure border border-azure/20'
                    }`}>
                      🏆 Rank #{selectedTrader.rank}
                    </span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Trader Profile</span>
                  </div>
                  <button 
                    onClick={() => setSelectedTrader(null)}
                    className="text-slate-400 hover:text-white hover:bg-white/5 p-2 rounded-xl transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Profile Info Row */}
                  <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                    <div className="shrink-0">
                      <div className={`w-20 h-20 rounded-full overflow-hidden border-2 flex items-center justify-center ${
                        selectedTrader.rank === 1 ? 'border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.25)]' :
                        selectedTrader.rank === 2 ? 'border-slate-400/50 shadow-[0_0_15px_rgba(148,163,184,0.15)]' :
                        selectedTrader.rank === 3 ? 'border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.15)]' : 'border-azure/30'
                      }`}>
                        <img 
                          src={`https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`} 
                          alt={countryCode} 
                          className="w-full h-full object-cover scale-110"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight truncate">
                        {trName}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-400 flex-wrap">
                        <span className="text-xs font-medium">{countryName}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Funded Elite</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Metrics Cards Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Allocation P&L</span>
                      <span className="text-md font-extrabold text-emerald-400 font-mono">
                        +{trPnl}%
                      </span>
                    </div>
                    <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Win Rate</span>
                      <span className="text-md font-extrabold text-azure font-mono">
                        {trWinRate}%
                      </span>
                    </div>
                    <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Consistency</span>
                      <span className="text-md font-extrabold text-amber-500 font-mono">
                        {trConsistency}%
                      </span>
                    </div>
                  </div>

                  {/* Won vs Lost Trades Visualization */}
                  <div className="space-y-3 bg-slate-950/20 border border-white/5 p-5 rounded-2xl">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-slate-400 font-bold">Castigate (Wins):</span>
                        <span className="text-emerald-400 font-black font-mono">
                          {wonTr}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-slate-400 font-bold">Pierdute (Losses):</span>
                        <span className="text-rose-400 font-black font-mono">
                          {lostTr}
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-white/5">
                      <div 
                        className="bg-emerald-500 h-full rounded-l-full transition-all duration-500" 
                        style={{ width: `${trWinRate}%` }} 
                      />
                      <div 
                        className="bg-rose-500 h-full rounded-r-full transition-all duration-500" 
                        style={{ width: `${100 - trWinRate}%` }} 
                      />
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold pt-1">
                      <span>Rata de succes: {trWinRate}%</span>
                      <span>Total: {totalTr} Tranzactii</span>
                    </div>
                  </div>

                  {/* Traded asset pairs chips */}
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Instrumente Tranzactionate (Pairs)</span>
                    <div className="flex flex-wrap gap-2.5">
                      {favPairs.map((pair, index) => (
                        <span 
                          key={index} 
                          className="px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-950 border border-white/5 text-slate-300 flex items-center gap-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                        >
                          <Activity size={12} className="text-azure shrink-0 animate-pulse" />
                          {pair}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Projection Curve */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold pb-2">
                      <span>PROJECTION GROWTH CURVE</span>
                      <span className="text-emerald-400">Consistent Trajectory</span>
                    </div>
                    <div className="h-16 bg-slate-950/50 rounded-xl border border-white/5 relative overflow-hidden flex items-end px-2 py-1">
                      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                          <linearGradient id="modalGlow" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.15" />
                          </linearGradient>
                        </defs>
                        <path 
                          d="M 0 85 Q 25 75, 50 45 T 100 15 L 100 100 L 0 100 Z" 
                          fill="url(#modalGlow)"
                        />
                        <path 
                          d="M 0 85 Q 25 75, 50 45 T 100 15" 
                          fill="none" 
                          stroke="rgb(16, 185, 129)" 
                          strokeWidth="2" 
                          strokeLinecap="round"
                          className="stroke-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]"
                        />
                      </svg>
                      <div className="absolute top-1.5 right-2 flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                        <span>Live Account Connected</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

function PodiumCard({ entry, rank, color, bgColor, borderColor, isMain = false, onSelect }: any) {
  const { user } = useApp();
  const isCurrentUser = user && (entry?.userId === user.id || (entry?.userId === 'u3' && user.email?.includes('lupascu')));

  const trName = isCurrentUser ? user.name : (entry?.userName || entry?.name || 'Unknown');
  const trAvatar = isCurrentUser ? user.avatar : entry?.avatar;
  const trPnl = entry?.pnlPercentage || (entry?.pnl ? Number(((entry.pnl / 100000) * 100).toFixed(1)) : 25.4);
  const trWinRate = entry?.winRate || 65;
  const countryCode = isCurrentUser ? (user.country || 'RO') : (entry?.country || 'RO');

  if (!entry) {
    return (
      <div 
        className={`glass rounded-[32px] p-8 border ${borderColor} flex flex-col items-center gap-6 relative overflow-hidden ${isMain ? 'pt-16 pb-12' : 'py-8'} transition-all duration-300`} 
      >
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 px-6 py-2 rounded-b-2xl font-display font-bold text-sm tracking-widest ${bgColor} ${color} border-x border-b ${borderColor}`}>
          RANK {rank}
        </div>
        <div className={`rounded-3xl flex items-center justify-center text-3xl font-display font-bold border ${borderColor} relative overflow-hidden ${isMain ? 'w-28 h-28' : 'w-20 h-20'} bg-slate-950/40`}>
           <span className={color}>-</span>
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-display font-bold text-white uppercase tracking-tighter">TBD</h3>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>Awaiting Data</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onSelect(entry)}
      className={`glass rounded-[32px] p-8 border ${borderColor} flex flex-col items-center gap-6 relative overflow-hidden ${isMain ? 'pt-16 pb-12' : 'py-8'} cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-white/10 group`}
      style={{
        boxShadow: rank === 1 ? '0 10px 30px -10px rgba(251, 191, 36, 0.15)' : '0 10px 30px -10px rgba(0, 242, 255, 0.05)'
      }}
    >
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 px-6 py-2 rounded-b-2xl font-display font-bold text-sm tracking-widest ${bgColor} ${color} border-x border-b ${borderColor}`}>
        RANK {rank}
      </div>

      <div className="relative">
        <div className={`rounded-full flex items-center justify-center border ${borderColor} relative overflow-hidden ${isMain ? 'w-24 h-24' : 'w-20 h-20'} bg-slate-950/40 transition-transform duration-300 group-hover:scale-105 shadow-md`}>
           <img 
             src={`https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`} 
             alt={countryCode} 
             className="w-full h-full object-cover scale-110"
             referrerPolicy="no-referrer"
           />
        </div>
      </div>

      <div className="text-center space-y-1 w-full">
        <h3 className="text-lg font-display font-bold text-white uppercase tracking-tighter truncate w-full px-2">{trName}</h3>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>Elite Protocol Trader</p>
      </div>

      <div className="w-full space-y-3 pt-4 border-t border-white/5">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
           <span>PnL Sync</span>
           <span className="text-green-400">+{trPnl}%</span>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
           <div className={`h-full ${rank === 1 ? 'bg-amber-400' : 'bg-azure'} rounded-full`} style={{ width: `${trWinRate}%` }} />
        </div>
      </div>
    </div>
  );
}
