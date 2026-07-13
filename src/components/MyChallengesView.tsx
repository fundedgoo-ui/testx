import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { Target, ArrowRight, RefreshCcw, AlertTriangle, MonitorPlay, ExternalLink, X, TrendingUp, TrendingDown, DollarSign, Award } from 'lucide-react';
import { TradingAccount } from '../types';
import CertificateModal from './CertificateModal';
import { Certificate } from '../types';

export default function MyChallengesView() {
  const { user, setActiveView, setActiveAccountId } = useApp();
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | null>(null);
  const [showCertificateFor, setShowCertificateFor] = useState<{account: TradingAccount, cert?: Certificate} | null>(null);

  const accounts = user?.tradingAccounts || [];

  if (accounts.length === 0) {
    return (
      <div className="p-4 sm:p-8 flex flex-col items-center justify-center min-h-[70vh] text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mb-6">
          <Target className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-3xl font-display font-medium text-white tracking-tighter mb-4">No Challenges Yet</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          You don't have any active trading accounts or challenges. Buy a challenge to start your journey.
        </p>
        <button
          onClick={() => setActiveView('shop')}
          className="px-8 py-4 bg-azure hover:bg-white text-slate-950 rounded-full font-bold uppercase tracking-widest text-xs transition-all hover:shadow-[0_0_20px_rgba(0,242,255,0.4)]"
        >
          Buy Challenge
        </button>
      </div>
    );
  }

  const handleGoToTerminal = (accountId: string) => {
    setActiveAccountId(accountId);
    setActiveView('web-terminal');
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-medium text-white tracking-tighter">My Challenges</h1>
          <p className="text-slate-400 mt-2">Manage and analyze your trading accounts.</p>
        </div>
        <button
          onClick={() => setActiveView('shop')}
          className="px-6 py-3 bg-azure/10 text-azure hover:bg-azure hover:text-slate-950 rounded-full font-bold uppercase tracking-widest text-xs transition-all"
        >
          Get New Challenge
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(account => (
          <motion.div
            key={account.id}
            whileHover={{ y: -4 }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-br from-azure/20 to-blue-500/0 rounded-[32px] opacity-0 group-hover:opacity-100 blur transition-opacity" />
            <div className="relative bg-slate-900 border border-white/5 rounded-[32px] p-6 h-full flex flex-col justify-between overflow-hidden cursor-pointer hover:border-azure/30 transition-colors"
                 onClick={() => setSelectedAccount(account)}>
              {/* Card Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium uppercase tracking-widest text-slate-500">{account.platform}</span>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${account.type === 'funded' ? 'bg-green-500/10 text-green-400' : 'bg-azure/10 text-azure'}`}>
                      {account.type}
                    </span>
                  </div>
                  <h3 className="text-xl font-display text-white tracking-tight flex items-center gap-2">
                    Acct: {account.accountNumber}
                    {(account.status === 'suspended' || account.status === 'failed') && (
                      <span className="text-red-500 font-extrabold text-[10px] bg-red-500/10 px-1.5 py-0.5 border border-red-500/20 rounded">FAILED</span>
                    )}
                  </h3>
                </div>
                <div className={`p-2 rounded-xl ${(account.status === 'suspended' || account.status === 'failed') ? 'bg-red-500/10 text-red-500' : account.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                  {(account.status === 'suspended' || account.status === 'failed') ? <AlertTriangle className="w-5 h-5 text-red-500" /> : account.status === 'active' ? <RefreshCcw className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                </div>
              </div>

              {/* Balances */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-slate-400">Balance</span>
                  <span className="text-lg font-medium text-white">${account.balance?.toLocaleString() || account.initialBalance?.toLocaleString() || '10,000'}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-slate-400">Equity</span>
                  <span className="text-lg font-medium text-slate-300">${account.equity?.toLocaleString() || account.initialBalance?.toLocaleString() || '10,000'}</span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-widest group-hover:text-azure transition-colors flex items-center gap-1">
                  View Analytics <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col md:flex-row items-stretch justify-end bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedAccount(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full md:w-3/4 lg:w-1/2 bg-[#020617] border-l border-white/10 h-full overflow-y-auto"
            >
              <div className="p-6 sm:p-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-azure bg-azure/10 px-3 py-1 rounded-full">
                        {selectedAccount.type}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${(selectedAccount.status === 'suspended' || selectedAccount.status === 'failed') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : selectedAccount.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                        {(selectedAccount.status === 'suspended' || selectedAccount.status === 'failed') ? 'FAILED' : selectedAccount.status}
                      </span>
                    </div>
                    <h2 className="text-4xl font-display font-medium text-white tracking-tighter">
                      Account {selectedAccount.accountNumber}
                    </h2>
                    <p className="text-slate-400 mt-2 text-sm">{selectedAccount.platform} • {selectedAccount.broker}</p>
                  </div>
                  <button
                    onClick={() => setSelectedAccount(null)}
                    className="p-3 bg-slate-900 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                  <div className="bg-slate-900/50 border border-white/5 p-4 rounded-3xl">
                    <div className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Balance</div>
                    <div className="text-xl font-display text-white">${selectedAccount.balance?.toLocaleString() || selectedAccount.initialBalance?.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-900/50 border border-white/5 p-4 rounded-3xl">
                    <div className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Equity</div>
                    <div className="text-xl font-display text-white">${selectedAccount.equity?.toLocaleString() || selectedAccount.initialBalance?.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-900/50 border border-white/5 p-4 rounded-3xl">
                    <div className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">P/L</div>
                    <div className="text-xl font-display text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />+1.2%
                    </div>
                  </div>
                  <div className="bg-slate-900/50 border border-white/5 p-4 rounded-3xl">
                    <div className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Leverage</div>
                    <div className="text-xl font-display text-white">{selectedAccount.leverage || '1:100'}</div>
                  </div>
                </div>

                {/* Certificate of Merit / Gold Achievement Diploma */}
                {(() => {
                  const hasCertificates = selectedAccount.certificates && selectedAccount.certificates.length > 0;
                  
                  if (hasCertificates) {
                    return (
                      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 p-6 sm:p-8 rounded-[40px] mb-10 text-center relative overflow-hidden group animate-in fade-in duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-300 to-yellow-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)] border border-amber-300/30">
                            <Award className="w-7 h-7 text-slate-950" />
                          </div>
                          <h3 className="text-xl font-display font-medium text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 mb-2 uppercase tracking-wider font-bold">
                            Excellence Certificates 🏆
                          </h3>
                          <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto mb-6 leading-relaxed font-sans">
                            Congratulations! You have received official certifications for your performance on this account. Download or print the certificates.
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            {selectedAccount.certificates.map(cert => (
                              <button
                                key={cert.id}
                                onClick={() => setShowCertificateFor({ account: selectedAccount, cert })}
                                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 rounded-full font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center gap-2"
                              >
                                <Award className="w-4 h-4 text-slate-950" /> {cert.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-slate-900/40 border border-white/5 p-5 rounded-[28px] mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3.5 text-left">
                          <div className="p-2.5 bg-amber-500/10 rounded-xl text-[#ECC35C]">
                            <Award className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Preview Gold Certificate</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-sans">See the official certificate you will obtain when passing this challenge.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowCertificateFor({ account: selectedAccount })}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-[#ECC35C] rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors whitespace-nowrap font-mono"
                        >
                          Certificate Mock-up
                        </button>
                      </div>
                    );
                  }
                })()}

                <div className="bg-gradient-to-br from-azure/10 to-transparent border border-azure/20 p-8 rounded-[40px] mb-10 text-center relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 opacity-10">
                    <MonitorPlay className="w-48 h-48" />
                  </div>
                  <h3 className="text-2xl font-display text-white mb-2 relative z-10">Ready to trade?</h3>
                  <p className="text-slate-400 mb-8 relative z-10 max-w-sm mx-auto">Open the trading terminal to manage positions, view charts, and execute your strategy.</p>
                  <button 
                    onClick={() => {
                        setSelectedAccount(null);
                        handleGoToTerminal(selectedAccount.id);
                    }}
                    className="relative z-10 w-full sm:w-auto px-10 py-5 bg-azure text-slate-950 hover:bg-white rounded-full font-bold uppercase tracking-widest text-sm transition-all hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] flex items-center justify-center gap-2 mx-auto"
                  >
                    Open Terminal <ExternalLink className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h4 className="text-lg font-display text-white mb-6 tracking-tight">Recent Activity</h4>
                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 text-center">
                    <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Trading history will appear here once you start placing trades on this account.</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCertificateFor && (
          <CertificateModal 
            account={showCertificateFor.account} 
            certificate={showCertificateFor.cert}
            onClose={() => setShowCertificateFor(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
