import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../AppContext';
import { Users, Gift, Copy, CheckCircle2, Trophy, ArrowRight, UserCheck, Star } from 'lucide-react';
import ThreeDCard from './ThreeDCard';

export default function ReferralView() {
  const { user, globalSettings } = useApp();
  const [copied, setCopied] = useState(false);
  
  const referralCode = user?.referralCode || "FUNDEDGOO-REF";
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const referrals = user?.referrals || [];
  const successfulReferrals = referrals.length;

  const rewards = [
    {
      title: "5K Gift Account",
      condition: "Refer a user who purchases a >10K account",
      status: referrals.some(r => r.purchaseAmount > 100) ? "Active" : "Ongoing", // Simplified check for mock UI
      icon: Gift,
      color: "text-azure"
    },
    {
      title: "100K Elite Account",
      condition: "Reach 10 successful referrals",
      status: successfulReferrals >= 10 ? "Claimed" : `${successfulReferrals}/10 Completed`,
      icon: Trophy,
      color: "text-toxic-orange"
    }
  ];

  return (
    <div className="p-4 sm:p-8 space-y-12 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-4">
        <h1 className="text-4xl sm:text-6xl font-display font-black text-white tracking-tighter uppercase leading-none italic">
          REFERRAL <span className="text-azure text-glow-azure">PROGRAM</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed uppercase tracking-[0.3em] font-black">
          Invite your squad and build your institutional node empire
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Referral Card */}
        <ThreeDCard className="glass p-8 sm:p-10 rounded-[40px] border-white/5 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-azure/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">Your Referral Link</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Share this link to earn massive rewards</p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/50 p-4 rounded-2xl border border-white/5 group">
            <div className="flex-1 truncate font-mono text-sm text-azure font-bold">{referralLink}</div>
            <button 
              onClick={handleCopy}
              className="p-3 bg-white/5 rounded-xl hover:bg-azure hover:text-slate-950 transition-all text-slate-400"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center space-y-1">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Successful Node Links</p>
              <p className="text-3xl font-display font-black text-white">{successfulReferrals}</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center space-y-1">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Available Rewards</p>
              <p className="text-3xl font-display font-black text-azure">{rewards.filter(r => r.status === "Active" || r.status === "Claimed").length}</p>
            </div>
          </div>
        </ThreeDCard>

        {/* Benefits/Rules */}
        <div className="glass p-8 sm:p-10 rounded-[40px] border-white/5 space-y-8">
          <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">Protocol Rewards</h2>
          
          <div className="space-y-4">
            {rewards.map((reward, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-3xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors">
                <div className={`p-3 rounded-2xl bg-white/5 ${reward.color}`}>
                  <reward.icon size={24} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{reward.title}</h3>
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${reward.status === "Claimed" || reward.status === "Active" ? "bg-green-500/10 text-green-400" : "bg-white/5 text-slate-500"}`}>
                      {reward.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{reward.condition}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-3xl bg-azure/5 border border-azure/20 flex items-center gap-4">
            <div className="p-2 bg-azure rounded-lg text-slate-950">
              <ArrowRight size={16} />
            </div>
            <p className="text-[10px] text-slate-400 uppercase font-black leading-tight tracking-wider">
              Rewards are issued <span className="text-white">automatically</span> within 24 hours of successful verification.
            </p>
          </div>
        </div>
      </div>

      {/* Referral Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">Node Activity</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
            <Users size={14} className="text-azure" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{successfulReferrals} Referrals</span>
          </div>
        </div>

        <div className="glass rounded-[40px] border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/2">
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Trader</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Infrastructure</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {referrals.length > 0 ? referrals.map((ref) => (
                <tr key={ref.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-azure/10 flex items-center justify-center text-azure">
                        <UserCheck size={16} />
                      </div>
                      <span className="text-sm font-bold text-white tracking-tight">{ref.userName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-400 font-mono italic">{ref.packageTitle}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-green-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Active Stake</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-500 font-medium">
                    {new Date(ref.timestamp).toLocaleDateString()}
                    <span className="ml-2 opacity-50">{new Date(ref.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Users size={48} className="text-slate-500" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No nodes linked yet</p>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest">Start sharing your referral link to build your team</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rewards Explanation Notification Style */}
      <section className="glass-orange p-8 rounded-[40px] border-toxic-orange/20 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-toxic-orange/5 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="w-20 h-20 bg-toxic-orange/10 rounded-3xl flex items-center justify-center text-toxic-orange shrink-0">
          <Star size={40} className="animate-pulse" />
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-2">
          <h3 className="text-2xl font-display font-black text-white uppercase tracking-tighter italic">FUNDEDGOO ELITE REWARDS</h3>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed uppercase tracking-wider font-bold">
            {globalSettings.referralConfig?.referralViewMessage || `Refer someone who buys an account > $10,000 and get a $5,000 gift account. Reach 10 successful sales and receive a $100,000 institutional account.`}
          </p>
        </div>
        
        <button 
          onClick={handleCopy}
          className="px-8 py-4 bg-toxic-orange rounded-2xl text-slate-950 font-black uppercase tracking-[0.2em] text-[10px] hover:scale-105 transition-all shadow-xl shadow-toxic-orange/20"
        >
          COPY MY NODE LINK
        </button>
      </section>
    </div>
  );
}
