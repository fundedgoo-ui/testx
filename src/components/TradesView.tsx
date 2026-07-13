import React from 'react';
import { useApp } from '../AppContext';
import { History, TrendingUp, TrendingDown, Clock, Search, Filter, ArrowLeft } from 'lucide-react';

export default function TradesView() {
  const { trades, setActiveView } = useApp();

  const formatPrice = (price: any, symbol: string) => {
    if (price === undefined || price === null) return "---";
    const numPrice = Number(price);
    if (isNaN(numPrice)) return "---";
    const precision = symbol?.includes('JPY') ? 3 : (symbol?.includes('BTC') || symbol?.includes('XAU')) ? 2 : 5;
    return numPrice.toFixed(precision);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveView('dashboard')}
            className="p-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 text-slate-400 hover:text-white transition-all shadow-sm group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tighter uppercase">
            TRADE <span className="text-azure text-glow-azure">HISTORY</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Detailed audit of institutional executions.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input type="text" placeholder="Search entries..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-azure" />
          </div>
          <button className="p-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all">
             <Filter size={18} />
          </button>
        </div>
      </header>

      <div className="glass rounded-[32px] overflow-hidden border border-white/5">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Asset</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Type</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Entry / Exit</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Size</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">PNL</th>
                <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Execution Times</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center font-bold text-white text-xs">
                        {trade.symbol.slice(0, 3)}
                      </div>
                      <span className="font-bold text-sm text-white">{trade.symbol}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest
                      ${trade.type === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}
                    `}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="p-6 text-sm font-mono text-slate-300">
                    {formatPrice(trade.entryPrice || (trade as any).open_price, trade.symbol)} <span className="text-slate-600 px-1">→</span> {formatPrice(trade.exitPrice || (trade as any).close_price, trade.symbol)}
                  </td>
                  <td className="p-6 text-sm font-mono text-white">{Number(trade.size || (trade as any).lots || 0).toFixed(2)} Lots</td>
                  <td className="p-6">
                    <div className={`flex items-center gap-2 font-mono font-bold text-sm
                      ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}
                    `}>
                      {trade.pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {trade.pnl >= 0 ? '+' : ''}${Number(trade.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1 text-xs text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/10 px-1 py-0.5 rounded leading-none shrink-0" style={{ fontSize: '8.5px' }}>Start</span>
                        <span>{trade.open_time || (trade as any).open_time ? new Date(trade.open_time || (trade as any).open_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' }) : (trade.timestamp ? new Date(trade.timestamp - 300000).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' }) : '---')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider bg-rose-500/10 px-1 py-0.5 rounded leading-none shrink-0" style={{ fontSize: '8.5px' }}>Stop</span>
                        <span>{trade.close_time || (trade as any).close_time || trade.timestamp ? new Date(trade.close_time || (trade as any).close_time || trade.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' }) : '---'}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
