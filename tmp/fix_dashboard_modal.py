import os

with open('src/components/Dashboard.tsx', 'r') as f:
    content = f.read()

# Let's find the start of showPromoModal and the matching end block
start_str = '<AnimatePresence>\n        {showPromoModal && applicablePromo && ('
end_str = '        )}\n      </AnimatePresence>'

# Let's do a more robust find
start_idx = content.find('showPromoModal && applicablePromo &&')
if start_idx == -1:
    print("Could not find start index")
    exit(1)

# Backtrack to the preceding <AnimatePresence>
animate_presence_idx = content.rfind('<AnimatePresence>', 0, start_idx)
if animate_presence_idx == -1:
    print("Could not find preceding AnimatePresence")
    exit(1)

# Now find the closing </AnimatePresence> after start_idx
end_presence_idx = content.find('</AnimatePresence>', start_idx)
if end_presence_idx == -1:
    print("Could not find closing AnimatePresence")
    exit(1)

closing_tag_len = len('</AnimatePresence>')
end_idx = end_presence_idx + closing_tag_len

replacement = """      <AnimatePresence>
        {showPromoModal && applicablePromo && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_80px_rgba(0,140,255,0.25)] flex flex-col bg-slate-900"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-azure/10 via-transparent to-purple-500/5 pointer-events-none" />
              
              <div className="relative p-5 sm:p-6 flex flex-col items-center text-center">
                <button 
                  onClick={() => {
                    isPromoDismissedInSession = True
                    setShowPromoModal(false)
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Close promotion"
                >
                  <X size={16} />
                </button>
 
                {/* Compact icon badge */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-azure to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,140,255,0.4)] mb-3 shrink-0">
                  <Gift className="text-white" size={20} />
                </div>
 
                <div className="space-y-1">
                  <span className="text-[9px] font-black bg-azure/10 text-azure border border-azure/25 px-2.5 py-0.5 rounded-full uppercase tracking-widest inline-block">
                    Ofertă Limitată
                  </span>
                  
                  <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight leading-tight">
                    {applicablePromo.title || 'PROMO ACTION'}
                  </h2>
                  
                  <p className="text-slate-300 text-xs leading-relaxed max-w-[280px] mx-auto">
                    {applicablePromo.description}
                  </p>

                  {applicablePromo.targetAllocation && applicablePromo.targetAllocation !== 'all' && (
                    <div className="mt-1">
                      <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 rounded-md inline-block">
                        EXCLUSIV: Conturi de {Number(applicablePromo.targetAllocation) >= 1000000 ? `${Number(applicablePromo.targetAllocation)/1000000}M` : `$${(Number(applicablePromo.targetAllocation)/1000)}K`}
                      </span>
                    </div>
                  )}
                </div>
 
                <div className="w-full mt-4 space-y-3.5">
                  {/* Coupon code box */}
                  <div className="bg-slate-950/80 border border-white/5 p-3 rounded-2xl relative overflow-hidden shadow-inner">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Cod Reducere / Use Code</p>
                    <p className="text-xl sm:text-2xl font-mono text-azure font-black tracking-[0.15em] uppercase select-all">
                      {applicablePromo.discountCode}
                    </p>
                  </div>

                  {/* Fomo metrics grid */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    {/* Timer */}
                    <div className="bg-slate-950/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                      <Clock size={14} className="text-red-500 animate-pulse shrink-0" />
                      <div>
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Timp Rămas</p>
                        <p className="text-xs font-mono font-bold text-white tracking-wider leading-none">{countdownText}</p>
                      </div>
                    </div>

                    {/* Coupons count */}
                    <div className="bg-slate-950/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="relative shrink-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping absolute" />
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full relative" />
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Copii Rămase</p>
                        <p className="text-xs font-mono font-bold text-green-400 leading-none">{fomoSlots} libere</p>
                      </div>
                    </div>
                  </div>
 
                  <div className="pt-1">
                    <button 
                      onClick={() => {
                        isPromoDismissedInSession = true
                        setShowPromoModal(false)
                        setActiveView('shop')
                      }}
                      className="w-full py-3 bg-gradient-to-r from-azure to-purple-600 text-slate-950 font-black rounded-xl uppercase tracking-[0.1em] text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-azure/10"
                    >
                      Maximizează Profitul Acum
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>"""

new_content = content[:animate_presence_idx] + replacement + content[end_idx:]

with open('src/components/Dashboard.tsx', 'w') as f:
    f.write(new_content)

print("SUCCESSFULLY_REPLACED")
