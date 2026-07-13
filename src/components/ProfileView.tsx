import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../AppContext';
import { User, Mail, Phone, ShieldCheck, Trash2, Key, Upload, CheckCircle2, AlertCircle, Save, Camera, Clock, Activity, TrendingUp, TrendingDown, Target, Globe } from 'lucide-react';
import ThreeDCard from './ThreeDCard';
import Logo from './Logo';
import { TradingAccount } from '../types';

const COUNTRIES_LIST = {
  RO: 'Romania',
  FR: 'France',
  GB: 'United Kingdom',
  US: 'United States',
  DE: 'Germany',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  CH: 'Switzerland',
  AE: 'United Arab Emirates',
  CA: 'Canada',
  AU: 'Australia',
  SG: 'Singapore',
  JP: 'Japan',
};

export default function ProfileView() {
  const { user, updateUserProfile, deleteAccount, submitVerification } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kycRef1 = useRef<HTMLInputElement>(null);
  const kycRef2 = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'identity' | 'analytics'>('identity');

  const [doc1, setDoc1] = useState<string | null>(null);
  const [doc2, setDoc2] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    country: user?.country || 'RO',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        country: user.country || 'RO',
      });
    }
  }, [user]);

  const PRESET_AVATARS = [
    // Adventurer style Family
    { id: 'adv-1', label: 'Jack (Adventurer)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack' },
    { id: 'adv-2', label: 'Pepper (Adventurer)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Pepper' },
    { id: 'adv-3', label: 'Snuggles (Adventurer)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Snuggles' },
    { id: 'adv-4', label: 'Bella (Adventurer)', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bella' },
    
    // Lorelei style Family
    { id: 'lor-1', label: 'Sasha (Lorelei)', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sasha' },
    { id: 'lor-2', label: 'Coco (Lorelei)', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Coco' },
    { id: 'lor-3', label: 'Tinkerbell (Lorelei)', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Tinkerbell' },
    { id: 'lor-4', label: 'Shadow (Lorelei)', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Shadow' },

    // Notionists style Family
    { id: 'not-1', label: 'Felix (Notionist)', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix' },
    { id: 'not-2', label: 'Sara (Notionist)', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sara' },
    { id: 'not-3', label: 'Oliver (Notionist)', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Oliver' },
    { id: 'not-4', label: 'Kiki (Notionist)', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Kiki' },

    // Avataaars style Family
    { id: 'ava-1', label: 'Milo (Avatar)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo' },
    { id: 'ava-2', label: 'Harley (Avatar)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Harley' },
    { id: 'ava-3', label: 'Buster (Avatar)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Buster' },
    { id: 'ava-4', label: 'Patches (Avatar)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Patches' },

    // Micah style Family
    { id: 'mic-1', label: 'Max (Micah)', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Max' },
    { id: 'mic-2', label: 'Mimi (Micah)', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Mimi' },
    { id: 'mic-3', label: 'Cleo (Micah)', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Cleo' },
    { id: 'mic-4', label: 'Toby (Micah)', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Toby' },
  ];

  const handleUpdate = () => {
    if (user) {
      updateUserProfile(formData);
      alert('Identity profile synchronized with institutional servers.');
    }
  };

  const handleKYCSubmit = () => {
    if (doc1 && doc2) {
      submitVerification([
        { type: 'id', url: doc1 },
        { type: 'residence', url: doc2 }
      ]);
    } else {
      alert('Institutional Protocol requires both identification and proof of residence.');
    }
  };

  const handleSelectPreset = (url: string) => {
    if (user) {
      updateUserProfile({ avatar: url });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'kyc1' | 'kyc2') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(type);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'avatar' && user) {
        updateUserProfile({ avatar: base64String });
      } else if (type === 'kyc1') {
        setDoc1(base64String);
      } else if (type === 'kyc2') {
        setDoc2(base64String);
      }
      setIsUploading(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 sm:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-4">
          <Logo textClassName="text-xl" />
          <div className="space-y-2">
             <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tighter uppercase leading-none">
               {activeTab === 'identity' ? 'IDENTITY' : 'TRADING'} <span className="text-azure">{activeTab === 'identity' ? 'SETTINGS' : 'ANALYTICS'}</span>
             </h1>
             <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">
               {activeTab === 'identity' ? 'Global Protocol Management' : 'Performance Tracking & Risk Parameters'}
             </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('identity')}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === 'identity' ? 'bg-cyan-500 text-slate-950' : 'text-slate-500 hover:text-white'
              }`}
            >
              Identity
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === 'analytics' ? 'bg-cyan-500 text-slate-950' : 'text-slate-500 hover:text-white'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'identity' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-8">
            <ThreeDCard className="glass p-8 rounded-[32px] border-white/5 space-y-8" glowColor="rgba(0, 242, 255, 0.05)">
              <div className="flex items-center gap-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative w-20 h-20 rounded-3xl bg-azure/10 border border-azure/20 flex items-center justify-center cursor-pointer transition-all hover:border-azure overflow-hidden"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-azure font-display text-3xl font-bold">{user?.name.charAt(0)}</span>
                  )}
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileUpload(e, 'avatar')} 
                  />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter">{user?.name}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{user?.status} Account</p>
                    {user?.verificationStatus === 'verified' ? (
                        <div className="flex items-center gap-1 text-green-400 text-[10px] font-bold uppercase tracking-widest">
                           <CheckCircle2 size={12} /> Verified
                        </div>
                      ) : user?.verificationStatus === 'pending' ? (
                        <div className="flex items-center gap-1 text-azure text-[10px] font-bold uppercase tracking-widest">
                           <Clock size={12} className="animate-pulse" /> Pending
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold uppercase tracking-widest">
                           <AlertCircle size={12} /> Unverified
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Institutional Avatar Selection</label>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-7 gap-3 max-h-[260px] overflow-y-auto pr-2 p-1 bg-slate-950/20 rounded-2xl border border-white/5">
                  {PRESET_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => handleSelectPreset(avatar.url)}
                      title={avatar.label}
                      className={`relative aspect-square rounded-2xl bg-white/5 border overflow-hidden transition-all hover:scale-105 active:scale-95 ${user?.avatar === avatar.url ? 'border-azure ring-2 ring-azure/20' : 'border-white/10 hover:border-white/20'}`}
                    >
                      <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                      {user?.avatar === avatar.url && (
                        <div className="absolute inset-0 bg-azure/25 flex items-center justify-center backdrop-blur-[1px]">
                          <CheckCircle2 size={18} className="text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-white hover:border-white/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Camera size={18} />
                    <span className="text-[8px] font-bold uppercase tracking-tighter">Custom</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-azure transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Institutional Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-azure transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Identity Contact (Phone)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-azure transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Country Flag (Privacy Location)</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select 
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-azure transition-all appearance-none" 
                    >
                      {Object.entries(COUNTRIES_LIST).map(([code, name]) => (
                        <option key={code} value={code} className="bg-slate-900 text-white">
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <button 
                    onClick={handleUpdate}
                    className="w-full md:w-auto md:px-10 h-[52px] bg-white text-slate-950 font-bold rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Sync Account
                  </button>
                </div>
              </div>
            </ThreeDCard>

            <div className="glass p-8 rounded-[32px] border-white/5 space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="text-azure" size={18} /> KYC Protocol
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed uppercase">
                Upload institutional-grade identification to unlock maximum allocation and payouts. 
                <span className="text-toxic-orange font-bold ml-1">Note: Verification is mandatory to request payouts.</span>
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div 
                   onClick={() => kycRef1.current?.click()}
                   className={`group border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${doc1 ? 'border-azure/40 bg-azure/5' : 'border-white/10 bg-white/5 hover:border-azure/40'}`}
                 >
                    {doc1 ? (
                      <img src={doc1} alt="ID" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <Upload className="text-slate-600 group-hover:text-azure transition-colors" size={32} />
                    )}
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{doc1 ? 'Passport Linked' : 'Passport / ID Card'}</span>
                    <input type="file" ref={kycRef1} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'kyc1')} />
                 </div>
                 <div 
                   onClick={() => kycRef2.current?.click()}
                   className={`group border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${doc2 ? 'border-azure/40 bg-azure/5' : 'border-white/10 bg-white/5 hover:border-azure/40'}`}
                 >
                    {doc2 ? (
                      <img src={doc2} alt="Residence" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <Upload className="text-slate-600 group-hover:text-azure transition-colors" size={32} />
                    )}
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{doc2 ? 'Residence Doc Linked' : 'Proof of Residence'}</span>
                    <input type="file" ref={kycRef2} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'kyc2')} />
                 </div>
              </div>

              {doc1 && doc2 && user?.verificationStatus !== 'verified' && user?.verificationStatus !== 'pending' && (
                <button 
                  onClick={handleKYCSubmit}
                  className="w-full py-4 bg-azure text-slate-950 font-bold rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={20} /> Submit for Institutional Review
                </button>
              )}
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <ThreeDCard className="glass p-8 rounded-3xl border-white/10 bg-slate-900/50" glowColor="rgba(255, 255, 255, 0.05)">
              <div className="flex items-center gap-3 mb-6">
                 <Key className="text-azure" size={20} />
                 <h3 className="text-sm font-bold text-white uppercase tracking-widest">Security</h3>
              </div>
              <button className="w-full py-3 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/5 transition-all mb-4">
                Change Secret Key
              </button>
              <button className="w-full py-3 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/5 transition-all">
                2FA Allocation Sync
              </button>
            </ThreeDCard>

            <div className="glass p-8 rounded-3xl border-red-500/10 space-y-6">
              <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={18} /> Danger Zone
              </h3>
              <p className="text-[10px] text-slate-500 uppercase leading-relaxed">Account termination is synchronous and irreversible. All allocation data will be purged.</p>
              
              {isDeleting ? (
                <div className="space-y-3">
                   <button 
                     onClick={deleteAccount}
                     className="w-full py-3 bg-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                   >
                     Confirm Purge
                   </button>
                   <button 
                     onClick={() => setIsDeleting(false)}
                     className="w-full py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                   >
                     Abort
                   </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsDeleting(true)}
                  className="w-full py-3 border border-red-500/20 text-red-500 font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500/5 transition-all"
                >
                  Request Termination
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <AnalyticsPanel user={user!} />
      )}
    </div>
  );
}

function AnalyticsPanel({ user }: { user: any }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const accounts = user?.tradingAccounts || [];
  
  // Set default account if none selected
  useMemo(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const activeAccount: TradingAccount | undefined = accounts.find((a: any) => a.id === selectedAccountId);

  if (!user?.tradingAccounts || user.tradingAccounts.length === 0) {
    return (
      <div className="glass p-12 rounded-[40px] border-white/5 flex flex-col items-center text-center space-y-6">
        <Activity size={48} className="text-slate-600" />
        <div>
           <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">No Active Protocols</h3>
           <p className="text-slate-500 uppercase tracking-widest text-sm mt-2">Visit the Shop to configure an allocation.</p>
        </div>
      </div>
    );
  }

  if (!activeAccount) return null;

  const currentEquity = activeAccount.equity ?? activeAccount.balance ?? 0;
  const initialBalance = activeAccount.initialBalance ?? activeAccount.balance ?? 0;
  const growth = ((currentEquity - initialBalance) / initialBalance) * 100;
  const dailyDrawdown = activeAccount.rules?.dailyDrawdown ?? 0;
  const maxDrawdown = activeAccount.rules?.maxDrawdown ?? 0;
  const target = activeAccount.rules?.profitTarget ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Account Selector */}
      <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-2">
         {accounts.map((acc: any) => (
           <button
             key={acc.id}
             onClick={() => setSelectedAccountId(acc.id)}
             className={`px-6 py-4 border rounded-2xl flex flex-col items-start min-w-[200px] transition-all ${
               selectedAccountId === acc.id 
               ? 'bg-azure/5 border-azure/30 shadow-[0_0_20px_rgba(0,242,255,0.05)]' 
               : 'bg-white/5 border-white/5 opacity-50 hover:opacity-100 hover:border-white/20'
             }`}
           >
             <div className="flex items-center justify-between w-full mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{acc.platform}</span>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                  acc.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'
                }`}>
                  {acc.status}
                </span>
             </div>
             <div className="text-xl font-mono font-bold text-white">${(acc.equity ?? acc.balance)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
             <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Acc: {acc.accountNumber}</div>
           </button>
         ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ThreeDCard className="glass p-6 rounded-3xl" glowColor="rgba(0, 255, 0, 0.05)">
          <div className="flex justify-between items-start mb-4">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Equity</span>
             <Activity className="text-azure" size={16} />
          </div>
          <div className={`text-3xl font-mono font-bold ${currentEquity >= initialBalance ? 'text-green-400' : 'text-red-400'}`}>
            ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">Starting: ${initialBalance.toLocaleString()}</div>
        </ThreeDCard>
        
        <ThreeDCard className="glass p-6 rounded-3xl" glowColor="rgba(0, 242, 255, 0.05)">
          <div className="flex justify-between items-start mb-4">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Growth Factor</span>
             {growth >= 0 ? <TrendingUp className="text-green-400" size={16} /> : <TrendingDown className="text-red-400" size={16} />}
          </div>
          <div className={`text-3xl font-display font-bold ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {growth >= 0 ? '+' : ''}{growth.toFixed(2)}%
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">All Time</div>
        </ThreeDCard>
        
        <ThreeDCard className="glass p-6 rounded-3xl" glowColor="rgba(255, 0, 0, 0.05)">
          <div className="flex justify-between items-start mb-4">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Daily Limit</span>
             <ShieldCheck className="text-orange-400" size={16} />
          </div>
          <div className="text-xl font-mono font-bold text-white">
            ${dailyDrawdown.toLocaleString()} Limit
          </div>
          <div className="mt-2 w-full bg-white/5 h-2 rounded-full overflow-hidden">
             <div className="bg-orange-400 h-full" style={{ width: `${Math.min(100, Math.max(0, ((initialBalance - currentEquity) / dailyDrawdown) * 100))}%` }}></div>
          </div>
        </ThreeDCard>

        <ThreeDCard className="glass p-6 rounded-3xl" glowColor="rgba(0, 242, 255, 0.05)">
          <div className="flex justify-between items-start mb-4">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Profit Target</span>
             <Target className="text-azure" size={16} />
          </div>
          <div className="text-xl font-mono font-bold text-white">
             ${target.toLocaleString()} Obj.
          </div>
          <div className="mt-2 w-full bg-white/5 h-2 rounded-full overflow-hidden">
             <div className="bg-azure h-full" style={{ width: `${Math.max(0, Math.min(100, ((currentEquity - initialBalance) / target) * 100))}%` }}></div>
          </div>
        </ThreeDCard>
      </div>

      <div className="glass rounded-[32px] overflow-hidden border border-white/5">
         <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold text-xl text-white uppercase tracking-tighter">Transaction Ledger</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
               <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                     <th className="p-6">Symbol</th>
                     <th className="p-6">Type</th>
                     <th className="p-6">Open Price</th>
                     <th className="p-6">Lots</th>
                     <th className="p-6 text-right">PNL</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {/* Here we show openTrades and history. Currently we'll map openTrades since local terminal stores them */}
                 {activeAccount.openTrades && activeAccount.openTrades.length > 0 ? (
                   activeAccount.openTrades.map((t: any) => (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-6 font-bold text-white text-sm">{t.symbol}</td>
                        <td className="p-6">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.type === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                             {t.type}
                           </span>
                        </td>
                        <td className="p-6 font-mono text-sm text-slate-300">{Number(t.open_price).toFixed(5)}</td>
                        <td className="p-6 font-mono text-sm text-slate-300">{t.lots}</td>
                        <td className="p-6 font-mono text-right font-bold text-slate-500">
                           ACTIVE
                        </td>
                      </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan={5} className="p-12 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 opacity-50">
                       No Active Extracorporeal Trades Logged
                     </td>
                   </tr>
                 )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
