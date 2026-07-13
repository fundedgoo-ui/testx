const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
code = code.replace(
  /<div className="flex gap-3 sm:gap-4 shrink-0">[\s\S]*?<\/div>/,
  `<div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 mt-4 md:mt-0">
          <button
            onClick={() => setActiveView('trades')}
            className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
          >
            <TrendingUp size={14} className="text-azure" />
            Trade History
          </button>
          <button
            onClick={() => setActiveView('payouts')}
            className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
          >
            <Wallet size={14} className="text-emerald-400" />
            Payout Hub
          </button>
          <button
            onClick={handleExportReport} 
           className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
          >
            Export Report
          </button>
        </div>`
);
fs.writeFileSync('src/components/Dashboard.tsx', code);
