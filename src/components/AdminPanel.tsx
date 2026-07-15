import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { 
  Users, 
  CreditCard, 
  Cpu, 
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Lock,
  Plus,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  TrendingDown,
  TrendingUp,
  Filter,
  ShoppingBag,
  Info,
  Clock,
  X,
  Wallet,
  FileText,
  AlertTriangle,
  Eye,
  Gift,
  Key,
  MessageSquare,
  PieChart,
  BarChart,
  Trophy,
  Calendar,
  Terminal,
  Download,
  RefreshCw,
  Bot,
  Award,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import ThreeDCard from './ThreeDCard';
import Logo from './Logo';
import CertificatesTab from './CertificatesTab';
import EducatorApprovalsTab from './EducatorApprovalsTab';
import { UserAccount, UserRole, ExternalAPI, ShopPackage, Transaction, AuditLog, VerificationRequest, SymbolConfig, CompetitionConfig, TradingAccount } from '../types';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'certificates' | 'payments' | 'api' | 'risk' | 'prop' | 'logs' | 'verify' | 'market' | 'giveaway' | 'promotions' | 'support' | 'analytics' | 'competition' | 'mt5' | 'referrals' | 'hostes' | 'bots' | 'educators' | 'challenges_passed'>('users');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const handlePayoutAction = async (txId: string, status: 'completed' | 'rejected') => {
    // Stage 3 enhancement: Actually process payout
    await updateDoc(doc(db, "transactions", txId), { status });
    alert(`Payout ${status}.`);
  };

  const { users, transactions, apis, packages, rules, auditLogs, verificationRequests, symbolConfigs, updateSymbolConfig, handleVerificationRequest, updateUser, deleteUser, updateAPI, addAPI, setActiveView, generateTradingAccount, isAdmin, isModerator, user, addAuditLog, createHostesUser, addManualTrade, competitions, educators } = useApp();
  
  const pendingEducatorsCount = educators.filter(e => e.status === 'pending').length;

  useEffect(() => {
    if (activeTab && user && (isAdmin || isModerator)) {
      addAuditLog({
        action: 'NAVIGATE_TAB',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role as any,
        details: `Navigated to ${activeTab} tab`,
        type: 'system'
      });
    }
  }, [activeTab]);

  if (!isUnlocked) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
        <div className="glass p-8 rounded-3xl border border-white/10 max-w-sm w-full text-center">
          <Lock className="w-12 h-12 text-azure mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Admin Access Restricted</h2>
          <input 
            type="password" 
            placeholder="Enter admin password..."
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (passwordInput === 'Victor') setIsUnlocked(true);
                else alert('Incorrect password');
              }
            }}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono focus:outline-none focus:border-azure mb-4"
          />
          <button 
            onClick={() => {
              if (passwordInput === 'Victor') {
                setIsUnlocked(true);
              } else {
                alert('Incorrect password');
              }
            }}
            className="w-full py-3 bg-azure/20 text-azure hover:bg-azure/30 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
          >
            Unlock Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <Logo textClassName="text-3xl sm:text-4xl" />
          <p className="text-slate-400 mt-2">Centralized control for system integrity and scalability.</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto scrollbar-hide">
          {[
            <TabButton key="traders" active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Traders" />,
            isAdmin && <TabButton key="challenges_passed" active={activeTab === 'challenges_passed'} onClick={() => setActiveTab('challenges_passed')} icon={Award} label="Passed Challenges" />,
            isAdmin && <TabButton key="certificates" active={activeTab === 'certificates'} onClick={() => setActiveTab('certificates')} icon={Award} label="Certificates" />,
            isAdmin && <TabButton key="prop" active={activeTab === 'prop'} onClick={() => setActiveTab('prop')} icon={ShoppingBag} label="Shop" />,
            <TabButton key="finance" active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={CreditCard} label="Finance" />,
            <TabButton key="analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={PieChart} label="Analytics" />,
            <TabButton key="kyc" active={activeTab === 'verify'} onClick={() => setActiveTab('verify')} icon={ShieldCheck} label="KYC Requests" />,
            <TabButton key="support" active={activeTab === 'support'} onClick={() => setActiveTab('support')} icon={MessageSquare} label="Support" />,
            isAdmin && <TabButton key="giveaway" active={activeTab === 'giveaway'} onClick={() => setActiveTab('giveaway')} icon={Gift} label="Giveaway" />,
            isAdmin && <TabButton key="promotions" active={activeTab === 'promotions'} onClick={() => setActiveTab('promotions')} icon={Gift} label="Promotions" />,
            <TabButton key="audit" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={FileText} label="Audit" />,
            isAdmin && <TabButton key="risk" active={activeTab === 'risk'} onClick={() => setActiveTab('risk')} icon={AlertTriangle} label="Risk Rules" />,
            isAdmin && <TabButton key="market" active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={TrendingUp} label="Market" />,
            <TabButton key="competition" active={activeTab === 'competition'} onClick={() => setActiveTab('competition')} icon={Trophy} label="Competitions" />,
            isAdmin && <TabButton key="bots" active={activeTab === 'bots'} onClick={() => setActiveTab('bots')} icon={Bot} label="Bots" />,
            isAdmin && <TabButton key="referrals" active={activeTab === 'referrals'} onClick={() => setActiveTab('referrals')} icon={Users} label="Referrals" />,
            isAdmin && <TabButton key="educators" active={activeTab === 'educators'} onClick={() => setActiveTab('educators')} icon={GraduationCap} label="Educators" badgeCount={pendingEducatorsCount} />,
            isAdmin && <TabButton key="hostes" active={activeTab === 'hostes'} onClick={() => setActiveTab('hostes')} icon={Users} label="HOSTES" />,
            isAdmin && <TabButton key="mt5" active={activeTab === 'mt5'} onClick={() => setActiveTab('mt5')} icon={Terminal} label="MT5 Bridge" />,
            isAdmin && <TabButton key="api" active={activeTab === 'api'} onClick={() => setActiveTab('api')} icon={Cpu} label="API Admin" />,
          ].reduce((acc: React.ReactNode[], item, index, arr) => {
            if (item) {
              acc.push(item);
              if ((acc.length) % 4 === 0 && index < arr.length - 1) {
                acc.push(<div key={`sep-${index}`} className="h-6 w-px bg-white/20 mx-1 my-auto flex-shrink-0" />);
              }
            }
            return acc;
          }, [])}
        </div>
      </header>

      <div className="space-y-8">
        {activeTab === 'users' && <UsersTab users={users.filter(u => !u.isBot)} onUpdate={updateUser} onDelete={deleteUser} />}
        {activeTab === 'challenges_passed' && <ChallengesPassedTab />}
        {activeTab === 'certificates' && <CertificatesTab />}
        {activeTab === 'prop' && <PackageConfigTab packages={packages} />}
        {activeTab === 'payments' && <PaymentsTab transactions={transactions} />}
        {activeTab === 'analytics' && <AnalyticsTab users={users} transactions={transactions} />}
        {activeTab === 'verify' && <VerificationTab requests={verificationRequests} onHandle={handleVerificationRequest} />}
        {activeTab === 'support' && <SupportTab />}
        {activeTab === 'giveaway' && <GiveawayTab users={users.filter(u => !u.isBot)} packages={packages} onGenerate={generateTradingAccount} />}
        {activeTab === 'promotions' && <PromotionsTab />}
        {activeTab === 'logs' && <AuditLogTab logs={auditLogs} />}
        {activeTab === 'risk' && <RiskTab />}
        {activeTab === 'market' && <MarketTab configs={symbolConfigs} onUpdate={updateSymbolConfig} />}
        {activeTab === 'competition' && <CompetitionAdminTab users={users} />}
        {activeTab === 'educators' && <EducatorApprovalsTab />}
        {activeTab === 'bots' && <BotAdminTab />}
        {activeTab === 'referrals' && <ReferralsAdminTab />}
        {activeTab === 'hostes' && <HostesTab users={users} createHostesUser={createHostesUser} addManualTrade={addManualTrade} symbolConfigs={symbolConfigs} competitions={competitions} generateTradingAccount={generateTradingAccount} />}
        {activeTab === 'mt5' && <MT5Tab />}
        {activeTab === 'api' && <ApiTab apis={apis} onUpdate={updateAPI} />}
      </div>
    </div>
  );
}

export function evaluateAccountCompliance(acc: TradingAccount) {
  const history = acc.history || [];
  const initBal = acc.initialBalance || 100000;
  const balance = acc.balance || initBal;
  const currentProfit = Math.max(0, balance - initBal);
  
  const baseTarget = acc.rules?.profitTarget || (initBal * 0.10);
  const penalty = acc.rules?.targetPenalty || 0;
  const actualTarget = baseTarget + penalty;
  
  const hasReachedTarget = currentProfit >= actualTarget;
  
  // Consistency Rule Check
  const dailyProfitsMap: { [date: string]: number } = {};
  history.forEach((t: any) => {
    const ms = t.close_time || t.timestamp || Date.now();
    const d = new Date(ms).toLocaleDateString();
    dailyProfitsMap[d] = (dailyProfitsMap[d] || 0) + parseFloat(t.pnl || 0);
  });
  const maxDailyProfit = Object.values(dailyProfitsMap).length > 0 ? Math.max(0, ...Object.values(dailyProfitsMap)) : 0;
  const baseForLimit = acc.type?.startsWith('evaluation') ? baseTarget : currentProfit;
  const limit = (baseForLimit || 1) * 0.45;
  const isConsistencyViolated = currentProfit > 0 && maxDailyProfit > limit;
  
  // Minimum 3 trading days check
  const tradingDaysSet = new Set(history.map(t => {
    const ms = t.close_time || t.timestamp || Date.now();
    return new Date(ms).toLocaleDateString();
  }));
  const uniqueDaysCount = tradingDaysSet.size;
  const tradingDaysPassed = uniqueDaysCount >= 3;
  
  // Scalping Warnings Count
  const scalpWarnings = acc.scalpWarningsCount || 0;
  const scalpPassed = scalpWarnings < 3;
  
  // Drawdowns failed check
  const isFailed = acc.status === 'failed';
  
  // Overall Passed status
  const isFullyEligible = hasReachedTarget && !isConsistencyViolated && tradingDaysPassed && scalpPassed && !isFailed;
  
  return {
    initBal,
    balance,
    currentProfit,
    actualTarget,
    hasReachedTarget,
    isConsistencyViolated,
    maxDailyProfit,
    limit,
    uniqueDaysCount,
    tradingDaysPassed,
    scalpWarnings,
    scalpPassed,
    isFailed,
    isFullyEligible
  };
}

