import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Book, Edit3, Save, RotateCcw } from 'lucide-react';
import Markdown from 'react-markdown';
import ThreeDCard from './ThreeDCard';

export default function RulesView() {
  const { rules, updateRules, user } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(rules.content);

  const handleSave = () => {
    updateRules(content);
    setIsEditing(false);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tighter uppercase">
            PROTOCOL <span className="text-azure">RULES</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Last update: {new Date(rules.updatedAt).toLocaleDateString()}</p>
        </div>

        {user?.role === 'admin' && (
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest transition-all
              ${isEditing ? 'bg-green-500 text-slate-950 shadow-lg shadow-green-500/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
          >
            {isEditing ? <><Save size={18} /> Save Protocol</> : <><Edit3 size={18} /> Edit Protocol</>}
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          {isEditing ? (
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[600px] bg-slate-950/50 border border-white/10 rounded-3xl p-8 text-white font-mono text-sm focus:border-azure outline-none resize-none"
            />
          ) : (
            <div className="glass p-8 sm:p-12 rounded-[32px] border-white/5 markdown-body">
              <Markdown>{rules.content}</Markdown>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <ThreeDCard className="glass p-8 rounded-3xl border-white/5" glowColor="rgba(0, 242, 255, 0.1)">
             <div className="flex items-center gap-3 text-cyan-400 mb-6">
               <Book size={24} />
               <h3 className="font-display font-bold text-xl uppercase tracking-tighter text-white">Summary</h3>
             </div>
             <ul className="space-y-4">
                {[
                  { label: 'Drawdown', val: '5% Daily / 10% Total' },
                  { label: 'Consistency', val: '45% Rule' },
                  { label: 'Weekend', val: 'No Holding (Funded)' },
                  { label: 'Crypto Weekend', val: 'No Overnight' },
                  { label: 'Profit Split', val: '80% User Share' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <span className="text-xs text-slate-500 font-bold uppercase">{item.label}</span>
                    <span className="text-sm font-mono text-white">{item.val}</span>
                  </li>
                ))}
              </ul>
          </ThreeDCard>

          <div className="glass p-8 rounded-3xl space-y-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <RotateCcw size={14} className="text-azure" /> 
              Consistency Calculator
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Your Total Profit ($)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 10000"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-azure transition-all"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const res = document.getElementById('calc-res');
                    const heal = document.getElementById('heal-res');
                    if (res) res.innerText = `$${(val * 0.45).toLocaleString()}`;
                    if (heal) heal.innerText = `$${(val / 0.45).toLocaleString()} total profit needed`;
                  }}
                />
              </div>
              <div className="p-4 bg-azure/5 rounded-2xl border border-azure/20">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Max Daily Profit Cap (45%)</p>
                <p id="calc-res" className="text-2xl font-display font-bold text-azure tracking-tighter">$0</p>
              </div>
              <div className="p-4 bg-toxic-orange/5 rounded-2xl border border-toxic-orange/20">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Target "Healing" Profit</p>
                <p id="heal-res" className="text-sm font-mono font-bold text-toxic-orange tracking-tight">$0 total profit needed</p>
                <p className="text-[8px] text-slate-500 mt-1 uppercase">If you have an outlier day, this is the total profit needed to dilute it to 45%.</p>
              </div>
              <p className="text-[9px] text-slate-500 italic leading-relaxed">
                *Calculate your safety threshold. No single day should exceed this amount to remain eligible for payouts. If breached, enter your "Outlier Day" profit in the box above to see the required Total Profit to "Heal" your account.
              </p>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl space-y-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compliance Status</h4>
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400">
                 <RotateCcw size={24} />
               </div>
               <div>
                 <p className="text-sm font-bold text-white">Fully Compliant</p>
                 <p className="text-[10px] text-slate-500 uppercase">System Sync Active</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
