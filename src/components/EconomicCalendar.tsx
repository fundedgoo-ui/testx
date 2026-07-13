import React from 'react';
import { Calendar, Globe, AlertTriangle } from 'lucide-react';

export default function EconomicCalendar() {
  return (
    <div className="p-4 sm:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-azure/10 rounded-2xl flex items-center justify-center text-azure glow-azure">
            <Calendar size={24} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tighter uppercase leading-none">
              ECONOMIC <span className="text-azure">CALENDAR</span>
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Global Fundamental Synchronization</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Calendar Feed */}
        <div className="lg:col-span-3 space-y-6">
           <div className="glass rounded-[40px] border-white/5 overflow-hidden h-[800px] relative">
             {/* TradingView Widget */}
             <div className="h-[calc(100%+32px)] w-full -mt-2">
               <div className="tradingview-widget-container h-full w-full" ref={(el) => {
               if (el && !el.querySelector('script')) {
                  const script = document.createElement("script");
                  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
                  script.type = "text/javascript";
                  script.async = true;
                  script.innerHTML = `
                    {
                      "colorTheme": "dark",
                      "isTransparent": true,
                      "width": "100%",
                      "height": "100%",
                      "locale": "en",
                      "importanceFilter": "-1,0,1",
                      "currencyFilter": "USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD,CNY,RON"
                    }`;
                  el.appendChild(script);
               }
             }}>
                <div className="tradingview-widget-container__widget h-full w-full"></div>
             </div>
             </div>
             
             {/* Cover Logo Component */}
             <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#020617] border-t border-white/5 z-20 flex items-center justify-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-azure animate-pulse shrink-0"></span>
                   FundedGoo Real-Time Data Nodes
                </span>
             </div>
           </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="space-y-6">
           <div className="glass p-8 rounded-[32px] border-orange-500/10 bg-orange-500/5 space-y-6">
              <div className="flex items-center gap-3">
                 <AlertTriangle className="text-orange-400" size={20} />
                 <h3 className="text-sm font-bold text-white uppercase tracking-widest">Protocol Warning</h3>
              </div>
              <p className="text-[10px] text-slate-400 uppercase leading-relaxed">
                Trading restriction active during <span className="text-red-400">CPI Release</span>. Orders placed 2 minutes before/after news may lead to allocation suspension.
              </p>
              <button className="w-full py-3 border border-orange-500/20 rounded-xl text-[10px] font-bold text-orange-400 uppercase tracking-widest hover:bg-orange-400/5 transition-all">
                View News Policy
              </button>
           </div>

           <div className="glass p-8 rounded-[32px] border-white/5 space-y-6">
              <div className="flex items-center gap-3">
                 <Globe size={20} className="text-azure" />
                 <h3 className="text-sm font-bold text-white uppercase tracking-widest">Market Status</h3>
              </div>
              <div className="space-y-4">
                 <MarketStatus label="London" status="Open" time="08:00 - 16:30" active={true} />
                 <MarketStatus label="New York" status="Pre-Open" time="13:00 - 21:00" />
                 <MarketStatus label="Tokyo" status="Closed" time="00:00 - 09:00" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function MarketStatus({ label, status, time, active = false }: any) {
  return (
    <div className="flex items-center justify-between group">
       <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-white uppercase tracking-widest">{label}</p>
          <p className="text-[8px] text-slate-500 font-mono italic">{time}</p>
       </div>
       <div className={`px-2 py-1 rounded text-[8px] font-bold uppercase tracking-tighter ${
         active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-600 border border-white/5'
       }`}>
          {status}
       </div>
    </div>
  );
}
