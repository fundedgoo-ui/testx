import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Gift, Target, Clock, Users, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ThreeDCard from './ThreeDCard';
import { useApp } from '../AppContext';
import { ShopPackage, CompetitionConfig } from '../types';

export default function CompetitionView() {
  const { user, competitions, generateTradingAccount, setActiveAccountId, setActiveView, fetchWithAuth } = useApp();
  const [activeCompId, setActiveCompId] = useState<string>('');
  const [formData, setFormData] = useState({ alias: '', experience: 'beginner' });
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null); // For viewing trades

  const formatPrice = (price: any, symbol: string) => {
    if (price === undefined || price === null || price === "") return "---";
    const numPrice = Number(price);
    if (isNaN(numPrice)) return "---";
    const precision = symbol?.includes('JPY') ? 3 : (symbol?.includes('BTC') || symbol?.includes('XAU') || symbol?.includes('US30') || symbol?.includes('NAS100')) ? 2 : 5;
    return numPrice.toFixed(precision);
  };

  useEffect(() => {
    if (competitions.length > 0 && !activeCompId) {
      // Find the first active competition or just the first one
      const active = competitions.find(c => c.isActive);
      setActiveCompId(active ? active.id : competitions[0].id);
    }
  }, [competitions, activeCompId]);

  useEffect(() => {
    if (!activeCompId || !user) return;
      // Fetch participants from API
      const fetchParticipants = async () => {
        try {
           const data = await fetchWithAuth(`/api/competitions/${activeCompId}/participants`);
           console.log("Participants fetched:", data);
           setParticipants(data || []);
        } catch (e) {
           console.error("Failed to fetch participants", e);
        }
      };
      fetchParticipants();
  }, [activeCompId, user]);

  const activeCompetition = competitions.find(c => c.id === activeCompId);
  const hasJoined = user?.tradingAccounts?.some(acc => acc.type === 'competition' && acc.competitionId === activeCompId) || false;

  if (!competitions || competitions.length === 0) {
    return <div className="p-8 text-center text-slate-400 mt-20 glass rounded-3xl border border-white/5">No competitions found. Please check back later!</div>;
  }

  if (!activeCompetition) {
    return <div className="p-8 text-center text-slate-400 mt-20 glass rounded-3xl border border-white/5 animate-pulse">Loading competition details...</div>;
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.alias || !user || !activeCompetition) return;
    
    // Handle Entry Fee
    const entryFee = activeCompetition.entryFee || 0;
    if (entryFee > 0 && user.balance < entryFee) {
      alert(`Insufficient balance. This VIP competition requires a $${entryFee} entry fee.`);
      return;
    }

    setLoading(true);

    const isVIP = activeCompetition.isVIP;
    const initialBalance = isVIP ? 250000 : 100000;

    const compPackage: ShopPackage = {
      id: `competition-pkg-${activeCompetition.id}`,
      name: `${isVIP ? 'VIP' : 'Standard'} Competition ${activeCompetition.currentMonthName}`,
      allocation: initialBalance,
      price: entryFee,
      profitTarget: 0,
      totalDrawdown: isVIP ? 99 : 10, // User said "fara nici un fel de limita pana la sfarsit"
      dailyDrawdown: isVIP ? 99 : 5,
      leverage: '1:100'
    };

    try {
      const newAcc = await generateTradingAccount(compPackage, 'GOO', 'competition', undefined, activeCompetition.id);
      if (newAcc) {
        setActiveAccountId(newAcc.id);
        // Deduct balance if fee exists
        if (entryFee > 0) {
          // This should ideally be handled in the generateTradingAccount or separate transaction
          // For now alert user
          alert(`Successfully joined! $${entryFee} has been deducted from your balance.`);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to join competition.");
    } finally {
      setLoading(false);
    }
  };

  // calculate days left to start date
  const now = new Date();
  const startDate = new Date(activeCompetition.startDate);
  const endDate = activeCompetition.endDate ? new Date(activeCompetition.endDate) : null;
  
  const daysDiff = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
  let timeText = daysDiff > 0 ? `Starts in ${daysDiff} Days` : `Started`;
  
  const isEnded = endDate ? now > endDate : false;
  if (isEnded) {
    timeText = 'Ended';
  } else if (endDate) {
    const endDiff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    timeText = daysDiff > 0 ? `Starts in ${daysDiff} Days` : `Ends in ${endDiff} Days`;
  }
  
  const activeCompetitions = competitions.filter(c => c.isActive);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-24">
      {/* Title Section */}
      <div className="flex flex-col items-center text-center space-y-4 pt-4">
        <h1 className="text-5xl lg:text-7xl font-display font-bold text-white uppercase tracking-tighter leading-[0.9]">
          The Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-azure to-blue-500">Trading</span> Arena
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl">
          Prove your skills in our trading contests. Join our standard free competitions or enter the exclusive VIP arenas for massive prizes and elite status.
        </p>
      </div>

      {activeCompetitions.length === 0 ? (
        <div className="p-8 text-center text-slate-400 mt-20 glass rounded-3xl border border-white/5">No active competitions at the moment. Please check back later!</div>
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar justify-center">
            {activeCompetitions.map(c => (
              <button 
                key={c.id} 
                onClick={() => setActiveCompId(c.id)}
                className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all border group relative ${activeCompId === c.id 
                  ? (c.isVIP 
                    ? 'bg-gradient-to-br from-yellow-400 via-yellow-600 to-yellow-800 text-slate-950 border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.4)]' 
                    : 'bg-azure text-slate-900 border-azure shadow-[0_0_20px_rgba(45,212,191,0.3)]') 
                  : 'glass text-slate-400 border-white/5 hover:border-azure/50 hover:text-white'}`}
              >
                <div className="flex items-center gap-2">
                  {c.isVIP && <Trophy size={14}/>}
                  {c.currentMonthName} {c.isVIP && ' (VIP)'}
                </div>
              </button>
            ))}
          </div>
          
          {/* Header section */}
          <div key={activeCompetition.id} className="relative rounded-[32px] overflow-hidden">
            {activeCompetition.isVIP ? (
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/30 via-yellow-500/20 to-amber-900/40 blur-3xl z-0" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-azure/20 to-blue-600/20 blur-3xl z-0" />
            )}
            
            <div className={`relative z-10 p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 border rounded-[32px] ${activeCompetition.isVIP 
              ? 'bg-gradient-to-br from-yellow-500/10 via-slate-900/90 to-yellow-900/20 border-yellow-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
              : 'glass border-white/5'}`}>
              
              <div className="space-y-6 max-w-2xl">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${activeCompetition.isVIP 
                    ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
                    : 'bg-azure/10 text-azure border-azure/20'}`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${activeCompetition.isVIP ? 'bg-yellow-500' : 'bg-azure'}`} />
                    {activeCompetition.isVIP ? 'VIP EXCLUSIVE' : 'STANDARD'}
                  </div>
                  {activeCompetition.entryFee && activeCompetition.entryFee > 0 ? (
                    <div className="px-3 py-1 bg-white/5 text-white rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                      Entry: ${activeCompetition.entryFee}
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                      Free Entry
                    </div>
                  )}
                </div>

                <h2 className={`text-5xl lg:text-6xl font-display font-bold uppercase tracking-tighter leading-[0.9] ${activeCompetition.isVIP 
                  ? 'text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-200 to-yellow-500 drop-shadow-sm' 
                  : 'text-white'}`}>
                  {activeCompetition.currentMonthName}
                </h2>
                
                <p className="text-slate-400 text-sm max-w-md">
                  {activeCompetition.isVIP 
                    ? "Welcome to the VIP suite. Compete for ultimate rewards with a $250,000 starting balance and no drawdown limitations until the end." 
                    : "Join our community competition and show your skills to secure evaluation accounts and prove you're the best."}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-bold text-slate-300">
                  <span className="flex items-center gap-2 glass px-4 py-2 rounded-xl border border-white/5"><Clock size={16} className={activeCompetition.isVIP ? "text-yellow-500" : "text-azure"}/> {timeText}</span>
                  <span className="flex items-center gap-2 glass px-4 py-2 rounded-xl border border-white/5"><Users size={16} className="text-purple-400"/> {participants.length} Registered</span>
                  <button onClick={() => setShowDetails(true)} className="flex items-center gap-2 glass px-4 py-2 rounded-xl hover:bg-white/10 transition-colors border-white/5 border text-white cursor-pointer group">
                    <span className={`transition-colors ${activeCompetition.isVIP ? 'group-hover:text-yellow-500' : 'group-hover:text-azure'}`}>Details</span> <ArrowRight size={16}/>
                  </button>
                </div>
              </div>
              
              <div className="w-full md:w-auto">
                {isEnded ? (
                   <div className="glass p-12 rounded-3xl border border-red-500/30 bg-red-500/5 space-y-6 w-full max-w-md text-center">
                     <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                        <Clock size={40} className="text-red-500" />
                     </div>
                     <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">Competition Ended</h3>
                     <p className="text-slate-400 text-sm">This competition has concluded. Check out our active competitions!</p>
                   </div>
                ) : !hasJoined ? (
                  <form onSubmit={handleJoin} className={`p-8 rounded-3xl border space-y-6 w-full max-w-md shadow-2xl ${activeCompetition.isVIP 
                    ? 'bg-slate-950/80 border-yellow-500/30 shadow-yellow-500/10' 
                    : 'glass border-white/10 shadow-black/50'}`}>
                    <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">
                      {activeCompetition.isVIP ? 'Join VIP Arena' : 'Enter Competition'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Leaderboard Alias</label>
                        <input 
                          required
                          value={formData.alias}
                          onChange={e => setFormData({...formData, alias: e.target.value})}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors"
                          placeholder="e.g. WinnerTrader" 
                        />
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Entry Fee</span>
                          <span className={`font-mono font-bold ${activeCompetition.entryFee ? 'text-white' : 'text-green-500'}`}>
                            {activeCompetition.entryFee ? `$${activeCompetition.entryFee}` : 'FREE'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      disabled={loading} 
                      type="submit" 
                      className={`w-full py-4 font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${activeCompetition.isVIP 
                        ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-slate-950 shadow-[0_0_30px_rgba(234,179,8,0.3)]' 
                        : 'bg-azure text-slate-950'}`}
                    >
                      {loading ? 'Joining...' : 'Register Now'} <ArrowRight size={18} />
                    </button>
                    <p className="text-xs text-slate-500 text-center">By entering you agree to the {activeCompetition.isVIP ? 'VIP' : 'standard'} competition rules.</p>
                  </form>
                ) : (
                   <div className={`p-12 rounded-3xl border space-y-6 w-full max-w-md text-center ${activeCompetition.isVIP 
                    ? 'bg-yellow-500/5 border-yellow-500/30' 
                    : 'glass bg-azure/5 border-azure/30'}`}>
                     <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${activeCompetition.isVIP ? 'bg-yellow-500/20' : 'bg-azure/20'}`}>
                        <CheckCircle2 size={40} className={activeCompetition.isVIP ? 'text-yellow-500' : 'text-azure'} />
                     </div>
                     <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">You're In!</h3>
                     <p className="text-slate-400 text-sm">
                        You have successfully registered! Your ${activeCompetition.isVIP ? '250,000 VIP' : '100,000 standard'} competition account is secured. 
                        Launch the terminal to review your credentials and get ready to trade!
                     </p>
                     <button 
                        onClick={() => setActiveView('web-terminal')}
                        className={`w-full py-3 font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 ${activeCompetition.isVIP 
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-950 shadow-[0_0_20px_rgba(234,179,8,0.3)]' 
                          : 'bg-azure text-slate-950'}`}
                     >
                        Launch Terminal <ArrowRight size={18} />
                     </button>
                   </div>
                )}
              </div>
            </div>
          </div>

          {/* Prizes Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Gift className="text-azure" size={24} />
              <h2 className="text-3xl font-display font-bold text-white uppercase tracking-tighter">Prize Pool</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ThreeDCard className="glass p-8 rounded-3xl border border-yellow-500/30 relative overflow-hidden group" glowColor="rgba(234, 179, 8, 0.15)">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Trophy size={100} className="text-yellow-500" />
                </div>
                <div className="relative z-10 space-y-4">
                  <span className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-yellow-500/30">1st Place</span>
                  <p className="text-4xl font-display font-bold text-white">{activeCompetition.prizes.first.includes('Account') ? `$${parseInt(activeCompetition.prizes.first.replace(/\D/g, ''))},000` : activeCompetition.prizes.first}</p>
                  <p className="text-slate-400 font-medium">Evaluation Account</p>
                </div>
              </ThreeDCard>
              
              <ThreeDCard className="glass p-8 rounded-3xl border border-slate-300/30 relative overflow-hidden group" glowColor="rgba(203, 213, 225, 0.15)">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Trophy size={100} className="text-slate-300" />
                </div>
                <div className="relative z-10 space-y-4">
                  <span className="inline-block px-3 py-1 bg-slate-300/20 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-full border border-slate-300/30">2nd Place</span>
                  <p className="text-4xl font-display font-bold text-white">{activeCompetition.prizes.second.includes('Account') ? `$${parseInt(activeCompetition.prizes.second.replace(/\D/g, ''))},000` : activeCompetition.prizes.second}</p>
                  <p className="text-slate-400 font-medium">Evaluation Account</p>
                </div>
              </ThreeDCard>
              
              <ThreeDCard className="glass p-8 rounded-3xl border border-amber-600/30 relative overflow-hidden group" glowColor="rgba(217, 119, 6, 0.15)">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Trophy size={100} className="text-amber-600" />
                </div>
                <div className="relative z-10 space-y-4">
                  <span className="inline-block px-3 py-1 bg-amber-600/20 text-amber-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-amber-600/30">3rd Place</span>
                  <p className="text-4xl font-display font-bold text-white">{activeCompetition.prizes.third.includes('Account') ? `$${parseInt(activeCompetition.prizes.third.replace(/\D/g, ''))},000` : activeCompetition.prizes.third}</p>
                  <p className="text-slate-400 font-medium">Evaluation Account</p>
                </div>
              </ThreeDCard>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
               <div className="glass p-6 rounded-2xl border border-white/5 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-azure/10 flex items-center justify-center shrink-0">
                     <Target size={24} className="text-azure" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-azure uppercase tracking-widest mb-1">Rank 4th - 20th</p>
                     <p className="text-xl font-bold text-white">{activeCompetition.prizes.fourthToTwentieth}</p>
                     <p className="text-sm text-slate-400">Prove your consistency and get funded.</p>
                  </div>
               </div>
               
               <div className="glass p-6 rounded-2xl border border-white/5 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                     <Gift size={24} className="text-purple-400" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Rank 21st - 100th</p>
                     <p className="text-xl font-bold text-white">{activeCompetition.prizes.rest}</p>
                     <p className="text-sm text-slate-400">Valid for $100k and $250k accounts.</p>
                  </div>
               </div>
            </div>
          </div>
        </>
      )}

      {/* Rules Section */}
      <div className="glass p-10 rounded-[32px] border border-white/5 space-y-8">
         <div className="flex items-center gap-4 border-b border-white/5 pb-6">
           <ShieldCheck className={activeCompetition.isVIP ? "text-yellow-500" : "text-cyan-400"} size={32} />
           <h2 className="text-3xl font-display font-bold text-white uppercase tracking-tighter">
             {activeCompetition.isVIP ? 'VIP Competition Rules' : 'Standard Rules'}
           </h2>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
               <h4 className="font-bold text-white font-display text-lg tracking-tight">Drawdown Limits</h4>
               <p className="text-slate-400 text-sm leading-relaxed">
                 {activeCompetition.isVIP 
                   ? "NO LIMITS. Trade freely without daily or total drawdown restrictions until the very end of the competition." 
                   : "Daily Drawdown is set at 5% and Maximum Overall Drawdown at 10%. Hitting either results in disqualification."}
               </p>
            </div>
            <div className="space-y-3">
               <h4 className="font-bold text-white font-display text-lg tracking-tight">Initial Balance</h4>
               <p className="text-slate-400 text-sm leading-relaxed">
                 {activeCompetition.isVIP 
                   ? "Elite $250,000 trading account provisioned immediately upon registration." 
                   : "$100,000 standard competition account for all participants."}
               </p>
            </div>
            <div className="space-y-3">
               <h4 className="font-bold text-white font-display text-lg tracking-tight">Winner Selection</h4>
               <p className="text-slate-400 text-sm leading-relaxed">
                 {activeCompetition.isVIP 
                   ? "The trader with the highest account balance at the final second wins. Pure performance metrics." 
                   : "Calculated based on equity, consistency (45% rule), and risk management scores."}
               </p>
            </div>
            <div className="space-y-3">
               <h4 className="font-bold text-white font-display text-lg tracking-tight">Max Lot Size</h4>
               <p className="text-slate-400 text-sm leading-relaxed">
                 {activeCompetition.isVIP 
                   ? "No Lot Size Limit. Scale your positions as you see fit to maximize your gains." 
                   : "A maximum of 5 lots across all open positions is enforced."}
               </p>
            </div>
            <div className="space-y-3">
               <h4 className="font-bold text-white font-display text-lg tracking-tight">News Trading</h4>
               <p className="text-slate-400 text-sm leading-relaxed">Allowed during all high-impact events. VIPs maintain full leverage (1:100) even during macroeconomic releases.</p>
            </div>
            <div className="space-y-3">
               <h4 className="font-bold text-white font-display text-lg tracking-tight">Leverage</h4>
               <p className="text-slate-400 text-sm leading-relaxed">Standard 1:100 leverage applied to all assets, including Forex, Indices, and Commodities.</p>
            </div>
         </div>
      </div>
      {showDetails && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowDetails(false)} />
          <div className="relative glass p-8 rounded-[32px] w-full max-w-4xl border-white/10 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">Competition Participants</h3>
              <button onClick={() => setShowDetails(false)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 font-bold uppercase tracking-widest text-[10px] text-slate-300">Close</button>
            </div>
            <div className="overflow-auto custom-scrollbar flex-1 relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900 border-b border-white/5 z-10">
                  <tr>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rank</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trader Name</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Country</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500 italic">No participants yet.</td>
                    </tr>
                  ) : (
                    participants.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <span className={`text-sm font-mono font-bold ${idx < 3 ? 'text-azure' : 'text-slate-500'}`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-white/10 text-xs font-bold text-white">
                              {p.shortName.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-white">{p.shortName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-slate-400 font-medium">{p.country || '-'}</span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => setSelectedParticipant(p)} className="text-sm font-mono font-bold text-azure hover:text-white transition-colors cursor-pointer px-4 py-1 rounded bg-azure/10 hover:bg-azure border border-azure/20 hover:border-azure">
                            ${Number(p.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedParticipant && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedParticipant(null)} />
          <div className="relative glass p-8 rounded-[32px] w-full max-w-4xl border-white/10 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">Trades: {selectedParticipant.shortName}</h3>
              <button onClick={() => setSelectedParticipant(null)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 font-bold uppercase tracking-widest text-[10px] text-slate-300">Close</button>
            </div>
            <div className="overflow-auto custom-scrollbar flex-1 relative">
               {(!selectedParticipant.trades || selectedParticipant.trades.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 italic">No trades placed during this competition.</div>
               ) : (
                  <table className="w-full text-left border-collapse">
                     <thead className="sticky top-0 bg-slate-900 border-b border-white/5 z-10">
                        <tr>
                           <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Symbol</th>
                           <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                           <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lots</th>
                           <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Open Price</th>
                           <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Profit</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {selectedParticipant.trades.map((t: any, idx: number) => (
                           <tr key={idx} className="hover:bg-white/[0.02]">
                              <td className="p-4 text-xs font-bold text-white">{t.symbol}</td>
                              <td className="p-4">
                                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest ${t.type?.toLowerCase() === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>{t.type}</span>
                              </td>
                              <td className="p-4 text-xs font-mono text-slate-300">{t.lots}</td>
                              <td className="p-4 text-xs font-mono text-slate-300">{formatPrice(t.open_price, t.symbol)}</td>
                              <td className={`p-4 text-xs font-mono font-bold text-right ${t.profit >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                {t.profit >= 0 ? '+' : ''}${Number(t.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
