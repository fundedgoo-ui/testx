import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, doc, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { Search, User, Award, ShieldCheck, Mail, Calendar, Check, Send, AlertCircle, FileText, ArrowRight, Star } from 'lucide-react';
import { UserAccount, TradingAccount, Certificate } from '../types';
import { useApp } from '../AppContext';
import CertificateModal from './CertificateModal';

export default function CertificatesTab() {
  const { users, addNotification, addAuditLog, user: adminUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | null>(null);

  // Form states
  const [certType, setCertType] = useState<'phase1' | 'phase2' | 'funded'>('phase1');
  const [signerName, setSignerName] = useState('M. Michael');
  const [customTitle, setCustomTitle] = useState('PHASE 1 PASSED');

  // Success state
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Preview Modal
  const [previewModalActive, setPreviewModalActive] = useState(false);

  // Fetch accounts when user changes
  useEffect(() => {
    if (!selectedUser) {
      setAccounts([]);
      setSelectedAccount(null);
      return;
    }

    const fetchUserAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const snap = await getDocs(collection(db, "users", selectedUser.id, "tradingAccounts"));
        const rawAccounts = snap.docs.map(d => ({ ...d.data(), id: d.id }) as TradingAccount);
        setAccounts(rawAccounts);
        if (rawAccounts.length > 0) {
          setSelectedAccount(rawAccounts[0]);
        } else {
          setSelectedAccount(null);
        }
      } catch (err) {
        console.error("Failed to load user accounts:", err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchUserAccounts();
  }, [selectedUser]);

  // Handle certType change to prefill title
  useEffect(() => {
    if (certType === 'phase1') {
      setCustomTitle('PHASE 1 PASSED');
    } else if (certType === 'phase2') {
      setCustomTitle('EVALUATION GRADUATE');
    } else if (certType === 'funded') {
      setCustomTitle('CERTIFIED FUNDED TRADER');
    }
  }, [certType]);

  // Filter users based on query
  const filteredUsers = searchQuery.trim() === ''
    ? []
    : users.filter(u => 
        !u.isBot && 
        (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 6);

  const handleSendCertificate = async () => {
    if (!selectedUser || !selectedAccount) return;
    setSubmitting(true);
    setStatusMessage(null);

    const certId = 'cert_' + Math.random().toString(36).substr(2, 9);
    const newCertificate: Certificate = {
      id: certId,
      title: customTitle,
      type: certType,
      createdAt: Date.now(),
      signerName: signerName
    };

    try {
      // 1. Fetch updated account document to avoid wiping out other values
      const accDocRef = doc(db, "users", selectedUser.id, "tradingAccounts", selectedAccount.id);
      const accSnap = await getDoc(accDocRef);
      
      let existingCerts: Certificate[] = [];
      if (accSnap.exists()) {
        const accData = accSnap.data() as TradingAccount;
        existingCerts = accData.certificates || [];
      }

      // Check for duplicates of same type to protect database integrity
      if (existingCerts.some(c => c.type === certType)) {
        if (!confirm(`The trader already has a certificate of type "${certType}" on this account. Do you want to send another one?`)) {
          setSubmitting(false);
          return;
        }
      }

      const updatedCerts = [...existingCerts, newCertificate];

      // 2. Perform save inside Firestore Account Document
      await updateDoc(accDocRef, {
        certificates: updatedCerts
      });

      // 3. Trigger Official Push notification
      await addNotification({
        title: `🏆 New Certificate: ${customTitle}`,
        message: `Congratulations! The protocol director has issued an excellence certificate for account #${selectedAccount.accountNumber}. Click to view.`,
        type: 'success',
        data: {
          openCertificate: true,
          accountId: selectedAccount.id,
          certificateId: certId
        }
      }, selectedUser.id);

      // 4. Log inside audit log
      if (adminUser) {
        addAuditLog?.({
          action: 'ISSUE_CERTIFICATE',
          actorId: adminUser.id,
          actorName: adminUser.name,
          actorRole: adminUser.role as any,
          targetId: selectedUser.id,
          targetName: selectedUser.name,
          details: `Issued ${customTitle} certificate (#${certId}) to account ${selectedAccount.accountNumber}`,
          type: 'user_management'
        });
      }

      setStatusMessage({
        type: 'success',
        text: `Certificate "${customTitle}" has been successfully issued and sent to ${selectedUser.name}! The user has been notified.`
      });

      // Re-fetch accounts to show updated certificates list
      const snap = await getDocs(collection(db, "users", selectedUser.id, "tradingAccounts"));
      setAccounts(snap.docs.map(d => ({ ...d.data(), id: d.id }) as TradingAccount));

    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `Issue error: ${err.message || err.toString()}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper mock account for previewing
  const previewAccount: TradingAccount = selectedAccount || {
    id: 'preview',
    userId: selectedUser?.id || 'user',
    platform: 'GOO',
    accountNumber: '8849204',
    broker: 'Goo Broker',
    server: 'Live Server',
    status: 'active',
    leverage: '1:100',
    type: 'evaluation-2',
    createdAt: Date.now()
  };

  const previewCert: Certificate = {
    id: 'preview_id',
    title: customTitle,
    type: certType,
    createdAt: Date.now(),
    signerName: signerName
  };

  return (
    <div className="space-y-8">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-600/5 to-transparent border border-amber-500/20 rounded-[40px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 text-left relative z-10">
          <div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-300 to-yellow-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Award className="w-8 h-8 text-slate-950" />
          </div>
          <div>
            <h2 className="text-xl font-display font-medium text-white tracking-wide uppercase">Gold Certificate Generation</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Support excellence! Search for a trader, select the completed account, and issue premium official certificates with one click.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Search and Select Trader */}
          <div className="bg-slate-900 border border-white/5 p-6 rounded-[28px] relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-[10px]">1</span>
              Search User
            </h3>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter trader's name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>

            {/* Suggestions Search Results List */}
            <AnimatePresence>
              {filteredUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute left-6 right-6 top-24 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-25 max-h-60 overflow-y-auto"
                >
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setSearchQuery('');
                      }}
                      className="w-full px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 text-left flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{u.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected User Display */}
            {selectedUser && (
              <div className="mt-5 p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{selectedUser.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 leading-none">
                      <Mail className="w-3 h-3 text-slate-500" /> {selectedUser.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setSelectedAccount(null);
                    setStatusMessage(null);
                  }}
                  className="text-[10px] font-mono font-bold text-slate-500 hover:text-white uppercase transition-colors"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Select Trading Account */}
          {selectedUser && (
            <div className="bg-slate-900 border border-white/5 p-6 rounded-[28px] animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-[10px]">2</span>
                Select Trading Account
              </h3>

              {loadingAccounts ? (
                <div className="py-6 text-center text-xs text-slate-500 animate-pulse">
                  Loading accounts associated with the trader...
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-2 p-4">
                  <AlertCircle className="w-5 h-5 text-slate-600" />
                  <span>This user has no registered trading accounts.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {accounts.map((acc) => {
                    const isSelected = selectedAccount?.id === acc.id;
                    const hasCerts = acc.certificates && acc.certificates.length > 0;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setSelectedAccount(acc)}
                        className={`w-full p-3.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-slate-950/20 hover:bg-slate-950/50 border-white/5 text-slate-400'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white font-mono">#{acc.accountNumber}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                              acc.type === 'funded' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {acc.type}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Platform: {acc.platform} • Balance: ${(acc.balance || 0).toLocaleString()}
                          </p>
                        </div>

                        {hasCerts ? (
                          <div className="flex flex-col items-end gap-1">
                            {acc.certificates?.map((c) => (
                              <span key={c.id} className="text-[8px] font-bold bg-amber-500 text-slate-950 px-1 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wide">
                                <Award className="w-2.5 h-2.5" /> {c.type}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configure Certificate Details */}
          <div className={`bg-slate-900 border border-white/5 p-6 rounded-[28px] transition-all duration-300 space-y-4 ${!(selectedUser && selectedAccount) ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-[10px]">3</span>
              Certificate Configuration
            </h3>

            {!selectedUser && (
              <div className="text-xs text-slate-500 mb-2">
                *Select a user and an account to unlock the form.
              </div>
            )}

            {/* Milestone Dropdown */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Milestone Stage</label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="phase1">Phase 1 Certificate (Phase 1 Passed)</option>
                  <option value="phase2">Phase 2 Certificate (Phase 2 Passed / Finalized)</option>
                  <option value="funded">Live Account Certificate (Funded Partner)</option>
                </select>
              </div>

              {/* Signature Name Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Signature Director (Protocol Director)</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter signer's name..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Custom Title */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Certificate Title</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="EX: PHASE 1 PASSED"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Status Notifications Panel */}
              {statusMessage && (
                <div className={`p-3.5 rounded-xl text-xs flex gap-2.5 items-start ${
                  statusMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Final Submit and Preview Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setPreviewModalActive(true)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-colors font-mono"
                >
                  Preview
                </button>
                <button
                  disabled={submitting}
                  onClick={handleSendCertificate}
                  className="px-4 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 font-mono"
                >
                  <Send className="w-3.5 h-3.5" /> SEND CERTIFICATE
                </button>
              </div>
            </div>
        </div>

        {/* Right Preview Representation Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-white/5 p-6 rounded-[28px] h-full flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ECC35C]" />
                Visual Template Mock-up
              </h3>
              
              <div className="border border-[#ECC35C]/20 rounded-2xl p-4 bg-slate-950/80 overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-amber-500/5 to-transparent blur-xl" />
                <div className="aspect-[1.5/1] bg-slate-950 border border-white/5 rounded-xl p-4 sm:p-6 flex flex-col justify-between select-none relative overflow-hidden filter drop-shadow-xl">
                  {/* Trading Charts Transparent Background SVG */}
                  <div className="absolute inset-0 pointer-events-none opacity-5">
                    <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="none">
                      <path d="M0,100 L800,100 M0,200 L800,200 M0,300 L800,300 M0,400 L800,400 M0,500 L800,500" stroke="#FFF" strokeWidth="1" strokeDasharray="5,5" />
                      <g stroke="#10b981" fill="#10b981" strokeWidth="3">
                        <path d="M 150 400 L 150 250 M 145 360 L 155 360 L 155 280 L 145 280 Z" />
                        <path d="M 450 320 L 450 150 M 445 280 L 455 280 L 455 180 L 445 180 Z" />
                      </g>
                      <g stroke="#ef4444" fill="#ef4444" strokeWidth="3">
                        <path d="M 350 200 L 350 350 M 345 220 L 355 220 L 355 320 L 345 320 Z" />
                        <path d="M 750 100 L 750 220 M 745 120 L 755 120 L 755 190 L 745 190 Z" />
                      </g>
                      <path d="M 0 500 Q 100 420 200 380 T 400 250 T 600 200 T 800 50" fill="none" stroke="#ECC35C" strokeWidth="5" />
                    </svg>
                  </div>
                  {/* Outer and Inner Borders */}
                  <div className="absolute inset-2 border border-[#ECC35C]/20 opacity-40" />
                  <div className="absolute inset-3 border-[2px] border-[#FFF1C5]/10 opacity-30" />

                  {/* Header Logo */}
                  <div className="text-center relative z-10">
                    <span className="font-sans font-black tracking-widest text-xs flex items-center justify-center">
                      <span className="bg-gradient-to-b from-[#FFF1C5] via-[#ECC35C] to-[#9E731F] bg-clip-text text-transparent">FUNDED</span>
                      <span className="bg-gradient-to-b from-[#D4F7FF] via-[#00D4FF] to-[#0055FF] bg-clip-text text-transparent ml-0.5">GOO</span>
                    </span>
                    <span className="text-[6px] text-slate-600 font-mono tracking-widest uppercase block mt-0.5">ELITE EVALUATION</span>
                  </div>

                  {/* Core Certificate Content */}
                  <div className="text-center space-y-1 my-1.5 relative z-10">
                    <h3 className="text-xs sm:text-sm font-bold text-[#ECC35C] tracking-wider uppercase font-mono">
                      {customTitle}
                    </h3>
                    <p className="text-[6px] text-slate-500 italic">Proudly Awarded To</p>
                    <p className="text-sm sm:text-lg font-serif italic text-white font-bold tracking-wide">
                      {selectedUser?.name || "User Name (Live Sync)"}
                    </p>
                    <p className="text-[5.5px] text-slate-400 max-w-[200px] mx-auto leading-normal">
                      For exhibiting tactical consistency, outstanding discipline, and ultimate risk protection standard.
                    </p>
                  </div>

                  {/* Footer Seal representation */}
                  <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5 relative z-10">
                    <div className="text-left space-y-0.5">
                      <span className="text-[5.5px] text-[#ECC35C] font-mono font-bold block">SPECIFICATIONS</span>
                      <span className="text-[5px] text-slate-500 font-mono block">Acct #{selectedAccount?.accountNumber || "88XXXXX"}</span>
                    </div>

                    {/* Miniature Wax Seal Representation */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFF1C5] via-[#ECC35C] to-[#9E731F] flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                        <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-[5.5px] text-slate-400 font-serif font-bold block italic">{signerName}</span>
                      <span className="text-[5px] text-slate-600 font-mono block">Protocol Director</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-950/40 border border-white/5 rounded-2xl text-xs text-slate-400 space-y-2.5">
              <p className="font-sans leading-relaxed">
                ℹ️ <strong>Integrated Notification System:</strong> The second you click <b>"Send Certificate"</b>, the user receives an active notification in the Navbar. Clicking this alert automatically opens the premium certificate modal, where they can print or save it as a PDF.
              </p>
              <p className="font-sans leading-relaxed">
                ✅ <strong>Permanent account save:</strong> The certificate also becomes visible from the "My Challenges" section, directly attached to the respective account!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Render interactive Preview Modal */}
      <AnimatePresence>
        {previewModalActive && (
          <CertificateModal
            account={previewAccount}
            certificate={previewCert}
            onClose={() => setPreviewModalActive(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
