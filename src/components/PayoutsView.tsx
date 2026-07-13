import React, { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { getTradeDateString, getTradePnl } from '../utils/tradeUtils';
import { Wallet, ArrowUpRight, Clock, ShieldCheck, AlertCircle, TrendingUp, Lock, CheckCircle2, Banknote, DollarSign, Euro, PoundSterling, ArrowLeft } from 'lucide-react';
import ThreeDCard from './ThreeDCard';
import { TradingAccount } from '../types';

const FlyingMoney = () => {
  const [elements, setElements] = useState<{ id: number; left: number; delay: number; duration: number; type: 'bill' | 'dollar' | 'euro' | 'pound'; size: number }[]>([]);

  useEffect(() => {
    const types: ('bill' | 'dollar' | 'euro' | 'pound')[] = ['bill', 'dollar', 'euro', 'pound'];
    const newElements = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 15 + Math.random() * 25, // Slower fall
      type: types[Math.floor(Math.random() * types.length)],
      size: 16 + Math.random() * 24
    }));
    setElements(newElements);
  }, []);

  const renderIcon = (type: string, size: number) => {
    const commonStyle = {
      transform: `rotate(${Math.random() * 360}deg)`,
      animation: `spinAndSway ${6 + Math.random() * 6}s ease-in-out infinite alternate`
    };
    
    switch (type) {
      case 'bill':
        return <Banknote size={size} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" style={commonStyle} />;
      case 'euro':
        return <Euro size={size} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" style={commonStyle} />;
      case 'pound':
        return <PoundSterling size={size} className="text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" style={commonStyle} />;
      case 'dollar':
      default:
        return <DollarSign size={size} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" style={commonStyle} />;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[10] overflow-hidden opacity-30">
      {elements.map((el) => (
        <div
          key={el.id}
          className="absolute top-[-10%] animate-fall"
          style={{
            left: `${el.left}%`,
            animation: `fall ${el.duration}s linear infinite`,
            animationDelay: `${el.delay}s`,
            opacity: 0.2 + Math.random() * 0.5
          }}
        >
          {renderIcon(el.type, el.size)}
        </div>
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh); opacity: 0; }
        }
        @keyframes spinAndSway {
          0% { transform: rotate(-20deg) translateX(-15px); }
          50% { transform: rotate(180deg) translateX(15px); }
          100% { transform: rotate(380deg) translateX(-15px); }
        }
      `}</style>
    </div>
  );
};

export default function PayoutsView() {
  const { transactions, user, updateTradingAccount, setActiveView } = useApp();
  const payouts = transactions.filter(t => t.type === 'payout');
  const now = Date.now();

  const fundedAccounts = user?.tradingAccounts?.filter(acc => acc.type === 'funded') || [];

  const getPayoutInfo = (acc: TradingAccount) => {
    const currentBalance = acc.balance;
    const initialBalance = acc.initialBalance || acc.balance;
    const totalProfit = Math.max(0, currentBalance - initialBalance);
    
    // 45% Consistency Rule implementation
    const history = acc.history || [];
    const dailyProfits: { [date: string]: number } = {};
    
    history.forEach((trade: any) => {
      const date = getTradeDateString(trade);
      if (date && date !== "Invalid Date") {
        dailyProfits[date] = (dailyProfits[date] || 0) + getTradePnl(trade);
      }
    });
    
    const maxDailyProfit = Math.max(0, ...Object.values(dailyProfits));
    const consistencyLimit = totalProfit * 0.45;
    const isConsistent = true; // Consistency rule only applies to evaluation/challenge stages, not funded accounts
    
    const now = Date.now();
    const milestones = acc.payoutMilestones || [];
    
    const maturedAmount = milestones
      .filter(m => m.unlockAt <= now)
      .reduce((sum, m) => sum + m.amount, 0);
      
    const lockedAmount = milestones
      .filter(m => m.unlockAt > now)
      .reduce((sum, m) => sum + m.amount, 0);

    const isEligible = user?.isVerified && user?.linkedPaymentMethod?.isVerified && isConsistent;
    const available = isEligible ? Math.min(totalProfit, maturedAmount) : 0;
    
    return { totalProfit, maturedAmount, lockedAmount, available, isConsistent, maxDailyProfit, consistencyLimit };
  };

  const totalAvailable = fundedAccounts.reduce((sum, acc) => sum + getPayoutInfo(acc).available, 0);

  const handleRequestPayout = async (acc: TradingAccount) => {
    // MANDATORY VERIFICATION CHECK
    if (!user?.isVerified) {
      alert("Verification is mandatory to process payouts. Please complete your profile verification in the Profile tab.");
      setActiveView('profile');
      return;
    }

    if (!user?.linkedPaymentMethod) {
      alert("A saved payment method is required to request payouts. Please make a purchase to link your card or contact support.");
      return;
    }

    const info = getPayoutInfo(acc);
    if (info.available <= 0) return;

    const amountToWithdraw = info.available; 
    const shareAmount = amountToWithdraw * 0.8;
    const refundAmount = (!acc.feeRefunded && acc.initialFee) ? acc.initialFee : 0;
    const finalAmount = shareAmount + refundAmount;

    if (!confirm(`Are you sure you want to withdraw $${amountToWithdraw.toLocaleString()} from account #${acc.accountNumber}?\n\nWithdrawal will be sent to your linked card: ${user.linkedPaymentMethod.brand} ****${user.linkedPaymentMethod.last4}\n\nYour share (80%): $${shareAmount.toLocaleString()}${refundAmount > 0 ? `\nFee Refund: $${refundAmount.toLocaleString()}` : ""}\nTotal Payout: $${finalAmount.toLocaleString()}\nNew balance will be: $${((acc.balance || 0) - amountToWithdraw).toLocaleString()}`)) {
      return;
    }

    try {
      // 1. Update the trading account balance and milestones
      const now = Date.now();
      const updatedMilestones = (acc.payoutMilestones || []).map(m => {
        if (m.unlockAt <= now) {
          // Effectively "consuming" the matured milestones
          return { ...m, amount: 0 }; 
        }
        return m;
      }).filter(m => m.amount > 0);

      await updateTradingAccount(acc.id, {
        balance: acc.balance - amountToWithdraw,
        equity: acc.equity - amountToWithdraw,
        payoutMilestones: updatedMilestones,
        feeRefunded: true // Mark as refunded after first payout
      });

      // 2. Add to payout history (mocked if no server route yet, but we'll use addNotification for feedback)
      // In a real app, you'd call an API to create a payment request (Stripe/Crypto/etc)
      alert(`Request sent! $${amountToWithdraw} has been withdrawn from the account. You will receive $${finalAmount.toFixed(2)} (including any applicable fee refund) after admin approval.`);
      
    } catch (e) {
      console.error("Payout error:", e);
      alert("Error processing payout.");
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 relative">
      <FlyingMoney />
      <header>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveView('dashboard')}
                className="p-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 text-slate-400 hover:text-white transition-all shadow-sm group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tighter uppercase relative">
                  PAYOUT <span className="text-azure text-glow-azure">HUB</span>
                </h1>
                <p className="text-slate-400 mt-2 text-sm">Secure withdrawals and profit sharing management.</p>
              </div>
            </div>
            {/* Removed the GIF container */}
          </div>
          
          {!user?.isVerified && (
            <button 
              onClick={() => setActiveView('profile')}
              className="flex items-center gap-3 bg-toxic-orange/10 border border-toxic-orange/30 p-4 rounded-2xl animate-pulse hover:bg-toxic-orange/20 transition-colors text-left"
            >
               <ShieldCheck className="text-toxic-orange" size={24} />
               <div>
                  <p className="text-white text-xs font-bold uppercase tracking-tight">Verification Required</p>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-0.5 underline">Complete KYC for payouts</p>
               </div>
               <ArrowUpRight className="text-toxic-orange ml-2" size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Active Funded Accounts with Staggered Payouts */}
          <div className="space-y-4">
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-2">Profit Sharing Vested</h3>
             {fundedAccounts.length > 0 ? fundedAccounts.map(acc => {
                const info = getPayoutInfo(acc);
                return (
                  <div key={acc.id} className="glass rounded-3xl overflow-hidden border border-white/5 bg-slate-900/40">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-azure/10 rounded-lg text-azure">
                             <TrendingUp size={16} />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-white uppercase tracking-tight">{acc.broker} - #{acc.accountNumber}</p>
                             <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Initial: ${acc.initialBalance?.toLocaleString()}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Growth</p>
                          <p className={`text-sm font-mono font-bold ${info.totalProfit > 0 ? "text-green-400" : "text-slate-500"}`}>
                             +${info.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                       </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="space-y-4">
                          <div className="flex items-center justify-between text-xs">
                             <span className="text-slate-400 uppercase tracking-widest font-bold">Matured Profit (14d+)</span>
                             <span className="text-white font-mono font-bold text-sm">${info.maturedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                             <span className="text-slate-400 uppercase tracking-widest font-bold">Pending (Locked)</span>
                             <span className="text-toxic-orange font-mono font-bold text-sm">
                                <Lock size={12} className="inline mr-1" />
                                ${info.lockedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                             </span>
                          </div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-azure shadow-[0_0_10px_rgba(0,210,255,0.5)]" 
                                style={{ width: `${info.maturedAmount + info.lockedAmount > 0 ? (info.maturedAmount / (info.maturedAmount + info.lockedAmount)) * 100 : 0}%` }}
                             />
                          </div>
                       </div>
                       
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Available for Payout</p>
                          <p className="text-2xl font-display font-bold text-white tracking-tighter">${info.available.toLocaleString()}</p>
                          
                          {!info.isConsistent && (
                            <div className="mt-2 p-2 bg-toxic-orange/10 border border-toxic-orange/20 rounded-xl">
                              <p className="text-[9px] text-toxic-orange uppercase font-bold text-center">
                                Consistency Warning: Max Daily Profit (${info.maxDailyProfit.toFixed(0)}) exceeds 45% limit (${info.consistencyLimit.toFixed(0)})
                              </p>
                            </div>
                          )}

                          {(!acc.feeRefunded && acc.initialFee) && (
                            <div className="mt-2 p-2 bg-azure/10 border border-azure/20 rounded-xl">
                              <p className="text-[9px] text-azure uppercase font-bold text-center">
                                First Payout: +${acc.initialFee} Refund Included
                              </p>
                            </div>
                          )}
                          
                          {user?.isVerified ? (
                            <button 
                              onClick={() => handleRequestPayout(acc)}
                              disabled={info.available <= 0}
                              className={`mt-3 py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                 info.available > 0 
                                 ? "bg-azure text-slate-950 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(0,210,255,0.3)]" 
                                 : "bg-slate-800 text-slate-500 cursor-not-allowed"
                              }`}
                            >
                               Withdraw Profit #{acc.accountNumber}
                            </button>
                          ) : (
                            <button 
                              onClick={() => setActiveView('profile')}
                              className="mt-3 py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all bg-toxic-orange text-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(255,102,0,0.3)] flex items-center justify-center gap-2"
                            >
                               <ShieldCheck size={14} /> Verify KYC
                            </button>
                          )}
                          
                          <p className="text-[9px] text-slate-500 mt-3 flex items-center gap-1 uppercase">
                             <CheckCircle2 size={10} className="text-green-400" /> Vesting active: 14 days cycle
                          </p>
                       </div>
                    </div>

                    {/* Timeline of upcoming unlocks */}
                    {acc.payoutMilestones && acc.payoutMilestones.filter(m => m.unlockAt > now).length > 0 && (
                       <div className="p-4 bg-white/5 border-t border-white/5">
                          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                             {acc.payoutMilestones
                                .filter(m => m.unlockAt > now)
                                .sort((a,b) => a.unlockAt - b.unlockAt)
                                .slice(0, 5)
                                .map((m, idx) => (
                                   <div key={idx} className="flex-shrink-0 bg-slate-950/50 p-2 rounded-xl border border-white/5 min-w-[120px]">
                                      <p className="text-[9px] font-bold text-toxic-orange uppercase tracking-widest">Locked</p>
                                      <p className="text-xs font-mono font-bold text-white">${m.amount.toFixed(2)}</p>
                                      <p className="text-[8px] text-slate-500 uppercase font-bold mt-1">
                                         {new Date(m.unlockAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </p>
                                   </div>
                                ))
                             }
                          </div>
                       </div>
                    )}
                  </div>
                );
             }) : (
                <div className="p-12 glass rounded-3xl text-center text-slate-500 border border-white/5">
                   <Clock className="mx-auto mb-4 opacity-20" size={48} />
                   <p className="text-sm font-bold uppercase tracking-widest">No Active Funded Accounts</p>
                   <p className="text-xs mt-2">Pass a challenge to unlock your funded account and start earning payouts.</p>
                </div>
             )}
          </div>

          <div className="glass rounded-[32px] overflow-hidden border border-white/5">
            <div className="p-6 border-b border-white/5 bg-white/5">
              <h3 className="font-display font-bold text-lg text-white tracking-tighter uppercase tracking-wide">Payment History</h3>
            </div>
            <div className="divide-y divide-white/5">
              {payouts.length > 0 ? payouts.map((tx) => (
                <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-toxic-orange/10 text-toxic-orange">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Profit Withdrawal</p>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-white">-${tx.amount}</p>
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest bg-green-400/10 px-2 py-0.5 rounded-full">{tx.status}</span>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <AlertCircle className="mx-auto opacity-20" size={48} />
                  <p className="text-sm uppercase font-bold tracking-widest">No payout history found</p>
                </div>
              )}
            </div>
          </div>

          {/* Education Section */}
          <div className="glass rounded-[32px] p-8 border border-white/5 space-y-8">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-azure/10 rounded-lg text-azure">
                   <ShieldCheck size={20} />
                </div>
                <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight">Payout & Profit Sharing Guide</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-azure font-bold text-xs">1</div>
                      <div className="space-y-1">
                         <p className="text-sm font-bold text-white uppercase tracking-tight">Vesting Period (14 Days)</p>
                         <p className="text-xs text-slate-400 leading-relaxed">Every generated profit must "age" for 14 calendar days before becoming eligible for withdrawal. This ensures platform stability and professional risk management.</p>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-azure font-bold text-xs">2</div>
                      <div className="space-y-1">
                         <p className="text-sm font-bold text-white uppercase tracking-tight">Profit Split 80/20</p>
                         <p className="text-xs text-slate-400 leading-relaxed">You receive 80% of all profits you withdraw. For example, if you withdraw $1,000, you will receive $800 in your wallet, and $200 remains as the platform share.</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-azure font-bold text-xs">3</div>
                      <div className="space-y-1">
                         <p className="text-sm font-bold text-white uppercase tracking-tight">Balance Adjustment</p>
                         <p className="text-xs text-slate-400 leading-relaxed">When you request a payout, the total amount is deducted from your trading account balance and equity. Your balance cannot drop below your initial allocation.</p>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-azure font-bold text-xs">4</div>
                      <div className="space-y-1">
                         <p className="text-sm font-bold text-white uppercase tracking-tight">Minimum Withdrawal</p>
                         <p className="text-xs text-slate-400 leading-relaxed">You can request a payout anytime you have "Matured" funds. Processing typically takes between 24-48 business hours.</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-4 bg-azure/5 border border-azure/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-azure flex-shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wide">
                  Important: When requesting a payout, ensure you have no open positions on that specific account to prevent equity calculation errors.
                </p>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <ThreeDCard className="glass-orange p-8 rounded-3xl" glowColor="rgba(255, 102, 0, 0.2)">
            <h4 className="text-xs font-bold text-toxic-orange uppercase tracking-widest mb-2">Total Combined Payout Wallet</h4>
            <p className="text-4xl font-display font-bold text-white tracking-tighter">${totalAvailable.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed font-medium">
              Total matured profit from all your funded accounts. (80% split is applied at processing).
            </p>
            <div className="mt-8 p-4 bg-slate-950/50 rounded-xl border border-white/5">
               <p className="text-[10px] text-slate-500 uppercase font-bold text-center">Use individual account buttons to request withdrawal.</p>
            </div>
          </ThreeDCard>

          <div className="glass p-8 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-tighter flex items-center gap-2">
              <ShieldCheck className="text-azure" size={16} /> Linked Payment Method
            </h3>
            {user?.linkedPaymentMethod ? (
               <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{user.linkedPaymentMethod.brand}</p>
                     <ShieldCheck size={14} className="text-green-400" />
                  </div>
                  <p className="text-white font-mono font-bold tracking-widest">**** **** **** {user.linkedPaymentMethod.last4}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tight">{user.linkedPaymentMethod.cardholderName}</p>
                  <p className="text-[8px] text-slate-600 uppercase">Exp: {user.linkedPaymentMethod.expiryMonth}/{user.linkedPaymentMethod.expiryYear}</p>
               </div>
            ) : (
               <div className="p-4 bg-toxic-orange/5 rounded-2xl border border-toxic-orange/20">
                  <p className="text-[10px] text-toxic-orange uppercase font-bold leading-relaxed">No linked payment method. Payouts will only be processed to the card used for initial funding.</p>
               </div>
            )}
          </div>

          {/* Education Section moved or adjusted */}
        </div>
      </div>
    </div>
  );
}
