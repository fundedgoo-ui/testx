import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { motion } from 'motion/react';
import { 
  GraduationCap, 
  Verified, 
  BrainCircuit, 
  ExternalLink, 
  ShieldCheck, 
  ChevronRight, 
  TrendingUp, 
  Award, 
  CreditCard, 
  Wallet, 
  AlertCircle, 
  Loader2,
  Plus,
  Trash2,
  Settings,
  FileText,
  Image,
  Video,
  Link as LinkIcon,
  MessageSquare,
  Info,
  Sparkles,
  BookOpen,
  Clock,
  ThumbsUp,
  ShieldAlert,
  Check
} from 'lucide-react';
import { EducatorProfile, EducatorCourse, ContentType } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { rulesTranslations } from '../lib/rulesTranslations';

export default function EducatorsView() {
  const { user, educators } = useApp();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // For MVP, just using a simple layout
  const approvedEducators = educators.filter(e => e.status === 'approved');

  const userApplication = educators.find(e => e.userId === user?.id);
  const myApprovedProfile = approvedEducators.find(e => e.userId === user?.id);

  const [selectedProfile, setSelectedProfile] = useState<EducatorProfile | null>(null);

  const activeProfile = selectedProfile 
    ? (educators.find(e => e.id === selectedProfile.id) || selectedProfile) 
    : null;

  if (activeProfile) {
    return (
      <>
        <EducatorDetail 
          profile={activeProfile} 
          onBack={() => setSelectedProfile(null)} 
          onManage={() => setShowManageModal(true)}
        />
        {showManageModal && myApprovedProfile && (
          <ManageMentorProfileModal 
            profile={myApprovedProfile} 
            onClose={() => setShowManageModal(false)} 
          />
        )}
      </>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {showManageModal && myApprovedProfile && (
        <ManageMentorProfileModal 
          profile={myApprovedProfile} 
          onClose={() => setShowManageModal(false)} 
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <GraduationCap className="text-amber-500" size={32} />
            Mentors & Courses
          </h1>
          <p className="text-slate-400 mt-1">Verified trading strategies, transparent performance, and elite education.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowInfoModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-white/10 flex items-center gap-1.5 text-[11px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] uppercase"
          >
            <Info size={13} className="text-amber-400" />
            BECOME A MENTOR & FORUM RULES
          </button>

          {myApprovedProfile && (
            <button
              onClick={() => setShowManageModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)] flex items-center gap-2"
            >
              <Settings size={18} />
              Mentor Cabinet
            </button>
          )}

          {!userApplication && (
            <button
              onClick={() => setShowApplyModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              Become an Educator
            </button>
          )}
          
          {userApplication && userApplication.status === 'pending' && (
            <div className="px-6 py-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Application Pending Review
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-2 text-white font-bold text-lg border-b border-white/10 pb-4">
            <ShieldCheck className="text-green-500" />
            Platform Verified Mentors
            <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-lg ml-2">Total Transparency</span>
          </div>

          {approvedEducators.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center">
              <BrainCircuit size={48} className="text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-300">No Verified Mentors Yet</h3>
              <p className="text-slate-500 mt-2 max-w-sm">We are currently vetting applications. Only elite traders with consistent, verified track records will be featured here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedEducators.map(educator => (
                <EducatorCard key={educator.id} profile={educator} onSelect={() => setSelectedProfile(educator)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showApplyModal && (
        <ApplicationModal onClose={() => setShowApplyModal(false)} />
      )}

      {showInfoModal && (
        <MentorInfoModal onClose={() => setShowInfoModal(false)} />
      )}

      {/* Disclaimer */}
      <div className="border-t border-white/5 pt-6 text-center">
        <p className="text-[11px] text-slate-500 italic max-w-2xl mx-auto">
          Notice: Anyone who becomes an authorized and verified mentor is no longer allowed to purchase prop accounts from us. Mentors are restricted to selling educational courses, uploading resources, or receiving affiliate commissions (percentage of account sales) through our network referral system.
        </p>
      </div>
    </div>
  );
}

function EducatorCard({ profile, onSelect }: { profile: EducatorProfile; onSelect: () => void }) {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'text-slate-200 border-slate-300';
      case 'gold': return 'text-amber-400 border-amber-500';
      case 'silver': return 'text-slate-400 border-slate-400';
      default: return 'text-orange-400 border-orange-500';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition-colors"
    >
      <div className="p-6 relative text-center border-b border-white/5">
        <div className="mx-auto w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold text-slate-400 mb-4 border border-white/10">
          {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" /> : profile.name[0]}
        </div>
        <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5 flex-wrap">
          {profile.name}
          <Verified className="w-4 h-4 text-green-500" />
        </h3>
        {profile.hasMasterMentorBadge && (
          <div className="mt-1.5 flex justify-center">
            <span className="inline-flex items-center gap-1 text-[9px] bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.3)]">
              <Award size={10} /> Master Mentor
            </span>
          </div>
        )}
        <p className={`text-[10px] inline-block px-2 py-0.5 rounded-full border ${getTierColor(profile.tier)} mt-2 uppercase tracking-widest font-bold bg-white/5`}>
          {profile.tier} TIER
        </p>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-400 line-clamp-3">
          {profile.bio}
        </p>

        <div className="bg-slate-950 rounded-2xl p-4 border border-white/5">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-between mb-2">
            <span>Performance Passport</span>
            <TrendingUp size={12} className="text-green-500" />
          </div>
          <div className="flex items-center justify-between">
             <span className="text-xs text-slate-400">Status</span>
             <span className="text-xs font-bold text-green-500 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> Live Audited</span>
          </div>
          {profile.demoAccountId ? (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
               <span className="text-xs text-slate-400">Profit Factor</span>
               <span className="text-xs font-bold text-white">2.84</span>
            </div>
          ) : (
             <div className="text-xs text-slate-600 mt-2 italic text-center">Allocating Demo Account...</div>
          )}
        </div>

        <button onClick={onSelect} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
          View Profile <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function ApplicationModal({ onClose }: { onClose: () => void }) {
  const { applyAsEducator, user } = useApp();
  const [bio, setBio] = useState('');
  const [link, setLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [lang, setLang] = useState<'en' | 'es' | 'fr'>(() => (localStorage.getItem('market_forum_lang') as 'en' | 'es' | 'fr') || 'en');

  useEffect(() => {
    const handleLangChange = () => {
      const currentLang = (localStorage.getItem('market_forum_lang') as 'en' | 'es' | 'fr') || 'en';
      setLang(currentLang);
    };
    window.addEventListener('market_forum_lang_change', handleLangChange);
    return () => window.removeEventListener('market_forum_lang_change', handleLangChange);
  }, []);

  const changeLang = (newLang: 'en' | 'es' | 'fr') => {
    setLang(newLang);
    localStorage.setItem('market_forum_lang', newLang);
    window.dispatchEvent(new Event('market_forum_lang_change'));
  };

  const T = rulesTranslations[lang];
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'balance'>('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardBrand, setCardBrand] = useState<'Visa' | 'Mastercard' | 'Amex'>('Visa');

  const userBalance = user?.balance || 0;
  const canPayWithBalance = userBalance >= 25;

  // Auto-detect card brand from starting digit
  const handleCardNumberChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setCardNumber(cleaned);
    if (cleaned.startsWith('4')) {
      setCardBrand('Visa');
    } else if (cleaned.startsWith('5')) {
      setCardBrand('Mastercard');
    } else if (cleaned.startsWith('3')) {
      setCardBrand('Amex');
    }
  };

  const handleSubmit = async () => {
    if (!bio.trim()) return alert("Please provide a trading bio");
    
    // Validate payments
    if (paymentMethod === 'balance') {
      if (!canPayWithBalance) {
        return alert("Your account balance is insufficient to pay the $25 administration fee.");
      }
    } else {
      if (!cardName.trim()) return alert("Please enter the cardholder name");
      if (cardNumber.length < 12) return alert("Please enter a valid credit card number");
      if (!cardExpiry.includes('/')) return alert("Please enter expiration date in MM/YY format");
      if (cardCvv.length < 3) return alert("Please enter a valid CVV");
    }

    try {
      setIsSubmitting(true);
      
      const last4 = cardNumber.slice(-4) || '4242';
      const cardDetails = paymentMethod === 'card' ? {
        last4,
        brand: cardBrand,
        cardholderName: cardName
      } : undefined;

      await applyAsEducator(bio, { website: link }, paymentMethod, cardDetails);
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3500);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to process $25 administration fee and submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!acceptedRules) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl my-8 flex flex-col text-slate-300 max-h-[90vh]"
        >
          {/* Header with Flags */}
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="text-amber-500 shrink-0" size={24} />
              <div>
                <h2 className="text-lg font-display font-black uppercase text-white tracking-tight">
                  {T.Title}
                </h2>
                <p className="text-xs text-slate-400">
                  {T.Subtitle_Gate}
                </p>
              </div>
            </div>

            {/* Language Selectors */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/5 self-start sm:self-auto shrink-0 font-sans">
              <button
                onClick={() => changeLang('en')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${lang === 'en' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="English"
              >
                <span>🇬🇧</span>
                <span className="text-[9px]">EN</span>
              </button>
              <button
                onClick={() => changeLang('es')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${lang === 'es' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="Español"
              >
                <span>🇪🇸</span>
                <span className="text-[9px]">ES</span>
              </button>
              <button
                onClick={() => changeLang('fr')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${lang === 'fr' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="Français"
              >
                <span>🇫🇷</span>
                <span className="text-[9px]">FR</span>
              </button>
            </div>
          </div>

          {/* Rules Body */}
          <div className="p-1 overflow-y-auto space-y-6 my-4 pr-1 text-sm leading-relaxed max-h-[55vh]">
            {/* Step List */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-amber-400 uppercase tracking-widest text-[11px]">
                {T.Part1_Title}
              </h3>
              
              <div className="space-y-3.5">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0 text-[9px] mt-0.5 font-sans">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{T.P1_Step1_Title}</h4>
                    <p className="text-slate-400 text-[11px] leading-normal">{T.P1_Step1_Desc}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0 text-[9px] mt-0.5 font-sans">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{T.P1_Step2_Title}</h4>
                    <p className="text-slate-400 text-[11px] leading-normal">{T.P1_Step2_Desc}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0 text-[9px] mt-0.5 font-sans">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{T.P1_Step3_Title}</h4>
                    <p className="text-slate-400 text-[11px] leading-normal">{T.P1_Step3_Desc}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Posting rules */}
            <div className="space-y-2">
              <h3 className="font-extrabold text-amber-400 uppercase tracking-widest text-[11px]">
                {T.Part2_Title}
              </h3>
              <p className="text-slate-400 text-[11px] leading-normal">
                {T.P2_Intro}
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-400 leading-normal">
                <li>{T.P2_Bullet1}</li>
                <li>{T.P2_Bullet2}</li>
                <li>{T.P2_Bullet3}</li>
              </ul>
            </div>

            {/* Restriction Alert */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3">
              <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-bold text-red-400 text-xs uppercase tracking-wider mb-1">{T.Restriction_Title}</h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  {T.Restriction_Desc}
                </p>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="border-t border-slate-800 pt-4 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition-all"
            >
              {T.Btn_Reject}
            </button>
            <button 
              onClick={() => setAcceptedRules(true)}
              className="flex-[1.5] px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(245,158,11,0.2)]"
            >
              <Check size={14} />
              {T.Btn_Accept}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl my-8"
      >
        {success ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400 mx-auto border border-green-500/20">
              <Verified size={36} className="animate-bounce" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-black uppercase text-white tracking-tight">Application Submitted!</h2>
              <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                Your $25 administration fee has been processed. Our admin team will review your profile to award your candidate live account details.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-950 rounded-xl border border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
               Fee Status: <span className="text-green-400">Paid ($25.00)</span>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-display font-black uppercase text-white tracking-tight flex items-center gap-2">
                <GraduationCap className="text-amber-500" /> Apply as a Mentor
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Submit your profile for verification. To maintain high-caliber portfolios, candidates pay a non-refundable <strong>$25 administrator processing fee</strong>.
              </p>
            </div>

            <div className="space-y-5">
              {/* Profile Bio */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Trading Bio & Portfolio Strategy</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-sm outline-none focus:border-amber-500 min-h-[90px] placeholder-slate-600 transition-colors"
                  placeholder="Share your primary strategies, consistency stats, and background..."
                ></textarea>
              </div>

              {/* Website Input */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Personal Website, YouTube or Public Track Record url</label>
                <input 
                  type="text" 
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-sm outline-none focus:border-amber-500 placeholder-slate-600 transition-colors"
                  placeholder="https://mytrackrecord.com/username"
                />
              </div>

              {/* 💵 Payment Choice Section */}
              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select $25 administration fee method</span>
                  <span className="text-[11px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/10">Amount: $25.00</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Credit Card Selector */}
                  <button 
                    type="button" 
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all text-sm font-bold ${
                      paymentMethod === 'card' 
                        ? 'border-amber-500/40 bg-amber-500/5 text-amber-400' 
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard size={18} />
                    <span>Credit Card</span>
                  </button>

                  {/* Account Balance Selector */}
                  <button 
                    type="button" 
                    onClick={() => {
                      if (canPayWithBalance) setPaymentMethod('balance');
                    }}
                    disabled={!canPayWithBalance}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all text-sm font-bold opacity-100 ${
                      paymentMethod === 'balance' 
                        ? 'border-amber-500/40 bg-amber-500/5 text-amber-400' 
                        : !canPayWithBalance
                          ? 'border-slate-900 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet size={18} />
                      <span>Account Balance</span>
                    </div>
                    <span className={`font-mono text-xs ${canPayWithBalance ? 'text-slate-400' : 'text-red-500/75'}`}>
                      ${userBalance.toFixed(0)}
                    </span>
                  </button>
                </div>

                {/* Simulated credit card details inputs */}
                {paymentMethod === 'card' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3.5 overflow-hidden"
                  >
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cardholder Name</label>
                      <input 
                        type="text" 
                        value={cardName}
                        onChange={e => setCardName(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-800/50 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 placeholder-slate-700 transition-colors"
                        placeholder="CARDHOLDER FULL NAME"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                          Card Number ({cardBrand})
                        </label>
                        <input 
                          type="text" 
                          maxLength={16}
                          value={cardNumber}
                          onChange={e => handleCardNumberChange(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800/50 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 placeholder-slate-700 transition-colors font-mono"
                          placeholder="4000 1234 5678 9010"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Expiry</label>
                          <input 
                            type="text" 
                            maxLength={5}
                            value={cardExpiry}
                            onChange={e => setCardExpiry(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800/50 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 placeholder-slate-700 transition-colors font-mono text-center"
                            placeholder="MM/YY"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">CVV</label>
                          <input 
                            type="password" 
                            maxLength={4}
                            value={cardCvv}
                            onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-slate-950 border border-slate-800/50 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 placeholder-slate-700 transition-colors font-mono text-center"
                            placeholder="***"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Warnings or info blocks regarding the account balance status */}
                {paymentMethod === 'balance' && (
                  <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800/60 flex items-start gap-2.5 text-[11px] leading-relaxed text-slate-400">
                    <Wallet size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p>
                      You are using <strong>${userBalance.toFixed(2)}</strong> from your account balance. Upon submitting, <strong>$25.00</strong> will be deducted immediately, and a custom transaction audit trail will be pushed to your history of purchases.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-[2] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl py-3.5 transition-all text-center flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <span>PAY $25.00 & SUBMIT</span>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function EducatorDetail({ 
  profile, 
  onBack,
  onManage 
}: { 
  profile: EducatorProfile; 
  onBack: () => void;
  onManage?: () => void;
}) {
  const { user, updateUserProfile } = useApp();
  const [purchasedCourses, setPurchasedCourses] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`purchased_courses_${user?.id || 'Guest'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [checkoutCourse, setCheckoutCourse] = useState<EducatorCourse | null>(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<'balance' | 'card'>('balance');

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const isProfileOwner = user?.id === profile.userId;

  // Split products into Free materials / Paid courses
  const allMaterials = profile.courses || [];
  const freeResources = allMaterials.filter(m => !m.price || m.price === 0);
  const paidCourses = allMaterials.filter(m => m.price && m.price > 0);

  const getResourceIcon = (type?: ContentType) => {
    switch (type) {
      case 'pdf': return <FileText className="text-red-400" size={18} />;
      case 'image': return <Image className="text-emerald-400" size={18} />;
      case 'video': return <Video className="text-purple-400" size={18} />;
      case 'youtube': return <Video className="text-red-500" size={18} />;
      default: return <LinkIcon className="text-blue-400" size={18} />;
    }
  };

  const handleBuyCourse = (course: EducatorCourse) => {
    if (!user) {
      alert("You must be logged in to access/purchase courses.");
      return;
    }
    setCheckoutCourse(course);
    setPurchaseSuccess(false);
    setIsProcessingPurchase(false);
  };

  const confirmPurchase = async () => {
    if (!checkoutCourse) return;
    if (paymentChoice === 'balance' && user && user.balance < checkoutCourse.price) {
      alert("Insufficient balance. Please top up your account balance or use a credit card.");
      return;
    }

    setIsProcessingPurchase(true);

    try {
      // Simulate API round-trip delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (paymentChoice === 'balance' && user) {
        // Deduct from balance
        const nextBalance = user.balance - checkoutCourse.price;
        await updateUserProfile({ balance: nextBalance });
      }

      const nextPurchased = [...purchasedCourses, checkoutCourse.id];
      setPurchasedCourses(nextPurchased);
      localStorage.setItem(`purchased_courses_${user?.id || 'Guest'}`, JSON.stringify(nextPurchased));
      setPurchaseSuccess(true);

      setTimeout(() => {
        setCheckoutCourse(null);
      }, 2000);
    } catch (err) {
      alert("Error processing transaction. Please try again.");
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors">
          <ChevronRight size={16} className="rotate-180" /> Back to Mentors
        </button>

        {isProfileOwner && onManage && (
          <button 
            onClick={onManage}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] flex items-center gap-1.5"
          >
            <Settings size={14} /> Manage My Cabinet
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative">
        <div className="h-32 sm:h-48 bg-gradient-to-r from-[#020617] via-slate-900 to-[#020617] w-full absolute top-0 left-0 border-b border-white/5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10" />
        
        <div className="p-6 sm:p-10 relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-end mt-12 sm:mt-20">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl font-bold text-slate-400 border-4 border-slate-900 shadow-xl overflow-hidden">
             {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" /> : profile.name[0]}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl sm:text-4xl font-bold text-white flex items-center gap-3 flex-wrap">
              {profile.name}
              <Verified className="w-6 h-6 text-green-500" />
              {profile.hasMasterMentorBadge && (
                <span className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-slate-950 font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                  <Award size={12} /> Master Mentor
                </span>
              )}
            </h1>
            <div className={`mt-2 text-[10px] sm:text-xs inline-block px-3 py-1 rounded-full border ${
               profile.tier === 'platinum' ? 'text-slate-200 border-slate-300' :
               profile.tier === 'gold' ? 'text-amber-400 border-amber-500' :
               profile.tier === 'silver' ? 'text-slate-400 border-slate-400' : 
               'text-orange-400 border-orange-500'
             } uppercase tracking-widest font-bold bg-white/5`}>
              {profile.tier} Tier Trader
            </div>
            <p className="text-slate-400 mt-4 max-w-xl leading-relaxed">{profile.bio}</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
             <button className="flex-1 md:flex-none px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors shadow-sm">
                Follow
             </button>
             <button className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2">
                <ExternalLink size={16} /> Contact
             </button>
          </div>
        </div>
      </div>

      {/* 🧭 Special Mentor Guidance & Orientation Space */}
      {profile.guidanceText && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500/10 via-slate-950 to-slate-950 border border-blue-500/20 rounded-3xl p-6 md:p-8 space-y-3"
        >
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
            <Info size={16} className="text-blue-500" />
            <span>Mentor Guidance & Orientation</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed">
            {profile.guidanceText}
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           {/* Section 1: Portfolio Performance metrics */}
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <TrendingUp className="text-green-500" /> Live Performance Passport
           </h2>
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
               <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                 <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Win Rate</div>
                 <div className="text-xl font-bold text-green-400">72.4%</div>
               </div>
               <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                 <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Profit Factor</div>
                 <div className="text-xl font-bold text-white">2.84</div>
               </div>
               <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                 <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Max Drawdown</div>
                 <div className="text-xl font-bold text-red-400">2.1%</div>
               </div>
               <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                 <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Months Profitable</div>
                 <div className="text-xl font-bold text-white">4</div>
               </div>
             </div>

             <div className="h-48 w-full border-t border-white/5 pt-6 flex items-end gap-2 overflow-hidden">
               {/* Mock equity curve bars */}
               {Array.from({length: 20}).map((_, i) => (
                 <div key={i} className="flex-1 bg-green-500/20 rounded-t-sm relative group" style={{ height: `${30 + Math.random() * 70}%` }}>
                    <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-transparent to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
               ))}
             </div>
           </div>

           {/* 📁 NEW Section 2: Free Public Resources, PDFs and Charts */}
           <div className="space-y-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <BookOpen className="text-amber-500" /> Free Resources & Materials
             </h2>

             {freeResources.length === 0 ? (
               <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl text-center text-slate-500 text-xs">
                 The mentor has not published free resources yet.
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {freeResources.map(res => (
                   <div 
                     key={res.id}
                     className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
                   >
                     <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                           {getResourceIcon(res.contentType)}
                         </div>
                         <div>
                           <h4 className="text-sm font-bold text-white line-clamp-1">{res.title}</h4>
                           <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Free</span>
                         </div>
                       </div>
                       <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{res.description}</p>
                       
                       {/* 🛑 Highlighted Daily Note for Free materials (Red, pulsating) */}
                       {res.dailyNote && (
                         <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs flex items-start gap-2 animate-pulse mt-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                           <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                           <div className="flex-1">
                             <span className="font-extrabold uppercase tracking-wider block text-[9px] mb-0.5 text-red-400">Daily Mentor Alert</span>
                             <span className="font-medium text-slate-200 text-xs">{res.dailyNote}</span>
                           </div>
                         </div>
                       )}
                     </div>

                     <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end">
                       {res.contentUrl ? (
                         <a 
                           href={res.contentUrl}
                           target="_blank"
                           rel="noreferrer"
                           className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                         >
                           {res.contentType === 'pdf' ? 'Download PDF' : res.contentType === 'image' ? 'View Image' : 'Access Content'} <ExternalLink size={12} />
                         </a>
                       ) : (
                         <span className="text-xs text-slate-600 italic">No link available</span>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>

        {/* Sidebar Space */}
        <div className="space-y-6">
           {/* 💬 Discord Channel card */}
           {profile.discordUrl && (
             <div className="space-y-3">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Community & Chat Support</span>
               <a 
                 href={profile.discordUrl} 
                 target="_blank" 
                 rel="noreferrer"
                 className="flex items-center justify-between p-4.5 bg-[#5865F2]/10 hover:bg-[#5865F2]/15 border border-[#5865F2]/20 rounded-2xl text-white transition-all group"
               >
                 <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-[#5865F2] rounded-xl text-white">
                     <svg className="w-5 h-5 fill-current" viewBox="0 0 127.14 96.36">
                       <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.9-.65,1.76-1.34,2.58-2.06a75.13,75.13,0,0,0,72.63,0c.82.72,1.68,1.4,2.58,2.06a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.58-18.83C129.05,48.12,123.39,25.27,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.71,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                     </svg>
                   </div>
                   <div>
                     <h4 className="text-xs font-black uppercase text-white tracking-tight">VIP Discord Server</h4>
                     <p className="text-[11px] text-slate-400 mt-0.5">Join the educator's live community room</p>
                   </div>
                 </div>
                 <ChevronRight size={16} className="text-[#5865F2] group-hover:text-white transition-colors" />
               </a>
             </div>
           )}

           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <GraduationCap className="text-amber-500" /> Premium Mentorship & Courses
           </h2>
           <div className="space-y-4">
             {paidCourses.length === 0 ? (
               <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl text-center text-slate-500 text-xs">
                 No premium materials published by this mentor yet.
               </div>
             ) : (
               paidCourses.map(course => {
                 const isUnlocked = isProfileOwner || purchasedCourses.includes(course.id);
                 return (
                   <div key={course.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors rounded-2xl p-5 space-y-4 relative overflow-hidden">
                     <div>
                       <div className="flex items-center justify-between gap-2">
                         <h3 className="font-bold text-white text-sm">{course.title}</h3>
                         {isUnlocked && (
                           <span className="text-[9px] font-black uppercase tracking-widest text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-2 py-0.5 rounded-full shrink-0">Unlocked</span>
                         )}
                       </div>
                       <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">{course.description}</p>
                       
                       {/* 🛑 Highlighted Daily Note for VIP/Paid Course (Red, pulsating) */}
                       {course.dailyNote && (
                         <div className="bg-red-500/10 border border-red-500/35 rounded-xl p-3 text-red-400 text-xs flex items-start gap-2 mt-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                           <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                           <div className="flex-1">
                             <div className="font-extrabold uppercase tracking-wider block text-[9px] mb-0.5 text-red-400">Daily Mentor Alert</div>
                             <div className="font-medium text-slate-200 text-xs leading-normal">{course.dailyNote}</div>
                           </div>
                         </div>
                       )}
                     </div>

                     {isUnlocked && course.contentUrl && (
                       <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs mt-2">
                         <div className="flex items-center gap-2">
                           {getResourceIcon(course.contentType)}
                           <span className="font-mono text-slate-300">Materials Unlocked</span>
                         </div>
                         <a 
                           href={course.contentUrl}
                           target="_blank"
                           rel="noreferrer"
                           className="text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 transition-colors"
                         >
                           Access Content <ExternalLink size={12} />
                         </a>
                       </div>
                     )}

                     {!isUnlocked && (
                       <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                         <div className="text-base font-black text-white">${course.price}</div>
                         <button 
                           onClick={() => handleBuyCourse(course)}
                           className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-lg transition-all"
                         >
                           Buy Course
                         </button>
                       </div>
                     )}
                   </div>
                 );
               })
             )}
           </div>
        </div>
      </div>

      {/* 💳 SIMULATED COURSE CHECKOUT POPUP DIALOG */}
      {checkoutCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative"
          >
            {purchaseSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400 mx-auto border border-green-500/20">
                  <Verified size={36} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Payment Completed!</h3>
                  <p className="text-sm text-slate-400 mt-1">First-class material has been successfully unlocked. You now have immediate access!</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-display font-black text-white uppercase tracking-tight">Unlock Premium Materials</h3>
                  <p className="text-xs text-slate-400 mt-1">Submit your billing choice to unlock full lifetime access.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-2 mb-4">
                  <div className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Selected Material</div>
                  <h4 className="text-sm font-bold text-white">{checkoutCourse.title}</h4>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Total Amount:</span>
                    <span className="font-bold text-white text-sm">${checkoutCourse.price}</span>
                  </div>
                </div>

                <div className="space-y-3.5 mb-6">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">Payment Method</span>

                  {/* Payment Choices */}
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button" 
                      onClick={() => setPaymentChoice('balance')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center gap-2 ${
                        paymentChoice === 'balance' 
                          ? 'border-amber-500/40 bg-amber-500/5 text-amber-400' 
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Wallet size={14} /> Balance
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPaymentChoice('card')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center gap-2 ${
                        paymentChoice === 'card' 
                          ? 'border-amber-500/40 bg-amber-500/5 text-amber-400' 
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <CreditCard size={14} /> Credit Card
                    </button>
                  </div>

                  {paymentChoice === 'card' ? (
                    <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Cardholder Name</label>
                        <input 
                          type="text" 
                          value={cardName}
                          onChange={e => setCardName(e.target.value.toUpperCase())}
                          placeholder="EX. JOHN DOE"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-700 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Card Number</label>
                        <input 
                          type="text" 
                          maxLength={16}
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="4000 1234 5678 9010"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-700 outline-none font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
                      <Wallet size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p>
                        A total of <strong>${checkoutCourse.price}</strong> will be debited directly from your available balance of <strong>${user?.balance?.toFixed(2) || '0.00'}</strong>.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setCheckoutCourse(null)}
                    disabled={isProcessingPurchase}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmPurchase}
                    disabled={isProcessingPurchase}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isProcessingPurchase ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Pay Now</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

// 🛠️ COMPREHENSIVE MENTOR MANAGEMENT DASHBOARD MODAL
function ManageMentorProfileModal({ 
  profile, 
  onClose 
}: { 
  profile: EducatorProfile; 
  onClose: () => void;
}) {
  const [localDiscord, setLocalDiscord] = useState(profile.discordUrl || '');
  const [localGuidance, setLocalGuidance] = useState(profile.guidanceText || '');
  
  // New resource creation states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newType, setNewType] = useState<ContentType>('pdf');
  const [newUrl, setNewUrl] = useState('');

  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isAddingResource, setIsAddingResource] = useState(false);

  // Edit-existing-course local states
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editType, setEditType] = useState<ContentType>('pdf');
  const [editDailyNote, setEditDailyNote] = useState('');

  // Update Discord and Guidance fields
  const handleSaveMeta = async () => {
    setIsSavingMeta(true);
    try {
      const docRef = doc(db, 'educators', profile.id);
      await updateDoc(docRef, {
        discordUrl: localDiscord,
        guidanceText: localGuidance
      });
      alert("Profile guidance and Discord settings have been saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error updating profile settings.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  // Add new material/course resource
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return alert("Please enter a resource title.");
    if (!newUrl.trim()) return alert("Please enter a content/file URL.");

    setIsAddingResource(true);
    try {
      const newMaterial: EducatorCourse = {
        id: 'res_' + Date.now(),
        title: newTitle.trim(),
        description: newDesc.trim(),
        price: Number(newPrice) || 0,
        isSubscription: false,
        contentType: newType,
        contentUrl: newUrl.trim(),
        createdAt: Date.now()
      };

      const docRef = doc(db, 'educators', profile.id);
      const updatedMaterials = [...(profile.courses || []), newMaterial];

      await updateDoc(docRef, {
        courses: updatedMaterials
      });

      // Clear states
      setNewTitle('');
      setNewDesc('');
      setNewUrl('');
      setNewPrice(0);
      setNewType('pdf');

      alert("Resource successfully published to your mentor profile!");
    } catch (err) {
      console.error(err);
      alert("Error saving material resource.");
    } finally {
      setIsAddingResource(false);
    }
  };

  // Delete material/course resource
  const handleDeleteResource = async (resourceId: string, resourceTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${resourceTitle}"?`)) return;

    try {
      const docRef = doc(db, 'educators', profile.id);
      const filteredMaterials = (profile.courses || []).filter(c => c.id !== resourceId);

      await updateDoc(docRef, {
        courses: filteredMaterials
      });
      alert("Material deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Error deleting material.");
    }
  };

  // Edit / update course logic
  const startEditing = (course: EducatorCourse) => {
    setEditingCourseId(course.id);
    setEditTitle(course.title);
    setEditDesc(course.description || '');
    setEditUrl(course.contentUrl || '');
    setEditPrice(course.price || 0);
    setEditType(course.contentType || 'pdf');
    setEditDailyNote(course.dailyNote || '');
  };

  const handleSaveCourseEdit = async (courseId: string) => {
    if (!editTitle.trim()) return alert("Title is required.");
    if (!editUrl.trim()) return alert("Content URL is required.");

    try {
      const docRef = doc(db, 'educators', profile.id);
      const updatedMaterials = (profile.courses || []).map(c => {
        if (c.id === courseId) {
          return {
            ...c,
            title: editTitle.trim(),
            description: editDesc.trim(),
            price: Number(editPrice) || 0,
            contentType: editType,
            contentUrl: editUrl.trim(),
            dailyNote: editDailyNote.trim()
          };
        }
        return c;
      });

      await updateDoc(docRef, {
        courses: updatedMaterials
      });

      setEditingCourseId(null);
      alert("Material updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Error updating resource details.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 backdrop-blur-md p-3 sm:p-6 md:p-10 flex justify-center items-start">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-8 shadow-2xl relative my-4 sm:my-8 md:my-12"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-display font-black uppercase text-white tracking-tight flex items-center gap-2">
              <Settings className="text-blue-500" size={20} /> Mentor Control Cabinet
            </h2>
            <p className="text-xs text-slate-400 mt-1">Configure profile orientations, Discord widgets, and student materials (PDFs, templates, VIP charts, private courses).</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase border border-slate-800 hover:border-slate-700 bg-slate-950 py-1.5 px-3 rounded-lg"
          >
            Close (X)
          </button>
        </div>

        <div className="space-y-6">
          {/* Card 1: Header / Discord and guidance text */}
          <div className="bg-slate-950/60 rounded-2xl border border-slate-800/85 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Sparkles size={14} /> Profile Guidance & Discord Settings
            </h3>

            {/* Guidance Text / space */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 font-sans">
                Profile Orientation & Guidance Text
              </label>
              <textarea 
                value={localGuidance}
                onChange={e => setLocalGuidance(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                placeholder="Welcome to my profile! Here you can access premium courses, download guidelines below, or join our community."
              />
              <span className="text-[9px] text-slate-500 block mt-1">This message is showcased beautifully at the top of your public mentor profile to introduce your curriculum.</span>
            </div>

            {/* Discord invite URL */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Discord Invite URL</label>
              <input 
                type="text" 
                value={localDiscord}
                onChange={e => setLocalDiscord(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500 font-mono"
                placeholder="https://discord.gg/your_channel_code"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="button" 
                onClick={handleSaveMeta}
                disabled={isSavingMeta}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                {isSavingMeta ? <Loader2 size={12} className="animate-spin" /> : null}
                <span>Save Settings</span>
              </button>
            </div>
          </div>

          {/* Card 2: Adding Resources (Form) */}
          <form onSubmit={handleAddResource} className="bg-slate-950/60 rounded-2xl border border-slate-800/85 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Plus size={14} /> Publish New Resource (PDF, Video or Course)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Resource Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500"
                  placeholder="e.g. SMC Trend Rider Strategy 2026"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Content Type (Format)</label>
                <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value as ContentType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="image">Chart / Image Asset</option>
                  <option value="youtube">YouTube Video Link</option>
                  <option value="video">Direct Video URL (MP4/Vimeo)</option>
                  <option value="other">General External Link</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Content / File URL</label>
                <input 
                  type="text" 
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500 font-mono"
                  placeholder="https://drive.google.com/..."
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Price (USD) - Use 0 for Free tier</label>
                <input 
                  type="number" 
                  min="0"
                  value={newPrice}
                  onChange={e => setNewPrice(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono"
                  placeholder="0 (Free Resources)"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Short Description</label>
              <textarea 
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500"
                placeholder="Briefly outline what students will learn from this content..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={isAddingResource}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                {isAddingResource ? <Loader2 size={12} className="animate-spin" /> : null}
                <span>Publish to Profile</span>
              </button>
            </div>
          </form>

          {/* Card 3: Resources listed inside list with Details Editor and Delete trigger */}
          <div className="bg-slate-950/60 rounded-2xl border border-slate-800/85 p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <BookOpen size={14} /> Manage Published Materials ({profile.courses?.length || 0})
            </h3>

            {!profile.courses || profile.courses.length === 0 ? (
              <div className="text-center p-6 text-slate-600 text-xs italic">
                You have not published any files or courses yet.
              </div>
            ) : (
              <div className="space-y-4">
                {profile.courses.map(course => (
                  <div key={course.id} className="border border-slate-800/80 rounded-2xl p-3 bg-slate-900/50 hover:border-slate-700/80 transition-colors">
                    
                    {editingCourseId === course.id ? (
                      /* Inline Editor Form */
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveCourseEdit(course.id);
                        }}
                        className="space-y-3 p-1.5 text-left"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                          <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Editing: {course.title}</span>
                          <button 
                            type="button"
                            onClick={() => setEditingCourseId(null)}
                            className="bg-white/5 border border-white/5 text-slate-400 hover:text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Title</label>
                            <input 
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Content Type</label>
                            <select 
                              value={editType}
                              onChange={e => setEditType(e.target.value as ContentType)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                            >
                              <option value="pdf">PDF Document</option>
                              <option value="image">Chart / Image Asset</option>
                              <option value="youtube">YouTube Video Link</option>
                              <option value="video">Direct Video URL (MP4/Vimeo)</option>
                              <option value="other">General External Link</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Content URL</label>
                            <input 
                              type="text"
                              value={editUrl}
                              onChange={e => setEditUrl(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none font-mono"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Price (USD) - 0 is Free</label>
                            <input 
                              type="number"
                              min="0"
                              value={editPrice}
                              onChange={e => setEditPrice(Number(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                          <textarea 
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                          />
                        </div>

                        {/* Red pulsating highlight alert note editor */}
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3.5 space-y-1.5">
                          <label className="text-[9.5px] font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-red-500 animate-pulse shrink-0" /> Daily Highlight Note (Highlighted in pulsation red)
                          </label>
                          <input 
                            type="text"
                            value={editDailyNote}
                            onChange={e => setEditDailyNote(e.target.value)}
                            placeholder="e.g. Daily market notice! Read section 3 on inflation data volatility warning."
                            className="w-full bg-slate-950 border border-red-500/20 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-red-500 font-medium"
                          />
                          <span className="text-[9px] text-slate-500 block">Adding text here instantly promotes this notice in bright red visual panels under this resource on your profile. Clear to remove.</span>
                        </div>

                        <div className="flex justify-end gap-2 pt-1.5">
                          <button 
                            type="button"
                            onClick={() => setEditingCourseId(null)}
                            className="px-2.5 py-1 bg-slate-955 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded text-[10px] font-bold uppercase transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Standard Row View */
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
                        <div className="flex items-start gap-2.5 overflow-hidden">
                          <div className="w-8 h-8 bg-slate-950/80 rounded-lg flex items-center justify-center border border-white/5 shrink-0">
                            {course.contentType === 'pdf' ? <FileText size={16} className="text-red-400" /> :
                             course.contentType === 'image' ? <Image size={16} className="text-emerald-400" /> :
                             course.contentType === 'youtube' ? <Video size={16} className="text-red-500" /> :
                             course.contentType === 'video' ? <Video size={16} className="text-purple-400" /> :
                             <LinkIcon size={16} className="text-sky-400" />}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate">{course.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              <span className="uppercase font-mono">{course.contentType || 'LINK'}</span>
                              <span>•</span>
                              <span className="font-bold text-amber-500">{course.price === 0 ? 'FREE' : `$${course.price}`}</span>
                              {course.dailyNote && (
                                <>
                                  <span>•</span>
                                  <span className="text-[9px] text-red-400 font-extrabold uppercase animate-pulse">Warning Note Attached</span>
                                </>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate max-w-md mt-0.5">{course.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button 
                            type="button" 
                            onClick={() => startEditing(course)}
                            className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/15 text-blue-400 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Edit / Note
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteResource(course.id, course.title)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/15 rounded-lg text-red-400 transition-all"
                            title="Delete Material"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MentorInfoModal({ onClose }: { onClose: () => void }) {
  const [lang, setLang] = useState<'en' | 'es' | 'fr'>(() => (localStorage.getItem('market_forum_lang') as 'en' | 'es' | 'fr') || 'en');

  useEffect(() => {
    const handleLangChange = () => {
      const currentLang = (localStorage.getItem('market_forum_lang') as 'en' | 'es' | 'fr') || 'en';
      setLang(currentLang);
    };
    window.addEventListener('market_forum_lang_change', handleLangChange);
    return () => window.removeEventListener('market_forum_lang_change', handleLangChange);
  }, []);

  const changeLang = (newLang: 'en' | 'es' | 'fr') => {
    setLang(newLang);
    localStorage.setItem('market_forum_lang', newLang);
    window.dispatchEvent(new Event('market_forum_lang_change'));
  };

  const T = rulesTranslations[lang];

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{T.Title}</h2>
              <p className="text-xs text-slate-400">{T.Subtitle_Modal}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            {/* Language Selectors */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => changeLang('en')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${lang === 'en' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="English"
              >
                <span>🇬🇧</span>
                <span className="text-[9px]">EN</span>
              </button>
              <button
                onClick={() => changeLang('es')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${lang === 'es' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="Español"
              >
                <span>🇪🇸</span>
                <span className="text-[9px]">ES</span>
              </button>
              <button
                onClick={() => changeLang('fr')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${lang === 'fr' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="Français"
              >
                <span>🇫🇷</span>
                <span className="text-[9px]">FR</span>
              </button>
            </div>

            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-xl transition-colors text-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm leading-relaxed">
          
          {/* Section: Becoming a Mentor */}
          <div>
            <h3 className="font-extrabold text-amber-400 uppercase tracking-widest text-xs mb-3 border-b border-white/5 pb-1">
              {T.Part1_Title}
            </h3>
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0 text-[10px]">
                    1
                  </div>
                  <div className="w-0.5 flex-1 bg-slate-800 my-1" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{T.P1_Step1_Title}</h4>
                  <p className="text-slate-400 text-xs">
                    {T.P1_Step1_Desc}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0 text-[10px]">
                    2
                  </div>
                  <div className="w-0.5 flex-1 bg-slate-800 my-1" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{T.P1_Step2_Title}</h4>
                  <p className="text-slate-400 text-xs">
                    {T.P1_Step2_Desc}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0 text-[10px]">
                    3
                  </div>
                  <div className="w-0.5 flex-1 bg-slate-800 my-1" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{T.P1_Step3_Title}</h4>
                  <p className="text-slate-400 text-xs">
                    {T.P1_Step3_Desc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Market Analysis Rules */}
          <div>
            <h3 className="font-extrabold text-amber-400 uppercase tracking-widest text-xs mb-3 border-b border-white/5 pb-1">
              {T.Part2_Title}
            </h3>
            
            <div className="space-y-3 text-xs text-slate-400">
              <p>
                {T.P2_Intro}
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  {T.P2_Bullet1}
                </li>
                <li>
                  {T.P2_Bullet2}
                </li>
                <li>
                  {T.P2_Bullet3}
                </li>
              </ul>
            </div>
          </div>

          {/* Special Restriction Banner */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-red-400 text-xs uppercase tracking-wider mb-1">{T.Restriction_Title}</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                {T.Restriction_Desc}
              </p>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-950/40 border-t border-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all text-xs"
          >
            {T.Btn_GotIt}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

