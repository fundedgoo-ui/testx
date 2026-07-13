import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { Zap, ShieldCheck, ChevronRight, Tags, Edit2, Save, X, Loader2, Terminal, Cpu, Layers, Plus } from 'lucide-react';
import ThreeDCard from './ThreeDCard';
import Logo from './Logo';
import { ShopPackage, TradingPlatform } from '../types';

export default function ShopView() {
  const { packages, user, updatePackage, deletePackage, addPackage, addNotification, generateTradingAccount, apis, promotions, linkPaymentMethod, fetchWithAuth } = useApp();
  const isAdmin = user?.role === 'admin';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showSimulatedLinking, setShowSimulatedLinking] = useState(false);
  const [linkingCard, setLinkingCard] = useState({ 
    last4: '', 
    brand: 'Visa', 
    cardholderName: user?.name || '', 
    expiryMonth: 12, 
    expiryYear: 2028 
  });
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, rate: number, targetAllocation?: string } | null>(null);

  const sortedPackages = React.useMemo(() => [...packages].sort((a,b) => a.allocation - b.allocation), [packages]);
  
  const [selectedMobileIndex, setSelectedMobileIndex] = useState(() => {
    const sorted = [...packages].sort((a,b) => a.allocation - b.allocation);
    const popIdx = sorted.findIndex(pkg => pkg.isPopular || pkg.allocation === 25000);
    return popIdx !== -1 ? popIdx : 0;
  });

  const activeMobilePkg = sortedPackages[Math.min(selectedMobileIndex, Math.max(0, sortedPackages.length - 1))] || sortedPackages[0];
  const currentSliderColor = activeMobilePkg ? getSliderColor(activeMobilePkg.allocation) : { active: 'bg-azure shadow-[0_0_12px_rgba(0,140,255,0.7)]', text: 'text-azure font-black', bg: 'rgba(0,140,255,0.1)', activeColor: '#00d2ff' };

  const isPromoApplicableToSelected = React.useMemo(() => {
    if (!appliedDiscount) return true;
    if (!appliedDiscount.targetAllocation || appliedDiscount.targetAllocation === 'all') return true;
    return activeMobilePkg && activeMobilePkg.allocation === Number(appliedDiscount.targetAllocation);
  }, [appliedDiscount, activeMobilePkg]);

  useEffect(() => {
    if (!discountCode) {
      setAppliedDiscount(null);
      return;
    }
    const promo = promotions.find(p => {
      if (!p.isActive || p.discountCode?.toUpperCase() !== discountCode.toUpperCase()) return false;
      if (p.validUntil && new Date(p.validUntil).getTime() < new Date().getTime()) return false;
      if (p.usageLimit > 0 && (p.usageCount || 0) >= p.usageLimit) return false;
      return true;
    });
    if (promo) {
      setAppliedDiscount({ 
        code: promo.discountCode, 
        rate: promo.discountRate, 
        targetAllocation: promo.targetAllocation 
      });
    } else {
      setAppliedDiscount(null);
    }
  }, [discountCode, promotions]);

  const getStripeKey = () => {
    const stripeApi = apis.find(a => a.id === 'api-stripe');
    return stripeApi?.config?.PublicKey || stripeApi?.config?.PublishableKey || (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY;
  };

  const handlePurchase = async (pkg: ShopPackage, platform: TradingPlatform) => {
    if (!user) return;
    
    setIsProcessing(pkg.id);

    try {
      const pubKey = getStripeKey();
      if (!pubKey) {
        console.warn("Stripe publishable key is not configured. Falling back to Sandbox Mode.");
      }
      
      const session = await fetchWithAuth("/api/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          packageId: pkg.id,
          packageName: pkg.name,
          price: pkg.price + (pkg.platformFees?.[platform] || 0),
          userEmail: user.email,
          platform: platform,
          discountCode 
        }),
      });

      if (session.error) {
        throw new Error(session.error);
      }

      if (session.url) {
        setCheckoutUrl(session.url);
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      addNotification({
        title: "Purchase Failed",
        message: error.message || "An unknown error occurred.",
        type: "alert",
      });
      setIsProcessing(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-12 animate-in fade-in duration-500">
      <header className="text-center max-w-3xl mx-auto space-y-4">
        <Logo className="justify-center" textClassName="text-xl" />
        
        {/* Discount Code Input - Enhanced Visibility, Compact */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 relative max-w-[260px] mx-auto group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-azure/10 to-purple-500/10 blur-xl rounded-2xl opacity-40 group-hover:opacity-80 transition-opacity" />
          <div className={`relative flex items-center bg-slate-950/80 backdrop-blur-xl border rounded-[16px] overflow-hidden transition-all duration-500 ${appliedDiscount ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'border-white/10 focus-within:border-azure'}`}>
            <div className={`pl-3.5 ${appliedDiscount ? 'text-green-500' : 'text-slate-500'}`}>
              <Tags size={14} className={appliedDiscount ? 'animate-bounce' : ''} />
            </div>
            <input 
              type="text" 
              className="w-full bg-transparent pl-3 pr-3 py-2.5 text-white text-xs outline-none placeholder:text-slate-700 font-mono font-black tracking-[0.1em] uppercase"
              placeholder="PROMO CODE" 
              value={discountCode}
              onChange={e => setDiscountCode(e.target.value.toUpperCase())}
            />
            {discountCode && (
              <button 
                onClick={() => setDiscountCode('')}
                className="pr-3.5 text-slate-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <AnimatePresence>
            {appliedDiscount && isPromoApplicableToSelected && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-[10px] text-green-400 font-black uppercase tracking-[0.2em] mt-3 bg-green-500/10 py-1.5 px-4 rounded-full border border-green-500/20 inline-block"
              >
                CODE {appliedDiscount.code} ACTIVE: {appliedDiscount.rate}% OFF THIS ACCOUNT
              </motion.p>
            )}
            {appliedDiscount && !isPromoApplicableToSelected && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em] mt-3 bg-yellow-500/10 py-1.5 px-4 rounded-full border border-yellow-500/20 inline-block"
              >
                CODE ONLY VALID FOR {Number(appliedDiscount.targetAllocation) >= 1000000 ? `${Number(appliedDiscount.targetAllocation)/1000000}M` : `$${(Number(appliedDiscount.targetAllocation)/1000)}K`} ACCOUNTS!
              </motion.p>
            )}
          </AnimatePresence>
          {!appliedDiscount && discountCode.length > 0 && (
            <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] mt-3">Invalid or Inactive Code</p>
          )}
        </motion.div>
      </header>

      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 min-h-[44px]">
        <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tighter italic text-center">Start Trading</h2>
        {user?.role === 'admin' && (
          <div className="sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
            <button 
              onClick={() => setEditingId('new')}
              className="flex items-center gap-2 px-5 py-2.5 bg-azure rounded-xl text-slate-950 font-bold uppercase tracking-widest text-xs hover:scale-[1.02] transition-transform"
            >
              <Plus size={16} /> Add Prop
            </button>
          </div>
        )}
      </div>

      {/* UNIFIED INTERACTIVE SLIDER VIEW FOR ALL VIEWPORTS */}
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Slider Card */}
        <div className="relative bg-slate-950/40 p-6 sm:p-8 rounded-3xl border border-white/5 space-y-4">
          <div className="text-center">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Select Account Size</span>
          </div>

          {/* Modern Fader Track Container */}
          <div className="relative px-6 sm:px-12 py-8 select-none max-w-3xl mx-auto">
            <div 
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                if (width > 0) {
                  const pct = clickX / width;
                  const stepCount = sortedPackages.length;
                  if (stepCount > 1) {
                    const stepSize = 1 / (stepCount - 1);
                    const closestIdx = Math.round(pct / stepSize);
                    setSelectedMobileIndex(Math.max(0, Math.min(stepCount - 1, closestIdx)));
                  }
                }
              }}
              className="relative h-6 w-full cursor-pointer flex items-center group z-20"
            >
              {/* Dark Base Track */}
              <div className="absolute left-0 right-0 h-1.5 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors duration-200" />
              
              {/* Colored Active Track */}
              <div 
                className="absolute left-0 h-1.5 rounded-full z-10 transition-all duration-300 pointer-events-none"
                style={{
                  width: sortedPackages.length > 1 ? `${(selectedMobileIndex / (sortedPackages.length - 1)) * 100}%` : '100%',
                  backgroundColor: currentSliderColor.activeColor || '#00d2ff',
                  boxShadow: `0 0 12px ${currentSliderColor.activeColor || '#00d2ff'}`
                }}
              />

              {/* Step circles on the track */}
              {sortedPackages.map((pkg, idx) => {
                const isActive = idx === selectedMobileIndex;
                const stepColors = getSliderColor(pkg.allocation);
                const pct = sortedPackages.length > 1 ? (idx / (sortedPackages.length - 1)) * 100 : 0;
                return (
                  <button 
                    key={pkg.id} 
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid triggering parent track click
                      setSelectedMobileIndex(idx);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer z-30 focus:outline-none hover:scale-110 active:scale-95"
                    style={{ left: `${pct}%` }}
                    title={`Select ${pkg.allocation >= 1000000 ? (pkg.allocation / 1000000) + "M" : (pkg.allocation / 1000) + "K"}`}
                  >
                    <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      isActive 
                        ? `${stepColors.active} scale-125` 
                        : 'bg-slate-950 border border-white/20 hover:border-white/40 hover:bg-slate-900'
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* Labels below */}
            <div className="relative mt-8 h-10">
              {sortedPackages.map((pkg, idx) => {
                const formattedK = pkg.allocation >= 1000000 ? (pkg.allocation / 1000000) + "M" : (pkg.allocation / 1000) + "K";
                const isActive = idx === selectedMobileIndex;
                const stepColors = getSliderColor(pkg.allocation);
                const pct = sortedPackages.length > 1 ? (idx / (sortedPackages.length - 1)) * 100 : 0;
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedMobileIndex(idx)}
                    className="absolute top-0 -translate-x-1/2 flex flex-col items-center focus:outline-none transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{ left: `${pct}%` }}
                  >
                    <span className={`uppercase tracking-wider transition-all duration-300 ${
                      isActive 
                        ? `${stepColors.text} text-sm sm:text-base md:text-lg scale-110` 
                        : `${stepColors.inactive} text-xs sm:text-sm`
                    }`}>
                      {formattedK}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Package Details container (Responsive Split Grid on MD+, Single block on Mobile) */}
        {activeMobilePkg && (() => {
          const pkg = activeMobilePkg;
          const selectedPlatform = 'GOO';
          const platformFee = pkg.platformFees?.[selectedPlatform] || 0;
          const originalPrice = pkg.price + platformFee;
          const discountRate = isPromoApplicableToSelected ? (appliedDiscount?.rate || 0) : 0;
          const discountAmount = originalPrice * (discountRate / 100);
          const totalPrice = Math.max(0, originalPrice - discountAmount);
          const isPopular = pkg.isPopular || pkg.allocation === 25000;
          const style = getTierStyle(pkg.allocation, isPopular);
          const formattedK = pkg.allocation >= 1000000 ? (pkg.allocation / 1000000) + "M" : (pkg.allocation / 1000) + "K";

          // Calculate exact metrics
          const profitTargetVal = pkg.profitTarget ? `$${((pkg.profitTarget / 100) * pkg.allocation).toLocaleString()} (${pkg.profitTarget}%)` : "N/A";
          const maxLossVal = pkg.totalDrawdown ? `$${((pkg.totalDrawdown / 100) * pkg.allocation).toLocaleString()} (${pkg.totalDrawdown}%)` : "N/A";
          const dailyLossVal = pkg.dailyDrawdown && pkg.dailyDrawdown > 0 ? `$${((pkg.dailyDrawdown / 100) * pkg.allocation).toLocaleString()} (${pkg.dailyDrawdown}%)` : "×";

          return (
            <motion.div
              key="unified-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`grid grid-cols-1 md:grid-cols-12 relative rounded-3xl overflow-hidden transition-all duration-300 ${style.borderClass}`}
            >
              {style.bgGlow && <div className={style.bgGlow} />}

              {isPopular && (
                <div className="absolute top-4 left-4 md:left-1/2 md:-translate-x-1/2 px-4 py-1 bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-purple-500/20 z-20">
                  Most Popular
                </div>
              )}

              {/* MD Left / Mobile Top: Core Hero (Size, Name, Cost and Checkout button) */}
              <div className="md:col-span-5 p-8 flex flex-col justify-between items-center text-center border-b md:border-b-0 md:border-r border-white/5 bg-slate-950/40 relative z-10">
                <div className="space-y-2 mt-4">
                  <span className={`text-xs font-black tracking-[0.2em] uppercase ${style.nameClass}`}>
                    {pkg.name}
                  </span>
                  <p className={`text-4xl sm:text-5xl font-black tracking-tighter ${style.textClass}`}>
                    <span className="text-xl font-normal text-slate-400 mr-1">$</span>{formattedK}
                  </p>
                </div>

                <div className="space-y-6 w-full max-w-xs my-8">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Refundable Price</span>
                    <div className="flex items-baseline justify-center gap-2">
                      {discountRate > 0 && <p className="text-sm font-mono text-red-500 line-through opacity-70">${originalPrice}</p>}
                      <p className={`text-3xl sm:text-4xl font-mono font-black ${style.priceClass}`}>
                        ${totalPrice.toFixed(0)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg, 'GOO')}
                    disabled={isProcessing === pkg.id}
                    className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all outline-none ${style.btnClass}`}
                  >
                    {isProcessing === pkg.id ? (
                      <Loader2 className="animate-spin md:w-3.5 md:h-3.5" size={14} />
                    ) : (
                      'Start Trading'
                    )}
                  </button>
                </div>

                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Instant Node Activation & 100% Refundable
                </div>
              </div>

              {/* MD Right / Mobile Bottom: Parameter Details list */}
              <div className="md:col-span-7 flex flex-col justify-center divide-y divide-white/[0.02] bg-slate-950/10 p-4 sm:p-6 relative z-10">
                <RowMobileDetail label="Profit Target" val={profitTargetVal} desc="Phase 1: 10% / Phase 2: 5%" icon={Zap} highlightClass={style.rowValueClass} />
                <RowMobileDetail label="Maximum Loss Limit" val={maxLossVal} desc="10% Overall Drawdown" icon={ShieldCheck} highlightClass={style.rowValueClass} />
                <RowMobileDetail label="Daily Loss Limit" val={dailyLossVal} desc="5% Daily Drawdown" icon={ShieldCheck} highlightClass={style.rowValueClass} />
                <RowMobileDetail label="Consistency Rule" val="45% Cap" desc="45% Max Profit Cap" icon={Layers} highlightClass={style.rowValueClass} />
                <RowMobileDetail label="No Scalping" val="✓" desc="30s Hold Threshold" icon={ShieldCheck} isCheck />
                <RowMobileDetail label="No Activation Fee" val="✓" icon={ShieldCheck} isCheck />
                <RowMobileDetail label="One Time Fee" val="✓" desc="Refundable Price" icon={ShieldCheck} isCheck />
              </div>

              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-1 z-30">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingId(pkg.id); }}
                    className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm('Delete package?')) deletePackage(pkg.id); }}
                    className="p-2 rounded-xl bg-red-950 border border-red-500/25 text-red-400 hover:text-red-300"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })()}
      </div>

      {editingId && (
        <EditPackageModal 
          pkg={editingId === 'new' ? { id: 'new', name: 'New Package', price: 100, allocation: 10000, leverage: '1:100', dailyDrawdown: 5, totalDrawdown: 10, profitTarget: 10 } as any : packages.find(p => p.id === editingId)!} 
          onClose={() => setEditingId(null)}
          onSave={editingId === 'new' ? addPackage : updatePackage}
          isNew={editingId === 'new'}
        />
      )}

      {checkoutUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 p-8 rounded-[40px] border border-white/10 max-w-md w-full text-center shadow-2xl">
              <h3 className="text-2xl font-display font-medium text-white mb-3 tracking-tighter">Complete Payment</h3>
              <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">A secure Stripe checkout session has been created. Click the button below to complete your purchase.</p>
              <a 
                href={checkoutUrl} 
                rel="noopener noreferrer" 
                onClick={() => {
                  setCheckoutUrl(null);
                  setIsProcessing(null);
                  // Simulate return from Stripe after 2 seconds
                  setTimeout(() => setShowSimulatedLinking(true), 2000);
                }} 
                className="w-full inline-block py-4 rounded-full bg-azure text-slate-950 font-bold uppercase tracking-widest text-xs hover:bg-white hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all mb-4"
              >
                Proceed to Stripe
              </a>
              <button 
                onClick={() => {
                  setCheckoutUrl(null);
                  setIsProcessing(null);
                }} 
                className="text-xs text-slate-500 font-bold uppercase tracking-widest hover:text-white transition-colors"
              >
                Cancel
              </button>
          </div>
        </div>
      )}

      {showSimulatedLinking && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-slate-900 p-8 rounded-[40px] border border-azure/30 max-w-md w-full shadow-[0_0_50px_rgba(0,210,255,0.2)]"
          >
              <div className="w-16 h-16 bg-azure/10 rounded-2xl flex items-center justify-center text-azure mb-6 mx-auto">
                 <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-display font-medium text-white mb-2 tracking-tighter text-center uppercase">Secure Your Payouts</h3>
              <p className="text-xs text-slate-400 mb-8 text-center leading-relaxed uppercase tracking-wider">
                For your safety, payouts will be processed exclusively to the card used for initial payment. Please confirm your card details.
              </p>
              
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Cardholder Name</label>
                    <input 
                      type="text" 
                      value={linkingCard.cardholderName}
                      onChange={e => setLinkingCard({...linkingCard, cardholderName: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors"
                      placeholder="FULL NAME"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Brand</label>
                       <select 
                         value={linkingCard.brand}
                         onChange={e => setLinkingCard({...linkingCard, brand: e.target.value})}
                         className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors"
                       >
                          <option value="Visa">Visa</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="Amex">Amex</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Last 4 Digits</label>
                       <input 
                         type="text" 
                         maxLength={4}
                         value={linkingCard.last4}
                         onChange={e => setLinkingCard({...linkingCard, last4: e.target.value.replace(/\D/g, '')})}
                         className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors font-mono"
                         placeholder="1234"
                       />
                    </div>
                 </div>

                 <button 
                   onClick={async () => {
                     if (linkingCard.last4.length !== 4 || !linkingCard.cardholderName) {
                       alert("Please enter the last 4 digits of your card and the cardholder name.");
                       return;
                     }
                     await linkPaymentMethod(linkingCard);
                     setShowSimulatedLinking(false);
                     addNotification({
                        title: "Success!",
                        message: "Card saved. You can now request payouts to this card.",
                        type: "success"
                     });
                   }}
                   className="w-full py-4 bg-azure rounded-2xl text-slate-950 font-bold uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all mt-4"
                 >
                   Save Card for Payouts
                 </button>
                 <button 
                  onClick={() => setShowSimulatedLinking(false)}
                  className="w-full py-2 text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors mt-2"
                >
                  I'll do this later
                </button>
              </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Row sub-helpers for clean matching layout
const getTierStyle = (allocation: number, isPopularPackage: boolean) => {
  if (allocation >= 250000) {
    return {
      borderClass: "border-2 border-slate-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] bg-slate-950/40 z-10",
      textClass: "text-slate-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]",
      nameClass: "text-slate-300",
      badgeBg: "bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950",
      priceClass: "text-slate-200 font-bold",
      btnClass: "bg-slate-200 text-slate-950 hover:bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-[1.02]",
      rowValueClass: "text-slate-300",
      rowBg: "bg-white/[0.02]",
      bgGlow: "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14)_0%,transparent_70%)] animate-pulse pointer-events-none z-0"
    };
  } else if (allocation >= 100000) {
    return {
      borderClass: "border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.25)] bg-amber-950/10 z-10 scale-[1.01]",
      textClass: "text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]",
      nameClass: "text-amber-300 font-black",
      badgeBg: "bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 text-slate-950",
      priceClass: "text-amber-400 font-extrabold",
      btnClass: "bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-[1.02]",
      rowValueClass: "text-amber-200",
      rowBg: "bg-amber-500/[0.02]",
      bgGlow: "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.16)_0%,transparent_75%)] animate-pulse pointer-events-none z-0"
    };
  } else if (allocation >= 50000) {
    return {
      borderClass: "border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)] bg-cyan-950/10 z-10",
      textClass: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]",
      nameClass: "text-cyan-400 font-black",
      badgeBg: "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950",
      priceClass: "text-cyan-400 font-extrabold",
      btnClass: "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:scale-[1.02]",
      rowValueClass: "text-cyan-200",
      rowBg: "bg-cyan-500/[0.02]",
      bgGlow: "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.16)_0%,transparent_75%)] animate-pulse pointer-events-none z-0"
    };
  } else if (allocation >= 25000 || isPopularPackage) {
    return {
      borderClass: "border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.25)] bg-emerald-950/10 z-10",
      textClass: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.45)]",
      nameClass: "text-emerald-400 font-black",
      badgeBg: "bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950",
      priceClass: "text-emerald-400 font-extrabold",
      btnClass: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:scale-[1.02]",
      rowValueClass: "text-emerald-200",
      rowBg: "bg-emerald-500/[0.02]",
      bgGlow: "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16)_0%,transparent_75%)] animate-pulse pointer-events-none z-0"
    };
  } else {
    return {
      borderClass: "border border-white/5 bg-slate-950/30 hover:border-white/10",
      textClass: "text-slate-300",
      nameClass: "text-slate-500 font-bold",
      badgeBg: "bg-slate-800 text-slate-300",
      priceClass: "text-white font-bold",
      btnClass: "bg-slate-800 hover:bg-slate-700 border border-white/10 text-white hover:scale-[1.02]",
      rowValueClass: "text-slate-300",
      rowBg: "",
      bgGlow: "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,transparent_75%)] pointer-events-none z-0"
    };
  }
};

const getSliderColor = (allocation: number) => {
  if (allocation >= 250000) return { 
    active: 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.75)]', 
    text: 'text-slate-100 font-extrabold drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]', 
    inactive: 'text-slate-400/50 hover:text-slate-300 font-bold',
    bg: 'rgba(255,255,255,0.08)',
    activeColor: '#f1f5f9'
  };
  if (allocation >= 100000) return { 
    active: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.75)]', 
    text: 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]', 
    inactive: 'text-amber-500/40 hover:text-amber-400 font-bold',
    bg: 'rgba(245,158,11,0.08)',
    activeColor: '#fbbf24'
  };
  if (allocation >= 50000) return { 
    active: 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.75)]', 
    text: 'text-cyan-400 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]', 
    inactive: 'text-cyan-500/40 hover:text-cyan-400 font-bold',
    bg: 'rgba(6,182,212,0.08)',
    activeColor: '#22d3ee'
  };
  if (allocation >= 25000) return { 
    active: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]', 
    text: 'text-emerald-400 font-extrabold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]', 
    inactive: 'text-emerald-500/40 hover:text-emerald-400 font-bold',
    bg: 'rgba(16,185,129,0.08)',
    activeColor: '#34d399'
  };
  return { 
    active: 'bg-azure shadow-[0_0_12px_rgba(0,210,255,0.75)]', 
    text: 'text-azure font-extrabold drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]', 
    inactive: 'text-sky-500/45 hover:text-sky-400 font-bold',
    bg: 'rgba(0,140,255,0.08)',
    activeColor: '#00d2ff'
  };
};

const RowMobileDetail = ({ 
  label, 
  val, 
  desc, 
  icon: Icon, 
  isCheck, 
  highlightClass 
}: { 
  label: string; 
  val: string; 
  desc?: string; 
  icon: any; 
  isCheck?: boolean; 
  highlightClass?: string;
}) => (
  <div className="flex items-center justify-between p-4 hover:bg-white/[0.01] transition-colors border-b border-white/[0.03]">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-950/40 border border-white/[0.03] flex items-center justify-center shrink-0">
        <Icon className="text-azure" size={14} />
      </div>
      <div className="flex flex-col text-left">
        <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">{label}</span>
        {desc && <span className="text-[9px] text-slate-500 font-medium tracking-wide mt-0.5 leading-tight">{desc}</span>}
      </div>
    </div>
    <div className="text-right">
      {isCheck ? (
        <span className="text-emerald-400 text-sm font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">✓</span>
      ) : (
        <span className={`text-[12px] font-extrabold ${highlightClass || "text-white"}`}>{val}</span>
      )}
    </div>
  </div>
);

const RowLabel = ({ label, desc, icon: Icon }: { label: string; desc?: string; icon: any }) => (
  <div className="h-[34px] flex items-center gap-2 px-3 border-b border-white/[0.03]">
    <Icon className="text-azure shrink-0" size={12} />
    <div className="flex flex-col text-left">
      <span className="text-slate-300 text-[9.5px] font-bold uppercase tracking-wider leading-none">{label}</span>
      {desc && <span className="text-[7.5px] text-slate-500 font-semibold tracking-widest leading-none mt-0.5">{desc}</span>}
    </div>
  </div>
);

const RowValue = ({ val, isCheck, isCross, textClass, rowBg }: { val: string; isCheck?: boolean; isCross?: boolean; textClass?: string; rowBg?: string }) => (
  <div className={`h-[34px] flex items-center justify-center px-3 border-b border-white/[0.03] text-center text-[10px] font-bold ${rowBg || ''}`}>
    {isCheck ? (
      <span className="text-emerald-400 text-xs font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">✓</span>
    ) : isCross ? (
      <span className="text-slate-600 text-xs font-semibold">×</span>
    ) : (
      <span className={`text-[10.5px] ${textClass || "text-white"}`}>{val}</span>
    )}
  </div>
);

function EditPackageModal({ pkg, onClose, onSave, isNew }: { pkg: ShopPackage, onClose: () => void, onSave: any, isNew?: boolean }) {
  const [formData, setFormData] = useState({ 
    ...pkg,
    name: pkg.name || "",
    price: pkg.price || 0,
    allocation: pkg.allocation || 0,
    dailyDrawdown: pkg.dailyDrawdown || 0,
    totalDrawdown: pkg.totalDrawdown || 0,
    profitTarget: pkg.profitTarget || 0,
    newsTrading: pkg.newsTrading ?? true,
    weekendHolding: pkg.weekendHolding ?? true,
    isPopular: pkg.isPopular ?? false,
    platformFees: pkg.platformFees || {},
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative glass-cyan p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] w-full max-w-lg border-white/10 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
           <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter">Edit Challenge Tier</h3>
           <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-azure"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Price ($)</label>
              <input 
                type="number" 
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-azure"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Allocation ($)</label>
              <input 
                type="number" 
                value={formData.allocation}
                onChange={(e) => setFormData({ ...formData, allocation: Number(e.target.value) })}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-azure"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Daily DD (%)</label>
              <input 
                type="number" 
                value={formData.dailyDrawdown}
                onChange={(e) => setFormData({ ...formData, dailyDrawdown: Number(e.target.value) })}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-azure"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Total DD (%)</label>
              <input 
                type="number" 
                value={formData.totalDrawdown}
                onChange={(e) => setFormData({ ...formData, totalDrawdown: Number(e.target.value) })}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-azure"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Profit Target (%)</label>
              <input 
                type="number" 
                value={formData.profitTarget}
                onChange={(e) => setFormData({ ...formData, profitTarget: Number(e.target.value) })}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-azure"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.newsTrading}
                onChange={(e) => setFormData({ ...formData, newsTrading: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-white/5 border border-white/10 rounded-full peer peer-checked:bg-azure peer-checked:border-azure transition-all relative">
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">News Trading</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.weekendHolding}
                onChange={(e) => setFormData({ ...formData, weekendHolding: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-white/5 border border-white/10 rounded-full peer peer-checked:bg-azure peer-checked:border-azure transition-all relative">
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekend Holding</span>
            </label>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <p className="text-[10px] font-bold text-azure uppercase tracking-widest">Platform Specific Fees ($)</p>
            <div className="grid grid-cols-1 gap-4">
              {(['GOO'] as TradingPlatform[]).map(platform => (
                <div key={platform}>
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">{platform}</label>
                  <input 
                    type="number" 
                    value={formData.platformFees?.[platform] ?? 0}
                    onChange={(e) => {
                      const newFees = { ...(formData.platformFees || {}) };
                      newFees[platform] = Number(e.target.value);
                      setFormData({ ...formData, platformFees: newFees });
                    }}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-azure"
                  />
                </div>
              ))}
            </div>
            <p className="text-[8px] text-slate-500 italic">Values can be positive (fee), zero (no cost), or negative (discount).</p>
          </div>

          <div>
             <label className="flex items-center gap-3 cursor-pointer">
               <input 
                 type="checkbox" 
                 checked={formData.isPopular}
                 onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                 className="sr-only peer"
               />
               <div className="w-12 h-6 bg-white/5 border border-white/10 rounded-full peer peer-checked:bg-azure peer-checked:border-azure transition-all relative">
                 <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform" />
               </div>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mark as Popular</span>
             </label>
          </div>

          <button 
            type="button"
            onClick={() => {
              if (isNew) {
                onSave(formData);
              } else {
                onSave(pkg.id, formData);
              }
              onClose();
            }}
            className="w-full py-4 bg-azure rounded-xl text-slate-950 font-bold uppercase tracking-widest shadow-lg shadow-azure/20"
          >
            {isNew ? 'Create Package' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