function ChallengesPassedTab() {
  const { users } = useApp();
  const [passedAccounts, setPassedAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAllAccounts = async () => {
    setLoading(true);
    try {
      const accountsWithUsers: any[] = [];
      const fetchPromises = users.map(async (u) => {
        try {
          const snap = await getDocs(collection(db, "users", u.id, "tradingAccounts"));
          return {
            user: u,
            accounts: snap.docs.map(d => ({ ...d.data(), id: d.id }) as TradingAccount)
          };
        } catch (e) {
          console.error("Error loading accounts for user", u.id, e);
          return { user: u, accounts: [] };
        }
      });

      const results = await Promise.all(fetchPromises);
      
      results.forEach(({ user: trader, accounts }) => {
        accounts.forEach((acc) => {
          const compliance = evaluateAccountCompliance(acc);
          if (compliance.hasReachedTarget) {
            accountsWithUsers.push({
              trader,
              account: acc,
              compliance,
            });
          }
        });
      });

      accountsWithUsers.sort((a,b) => b.compliance.currentProfit - a.compliance.currentProfit);
      setPassedAccounts(accountsWithUsers);
    } catch (err) {
      console.error("Error setting up passed challenges:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAccounts();
  }, [users]);

  const handleApproveUpgrade = async (traderId: string, accId: string) => {
    if (!confirm("Are you sure you want to approve this challenge and upgrade the trader to Funded status?")) return;
    try {
      const acctRef = doc(db, "users", traderId, "tradingAccounts", accId);
      await updateDoc(acctRef, {
        status: "active",
        type: "funded",
        balance: 100000, 
        equity: 100000,
        scalpWarningsCount: 0,
        consistencyWarningsCount: 0
      } as any);

      alert("Challenge approved! Account upgraded to Funded phase.");
      setSelectedAudit(null);
      loadAllAccounts();
    } catch (e: any) {
      alert("Error upgrading account: " + e.message);
    }
  };

  const filtered = passedAccounts.filter(item => 
    item.trader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.trader.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.account.accountNumber.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-xl text-white tracking-tighter uppercase">Challenges Passed Auditor</h3>
            <p className="text-xs text-slate-400 mt-1">Verify traders who reached targets and review detailed execution compliance.</p>
          </div>
          <div className="relative w-full sm:w-64">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
             <input 
               type="text" 
               placeholder="Search by name, email, account..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-azure" 
             />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-azure" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic">No passed challenges found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="p-5">Trader</th>
                  <th className="p-5">Account No.</th>
                  <th className="p-5">Starting Bal</th>
                  <th className="p-5">Gain profit</th>
                  <th className="p-5">Consistency Check</th>
                  <th className="p-5">Days Traded</th>
                  <th className="p-5">Scalp strikes</th>
                  <th className="p-5">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filtered.map((item, idx) => {
                  const { trader, account, compliance } = item;
                  return (
                    <tr 
                      key={trader.id + '-' + account.id + idx} 
                      onClick={() => setSelectedAudit(item)}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="p-5">
                        <p className="text-sm font-bold text-white leading-none">{trader.name}</p>
                        <p className="text-xs text-slate-500">{trader.email}</p>
                      </td>
                      <td className="p-5 font-mono text-xs">
                        <span className="bg-white/5 px-2 py-1 rounded text-white border border-white/5">#{account.accountNumber}</span>
                        <span className="ml-2 text-[10px] uppercase text-azure font-bold font-sans">({account.type})</span>
                      </td>
                      <td className="p-5 font-mono text-sm">${compliance.initBal.toLocaleString()}</td>
                      <td className="p-5 font-mono text-sm">
                        <span className="text-green-400 font-bold">${compliance.currentProfit.toLocaleString()}</span>
                        <span className="text-slate-500 text-xs"> / ${compliance.actualTarget.toLocaleString()}</span>
                      </td>
                      <td className="p-5 leading-none">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${compliance.isConsistencyViolated ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                          {compliance.isConsistencyViolated ? 'Outlier Exceeded ❌' : 'Passed ✅'}
                        </span>
                      </td>
                      <td className="p-5 font-mono text-sm leading-none">
                        <span className={`text-xs px-2 py-0.5 rounded ${compliance.tradingDaysPassed ? 'text-green-400 font-bold' : 'text-amber-400'}`}>
                          {compliance.uniqueDaysCount} / 3 days
                        </span>
                      </td>
                      <td className="p-5 leading-none">
                        <span className={`text-xs px-2 py-0.5 rounded ${compliance.scalpPassed ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}`}>
                          {compliance.scalpWarnings} / 2 warning(s)
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${compliance.isFullyEligible ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {compliance.isFullyEligible ? 'Perfect Pass 🏆' : 'Warning/Hold ⚠️'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED DRILLDOWN MODAL */}
      {selectedAudit && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={() => setSelectedAudit(null)} />
          <div className="relative glass p-6 sm:p-8 rounded-[2rem] w-full max-w-5xl border border-white/10 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col gap-6">
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] font-bold text-azure uppercase tracking-widest bg-azure/15 px-2 py-1 rounded-md">Auditor Workspace</span>
                <h3 className="text-2xl font-display font-bold text-white mt-2 uppercase tracking-tighter">
                  Reviewing: {selectedAudit.trader.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Audit verification worksheet for live account #{selectedAudit.account.accountNumber}</p>
              </div>
              <button 
                onClick={() => setSelectedAudit(null)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* COMPLIANCE STACK */}
              <div className="lg:col-span-1 space-y-4">
                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trader Profile</h4>
                  <div className="space-y-1 text-sm bg-slate-950/40 p-3 rounded-xl border border-white/5">
                    <p className="text-slate-400 flex justify-between"><span>Email:</span> <span className="text-white font-medium">{selectedAudit.trader.email}</span></p>
                    <p className="text-slate-400 flex justify-between"><span>Phone:</span> <span className="text-white">{selectedAudit.trader.phone || '-'}</span></p>
                    <p className="text-slate-400 flex justify-between"><span>Verified KYC:</span> <span className={`${selectedAudit.trader.isVerified ? 'text-green-400' : 'text-rose-400'} font-bold`}>{selectedAudit.trader.isVerified ? 'YES' : 'NO'}</span></p>
                    <p className="text-slate-400 flex justify-between"><span>Country:</span> <span className="text-white capitalize">{selectedAudit.trader.country || '-'}</span></p>
                  </div>
                </div>

                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Core Compliance Check</h4>
                  
                  {/* Profit Target */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Profit Target</span>
                      <span className="text-green-400 font-bold">Passed ✅</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <p className="text-xs text-slate-500">Target required: <span className="text-white font-mono">${selectedAudit.compliance.actualTarget.toLocaleString()}</span></p>
                      <p className="text-xs text-slate-500 mt-1">Traded profit: <span className="text-green-400 font-mono font-bold">${selectedAudit.compliance.currentProfit.toLocaleString()}</span></p>
                    </div>
                  </div>

                  {/* Consistency Rule */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Consistency Outlier (45% cap)</span>
                      <span className={selectedAudit.compliance.isConsistencyViolated ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                        {selectedAudit.compliance.isConsistencyViolated ? "Violated ❌" : "Passed ✅"}
                      </span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <p className="text-xs text-slate-500">Max single day: <span className="text-white font-mono">${selectedAudit.compliance.maxDailyProfit.toLocaleString()}</span></p>
                      <p className="text-xs text-slate-500 mt-1">Consistency limit: <span className="text-white font-mono">${Math.round(selectedAudit.compliance.limit).toLocaleString()}</span></p>
                    </div>
                  </div>

                  {/* Min Days */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Minimum 3 Trading Days</span>
                      <span className={selectedAudit.compliance.tradingDaysPassed ? "text-green-400 font-bold" : "text-amber-400 font-bold"}>
                        {selectedAudit.compliance.tradingDaysPassed ? "Passed ✅" : "Failed ⏳"}
                      </span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <p className="text-xs text-slate-500">Unique active days: <span className="text-white font-bold">{selectedAudit.compliance.uniqueDaysCount} / 3 req.</span></p>
                    </div>
                  </div>

                  {/* Scalp warnings */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Hyper-scalping rules (&lt;30s)</span>
                      <span className={selectedAudit.compliance.scalpPassed ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {selectedAudit.compliance.scalpPassed ? "Passed ✅" : "Failed ❌"}
                      </span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <p className="text-xs text-slate-500">Warning events: <span className="text-white font-bold">{selectedAudit.compliance.scalpWarnings} of 2 allowed</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleApproveUpgrade(selectedAudit.trader.id, selectedAudit.account.id)}
                    className="flex-1 py-3 text-center bg-azure hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Approve Challenge Upgrade 🏆
                  </button>
                </div>
              </div>

              {/* DETAILED TRANSACTION LOGS (ALL TRADES) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col h-full min-h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Complete Order Ledger ({selectedAudit.account.history?.length || 0} executions)</h4>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Real-time DB synced</span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[480px] border border-white/5 rounded-xl custom-scrollbar">
                    {(!selectedAudit.account.history || selectedAudit.account.history.length === 0) ? (
                      <div className="p-12 text-center text-slate-600 italic text-sm uppercase font-bold tracking-widest">No transaction history recorded on index.</div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead className="bg-[#0b101d] sticky top-0 border-b border-white/10 text-slate-500 font-sans uppercase text-[9px] tracking-wider font-bold">
                          <tr>
                            <th className="py-3 px-4">Asset</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4 text-right">Lots</th>
                            <th className="py-3 px-4 text-right">Prices</th>
                            <th className="py-3 px-4 text-center">Execution Times (Pornit/Oprit)</th>
                            <th className="py-3 px-4 text-right">PnL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selectedAudit.account.history.map((t: any, idx: number) => {
                            const holdDuration = t.close_time && t.open_time ? Math.round((t.close_time - t.open_time) / 1000) : null;
                            return (
                              <tr key={t.id || idx} className="hover:bg-white-[0.02] transition-colors group">
                                <td className="py-3 px-4 font-bold text-white font-sans">
                                  {t.symbol}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${t.type === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-300 font-bold">{Number(t.lots || t.size).toFixed(2)}</td>
                                <td className="py-3 px-4 text-right text-slate-400 text-[10px]">
                                  <span className="block text-slate-200">Open: {Number(t.open_price || t.entryPrice).toFixed(2)}</span>
                                  <span className="block text-slate-400">Close: {Number(t.close_price || t.exitPrice).toFixed(2)}</span>
                                </td>
                                <td className="py-2 px-4 text-center select-all leading-relaxed">
                                  {/* EXACT OPEN AND CLOSE TIMES DISPLAY */}
                                  <div className="flex flex-col gap-0.5 justify-center font-mono">
                                    <span className="text-emerald-400 text-xs text-glow-emerald">
                                      Pornit: {t.open_time ? new Date(t.open_time).toLocaleString() : (t.timestamp ? new Date(t.timestamp - 300000).toLocaleString() : '---')}
                                    </span>
                                    <span className="text-rose-400 text-xs text-glow-rose">
                                      Oprit: {t.close_time ? new Date(t.close_time).toLocaleString() : (t.timestamp ? new Date(t.timestamp).toLocaleString() : '---')}
                                    </span>
                                  </div>
                                  {holdDuration !== null && (
                                    <span className={`inline-block mt-1 text-[8.5px] px-1 rounded-sm leading-none font-bold uppercase
                                      ${holdDuration < 30 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/15 text-emerald-400'}
                                    `}>
                                      Held: {holdDuration}s {holdDuration < 30 && '⚠️ SCALP'}
                                    </span>
                                  )}
                                </td>
                                <td className={`py-3 px-4 text-right font-bold ${Number(t.pnl) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {Number(t.pnl) >= 0 ? '+' : ''}${Number(t.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PackageConfigTab({ packages }: { packages: ShopPackage[] }) {
  const [newPackage, setNewPackage] = useState<Partial<ShopPackage>>({ name: '', price: 0, allocation: 0, profitTarget: 10, totalDrawdown: 10 });
  const [loading, setLoading] = useState(false);

  const addPackage = async () => {
    setLoading(true);
    await addDoc(collection(db, 'packages'), { ...newPackage, id: `pkg-${Date.now()}` });
    setNewPackage({ name: '', price: 0, allocation: 0, profitTarget: 10, totalDrawdown: 10 });
    setLoading(false);
  };

  const deletePackage = async (id: string) => {
    await deleteDoc(doc(db, 'packages', id));
  };

  return (
    <div className="glass p-8 rounded-3xl border border-white/5 bg-white/5 space-y-6">
      <h3 className="font-display font-bold text-xl text-white uppercase tracking-tighter">Challenge Packages</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map(p => (
           <div key={p.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                 <p className="text-white font-bold">{p.name}</p>
                 <p className="text-slate-400 text-xs">${p.allocation} - {p.profitTarget}% Target</p>
              </div>
              <button onClick={() => deletePackage(p.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
           </div>
        ))}
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-white/10 space-y-4">
        <h4 className="text-white font-bold">New Package</h4>
        <div className="grid grid-cols-2 gap-4">
           <input className="bg-slate-950 p-3 rounded" placeholder="Name" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
           <input className="bg-slate-950 p-3 rounded" placeholder="Price" type="number" value={newPackage.price} onChange={e => setNewPackage({...newPackage, price: Number(e.target.value)})} />
           <input className="bg-slate-950 p-3 rounded" placeholder="Allocation" type="number" value={newPackage.allocation} onChange={e => setNewPackage({...newPackage, allocation: Number(e.target.value)})} />
           <input className="bg-slate-950 p-3 rounded" placeholder="Profit Target %" type="number" value={newPackage.profitTarget} onChange={e => setNewPackage({...newPackage, profitTarget: Number(e.target.value)})} />
        </div>
        <button onClick={addPackage} disabled={loading} className="w-full bg-azure p-3 rounded text-slate-950 font-bold">{loading ? 'Adding...' : 'Add Package'}</button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, badgeCount }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap
        ${active ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}
      `}
    >
      <Icon size={18} />
      {label}
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold animate-pulse">
          {badgeCount}
        </span>
      )}
    </button>
  );
}

function PromotionsTab() {
  const { users, packages } = useApp();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState({ 
    title: '', 
    description: '', 
    discountCode: '', 
    discountRate: 0,
    showToAll: true,
    isSecret: false,
    targetEmails: '',
    targetAllocation: 'all',
    validUntil: '',
    usageLimit: 0,
    usageCount: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    const q = collection(db, 'promotions');
    const snapshot = await getDocs(q);
    setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const createPromotion = async () => {
    if (!newPromo.title || !newPromo.discountCode) return;
    setLoading(true);
    
    // Resolve emails to UIDs if not showing to all
    let targetUserIds: string[] = [];
    if (!newPromo.showToAll) {
      const emails = newPromo.targetEmails.split(',').map(e => e.trim()?.toLowerCase());
      targetUserIds = users.filter(u => emails.includes(u.email?.toLowerCase())).map(u => u.id);
    }

    await addDoc(collection(db, 'promotions'), {
      title: newPromo.title,
      description: newPromo.description,
      discountCode: newPromo.discountCode.toUpperCase(),
      discountRate: newPromo.discountRate,
      isActive: true,
      showToAll: newPromo.showToAll,
      isSecret: newPromo.isSecret,
      targetUserIds,
      targetAllocation: newPromo.targetAllocation,
      createdAt: Date.now(),
      validUntil: newPromo.validUntil || null,
      usageLimit: newPromo.usageLimit || 0,
      usageCount: 0
    });
    
    setNewPromo({ title: '', description: '', discountCode: '', discountRate: 0, showToAll: true, isSecret: false, targetEmails: '', targetAllocation: 'all', validUntil: '', usageLimit: 0, usageCount: 0 });
    await fetchPromotions();
    setLoading(false);
  };

  const togglePromo = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'promotions', id), { isActive: !currentStatus });
    await fetchPromotions();
  };

  return (
    <div className="glass p-8 rounded-3xl border border-white/5 bg-white/5 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-display font-bold text-xl text-white uppercase tracking-tighter">Promotions Engine</h3>
        <Zap className="text-azure animate-pulse" size={24} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5">
           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Create New Offer</h4>
           <div className="space-y-4">
             {/* Title field */}
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Titlu Promovare / Promo Title</label>
               <input className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors text-sm" placeholder="e.g. Reducere de Vara (Summer Sale)" value={newPromo.title} onChange={e => setNewPromo({...newPromo, title: e.target.value})} />
               <span className="text-[10px] text-slate-500 font-medium block pl-1">Afișează numele promoției (util pentru evidența ta internă și pentru unele secțiuni din panou).</span>
             </div>

             {/* Description field */}
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Descriere Afișată / Promo Description</label>
               <textarea className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors h-20 text-sm" placeholder="e.g. Obține 20% reducere la orice challenge achiziționat!" value={newPromo.description} onChange={e => setNewPromo({...newPromo, description: e.target.value})} />
               <span className="text-[10px] text-slate-500 font-medium block pl-1">Mesajul care va apărea scris pe bannerul/modalul promoțional de pe site. Spune-le clar clienților ce primesc!</span>
             </div>

             {/* Code & Off% field */}
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cod Cupon / Coupon Code</label>
                 <input className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors text-sm" placeholder="e.g. SUMMER20" value={newPromo.discountCode} onChange={e => setNewPromo({...newPromo, discountCode: e.target.value.toUpperCase()})} />
                 <span className="text-[10px] text-slate-500 font-medium block pl-1">Codul exact pe care utilizatorul îl va scrie la Checkout (ex. SUMMER20).</span>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Valoare Reducere (%) / Off %</label>
                 <input type="number" className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors text-sm" placeholder="Off %" value={newPromo.discountRate} onChange={e => setNewPromo({...newPromo, discountRate: Number(e.target.value)})} />
                 <span className="text-[10px] text-slate-500 font-medium block pl-1">Procentul de reducere aplicat prețului (ex. scrie 10 pentru o reducere de 10%).</span>
               </div>
             </div>
             
             {/* Switches / Options */}
             <div className="pt-2 flex flex-col gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-white/5">
               <div className="space-y-1">
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="hidden" checked={newPromo.showToAll} onChange={e => setNewPromo({...newPromo, showToAll: e.target.checked})} />
                    <div className={`w-5 h-5 rounded border ${newPromo.showToAll ? 'bg-azure border-azure' : 'border-white/20'} flex items-center justify-center transition-all`}>
                      {newPromo.showToAll && <ShieldCheck size={14} className="text-slate-950" />}
                    </div>
                    <span className="text-sm text-slate-300 font-semibold">Disponibil pentru toți / Available to all</span>
                 </label>
                 <span className="text-[10px] text-slate-500 font-medium block pl-7">Dacă este BIFAT, codul este global și poate fi utilizat de oricine. Dacă este DEBIFAT, poți adăuga e-mailuri specifice mai jos.</span>
               </div>

               <div className="space-y-1">
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="hidden" checked={newPromo.isSecret} onChange={e => setNewPromo({...newPromo, isSecret: e.target.checked})} />
                    <div className={`w-5 h-5 rounded border ${newPromo.isSecret ? 'bg-red-500 border-red-500' : 'border-white/20'} flex items-center justify-center transition-all`}>
                      {newPromo.isSecret && <ShieldCheck size={14} className="text-white" />}
                    </div>
                    <span className="text-sm text-slate-300 font-semibold">Cod Secret / Secret Code</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium block pl-7">Dacă este BIFAT, promoția va fi ASCUNSĂ de pe site (fără modal sau banner), dar codul va fi activ dacă este trimis privat clienților.</span>
                </div>
              </div>

              {/* Target emails field if not global */}
              {!newPromo.showToAll && !newPromo.isSecret && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">E-mailuri Utilizatori Permiși / Target Emails</label>
                  <input className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors text-sm" placeholder="Emails (separated by commas)" value={newPromo.targetEmails} onChange={e => setNewPromo({...newPromo, targetEmails: e.target.value})} />
                  <span className="text-[10px] text-slate-500 font-medium block pl-1">Adresele de e-mail separate prin virgulă (ex: user1@mail.com, user2@mail.com) ale celor singuri permisi să folosească codul.</span>
                </div>
              )}

              {/* Target Allocation Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Limitare Mărime Cont / Account Size Restriction</label>
                <select 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors text-sm font-semibold" 
                  value={newPromo.targetAllocation} 
                  onChange={e => setNewPromo({...newPromo, targetAllocation: e.target.value})}
                >
                  <option value="all">Fără limită (Valabil pentru TOATE mărimile de cont / Apply to all accounts)</option>
                  {[...packages].sort((a,b) => a.allocation - b.allocation).map(pkg => (
                    <option key={pkg.id} value={pkg.allocation.toString()}>
                      Doar conturi de ${pkg.allocation.toLocaleString()} ({pkg.name})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 font-medium block pl-1">Alege dacă dorești ca această reducere să poată fi aplicată exclusiv pe un anumit tip de cont.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Valabil Până La / Valid Until</label>
                  <input type="date" className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors text-sm" value={newPromo.validUntil} onChange={e => setNewPromo({...newPromo, validUntil: e.target.value})} />
                  <span className="text-[10px] text-slate-500 font-medium block pl-1">Data la care promoția expiră. După această dată, codul nu va mai funcționa deloc.</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Limită Utilizări Totale / Usage Limit</label>
                  <input type="number" className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure transition-colors text-sm" placeholder="e.g. 50" value={newPromo.usageLimit || ''} onChange={e => setNewPromo({...newPromo, usageLimit: Number(e.target.value)})} />
                  <span className="text-[10px] text-slate-500 font-medium block pl-1">Numărul total maxim de dăți în care poate fi utilizat acest cupon pe tot site-ul (0 sau lăsat gol înseamnă nelimitat).</span>
                </div>
              </div>

              <button onClick={createPromotion} disabled={loading} className="w-full py-4 bg-azure rounded-xl text-slate-950 font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-azure/20">
                {loading ? 'Processing...' : 'Deploy Promotion'}
              </button>
            </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active & Scheduled Offers</h4>
          <div className="space-y-3">
            {promotions.length === 0 && <p className="text-slate-600 text-sm italic">No promotions configured</p>}
            {promotions.map(p => (
              <div key={p.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-white/10 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white mb-0">{p.title}</p>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {p.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">{p.description}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-[10px] font-mono bg-azure/10 text-azure px-2 py-0.5 rounded border border-azure/20">{p.discountCode}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{p.discountRate}% OFF</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{p.showToAll ? 'Global' : 'Targeted'}</span>
                    {p.targetAllocation && p.targetAllocation !== 'all' && (
                      <span className="text-[10px] text-purple-400 font-bold uppercase">
                        {Number(p.targetAllocation) >= 1000000 ? `${Number(p.targetAllocation)/1000000}M` : `$${(Number(p.targetAllocation)/1000)}K`} ONLY
                      </span>
                    )}
                    {p.isSecret && <span className="text-[10px] text-red-500 font-bold uppercase">Secret</span>}
                    {p.usageLimit > 0 && (
                      <span className="text-[10px] text-slate-500 font-bold">
                        USED: {p.usageCount || 0}/{p.usageLimit}
                      </span>
                    )}
                    {p.validUntil && (
                      <span className="text-[10px] text-slate-500 font-bold">
                        EXP: {new Date(p.validUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => togglePromo(p.id, p.isActive)}
                    className={`p-2 rounded-lg transition-colors ${p.isActive ? 'text-yellow-500 hover:bg-yellow-500/10' : 'text-green-500 hover:bg-green-500/10'}`}
                    title={p.isActive ? 'Pause' : 'Resume'}
                  >
                    <Zap size={18} fill={p.isActive ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={async () => {
                      await deleteDoc(doc(db, 'promotions', p.id));
                      await fetchPromotions();
                    }}
                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GiveawayTab({ users, packages, onGenerate }: { users: UserAccount[], packages: ShopPackage[], onGenerate: any }) {
  const { addNotification, addAuditLog, user } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedPackage, setSelectedPackage] = useState<ShopPackage | null>(packages[0] || null);
  const [accountType, setAccountType] = useState<'evaluation-1' | 'evaluation-2' | 'funded'>('evaluation-2');
  const [isProcessing, setIsProcessing] = useState(false);

  const suggestions = searchTerm.trim() === ''
    ? []
    : users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8);

  const toggleUser = (userId: string) => {
    const next = new Set(selectedUsers);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUsers(next);
  };

  const handleGiveaway = async () => {
    if (!selectedPackage || selectedUsers.size === 0) return;
    setIsProcessing(true);
    for (const userId of selectedUsers) {
      const userObj = users.find(u => u.id === userId);
      await onGenerate(selectedPackage, 'GOO', accountType, userId);
      
      addAuditLog({
        action: 'GIFT_ACCOUNT',
        actorId: user?.id,
        actorName: user?.name,
        targetId: userId,
        targetName: userObj?.name,
        details: `Gave ${accountType} challenge for ${selectedPackage.name}`,
        type: 'user_management'
      });

      // Notify the user
      addNotification({
        title: "New Account Added!",
        message: `You received a new ${accountType} account for ${selectedPackage.name}.`,
        type: "success",
        link: '/profile',
      }, userId);
    }
    setIsProcessing(false);
    setSelectedUsers(new Set());
    alert('Giveaway successful!');
  };

  return (
    <div className="space-y-6">
      <div className="glass p-8 rounded-3xl border border-white/5 bg-white/5">
        <h3 className="font-display font-bold text-xl text-white uppercase tracking-tighter mb-6">Account Giveaway</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: User Search and Selection */}
          <div className="space-y-4 relative">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Search & Select Users</label>
             <div className="relative z-30">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to search traders..." 
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white outline-none focus:border-azure/50 transition-colors text-sm" 
                />
             </div>
             
             {/* Suggestions List Dropdown */}
             <AnimatePresence>
                {suggestions.length > 0 && (
                   <motion.div
                     initial={{ opacity: 0, y: -5 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -5 }}
                     className="absolute left-0 right-0 top-20 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-40 max-h-60 overflow-y-auto"
                   >
                     {suggestions.map((u) => (
                       <button
                         key={u.id}
                         onClick={() => {
                           toggleUser(u.id);
                           setSearchTerm('');
                         }}
                         className="w-full px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 text-left flex items-center justify-between transition-colors font-sans"
                       >
                         <div>
                           <p className="text-xs font-bold text-white">{u.name}</p>
                           <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                         </div>
                         <div className="flex items-center gap-2">
                           {selectedUsers.has(u.id) ? (
                             <span className="text-[10px] bg-azure/20 text-azure px-2 py-0.5 rounded font-bold uppercase">Selected</span>
                           ) : (
                             <span className="text-[10px] text-slate-500 uppercase">Click to select</span>
                           )}
                         </div>
                       </button>
                     ))}
                   </motion.div>
                )}
             </AnimatePresence>

             {/* Selected Users Bucket */}
             <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Traders ({selectedUsers.size})</span>
                  {selectedUsers.size > 0 && (
                    <button 
                      onClick={() => setSelectedUsers(new Set())}
                      className="text-[9px] font-bold text-red-400 uppercase tracking-widest hover:underline animate-fade-in"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="h-64 overflow-y-auto bg-slate-950/40 rounded-2xl border border-white/5 p-4 space-y-2 custom-scrollbar">
                   {selectedUsers.size === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4">
                       <p className="text-xs font-bold uppercase tracking-wider mb-1">No traders selected</p>
                       <p className="text-[10px] max-w-[200px]">Type their name or email above to search and select them.</p>
                     </div>
                   ) : (
                     Array.from(selectedUsers).map(userId => {
                       const uObj = users.find(u => u.id === userId);
                       if (!uObj) return null;
                       return (
                         <div 
                           key={userId}
                           className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
                         >
                           <div>
                             <p className="text-xs font-bold text-white">{uObj.name}</p>
                             <p className="text-[10px] text-slate-500 font-mono">{uObj.email}</p>
                           </div>
                           <button 
                             onClick={() => toggleUser(userId)}
                             className="text-[10px] bg-red-500/10 text-red-400 px-2.5 py-1 rounded-lg font-bold hover:bg-red-500/20 transition-all uppercase"
                           >
                             Remove
                           </button>
                         </div>
                       );
                     })
                   )}
                </div>
             </div>
          </div>
          
          {/* Right Column: Giveaway details */}
          <div className="space-y-6">
             <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Package</label>
                <select 
                  value={selectedPackage?.id || ''}
                  onChange={e => setSelectedPackage(packages.find(p => p.id === e.target.value) || null)}
                  className="w-full py-3 px-4 bg-slate-950/50 border border-white/10 rounded-xl text-white outline-none"
                >
                  {packages.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name} - ${pkg.allocation}</option>)}
                </select>
             </div>
             
             <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setAccountType('evaluation-1')}
                    className={`py-3 rounded-xl border font-bold text-[10px] ${accountType === 'evaluation-1' ? 'bg-azure text-slate-950 border-azure' : 'bg-transparent text-white border-white/10'}`}
                  >
                    Phase 1
                  </button>
                  <button 
                    onClick={() => setAccountType('evaluation-2')}
                    className={`py-3 rounded-xl border font-bold text-[10px] ${accountType === 'evaluation-2' ? 'bg-azure text-slate-950 border-azure' : 'bg-transparent text-white border-white/10'}`}
                  >
                    Phase 2
                  </button>
                  <button 
                    onClick={() => setAccountType('funded')}
                    className={`py-3 rounded-xl border font-bold text-[10px] ${accountType === 'funded' ? 'bg-toxic-orange text-slate-950 border-toxic-orange' : 'bg-transparent text-white border-white/10'}`}
                  >
                    Funded
                  </button>
                </div>
             </div>
             
             <button 
               onClick={handleGiveaway}
               disabled={isProcessing || selectedUsers.size === 0 || !selectedPackage}
               className="w-full py-4 bg-azure rounded-xl text-slate-950 font-bold uppercase tracking-widest disabled:opacity-50"
             >
               {isProcessing ? 'Processing...' : `Send ${selectedUsers.size} Challenge${selectedUsers.size !== 1 ? 's' : ''}`}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users, onUpdate, onDelete }: { users: UserAccount[], onUpdate: any, onDelete: any }) {
  const { addUser, isAdmin, isModerator } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', balance: 50000 });
  const [selectedTrader, setSelectedTrader] = useState<UserAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="font-display font-bold text-xl text-white tracking-tighter">USER MANAGEMENT</h3>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
               <input 
                 type="text" 
                 placeholder="Search accounts..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-azure/50 transition-colors" 
               />
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="p-2 bg-toxic-orange rounded-xl text-slate-950 hover:scale-105 transition-transform"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trader</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Balance</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Verif</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-white/5 transition-colors ${user.status === 'banned' ? 'opacity-50' : ''}`}>
                  <td className="p-6 cursor-pointer" onClick={() => setSelectedTrader(user)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-none mb-1">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 font-mono text-sm text-white">${(user.balance || 0).toLocaleString()}</td>
                  <td className="p-6">
                    {isAdmin ? (
                      <select 
                        key={`${user.id}-${user.role}`}
                        value={user.role}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          e.stopPropagation();
                          const newRole = e.target.value as any;
                          try {
                            await onUpdate(user.id, { role: newRole });
                          } catch (err: any) {
                            console.error(err);
                            alert("Error changing role: " + err.message);
                          }
                        }}
                        className={`bg-slate-900 border border-white/10 text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer px-2.5 py-1 rounded-full hover:bg-white/10 transition-colors
                          ${user.role === 'admin' ? 'text-purple-400' : 
                            user.role === 'moderator' ? 'text-blue-400' : 
                            'text-slate-400'}
                        `}
                      >
                        <option value="trader" className="bg-slate-900 text-white">Trader</option>
                        <option value="user" className="bg-slate-900 text-white">User</option>
                        <option value="moderator" className="bg-slate-900 text-blue-400">Moderator</option>
                        <option value="admin" className="bg-slate-900 text-purple-400">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                        ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 
                          user.role === 'moderator' ? 'bg-blue-500/10 text-blue-400' : 
                          'bg-slate-500/10 text-slate-400'}
                      `}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="p-6">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                      ${user.status === 'active' ? 'bg-green-500/10 text-green-400' : 
                        user.status === 'banned' ? 'bg-red-500/10 text-red-500' : 
                        'bg-toxic-orange/10 text-toxic-orange'}
                    `}>
                      {user.status}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    {user.isVerified ? 
                      <CheckCircle className="mx-auto text-cyan-400" size={18} /> : 
                      <button onClick={() => onUpdate(user.id, { isVerified: true })} className="mx-auto text-slate-600 hover:text-cyan-400 transition-colors"><ChevronRight size={18} /></button>
                    }
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onUpdate(user.id, { status: user.status === 'banned' ? 'active' : 'banned' })}
                        className={`p-2 rounded-lg transition-all ${user.status === 'banned' ? 'text-green-400 hover:bg-green-400/10' : 'text-slate-500 hover:text-red-500 hover:bg-red-500/10'}`}
                        disabled={(!isAdmin && user.role === 'admin') || (isModerator && user.role === 'admin')}
                      >
                        {user.status === 'banned' ? <Zap size={16} /> : <Lock size={16} />}
                      </button>
                      {isAdmin && (
                        <button onClick={() => onDelete(user.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTrader && <TraderModal selectedTrader={selectedTrader} onClose={() => setSelectedTrader(null)} />}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <div className="relative glass p-8 rounded-[32px] w-full max-w-md border-white/10">
             <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter mb-6">Provision New Trader</h3>
             <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Full Name</label>
                  <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Email Protocol</label>
                  <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Initial Allocation ($)</label>
                  <input type="number" value={newUser.balance} onChange={e => setNewUser({...newUser, balance: Number(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Password</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
               </div>
               <button 
                 onClick={() => {
                   addUser({
                     id: `user-${Date.now()}`,
                     name: newUser.name,
                     email: newUser.email,
                     role: 'user',
                     balance: newUser.balance,
                     equity: newUser.balance,
                     status: 'active',
                     leverage: '1:100',
                     pnl: 0,
                     pnlPercentage: 0,
                     isVerified: false,
                     verificationStatus: 'unverified',
                     createdAt: Date.now(),
                     winRate: 0,
                     totalTrades: 0,
                     profitFactor: 0,
                     maxDrawdown: 0
                   }, newUser.password);
                   setShowAddModal(false);
                 }}
                 className="w-full py-4 bg-azure rounded-xl text-slate-950 font-bold uppercase tracking-widest shadow-lg shadow-azure/20 mt-4"
               >
                 Activate Trader
               </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}

function PaymentsTab({ transactions }: { transactions: Transaction[] }) {
  const { users } = useApp();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const handleStatusChange = async (txId: string, status: 'completed' | 'rejected') => {
    await updateDoc(doc(db, "transactions", txId), { status });
    setSelectedTx(null); // Close modal if open
  };

  const stats = [
    { label: 'Total Revenue', val: '$45,280', icon: TrendingUp, color: 'text-green-400' },
    { label: 'Pending Payouts', val: '$12,400', icon: Clock, color: 'text-toxic-orange' },
    { label: 'Avg Sale', val: '$289', icon: ShoppingBag, color: 'text-azure' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <ThreeDCard key={i} className="glass p-6 rounded-3xl" glowColor="rgba(255, 255, 255, 0.05)">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
              <stat.icon className={stat.color} size={20} />
            </div>
            <p className="text-3xl font-display font-bold text-white tracking-tighter">{stat.val}</p>
          </ThreeDCard>
        ))}
      </div>

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <h3 className="font-display font-bold text-xl text-white tracking-tighter uppercase">Transaction Ledger</h3>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"><Filter size={18} /></button>
            <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"><Search size={18} /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trader</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Card Payout</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="p-6" onClick={() => setSelectedTx(tx)}>
                    <div className="flex items-center gap-2">
                       <p className="text-sm font-bold text-white">{tx.userName}</p>
                       {users.find(u => u.id === tx.userId)?.isVerified ? (
                          <ShieldCheck size={12} className="text-cyan-400" />
                       ) : (
                          <AlertCircle size={12} className="text-toxic-orange" />
                       )}
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase">ID: {tx.userId}</p>
                  </td>
                  <td className="p-6 text-sm text-slate-300" onClick={() => setSelectedTx(tx)}>
                    <span className="flex items-center gap-2">
                      {tx.type === 'purchase' ? <ShoppingBag size={14} className="text-azure" /> : <Wallet size={14} className="text-toxic-orange" />}
                      {tx.description}
                    </span>
                  </td>
                  <td className="p-6">
                    {users.find(u => u.id === tx.userId)?.linkedPaymentMethod ? (
                      <div className="flex flex-col">
                        <p className="text-[10px] text-white font-mono">****{users.find(u => u.id === tx.userId)?.linkedPaymentMethod?.last4}</p>
                        <p className="text-[8px] text-slate-500 uppercase">{users.find(u => u.id === tx.userId)?.linkedPaymentMethod?.brand}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic">No Card</span>
                    )}
                  </td>
                  <td className="p-6" onClick={() => setSelectedTx(tx)}>
                    <span className={`text-sm font-mono font-bold ${tx.type === 'purchase' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'purchase' ? '+' : '-'}${tx.amount}
                    </span>
                  </td>
                  <td className="p-6" onClick={() => setSelectedTx(tx)}>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest
                      ${tx.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-toxic-orange/10 text-toxic-orange'}
                    `}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="p-6">
                    {tx.status === 'pending' && tx.type === 'payout' && (
                        <div className="flex gap-2">
                             <button onClick={() => handleStatusChange(tx.id, 'completed')} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"><CheckCircle size={16} /></button>
                             <button onClick={() => handleStatusChange(tx.id, 'rejected')} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"><XCircle size={16} /></button>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
}

function TransactionDetailModal({ tx, onClose }: { tx: Transaction, onClose: () => void }) {
  const { trades, users } = useApp();
  const userTrades = trades.filter(t => t.pnl !== undefined); // Simplified for demo, usually filtered by userId

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass p-8 rounded-[32px] w-full max-w-2xl border-white/10 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">Transaction Audit</h3>
           <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
             <X size={24} />
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial Summary</h4>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <DetailRow label="ID" val={tx.id} />
              <DetailRow label="Trader" val={tx.userName} />
              <DetailRow label="Amount" val={`$${tx.amount}`} color="text-azure font-bold" />
              <DetailRow label="Type" val={tx.type.toUpperCase()} />
              <DetailRow label="Status" val={tx.status.toUpperCase()} color="text-green-400 font-bold" />
              <DetailRow label="Timestamp" val={new Date(tx.createdAt).toLocaleString()} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Intelligence</h4>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <DetailRow label="Category" val={tx.type === 'purchase' ? 'Capital Allocation' : 'Profit Split'} />
              <DetailRow label="Method" val={tx.paymentMethod || 'Stripe Rail'} />
              {users.find(u => u.id === tx.userId)?.linkedPaymentMethod && (
                <div className="p-3 bg-azure/5 border border-azure/20 rounded-xl space-y-1">
                   <p className="text-[8px] font-bold text-azure uppercase tracking-widest">Linked Payout Card</p>
                   <p className="text-xs font-mono text-white">**** **** **** {users.find(u => u.id === tx.userId)?.linkedPaymentMethod?.last4}</p>
                   <p className="text-[10px] text-slate-400 uppercase">{users.find(u => u.id === tx.userId)?.linkedPaymentMethod?.cardholderName}</p>
                </div>
              )}
              <DetailRow label="Network" val="Institutional Liquidity" />
              <div className="pt-4 mt-4 border-t border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Audit Log</p>
                <p className="text-xs text-white leading-relaxed">{tx.description}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trader Activity Sync</h4>
          <div className="glass rounded-2xl overflow-hidden border border-white/5">
             <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-white/5 text-slate-500">
                    <th className="p-4 font-bold uppercase tracking-widest">Symbol</th>
                    <th className="p-4 font-bold uppercase tracking-widest">Type</th>
                    <th className="p-4 font-bold uppercase tracking-widest text-right">PNL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {userTrades.slice(0, 5).map((trade, i) => (
                    <tr key={i} className="text-white">
                      <td className="p-4 font-bold">{trade.symbol}</td>
                      <td className="p-4"><span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>{trade.type.toUpperCase()}</span></td>
                      <td className={`p-4 text-right font-mono ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${Number(trade.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {userTrades.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500 uppercase tracking-widest font-bold opacity-50">No activity logged</td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, val, color }: { label: string, val: string, color?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className={`${color || 'text-white'}`}>{val}</span>
    </div>
  );
}

function ApiTab({ apis, onUpdate }: { apis: ExternalAPI[], onUpdate: any }) {
  const { addNotification, fetchWithAuth } = useApp();
  const [editedConfigs, setEditedConfigs] = useState<Record<string, Record<string, string>>>({});
  const [showConfig, setShowConfig] = useState<Record<string, boolean>>({});

  const handleConfigChange = (apiId: string, field: string, value: string) => {
    setEditedConfigs(prev => ({
      ...prev,
      [apiId]: {
        ...(prev[apiId] || {}),
        [field]: value
      }
    }));
  };

  const toggleShow = (id: string, field: string) => {
    setShowConfig(prev => ({
      ...prev,
      [`${id}-${field}`]: !prev[`${id}-${field}`]
    }));
  };

  const isEncrypted = (str: string) => /^[0-9a-f]{32}:[0-9a-f]+$/.test(str || "");
  const shouldEncrypt = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('public') || k.includes('publishable') || k.includes('client_id') || k.includes('clientid') || k.includes('interval')) return false;
    return k.includes('secret') || k.includes('private') || k.includes('key') || k.includes('token');
  };

  const handleToggleStatus = async (api: ExternalAPI) => {
    const newStatus = api.status === "active" ? "inactive" : "active";
    await onUpdate(api.id, { status: newStatus });
    addNotification({
      title: `${api.name} Status Changed`,
      message: `${api.name} is now ${newStatus.toUpperCase()}`,
      type: "success"
    });
  };

  const handleSave = async (api: ExternalAPI) => {
    const edits = editedConfigs[api.id] || {};
    const updatedConfig = { ...api.config };
    
    for (const [key, value] of Object.entries(edits)) {
      if (shouldEncrypt(key) && !isEncrypted(value) && value.trim() !== '') {
        try {
          const data = await fetchWithAuth("/api/admin/encrypt", {
            method: "POST",
            body: JSON.stringify({ text: value })
          });
          if (data.encrypted) {
            updatedConfig[key] = data.encrypted;
          } else {
            console.error("Encryption failed: API returned success but no encrypted data");
            updatedConfig[key] = value; // Fallback to raw value so we don't drop the data entirely
          }
        } catch (e) {
          console.error("Encryption failed", e);
          updatedConfig[key] = value; // Fallback
        }
      } else {
        updatedConfig[key] = value;
      }
    }
    
    await onUpdate(api.id, { config: updatedConfig });
    
    addNotification({
      title: "Configuration Saved",
      message: `${api.name} credentials updated successfully.`,
      type: "success"
    });
    
    setEditedConfigs(prev => {
      const next = { ...prev };
      delete next[api.id];
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {apis.map((api) => (
        <div key={api.id}>
          <ThreeDCard className="glass p-8 rounded-3xl" glowColor="rgba(0, 242, 255, 0.1)">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Cpu size={24} />
              </div>
              
              {/* Active/Inactive Toggle */}
              <button
                type="button"
                onClick={() => handleToggleStatus(api)}
                className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-mono font-bold transition-all border flex items-center gap-1.5 ${
                  api.status !== "inactive"
                    ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                    : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${api.status !== "inactive" ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                {api.status !== "inactive" ? "ACTIVE" : "INACTIVE"}
              </button>
            </div>
            
            <h3 className="text-xl font-display font-bold text-white mb-2">{api.name}</h3>
            <p className="text-sm text-slate-500 mb-6">{api.description}</p>
            
            <div className="space-y-4 mb-8">
              {Object.keys(api.config).map((field) => (
                <div key={field}>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{field}</label>
                  <div className="relative">
                    <input 
                      type={!shouldEncrypt(field) || showConfig[`${api.id}-${field}`] ? 'text' : 'password'}
                      defaultValue={api.config[field]}
                      placeholder={shouldEncrypt(field) && isEncrypted(api.config[field]) ? "•••••••••••••••• (Encrypted)" : "Enter value"}
                      onFocus={(e) => {
                        if (shouldEncrypt(field) && isEncrypted(e.target.value)) {
                          e.target.value = '';
                          handleConfigChange(api.id, field, '');
                        }
                      }}
                      onChange={(e) => handleConfigChange(api.id, field, e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-cyan-500 transition-colors font-mono text-sm pr-12"
                    />
                    {shouldEncrypt(field) && (
                    <button 
                      type="button"
                      onClick={() => toggleShow(api.id, field)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400"
                    >
                      <Eye size={16} />
                    </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleSave(api)}
              className="w-full py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
            >
              SAVE CONFIGURATION
            </button>
          </ThreeDCard>
        </div>
      ))}
    </div>
  );
}

function RiskTab() {
  const { globalSettings, updateGlobalSettings } = useApp();
  const [editingLeverage, setEditingLeverage] = useState(false);
  const [leverageInput, setLeverageInput] = useState(globalSettings.leverageCap?.toString() || "100");
  
  const [editingNewsMultiplier, setEditingNewsMultiplier] = useState(false);
  const [newsMultiplierInput, setNewsMultiplierInput] = useState(globalSettings.newsSpreadMultiplier?.toString() || "10");

  const [showAddNews, setShowAddNews] = useState(false);
  const [newNews, setNewNews] = useState({ title: '', timestamp: '', currency: 'USD', durationMinutes: 2 });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="glass p-8 rounded-3xl space-y-8">
        <h3 className="text-xl font-display font-bold text-white flex items-center gap-3">
          <ShieldCheck className="text-toxic-orange" /> RISK PARAMETERS
        </h3>
        
        {/* Leverage Cap Editable Rows */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-toxic-orange/20 transition-colors">
          <div>
            <p className="text-sm font-bold text-white mb-1">Leverage Cap</p>
            <p className="text-xs text-slate-500">Global limit for FX and Crypto pairs. (e.g. 100 for 1:100)</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            {editingLeverage ? (
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-right w-20 font-mono"
                  value={leverageInput}
                  onChange={(e) => setLeverageInput(e.target.value)}
                />
                <button 
                  onClick={() => {
                    const val = parseInt(leverageInput);
                    if (!isNaN(val) && val > 0) {
                      updateGlobalSettings({ leverageCap: val });
                      setEditingLeverage(false);
                    }
                  }}
                  className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold uppercase tracking-widest hover:bg-green-500/30"
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <p className="text-lg font-display font-bold text-toxic-orange">1:{globalSettings.leverageCap || 100}</p>
                <button onClick={() => setEditingLeverage(true)} className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest hover:underline">Edit</button>
              </>
            )}
          </div>
        </div>

        {/* News Spread Multiplier */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-toxic-orange/20 transition-colors">
          <div>
            <p className="text-sm font-bold text-white mb-1">News Spread Multiplier</p>
            <p className="text-xs text-slate-500">Multiplier applied to spread during important news.</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            {editingNewsMultiplier ? (
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-right w-20 font-mono"
                  value={newsMultiplierInput}
                  onChange={(e) => setNewsMultiplierInput(e.target.value)}
                />
                <button 
                  onClick={() => {
                    const val = parseFloat(newsMultiplierInput);
                    if (!isNaN(val) && val > 0) {
                      updateGlobalSettings({ newsSpreadMultiplier: val });
                      setEditingNewsMultiplier(false);
                    }
                  }}
                  className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold uppercase tracking-widest hover:bg-green-500/30"
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <p className="text-lg font-display font-bold text-toxic-orange">{globalSettings.newsSpreadMultiplier || 10}x</p>
                <button onClick={() => setEditingNewsMultiplier(true)} className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest hover:underline">Edit</button>
              </>
            )}
          </div>
        </div>

      </div>

      <div className="glass p-8 rounded-3xl space-y-6">
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-display font-bold text-white flex items-center gap-3">
            <Calendar className="text-cyan-500" /> UPCOMING NEWS
            </h3>
            <button onClick={() => setShowAddNews(!showAddNews)} className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                Add Event
            </button>
        </div>

        {showAddNews && (
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-4">
                <input placeholder="Event Title (e.g. CPI)" value={newNews.title} onChange={e => setNewNews({...newNews, title: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded p-2 text-sm text-white" />
                <div className="flex gap-2">
                    <input type="datetime-local" value={newNews.timestamp} onChange={e => setNewNews({...newNews, timestamp: e.target.value})} className="flex-1 bg-slate-900 border border-white/10 rounded p-2 text-sm text-white" />
                    <input placeholder="Currency" value={newNews.currency} onChange={e => setNewNews({...newNews, currency: e.target.value})} className="w-20 bg-slate-900 border border-white/10 rounded p-2 text-sm text-white" />
                    <input type="number" placeholder="Min" title="Duration Minutes" value={newNews.durationMinutes} onChange={e => setNewNews({...newNews, durationMinutes: Number(e.target.value)})} className="w-16 bg-slate-900 border border-white/10 rounded p-2 text-sm text-white" />
                </div>
                <button 
                  onClick={() => {
                      if (!newNews.title || !newNews.timestamp || !newNews.currency) return;
                      const events = globalSettings.newsEvents || [];
                      updateGlobalSettings({ 
                          newsEvents: [...events, { id: `news-${Date.now()}`, title: newNews.title, timestamp: new Date(newNews.timestamp).toISOString(), currency: newNews.currency, durationMinutes: newNews.durationMinutes }]
                      });
                      setShowAddNews(false);
                      setNewNews({ title: '', timestamp: '', currency: 'USD', durationMinutes: 2 });
                  }}
                  className="w-full py-2 bg-cyan-500 text-slate-900 font-bold uppercase rounded text-[10px] tracking-widest"
                >
                    Save Event
                </button>
            </div>
        )}

        <div className="space-y-3">
            {(globalSettings.newsEvents || []).map(event => (
                <div key={event.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="font-bold text-white text-sm">{event.title} <span className="text-toxic-orange ml-2 text-xs border border-toxic-orange px-1 rounded">{event.currency}</span></p>
                        <p className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()} ({event.durationMinutes} min)</p>
                    </div>
                    <button 
                        onClick={() => {
                            updateGlobalSettings({ newsEvents: (globalSettings.newsEvents || []).filter((e: any) => e.id !== event.id) });
                        }}
                        className="text-red-500 hover:bg-red-500/20 p-2 rounded"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
            {(!globalSettings.newsEvents || globalSettings.newsEvents.length === 0) && (
                <p className="text-slate-500 italic text-sm">No upcoming news events configured.</p>
            )}
        </div>
      </div>
    </div>
  );
}

function AuditLogTab({ logs }: { logs: AuditLog[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(
    (log) =>
      log.actorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass rounded-3xl overflow-visible border border-white/5">
      <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <h3 className="font-display font-bold text-xl text-white tracking-tighter uppercase">Protocol Audit Log</h3>
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by user or action..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-[16px] text-white outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[9999] max-h-60 overflow-y-auto">
              {(() => {
                const suggestions = new Set<string>();
                logs.forEach(l => {
                  if (l.actorName) suggestions.add(l.actorName);
                  if (l.targetName) suggestions.add(l.targetName);
                  if (l.action) suggestions.add(l.action);
                });
                return Array.from(suggestions).filter(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
              })().map((suggestion, i) => (
                <button
                  key={i}
                  className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white"
                  onClick={() => setSearchTerm(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
              
              {(() => {
                const suggestions = new Set<string>();
                logs.forEach(l => {
                  if (l.actorName) suggestions.add(l.actorName);
                  if (l.targetName) suggestions.add(l.targetName);
                  if (l.action) suggestions.add(l.action);
                });
                return Array.from(suggestions).filter(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
              })().length === 0 && (
                <div className="px-4 py-2 text-sm text-slate-500">No matches found</div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="border-b border-white/5">
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actor</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entity</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Info</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white leading-none mb-1">{log.actorName || 'SYSTEM'}</p>
                    {log.actorRole && (
                      <span className={`text-[8px] px-1 rounded font-bold uppercase ${log.actorRole === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {log.actorRole}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">ID: {log.actorId}</p>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${
                      log.type === 'security' ? 'bg-red-500/10 text-red-500' :
                      log.type === 'financial' ? 'bg-azure/10 text-azure' :
                      log.type === 'auth' ? 'bg-purple-500/10 text-purple-400' :
                      log.type === 'user_management' ? 'bg-green-500/10 text-green-400' :
                      'bg-white/10 text-white'
                    }`}>
                      {log.type === 'security' ? <Lock size={12} /> : 
                       log.type === 'financial' ? <Wallet size={12} /> : 
                       log.type === 'user_management' ? <Users size={12} /> :
                       log.type === 'auth' ? <Key size={12} /> :
                       <Cpu size={12} />}
                    </span>
                    <p className="text-xs font-bold text-white uppercase tracking-widest">{log.action}</p>
                  </div>
                </td>
                <td className="p-6">
                  <p className="text-sm text-white font-medium">{log.targetName || 'N/A'}</p>
                  {log.targetId && <p className="text-[10px] text-slate-500">ID: {log.targetId}</p>}
                </td>
                <td className="p-6">
                  <div className="text-xs text-slate-500">
                    <p>IP: {log.ip || 'N/A'}</p>
                    <p>Loc: {log.location || 'N/A'}</p>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <p className="text-xs text-slate-500 font-mono">{new Date(log.createdAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-slate-600 font-mono">{new Date(log.createdAt).toLocaleTimeString()}</p>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-30">
                    <FileText size={48} className="text-slate-500" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No logs found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MarketTab({ configs, onUpdate }: { configs: SymbolConfig[], onUpdate: any }) {
  const { addSymbolConfig, deleteSymbolConfig, apis } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spreadValue, setSpreadValue] = useState<number>(0);
  const [bulkSpread, setBulkSpread] = useState<string>("");

  const baseSymbolsFlat = [
    "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD",
    "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/AUD", "EUR/CAD", "EUR/NZD", "GBP/JPY", "GBP/CHF", "GBP/AUD", "GBP/CAD", "GBP/NZD", "AUD/JPY", "AUD/CHF", "AUD/CAD", "AUD/NZD", "NZD/JPY", "NZD/CHF", "CAD/JPY", "CHF/JPY",
    "USD/TRY", "EUR/TRY", "USD/ZAR", "EUR/ZAR", "USD/MXN", "EUR/MXN", "USD/SGD", "USD/HKD", "USD/SEK", "USD/NOK", "USD/DKK", "USD/PLN", "EUR/PLN", "USD/CNH", "EUR/CNH", "AUD/SGD", "GBP/SGD",
    "XAU/USD", "XAG/USD",
    "NAS100", "US30", "US500", "GER40", "UK100", "JPN225", "FRA40", "AUS200", "CHN50",
    "USOIL", "UKOIL",
    "BTC/USD", "ETH/USD"
  ];

  // New Symbol Form Toggles/States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newSpread, setNewSpread] = useState("1.5");
  const [newContractSize, setNewContractSize] = useState("100000");
  const [pipSizePreset, setPipSizePreset] = useState("0.0001");
  const [customPipSize, setCustomPipSize] = useState("");
  const [newCommission, setNewCommission] = useState("0");

  const handleUpdate = async (id: string, spread: number) => {
    await onUpdate(id, { spread });
    setEditingId(null);
  };

  const handleBulkUpdate = async () => {
    const val = parseFloat(bulkSpread);
    if (isNaN(val)) return;
    
    const promises = configs.map(c => onUpdate(c.id, { spread: val }));
    await Promise.all(promises);
    setBulkSpread("");
    alert("Bulk spread update complete!");
  };

  const handleCreateSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) {
      alert("Please enter a symbol name.");
      return;
    }

    const symbolUpper = newSymbol.trim().toUpperCase();

    // Prevent duplicates
    if (configs.some(c => c.symbol === symbolUpper)) {
      alert(`The symbol configuration for ${symbolUpper} already exists.`);
      return;
    }

    const finalSpread = parseFloat(newSpread) || 0;
    const finalContractSize = parseFloat(newContractSize) || 100000;
    const finalCommission = parseFloat(newCommission) || 0;
    
    let finalPipSize = parseFloat(pipSizePreset);
    if (pipSizePreset === "custom") {
      finalPipSize = parseFloat(customPipSize);
      if (isNaN(finalPipSize) || finalPipSize <= 0) {
        alert("Please enter a valid custom pip size (e.g. 0.0001)");
        return;
      }
    }

    try {
      await addSymbolConfig({
        symbol: symbolUpper,
        spread: finalSpread,
        contractSize: finalContractSize,
        pipSize: finalPipSize,
        commission: finalCommission,
        isActive: true
      });

      alert(`Successfully added ${symbolUpper} to the market feed!`);
      
      // Reset State
      setNewSymbol("");
      setNewSpread("1.5");
      setNewContractSize("100000");
      setPipSizePreset("0.0001");
      setCustomPipSize("");
      setNewCommission("0");
      setShowAddForm(false);
    } catch (err: any) {
      alert("Failed to create symbol config: " + err.message);
    }
  };

  const handleDeleteSymbol = async (id: string, symbol: string) => {
    if (confirm(`Are you sure you want to completely delete ${symbol} from the feed?`)) {
      await deleteSymbolConfig(id);
      alert(`${symbol} deleted successfully.`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Widget */}
      <div className="glass p-8 rounded-3xl border border-white/5 bg-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-display font-bold text-xl text-white uppercase tracking-tighter mb-2">Liquidity & Spreads</h3>
          <p className="text-slate-400 text-sm">Configure market depth, broker spreads, and add custom pairs to the terminal feed.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Add New Pair Toggle Button */}
          <button 
            onClick={() => {
              setShowAddForm(!showAddForm);
              setNewSymbol("");
            }}
            className="px-6 py-3 w-full sm:w-auto bg-green-500 hover:bg-green-400 rounded-2xl text-slate-950 font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(34,197,94,0.3)]"
          >
            <Plus size={16} />
            {showAddForm ? "Hide Form" : "Add Custom Pair"}
          </button>

          <div className="flex bg-slate-900 rounded-2xl border border-white/10 p-2 gap-4 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase">Pips</span>
                <input 
                  type="number" 
                  value={bulkSpread}
                  onChange={e => setBulkSpread(e.target.value)}
                  placeholder="Bulk spread..." 
                  className="w-full pl-12 pr-4 py-2 bg-transparent text-white outline-none font-mono text-sm"
                />
             </div>
             <button 
               onClick={handleBulkUpdate}
               className="px-6 py-2 bg-azure rounded-xl text-slate-950 font-bold uppercase tracking-widest hover:scale-105 transition-transform text-xs"
             >
               Apply to All
             </button>
          </div>
        </div>
      </div>

      {/* Expandable Add Symbol Form */}
      {showAddForm && (
        <ThreeDCard className="glass p-8 rounded-[32px] border border-green-500/20 bg-green-500/[0.02]" glowColor="rgba(34, 197, 94, 0.05)">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-display font-bold text-lg text-white uppercase tracking-tight">Create Custom Pair Configuration</h4>
              <p className="text-xs text-slate-400">Specify details to dynamically construct interactive terminal charts.</p>
            </div>
            <button 
              onClick={() => {
                setShowAddForm(false);
                setNewSymbol("");
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateSymbol} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Symbol Ticker */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Symbol Ticker</label>
              </div>
              <input 
                type="text" 
                required
                placeholder="Type symbol (e.g. SOL/USD, AAPL)"
                value={newSymbol}
                onChange={e => {
                  setNewSymbol(e.target.value);
                }}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 font-mono text-sm placeholder-slate-600 transition-colors"
              />
            </div>

            {/* Spread (PIPS) */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Spread (Pips)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                required
                placeholder="e.g. 1.2, 5.0"
                value={newSpread}
                onChange={e => setNewSpread(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 font-mono text-sm transition-colors"
              />
            </div>

            {/* Contract Size */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Contract Size</label>
              <input 
                type="number" 
                step="1"
                min="1"
                required
                placeholder="100000 (FX), 100 (Gold), 1 (Crypto)"
                value={newContractSize}
                onChange={e => setNewContractSize(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 font-mono text-sm transition-colors"
              />
            </div>

            {/* Pip Size Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pip Resolution</label>
              <select 
                value={pipSizePreset}
                onChange={e => setPipSizePreset(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 text-sm transition-colors"
              >
                <option value="0.0001">0.0001 (Forex standard - e.g. EUR/USD)</option>
                <option value="0.01">0.01 (JPY pairs - e.g. USD/JPY)</option>
                <option value="0.1">0.1 (Metals standard - e.g. XAU/USD)</option>
                <option value="1.0">1.0 (Crypto standard - e.g. BTC/USD)</option>
                <option value="custom">Custom Value...</option>
              </select>
            </div>

            {pipSizePreset === "custom" && (
              <div className="space-y-2 animate-fadeIn col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Custom Pip Size</label>
                <input 
                  type="number" 
                  step="0.000001"
                  required
                  placeholder="e.g. 0.00001"
                  value={customPipSize}
                  onChange={e => setCustomPipSize(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 font-mono text-sm transition-colors"
                />
              </div>
            )}

            {/* Commission */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Commission per Lot ($)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                placeholder="0 (Free)"
                value={newCommission}
                onChange={e => setNewCommission(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 font-mono text-sm transition-colors"
              />
            </div>

            <div className="col-span-full pt-4 flex items-center justify-end gap-4">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 border border-white/10 hover:bg-white/5 text-xs text-white uppercase tracking-wider font-bold rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-8 py-3 bg-green-500 hover:bg-green-400 text-slate-950 text-xs uppercase tracking-wider font-bold rounded-2xl transition-colors shadow-[0_4px_15px_rgba(34,197,94,0.3)]"
              >
                Create Pair Feed
              </button>
            </div>
          </form>
        </ThreeDCard>
      )}

      {/* Grid of Symbol Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {configs.sort((a,b) => a.symbol.localeCompare(b.symbol)).map((config) => (
          <ThreeDCard key={config.id} className="glass p-6 rounded-3xl border border-white/5 group relative overflow-hidden" glowColor="rgba(0, 242, 255, 0.05)">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-display font-bold text-white tracking-widest">{config.symbol}</h4>
                {/* Visual marker of custom added pair if it's not base */}
                {!baseSymbolsFlat.includes(config.symbol) && (
                  <span className="text-[8px] bg-green-500/10 border border-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider mt-1 inline-block">Custom</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${config.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                {/* Delete button for custom pairs or any pairs */}
                <button 
                  onClick={() => handleDeleteSymbol(config.id, config.symbol)}
                  className="p-1 px-1.5 rounded-lg border border-red-500/10 hover:border-red-500/40 text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 duration-200"
                  title="Delete configuration"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Spread</span>
                {editingId === config.id ? (
                   <input 
                     type="number" 
                     autoFocus
                     value={spreadValue}
                     onChange={e => setSpreadValue(parseFloat(e.target.value) || 0)}
                     className="w-20 bg-slate-800 border border-azure rounded px-2 py-1 text-white font-mono text-xs outline-none"
                     onBlur={() => handleUpdate(config.id, spreadValue)}
                     onKeyDown={e => e.key === 'Enter' && handleUpdate(config.id, spreadValue)}
                   />
                ) : (
                  <button 
                    onClick={() => {
                      setEditingId(config.id);
                      setSpreadValue(config.spread);
                    }}
                    className="text-lg font-mono font-bold text-azure group-hover:scale-110 transition-transform"
                    title="Click to edit spread"
                  >
                    {config.spread} <span className="text-[10px] text-slate-500 ml-1">PIPS</span>
                  </button>
                )}
              </div>
              
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contract Size</span>
                 <span className="text-xs font-mono text-slate-300">{Number(config.contractSize).toLocaleString()}</span>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pip Resolution</span>
                 <span className="text-xs font-mono text-slate-300">{config.pipSize}</span>
              </div>
              
              <button 
                onClick={() => onUpdate(config.id, { isActive: !config.isActive })}
                className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all mt-4
                  ${config.isActive ? 'border-white/10 text-white hover:bg-white/5' : 'bg-green-500 border-green-500 text-slate-950'}
                `}
              >
                {config.isActive ? 'Disable Feed' : 'Enable Feed'}
              </button>
            </div>
          </ThreeDCard>
        ))}
        {configs.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 opacity-50 border-2 border-dashed border-white/5 rounded-3xl">
             <Info size={48} className="mx-auto text-slate-600" />
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No symbol configurations found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function VerificationTab({ requests, onHandle }: { requests: VerificationRequest[], onHandle: (id: string, status: 'approved' | 'rejected') => void }) {
  return (
    <div className="glass rounded-[32px] overflow-hidden border border-white/5">
      <div className="p-8 border-b border-white/5 flex items-center justify-between">
         <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter">Identity Validation Hub</h3>
         <div className="px-4 py-1.5 rounded-full bg-azure/10 border border-azure/20 text-azure text-[10px] font-bold uppercase tracking-widest">
            {requests.filter(r => r.status === 'pending').length} Pending Requests
         </div>
      </div>
      
      <div className="divide-y divide-white/5">
        {requests.map(req => (
          <div key={req.id} className="p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center hover:bg-white/[0.02] transition-all">
            <div className="flex-1 space-y-4">
               <div>
                  <h4 className="text-lg font-bold text-white mb-1">{req.userName}</h4>
                  <p className="text-xs text-slate-500 font-mono">{req.userEmail}</p>
               </div>
               
               <div className="flex gap-4">
                  {req.docs.map((doc, idx) => (
                    <div key={idx} className="relative group overflow-hidden rounded-xl border border-white/10 bg-black w-24 h-24 cursor-zoom-in">
                       <img src={doc.url} alt="Document" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                       <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center">
                          <p className="text-[8px] font-bold text-white uppercase tracking-tighter">{doc.type}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="text-right space-y-4">
               <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Submitted {new Date(req.submittedAt).toLocaleString()}</div>
               <div className="flex gap-3 justify-end">
                  {req.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => onHandle(req.id, 'rejected')}
                        className="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-400 font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center gap-2"
                      >
                        <X size={14} /> Reject Access
                      </button>
                      <button 
                         onClick={() => onHandle(req.id, 'approved')}
                         className="px-6 py-2.5 rounded-xl bg-azure text-slate-950 font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <CheckCircle size={14} /> Approve Identity
                      </button>
                    </>
                  ) : (
                    <span className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${req.status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                       {req.status}
                    </span>
                  )}
               </div>
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="p-20 text-center space-y-4 opacity-50">
             <ShieldCheck size={48} className="mx-auto text-slate-600" />
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No KYC protocols pending execution.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TraderModal({ selectedTrader, onClose }: { selectedTrader: UserAccount, onClose: () => void }) {
  const { trades, isAdmin, updateUser, addAuditLog, user, users } = useApp();
  const [tradingAccounts, setTradingAccounts] = useState<TradingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const snap = await getDocs(collection(db, "users", selectedTrader.id, "tradingAccounts"));
        setTradingAccounts(snap.docs.map(d => ({ ...d.data(), id: d.id }) as TradingAccount));
      } catch (e) {
        console.error("Error fetching accounts:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, [selectedTrader.id]);

  const handleUpdateRole = async (newRole: UserRole) => {
    if (!isAdmin) return;
    const trader = (users as any).find((u: any) => u.id === selectedTrader.id) || selectedTrader;
    try {
      await updateUser(trader.id, { role: newRole });
      onClose();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateAccount = async (accountId: string, data: Partial<TradingAccount>) => {
    try {
      const acctRef = doc(db, "users", selectedTrader.id, "tradingAccounts", accountId);
      await updateDoc(acctRef, data);
      
      setTradingAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, ...data } : acc
      ));
    } catch (e) {
      alert("Failed to update account. Check permissions.");
    }
  };

  const userTrades = trades.slice(0, 5); 

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative glass p-6 sm:p-8 rounded-[2rem] sm:rounded-[32px] w-full max-w-xl sm:max-w-4xl border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter">Trader Overview: {selectedTrader.name}</h3>
          <div className="flex items-center gap-4">
              {isAdmin && (
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-[10px]">
                  <select 
                    key={`${selectedTrader.id}-${((users as any).find((u: any) => u.id === selectedTrader.id) || selectedTrader).role}`}
                    value={((users as any).find((u: any) => u.id === selectedTrader.id) || selectedTrader).role}
                    onChange={(e) => handleUpdateRole(e.target.value as any)}
                    className="bg-slate-900 border-none text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer px-3 py-1 rounded-lg text-white"
                  >
                    <option value="trader" className="bg-slate-900">Trader</option>
                    <option value="user" className="bg-slate-900">User</option>
                    <option value="moderator" className="bg-slate-900 text-blue-400">Moderator</option>
                    <option value="admin" className="bg-slate-900 text-purple-400">Admin</option>
                  </select>
                </div>
              )}
             <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
               <X size={24} />
             </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="glass p-6 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Performance</p>
            <div className="flex flex-col gap-2">
                <div>
                  <p className="text-sm text-slate-400">Total PnL</p>
                  <p className={`text-xl font-bold ${(selectedTrader.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${(selectedTrader.pnl || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Win Rate</p>
                  <p className="text-xl font-bold text-white">{selectedTrader.winRate}%</p>
                </div>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk</p>
            <div className="flex flex-col gap-2">
                <div>
                  <p className="text-sm text-slate-400">Max Drawdown</p>
                  <p className="text-xl font-bold text-red-400">{selectedTrader.maxDrawdown}%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Trades</p>
                  <p className="text-xl font-bold text-white">{selectedTrader.totalTrades}</p>
                </div>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identity Details</p>
            <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Name</p>
                  <p className="text-sm font-bold text-white uppercase">{selectedTrader.realName || '-'} {selectedTrader.lastName || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Fiscal Code</p>
                  <p className="text-sm font-mono text-white">{selectedTrader.fiscalCode || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">DOB</p>
                  <p className="text-sm font-mono text-white">{selectedTrader.birthDate || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Country</p>
                  <p className="text-sm font-bold text-white uppercase">{selectedTrader.country || '-'}</p>
                </div>
            </div>
            {isAdmin && (selectedTrader.realName || selectedTrader.fiscalCode) && (
              <button 
                onClick={async () => {
                   if (confirm("Reset user identity data and force re-registration?")) {
                      await updateUser(selectedTrader.id, { realName: "", lastName: "", fiscalCode: "", birthDate: "", country: "" });
                      alert("Identity data reset. User will be prompted next login.");
                   }
                }}
                className="mt-2 text-[10px] px-3 py-1 bg-red-500/20 text-red-400 rounded cursor-pointer hover:bg-red-500/30 uppercase tracking-widest font-bold"
              >
                Reset / Unlock Data
              </button>
            )}
          </div>
        </div>

        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Trading Accounts</h4>
        <div className="space-y-4 mb-8">
            {isLoading ? (
               <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-azure" /></div>
            ) : tradingAccounts.length > 0 ? (
               tradingAccounts.map(acc => (
                <div key={acc.id} className="p-6 bg-white/5 rounded-2xl border border-white/5">
                    {/* Admin Adjustment Section */}
                    {isAdmin && (
                      <div className="mb-6 p-4 bg-slate-950/40 rounded-xl border border-white/5 space-y-4">
                         <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-azure animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adjust Live Account Parameters</span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                               <label className="text-[9px] font-bold text-slate-400 uppercase">Status</label>
                               <select 
                                  value={acc.status} 
                                  onChange={(e) => handleUpdateAccount(acc.id, { status: e.target.value as any })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-azure/50 outline-none transition-all"
                               >
                                  <option value="active">Active</option>
                                  <option value="suspended">Suspended</option>
                                  <option value="pending">Pending</option>
                               </select>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-bold text-slate-400 uppercase">Account Balance ($)</label>
                               <input 
                                  type="number" 
                                  value={acc.balance || 0} 
                                  onChange={(e) => handleUpdateAccount(acc.id, { balance: Number(e.target.value), equity: Number(e.target.value) })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-azure/50 outline-none transition-all"
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-bold text-slate-400 uppercase">Challenge Type / Phase</label>
                               <select 
                                  value={acc.type || 'evaluation'} 
                                  onChange={(e) => handleUpdateAccount(acc.id, { type: e.target.value as any })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-azure/50 outline-none transition-all"
                               >
                                  <option value="evaluation">Evaluation (Normal)</option>
                                  <option value="evaluation-1">Phase 1 (evaluation-1)</option>
                                  <option value="evaluation-2">Phase 2 (evaluation-2)</option>
                                  <option value="funded">Funded</option>
                                  <option value="competition">Competition</option>
                               </select>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                               <label className="text-[9px] font-bold text-slate-400 uppercase">Daily Drawdown ($ Limit)</label>
                               <input 
                                  type="number" 
                                  value={acc.rules?.dailyDrawdown || 0} 
                                  onChange={(e) => handleUpdateAccount(acc.id, { 
                                     rules: { ...acc.rules, dailyDrawdown: Number(e.target.value) } as any
                                  })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-azure/50 outline-none transition-all"
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-bold text-slate-400 uppercase">Max Drawdown ($ Limit)</label>
                               <input 
                                  type="number" 
                                  value={acc.rules?.maxDrawdown || 0} 
                                  onChange={(e) => handleUpdateAccount(acc.id, { 
                                     rules: { ...acc.rules, maxDrawdown: Number(e.target.value) } as any
                                  })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-azure/50 outline-none transition-all"
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-bold text-slate-400 uppercase">Profit Target ($)</label>
                               <input 
                                  type="number" 
                                  value={acc.rules?.profitTarget || 0} 
                                  onChange={(e) => handleUpdateAccount(acc.id, { 
                                     rules: { ...acc.rules, profitTarget: Number(e.target.value) } as any
                                  })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-azure/50 outline-none transition-all"
                               />
                            </div>
                         </div>
                         <div className="h-px bg-white/5 my-2" />
                      </div>
                    )}
                   <div className="flex items-center justify-between mb-4">
                     <div>
                       <p className="text-sm text-white font-bold">{acc.broker} - {acc.server}</p>
                       <p className="text-xs text-slate-500 uppercase">#{acc.accountNumber} ({acc.type})</p>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${acc.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>{acc.status}</span>
                     </div>
                   </div>

                   {/* MT5 Sync Section */}
                   <div className="mt-4 p-4 bg-slate-950/50 rounded-xl border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Terminal size={14} className={acc.mt5Sync?.enabled ? "text-azure" : "text-slate-600"} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MT5 Bridge Copy-Trading</span>
                         </div>
                         <button 
                            onClick={() => handleUpdateAccount(acc.id, { 
                               mt5Sync: { 
                                  enabled: !acc.mt5Sync?.enabled, 
                                  bridgeUrl: acc.mt5Sync?.bridgeUrl || '', 
                                  token: acc.mt5Sync?.token || '' 
                               } 
                            })}
                            className={`relative w-10 h-5 rounded-full transition-colors ${acc.mt5Sync?.enabled ? 'bg-azure' : 'bg-slate-700'}`}
                         >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${acc.mt5Sync?.enabled ? 'translate-x-5' : ''}`} />
                         </button>
                      </div>

                      {acc.mt5Sync?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                           <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Bridge URL</label>
                              <input 
                                 type="text" 
                                 value={acc.mt5Sync?.bridgeUrl || ''} 
                                 onChange={(e) => handleUpdateAccount(acc.id, { 
                                    mt5Sync: { ...acc.mt5Sync!, bridgeUrl: e.target.value } 
                                 })}
                                 placeholder="https://vps-bridge-api.com"
                                 className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-azure/50 outline-none transition-all"
                              />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Bridge Token</label>
                              <input 
                                 type="password" 
                                 value={acc.mt5Sync?.token || ''} 
                                 onChange={(e) => handleUpdateAccount(acc.id, { 
                                    mt5Sync: { ...acc.mt5Sync!, token: e.target.value } 
                                 })}
                                 placeholder="MT5_AUTH_TOKEN"
                                 className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-azure/50 outline-none transition-all"
                              />
                           </div>
                        </div>
                      )}
                   </div>
                </div>
               ))
            ) : (
               <p className="text-slate-500 italic p-4">No accounts for this trader</p>
            )}
        </div>

        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Recent Trades</h4>
        <div className="space-y-2">
            {userTrades.map(trade => (
              <div key={trade.id} className="p-4 bg-white/5 rounded-xl flex items-center justify-between border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex gap-4 items-center w-1/3">
                  <div className={`w-2 h-2 rounded-full ${trade.type === 'buy' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div>
                    <p className="font-bold text-white text-sm">{trade.symbol}</p>
                    <p className="text-xs text-slate-500 uppercase">{trade.type} • {trade.size} Lots</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-sm font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                    {new Date(trade.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {userTrades.length === 0 && <p className="text-slate-500 italic p-4">No recent trades.</p>}
        </div>
      </div>
    </div>
  );
}

function CompetitionAdminTab({ users }: { users: UserAccount[] }) {
  const { competitions, updateCompetitions } = useApp();
  const [activeId, setActiveId] = useState<string>(competitions[0]?.id || '');
  const [selectedTrader, setSelectedTrader] = useState<UserAccount | null>(null);

  const [formConfig, setFormConfig] = useState<CompetitionConfig | null>(competitions[0] || null);

  useEffect(() => {
    if (activeId && competitions.length > 0) {
      const comp = competitions.find(c => c.id === activeId);
      if (comp) setFormConfig(comp);
    }
  }, [activeId, competitions]);

  const handleAddNew = () => {
    const newId = `comp-${Date.now()}`;
    const newComp: CompetitionConfig = {
      id: newId,
      isActive: false,
      currentMonthName: 'New Competition',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      prizes: {
        first: "250k Evaluation Account",
        second: "100k Evaluation Account",
        third: "50k Evaluation Account",
        fourthToTwentieth: "5k Evaluation Account",
        rest: "70% Discount Code for 100k & 250k Accounts"
      }
    };
    const updated = [...competitions, newComp];
    updateCompetitions(updated).then(() => {
      setActiveId(newId);
      setFormConfig(newComp);
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this competition?")) {
      const updated = competitions.filter(c => c.id !== id);
      await updateCompetitions(updated);
      if (activeId === id) {
        setActiveId(updated[0]?.id || '');
        setFormConfig(updated[0] || null);
      }
    }
  };

  const handleSave = async () => {
    try {
      if (!formConfig) return;
      
      const updated = competitions.map(c => c.id === formConfig.id ? formConfig : c);
      if (!competitions.some(c => c.id === formConfig.id)) {
        updated.push(formConfig);
      }
      
      await updateCompetitions(updated);
      alert('Competition config saved');
    } catch (err: any) {
      console.error(err);
      alert('Failed to save competition config. See console for details.');
    }
  };

  // Calculate participants for the active competition
  const participants = users.filter(u => u.tradingAccounts?.some(acc => acc.type === 'competition' && acc.competitionId === formConfig?.id));

  return (
    <div className="space-y-6">
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {competitions.map(c => (
          <button 
            key={c.id} 
            onClick={() => setActiveId(c.id)}
            className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors border group relative ${activeId === c.id ? 'bg-azure text-slate-900 border-azure' : 'glass text-slate-400 border-white/5 hover:border-azure/50 hover:text-white'}`}
          >
            {c.currentMonthName}
            {c.isActive ? ' (Active)' : ' (Draft)'}
            <span 
              onClick={(e) => handleDelete(e, c.id)}
              className={`absolute -top-2 -right-2 bg-red-500/20 text-red-500 border border-red-500 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${competitions.length <= 1 ? 'hidden' : ''}`}
            >
              ×
            </span>
          </button>
        ))}
        <button onClick={handleAddNew} className="whitespace-nowrap px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors border glass text-azure border-azure/20 hover:bg-azure/10">
          + Add New
        </button>
      </div>

      {!formConfig ? (
        <div className="text-center p-12 text-slate-500">No competitions found. Create one.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="space-y-1">
                <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter">Edit Competition</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${formConfig.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-500'}`}>
                    {formConfig.isActive ? 'Active' : 'Draft'}
                  </span>
                  {formConfig.isVIP && (
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                      VIP GOLD
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">VIP Mode</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={!!formConfig.isVIP} onChange={() => setFormConfig({...formConfig, isVIP: !formConfig.isVIP})} />
                    <div className={`block w-12 h-6 rounded-full transition-all ${formConfig.isVIP ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-slate-700'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formConfig.isVIP ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">Enabled</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={!!formConfig.isActive} onChange={() => setFormConfig({...formConfig, isActive: !formConfig.isActive})} />
                    <div className={`block w-12 h-6 rounded-full transition-all ${formConfig.isActive ? 'bg-azure shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'bg-slate-700'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formConfig.isActive ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">Bots Active</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={!!formConfig.botsEnabled} onChange={() => setFormConfig({...formConfig, botsEnabled: !formConfig.botsEnabled})} />
                    <div className={`block w-12 h-6 rounded-full transition-all ${(formConfig as any).botsEnabled ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-slate-700'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${(formConfig as any).botsEnabled ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                </label>
              </div>
              {formConfig.botsEnabled && (
                <div className="pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Bot Activity Intensity (0.1 - 5.0)</label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="5.0" 
                    step="0.1"
                    value={formConfig.botIntensityModifier || 1.0} 
                    onChange={e => setFormConfig({...formConfig, botIntensityModifier: parseFloat(e.target.value)})} 
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase">
                    <span>Chill</span>
                    <span>Intensity: {formConfig.botIntensityModifier || 1.0}x</span>
                    <span>Aggressive</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Month/Year Name (e.g. June 2026)</label>
                  <input value={formConfig.currentMonthName || ''} onChange={e => setFormConfig({...formConfig, currentMonthName: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Entry Fee ($)</label>
                  <input type="number" value={formConfig.entryFee || 0} onChange={e => setFormConfig({...formConfig, entryFee: Number(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" placeholder="0 = Free" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Start Date & Time (Local)</label>
                <input 
                   type="datetime-local" 
                   value={formConfig.startDate ? formConfig.startDate.slice(0, 16) : ''} 
                   onChange={e => {
                     const val = e.target.value;
                     if (val) {
                       const d = new Date(val);
                       if (!isNaN(d.getTime())) setFormConfig({...formConfig, startDate: d.toISOString()});
                     }
                   }} 
                   className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">End Date & Time (Local)</label>
                <input 
                   type="datetime-local" 
                   value={formConfig.endDate ? formConfig.endDate.slice(0, 16) : ''} 
                   onChange={e => {
                     const val = e.target.value;
                     if (val) {
                       const d = new Date(val);
                       if (!isNaN(d.getTime())) setFormConfig({...formConfig, endDate: d.toISOString()});
                     } else {
                       setFormConfig({...formConfig, endDate: undefined});
                     }
                   }} 
                   className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" 
                   placeholder="Keep empty to have no end date" 
                />
              </div>
              
              <div className="pt-4 border-t border-white/5 space-y-4">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Prizes</h4>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">1st Place</label>
                  <input value={formConfig.prizes.first || ''} onChange={e => setFormConfig({...formConfig, prizes: {...formConfig.prizes, first: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">2nd Place</label>
                  <input value={formConfig.prizes.second || ''} onChange={e => setFormConfig({...formConfig, prizes: {...formConfig.prizes, second: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">3rd Place</label>
                  <input value={formConfig.prizes.third || ''} onChange={e => setFormConfig({...formConfig, prizes: {...formConfig.prizes, third: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">4th - 20th Place</label>
                  <input value={formConfig.prizes.fourthToTwentieth || ''} onChange={e => setFormConfig({...formConfig, prizes: {...formConfig.prizes, fourthToTwentieth: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">21st - 100th Place</label>
                  <input value={formConfig.prizes.rest || ''} onChange={e => setFormConfig({...formConfig, prizes: {...formConfig.prizes, rest: e.target.value}})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
              </div>
              
              <button onClick={handleSave} className="w-full mt-4 bg-azure/20 text-azure font-bold py-3 text-sm uppercase tracking-widest rounded-xl hover:bg-azure/30 transition-colors">
                Save Configuration
              </button>
            </div>
          </div>
          
          <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter flex items-center gap-2">
                <Users className="text-azure" /> Participants ({participants.length})
              </h3>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {participants.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No participants for this competition yet.</p>
              ) : (
                participants.map(p => {
                  const compAcc = p.tradingAccounts?.find(a => a.type === 'competition' && a.competitionId === formConfig.id);
                  return (
                    <div 
                      key={p.id} 
                      className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between gap-4 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => setSelectedTrader(p)}
                    >
                      <div>
                        <p className="font-bold text-white">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-azure font-mono">${compAcc?.equity?.toLocaleString() ?? 0}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-widest">Equity</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      
      {selectedTrader && <TraderModal selectedTrader={selectedTrader} onClose={() => setSelectedTrader(null)} />}
    </div>
  );
}

function AnalyticsTab({ users, transactions }: { users: UserAccount[], transactions: Transaction[] }) {
  const totalRevenue = transactions.filter(t => t.type === 'purchase' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  const totalPayouts = transactions.filter(t => t.type === 'payout' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  
  const activeTraders = users.filter(u => u.status === 'active').length;
  const fundedTraders = users.filter(u => (u.tradingAccounts || []).some(acc => acc.type === 'funded')).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ThreeDCard className="glass p-6 rounded-3xl border border-white/5" glowColor="rgba(0, 242, 255, 0.1)">
           <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Revenue</span>
              <TrendingUp size={16} className="text-green-400" />
           </div>
           <p className="text-3xl font-display font-bold text-white">${totalRevenue.toLocaleString()}</p>
        </ThreeDCard>
        
        <ThreeDCard className="glass p-6 rounded-3xl border border-white/5" glowColor="rgba(255, 100, 0, 0.1)">
           <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Payouts</span>
              <Wallet size={16} className="text-toxic-orange" />
           </div>
           <p className="text-3xl font-display font-bold text-white">${totalPayouts.toLocaleString()}</p>
        </ThreeDCard>
        
        <ThreeDCard className="glass p-6 rounded-3xl border border-white/5" glowColor="rgba(255, 255, 255, 0.05)">
           <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Traders</span>
              <Users size={16} className="text-azure" />
           </div>
           <p className="text-3xl font-display font-bold text-white">{activeTraders}</p>
        </ThreeDCard>
        
        <ThreeDCard className="glass p-6 rounded-3xl border border-white/5" glowColor="rgba(255, 255, 255, 0.05)">
           <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Funded Traders</span>
              <CheckCircle size={16} className="text-cyan-400" />
           </div>
           <p className="text-3xl font-display font-bold text-white">{fundedTraders}</p>
        </ThreeDCard>
      </div>

      <div className="glass p-8 rounded-3xl border border-white/5 flex items-center justify-center h-64 text-slate-500">
         <div className="text-center space-y-4">
            <BarChart size={48} className="mx-auto text-slate-600" />
            <p className="text-sm uppercase tracking-widest font-bold">Chart integration ready</p>
         </div>
      </div>
    </div>
  );
}

function MT5Tab() {
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [token, setToken] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const bridgeCode = `import MetaTrader5 as mt5
from flask import Flask, request, jsonify
import logging

# Configuration
API_TOKEN = "${token || 'YOUR_SECURE_TOKEN_HERE'}" 

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def initialize_mt5():
    if not mt5.initialize():
        logging.error(f"MT5 initialization failed, error code: {mt5.last_error()}")
        return False
    return True

@app.route('/place_trade', methods=['POST'])
def place_trade():
    auth_token = request.headers.get('Authorization')
    if auth_token != f"Bearer {API_TOKEN}":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.json
    symbol = data.get('symbol')
    order_type = data.get('type')
    volume = float(data.get('volume', 0.01))
    sl = float(data.get('sl', 0))
    tp = float(data.get('tp', 0))
    
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return jsonify({"success": False, "message": "Price failed"}), 400
        
    price = tick.ask if order_type == "BUY" else tick.bid
    mt5_type = mt5.ORDER_TYPE_BUY if order_type == "BUY" else mt5.ORDER_TYPE_SELL
    
    request_dict = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": mt5_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 123456,
        "comment": "Web Platform Bridge",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(request_dict)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return jsonify({"success": False, "message": result.comment}), 400

    return jsonify({"success": True, "order_id": result.order})

if __name__ == '__main__':
    if initialize_mt5():
        app.run(host='0.0.0.0', port=5000)`;

  const downloadBridge = () => {
    const blob = new Blob([bridgeCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mt5_bridge.py';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const testConnection = async () => {
    if (!bridgeUrl) return;
    setIsTesting(true);
    try {
      const response = await fetch(`${bridgeUrl}/health`, {
          headers: { 
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
      });
      if (response.ok) {
          alert("Connection successful! MT5 is synchronized.");
      } else {
          alert("Connection failed. Check your token and VPS firewall.");
      }
    } catch (e) {
      alert("Failed to reach VPS. Ensure CORS is enabled or use a proxy.");
    }
    setIsTesting(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
        <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter flex items-center gap-2">
           <Terminal className="text-azure" /> MT5 Configuration
        </h3>
        <p className="text-slate-400 text-sm">Configure the connection to your hidden MT5 VPS Bridge.</p>
        
        <div className="space-y-4">
           <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">VPS Bridge URL</label>
              <input 
                value={bridgeUrl}
                onChange={e => setBridgeUrl(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure font-mono text-sm" 
                placeholder="http://IP_VPS:5000"
              />
           </div>
           <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Security Token</label>
              <input 
                value={token}
                onChange={e => setToken(e.target.value)}
                type="password"
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure font-mono text-sm" 
                placeholder="Your security token"
              />
           </div>
           <div className="flex gap-4">
              <button onClick={testConnection} disabled={isTesting} className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-3 text-sm uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors">
                 {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button className="flex-1 bg-azure text-slate-950 font-bold py-3 text-sm uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-azure/20">
                 Save Config
              </button>
           </div>
        </div>
      </div>

      <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
        <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter flex items-center gap-2">
           <Download className="text-toxic-orange" /> Download Bridge Script
        </h3>
        <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 space-y-4">
           <p className="text-xs text-slate-400 leading-relaxed">
             Download this Python script and run it on your Windows VPS where the MetaTrader 5 terminal is installed.
             It will create a secure bridge between your web terminal and the real MT5 market.
           </p>
           <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-4 uppercase tracking-wider">
             <li>Install Python 3.8+ on VPS</li>
             <li>pip install MetaTrader5 Flask</li>
             <li>Make sure MT5 allows Automated Trading</li>
             <li>Run bridge.py and keep it active</li>
           </ul>
        </div>
        <button 
           onClick={downloadBridge}
           className="w-full bg-toxic-orange text-slate-950 font-bold py-4 text-sm uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-toxic-orange/20 flex items-center justify-center gap-2"
        >
           <Download size={18} /> Download bridge.py
        </button>
      </div>
    </div>
  );
}

function SupportTab() {
  const { addNotification } = useApp();
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });

  const sendAnnouncement = () => {
    if (!announcement.title || !announcement.message) return;
    addNotification({
      title: announcement.title,
      message: announcement.message,
      type: 'info'
    });
    setAnnouncement({ title: '', message: '' });
    alert("Announcement sent to all users!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Announcements */}
      <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
         <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter flex items-center gap-2">
            <MessageSquare className="text-azure" /> Global Announcements
         </h3>
         <p className="text-slate-400 text-sm">Broadcast messages to all connected traders on the platform.</p>
         
         <div className="space-y-4">
            <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Title</label>
               <input 
                 value={announcement.title}
                 onChange={e => setAnnouncement({...announcement, title: e.target.value})}
                 className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" 
                 placeholder="e.g. Schedule Maintenance"
               />
            </div>
            <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Message</label>
               <textarea 
                 value={announcement.message}
                 onChange={e => setAnnouncement({...announcement, message: e.target.value})}
                 className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure h-24" 
                 placeholder="Enter message details..."
               />
            </div>
            <button onClick={sendAnnouncement} className="w-full bg-azure text-slate-950 font-bold py-3 text-sm uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform">
               Broadcast to All Users
            </button>
         </div>
      </div>

      {/* Support Tickets (Mock) */}
      <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
         <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter">Active Support Tickets</h3>
         
         <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                 <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-white text-sm">Issue with Payout #{8993 + i}</p>
                    <span className="text-[10px] bg-toxic-orange/20 text-toxic-orange px-2 py-0.5 rounded font-bold uppercase">Open</span>
                 </div>
                 <p className="text-xs text-slate-400 line-clamp-2 mb-4">Hello, I requested a payout 2 days ago but it is still pending in my dashboard. Please advise.</p>
                 <div className="flex gap-2">
                    <input className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white" placeholder="Quick reply..." />
                    <button className="bg-white/10 text-white px-4 rounded-lg text-xs font-bold hover:bg-white/20 transition-colors">Reply</button>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function BotAdminTab() {
  const [bots, setBots] = useState<any[]>([]);
  const [genCount, setGenCount] = useState(5);
  const [genProfile, setGenProfile] = useState('balanced');
  const [loading, setLoading] = useState(false);
  const { fetchWithAuth } = useApp();

  const fetchBots = async () => {
    try {
      const list = await fetchWithAuth('/api/admin/bots');
      setBots(list || []);
    } catch (err: any) {
      console.warn("API bot fetch failed:", err.message);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const generateBots = async () => {
    setLoading(true);
    try {
      const regionData = [
        {
          countries: ["Romania", "Germany", "France", "Italy", "Spain", "UK", "Poland", "Netherlands", "Turkey", "Sweden"],
          firstNames: ["Andrei", "Stefan", "Elena", "Marcus", "Julia", "David", "Sophie", "Luca", "Maria", "Victor", "Alexander", "Mihai", "Emma", "Oliver", "Johan", "Clara", "Antoine"],
          lastInitials: ["M.", "B.", "G.", "V.", "K.", "L.", "T.", "P.", "S.", "D.", "R.", "C."]
        },
        {
          countries: ["USA", "Canada", "Australia", "New Zealand"],
          firstNames: ["James", "John", "Robert", "Michael", "William", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Noah", "Liam", "Mason", "Jacob", "William", "Ethan", "James"],
          lastInitials: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "W.", "T.", "R.", "M."]
        },
        {
          countries: ["Japan", "South Korea", "Singapore", "Malaysia", "Vietnam", "Thailand"],
          firstNames: ["Yuki", "Kenji", "Hana", "Ji-hoon", "Seo-yeon", "Min-jun", "Wei", "Siti", "Ahmad", "Nguyen", "Tran", "Somchai", "Chen", "Lee"],
          lastInitials: ["T.", "K.", "L.", "W.", "C.", "P.", "N.", "H."]
        },
        {
          countries: ["Russia", "Ukraine", "Belarus", "Kazakhstan"],
          firstNames: ["Ivan", "Dmitry", "Sergey", "Nikolay", "Anna", "Maria", "Ekaterina", "Svetlana", "Vladimir", "Mikhail", "Artem", "Sofia"],
          lastInitials: ["I.", "P.", "S.", "V.", "M.", "K.", "R."]
        }
      ];

      let created = 0;
      for (let i = 0; i < genCount; i++) {
        const region = regionData[Math.floor(Math.random() * regionData.length)];
        const botCountry = region.countries[Math.floor(Math.random() * region.countries.length)];
        const firstName = region.firstNames[Math.floor(Math.random() * region.firstNames.length)];
        
        let lastName = region.lastInitials[Math.floor(Math.random() * region.lastInitials.length)];
        if (Math.random() > 0.7) {
          lastName = lastName.replace('.', '') + ' ' + Math.floor(Math.random() * 99);
        }

        const name = `${firstName} ${lastName}`;
        const id = `bot-${Math.random().toString(36).substring(2, 10)}`;
        
        const styles = ['avataaars', 'lorelei', 'notionists', 'adventurer', 'micah'];
        const avatarStyle = styles[Math.floor(Math.random() * styles.length)];
        const createdAt = Date.now() - (Math.floor(Math.random() * 180) + 1) * 24 * 60 * 60 * 1000;

        const botData = {
          id,
          name,
          email: `${id}@bot.fundedgoo.com`,
          role: 'trader',
          isBot: true,
          botProfile: genProfile,
          country: botCountry,
          avatar: `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${id}`,
          createdAt,
          status: 'verified'
        };

        await setDoc(doc(db, 'users', id), botData);
        created++;
      }
      
      await fetchBots();
      alert(`Successfully generated ${created} bots!`);
    } catch (err: any) {
      console.error(err);
      alert(`Error generating bots: ${err.message}`);
    }
    setLoading(false);
  };

  const forceAction = async (botId: string) => {
    try {
      await fetchWithAuth('/api/admin/bots/action', {
        method: 'POST',
        body: JSON.stringify({ botId })
      });
      alert("Trade forced successfully");
    } catch (err: any) {
      alert(`Error forcing action: ${err.message}`);
    }
  };

  const toggleActive = async (botId: string) => {
    try {
      const data = await fetchWithAuth('/api/admin/bots/toggle-active', {
        method: 'POST',
        body: JSON.stringify({ botId })
      });
      const stateStr = data.isActive ? "activated" : "deactivated";
      alert(`Bot was successfully ${stateStr}!`);
      fetchBots();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const deleteBot = async (botId: string) => {
    if (!confirm("Are you sure you want to permanently delete this bot? All associated competition accounts will be deleted.")) return;
    try {
      await fetchWithAuth('/api/admin/bots/delete', {
        method: 'POST',
        body: JSON.stringify({ botId })
      });
      alert("Bot has been deleted!");
      fetchBots();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass p-8 rounded-3xl border border-white/5 bg-white/5">
        <h3 className="font-display font-bold text-xl text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
          <Bot className="text-azure" /> 
          Bot Management System
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
             <h4 className="text-sm font-bold text-slate-400 uppercase">Mass Generate Bots</h4>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase block mb-1">Quantity</label>
                  <input type="number" value={genCount} onChange={e => setGenCount(parseInt(e.target.value))} className="w-full bg-slate-950 border border-white/10 p-2 rounded text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase block mb-1">Behavior Profile</label>
                  <select value={genProfile} onChange={e => setGenProfile(e.target.value)} className="w-full bg-slate-950 border border-white/10 p-2 rounded text-white">
                    <option value="aggressive">Aggressive</option>
                    <option value="balanced">Balanced</option>
                    <option value="conservative">Conservative</option>
                  </select>
                </div>
             </div>
             <button onClick={generateBots} disabled={loading} className="w-full py-3 bg-azure/20 text-azure border border-azure/30 rounded-xl font-bold hover:bg-azure/30 transition-all">
               {loading ? 'Initializing Bots...' : 'Generate Bot Squad'}
               </button>
          </div>

          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-center">
             <div className="space-y-2">
                <p className="text-3xl font-display font-bold text-white">{bots.length}</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Active System Bots</p>
                <div className="flex justify-center gap-2 mt-4">
                   <span className="flex items-center gap-1 text-[10px] text-green-400"><TrendingUp size={10} /> Active: {bots.filter(b => b.isActive !== false && b.status !== 'inactive').length}</span>
                   <span className="flex items-center gap-1 text-[10px] text-red-400"><XCircle size={10} /> Inactive: {bots.filter(b => b.isActive === false || b.status === 'inactive').length}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-slate-950 rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Bot Identity</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Region</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Strategy</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bots.map(bot => {
                const isActive = bot.isActive !== false && bot.status !== 'inactive';
                return (
                  <tr key={bot.id} className="hover:bg-white/5">
                    <td className="p-4 flex items-center gap-3">
                      <img src={bot.avatar} className="w-8 h-8 rounded-full bg-slate-800" alt="" />
                      <div>
                        <p className="text-sm font-bold text-white">{bot.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{bot.id}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-slate-300">{bot.country}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        bot.botProfile === 'aggressive' ? 'bg-red-500/20 text-red-400' :
                        bot.botProfile === 'conservative' ? 'bg-green-500/20 text-green-400' :
                        'bg-azure/20 text-azure'
                      }`}>
                        {bot.botProfile}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => forceAction(bot.id)} 
                          className="text-[10px] font-bold text-azure hover:underline uppercase tracking-wide px-2 py-1 bg-azure/5 rounded hover:bg-azure/10 transition-colors"
                          title="Force a mock trade"
                        >
                          Trade
                        </button>
                        <button 
                          onClick={() => toggleActive(bot.id)} 
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded transition-colors ${
                            isActive ? 'text-amber-400 bg-amber-400/5 hover:bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/5 hover:bg-emerald-400/10'
                          }`}
                          title={isActive ? "Deactivate bot" : "Activate bot"}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => deleteBot(bot.id)} 
                          className="p-1.5 text-red-400 bg-red-500/5 rounded hover:bg-red-500/10 active:scale-95 transition-all text-[10px]"
                          title="Delete bot permanently"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReferralsAdminTab() {
  const { globalSettings, updateGlobalSettings, addNotification } = useApp();
  const [config, setConfig] = useState(
    globalSettings.referralConfig || {
      enabled: true,
      rewardTier1Amount: 5000,
      rewardTier1MinPurchase: 10000,
      rewardTier2ReferralCount: 10,
      rewardTier2Amount: 100000,
      dashboardMessage: "Refer someone who buys an account +10K and get a $5,000 gift. Sell 10 accounts for a $100,000 account.",
      referralViewMessage: "Refer someone who buys an account > $10,000 and get a $5,000 gift account. Reach 10 successful sales and receive a $100,000 institutional account."
    }
  );

  const handleSave = () => {
    updateGlobalSettings({ referralConfig: config });
    addNotification({
      title: 'Settings Saved',
      message: 'Referral rewards have been updated successfully.',
      type: 'success'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">Referral Settings</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Configure automated rewards for affiliates</p>
        </div>
        <button onClick={handleSave} className="bg-azure hover:bg-cyan-400 text-slate-950 font-bold px-8 py-3 rounded-xl uppercase tracking-widest text-sm transition-all shadow-lg shadow-azure/20 hover:scale-[1.02]">
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter">Automated Rewards</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enable Referrals</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={config.enabled} onChange={(e) => setConfig({...config, enabled: e.target.checked})} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${config.enabled ? 'bg-azure' : 'bg-slate-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.enabled ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 space-y-4">
              <h4 className="font-bold text-white text-sm uppercase tracking-widest text-azure">Tier 1 Strategy: Per Sale</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Min Account Size ($)</label>
                  <input type="number" value={config.rewardTier1MinPurchase} onChange={e => setConfig({...config, rewardTier1MinPurchase: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Gift Acc Size ($)</label>
                  <input type="number" value={config.rewardTier1Amount} onChange={e => setConfig({...config, rewardTier1Amount: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 space-y-4">
              <h4 className="font-bold text-white text-sm uppercase tracking-widest text-toxic-orange">Tier 2 Strategy: Milestone</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Referrals Needed</label>
                  <input type="number" value={config.rewardTier2ReferralCount} onChange={e => setConfig({...config, rewardTier2ReferralCount: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Gift Acc Size ($)</label>
                  <input type="number" value={config.rewardTier2Amount} onChange={e => setConfig({...config, rewardTier2Amount: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
          <h3 className="text-xl font-display font-bold text-white uppercase tracking-tighter">UI Messages</h3>
          <p className="text-sm text-slate-400">Update the text displayed to users to match your rewarding structure.</p>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Dashboard Message (Short)</label>
              <textarea value={config.dashboardMessage} onChange={e => setConfig({...config, dashboardMessage: e.target.value})} className="w-full h-24 bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-azure" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Referral Page Message (Detailed)</label>
              <textarea value={config.referralViewMessage} onChange={e => setConfig({...config, referralViewMessage: e.target.value})} className="w-full h-32 bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-azure" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HostesTab({ users, createHostesUser, addManualTrade, symbolConfigs, competitions, generateTradingAccount }: { users: UserAccount[], createHostesUser: any, addManualTrade: any, symbolConfigs: SymbolConfig[], competitions: CompetitionConfig[], generateTradingAccount: any }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [selectedHostes, setSelectedHostes] = useState<UserAccount | null>(null);
  const [hostesForSim, setHostesForSim] = useState<UserAccount | null>(null);
  const [showCompSelectorForHostesId, setShowCompSelectorForHostesId] = useState<string | null>(null);
  const [selectedComps, setSelectedComps] = useState<Set<string>>(new Set());
  const [hostesData, setHostesData] = useState({ name: '', email: '', country: '', alias: '' });
  const [simData, setSimData] = useState({ 
    symbol: 'EURUSD', 
    type: 'buy' as 'buy' | 'sell', 
    lots: 1.0, 
    entryPrice: 1.0500, 
    exitPrice: 1.0600, 
    sl: 1.0450, 
    tp: 1.0700, 
    timestamp: Date.now() - 3600000, 
    closeTime: Date.now() 
  });

  const hostesUsers = users.filter(u => u.isHostes);

  const handleCreateHostes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createHostesUser(hostesData);
      setShowCreateModal(false);
      setHostesData({ name: '', email: '', country: '', alias: '' });
    } catch (err) {
      alert("Failed to create hostes.");
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostesForSim) return;
    const account = hostesForSim.tradingAccounts?.find(a => a.type === 'competition');
    if (!account) {
      alert("Competition account not found for this hostes.");
      return;
    }
    try {
      await addManualTrade(account.id, simData, hostesForSim.id);
      setShowSimModal(false);
    } catch (err) {
      console.error("Failed to add trade:", err);
      alert(`Failed to add trade: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-[2rem] border border-white/5">
        <div>
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">Hostes Management</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Simulated Identities & Competitive Ghosting</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-azure hover:bg-cyan-400 text-slate-950 font-bold px-8 py-3 rounded-xl uppercase tracking-widest text-sm transition-all shadow-lg shadow-azure/20 hover:scale-[1.02] flex items-center gap-2"
        >
          <Plus size={18} /> New Hostes
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="glass rounded-[2rem] border border-white/5 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Hostes Profile</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Alias / Country</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Competition Acc</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Balance / PnL</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {hostesUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 italic">No hostes traders found. Create your first ghost identity!</td>
                </tr>
              ) : (
                hostesUsers.map(h => {
                  const compAcc = h.tradingAccounts?.find(a => a.type === 'competition');
                  const pnl = ((compAcc?.balance || 0) - (compAcc?.initialBalance || 0));
                  return (
                    <tr key={h.id} className="hover:bg-white/[0.02] group transition-colors cursor-pointer" onClick={(e) => {
                      if (showCompSelectorForHostesId !== h.id) {
                        setSelectedHostes(h);
                      }
                    }}>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-azure to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-azure/10">
                            {h.realName?.charAt(0) || h.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm tracking-tight">{h.realName || h.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{h.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <p className="text-sm font-bold text-azure italic tracking-tight">{h.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{h.country}</p>
                      </td>
                      <td className="p-6">
                        {compAcc ? (
                          <div className="space-y-1">
                            <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-bold uppercase border border-green-500/20">Active</span>
                            <p className="text-[10px] text-slate-500 font-mono">{compAcc.accountNumber}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 relative">
                             <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-bold uppercase border border-red-500/20 w-fit">Unlinked</span>
                        {showCompSelectorForHostesId === h.id ? (
                               <div className="bg-slate-900 absolute z-50 p-4 rounded-xl border border-white/10 shadow-xl w-48" onClick={e => e.stopPropagation()}>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-2">Select Competitions:</label>
                                  {competitions.map(comp => (
                                     <label key={comp.id} className="flex items-center gap-2 text-white text-[10px] py-1 cursor-pointer" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedComps.has(comp.id)} onChange={e => {
                                            const next = new Set(selectedComps);
                                            if (e.target.checked) next.add(comp.id); else next.delete(comp.id);
                                            setSelectedComps(next);
                                        }} />
                                        {comp.currentMonthName}
                                     </label>
                                  ))}
                                  <div className="flex gap-2 mt-3">
                                     <button onClick={(e) => { e.stopPropagation(); setShowCompSelectorForHostesId(null); }} className="text-[9px] bg-slate-700 text-white font-bold uppercase px-2 py-1 rounded">Cancel</button>
                                     <button onClick={async (e) => {
                                        e.stopPropagation();
                                        for (const compId of selectedComps) {
                                           const activeComp = competitions.find(c => c.id === compId);
                                           if (activeComp) {
                                             const compPkg: ShopPackage = {
                                                id: `competition-pkg-${activeComp.id}`,
                                                name: `Competition ${activeComp.currentMonthName}`,
                                                allocation: 100000,
                                                price: 0,
                                                profitTarget: 0,
                                                totalDrawdown: 10,
                                                dailyDrawdown: 5,
                                                leverage: '1:100'
                                             };
                                             await generateTradingAccount(compPkg, 'GOO', 'competition', h.id, activeComp.id);
                                           }
                                        }
                                        setShowCompSelectorForHostesId(null);
                                        setSelectedComps(new Set());
                                     }} className="text-[9px] bg-azure text-slate-950 font-bold uppercase px-2 py-1 rounded">Link</button>
                                  </div>
                               </div>
                             ) : (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setShowCompSelectorForHostesId(h.id);
                                 }}
                                 className="text-[9px] bg-azure/20 text-azure font-bold uppercase px-2 py-1 rounded w-fit hover:scale-105"
                               >
                                 Link Competition
                               </button>
                             )}
                          </div>
                        )}
                      </td>
                      <td className="p-6">
                         <p className="text-sm font-mono font-bold text-white">${compAcc?.balance?.toLocaleString() || '-'}</p>
                         <p className={`text-[10px] font-mono font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                           {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} USD
                         </p>
                      </td>
                      <td className="p-6 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setHostesForSim(h); setShowSimModal(true); }}
                          className="px-4 py-2 bg-azure/10 text-azure hover:bg-azure hover:text-slate-950 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-azure/20 transition-all hover:scale-105 active:scale-95 text-center"
                        >
                          Simulator
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedHostes && <TraderModal selectedTrader={selectedHostes} onClose={() => setSelectedHostes(null)} />}

      {/* Create Hostes Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" key="create-modal">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
          <div className="relative glass p-10 rounded-[3rem] w-full max-w-xl border-white/10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-azure via-purple-500 to-azure animate-shimmer" />
            
            <h3 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic mb-8">Identity Generator</h3>
            
            <form onSubmit={handleCreateHostes} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Real Name</label>
                  <input required value={hostesData.name} onChange={e => setHostesData({...hostesData, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-azure transition-all font-sans" placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Alias (Leaderboard)</label>
                  <input required value={hostesData.alias} onChange={e => setHostesData({...hostesData, alias: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-azure transition-all font-sans" placeholder="NightHawk" />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">System Email</label>
                <input required type="email" value={hostesData.email} onChange={e => setHostesData({...hostesData, email: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-azure transition-all font-sans" placeholder="hostes@fundedgoo.com" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Country</label>
                <input required value={hostesData.country} onChange={e => setHostesData({...hostesData, country: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-azure transition-all font-sans" placeholder="United Kingdom" />
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-white/5 text-slate-400 font-bold uppercase tracking-widest rounded-2xl hover:text-white transition-all text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-azure text-slate-950 font-bold uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-transform shadow-lg shadow-azure/20 text-xs">Instantiate User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trade Manual Entry Modal */}
      {showSimModal && hostesForSim && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" key="sim-modal">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowSimModal(false)} />
          <div className="relative glass p-10 rounded-[3rem] w-full max-w-2xl border-white/10 shadow-2xl">
             <h3 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic mb-4">Manual Execution Entry</h3>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">Injecting record for: <span className="text-azure">{hostesForSim.name}</span></p>
             
             <form onSubmit={handleAddTrade} className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Symbol</label>
                      <select value={simData.symbol} onChange={e => setSimData({...simData, symbol: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure text-xs">
                        {symbolConfigs.map(s => <option key={s.id} value={s.symbol}>{s.symbol}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Type</label>
                      <select value={simData.type} onChange={e => setSimData({...simData, type: e.target.value as any})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure font-bold text-xs uppercase">
                        <option value="buy">BUY / LONG</option>
                        <option value="sell">SELL / SHORT</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Lots</label>
                      <input type="number" step="0.01" value={simData.lots} onChange={e => setSimData({...simData, lots: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure font-mono text-xs" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Entry Price</label>
                      <input type="number" step="0.00001" value={simData.entryPrice} onChange={e => setSimData({...simData, entryPrice: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure font-mono text-xs" />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Exit Price</label>
                      <input type="number" step="0.00001" value={simData.exitPrice} onChange={e => setSimData({...simData, exitPrice: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure font-mono text-xs" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Open Time</label>
                      <input type="datetime-local" onChange={e => setSimData({...simData, timestamp: new Date(e.target.value).getTime()})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure text-[10px]" />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Close Time</label>
                      <input type="datetime-local" onChange={e => setSimData({...simData, closeTime: new Date(e.target.value).getTime()})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-azure text-[10px]" />
                   </div>
                </div>

                <div className="p-6 bg-azure/5 border border-azure/20 rounded-2xl mb-4">
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-bold text-azure uppercase tracking-widest">Calculated PnL Projection</span>
                     <span className={`text-xl font-mono font-bold ${((simData.type === 'buy' ? simData.exitPrice - simData.entryPrice : simData.entryPrice - simData.exitPrice) * 100000 * simData.lots) >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                       ${((simData.type === 'buy' ? simData.exitPrice - simData.entryPrice : simData.entryPrice - simData.exitPrice) * 100000 * simData.lots).toFixed(2)}
                     </span>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowSimModal(false)} className="flex-1 py-4 bg-white/5 text-slate-400 font-bold uppercase tracking-widest rounded-2xl hover:text-white transition-all text-xs">Abort Entry</button>
                  <button type="submit" className="flex-1 py-4 bg-azure hover:bg-cyan-400 text-slate-950 font-bold uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-transform shadow-lg shadow-azure/20 text-xs">Inject Execution</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
