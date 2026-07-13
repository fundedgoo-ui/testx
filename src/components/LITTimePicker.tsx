import React from "react";
import { Clock, ArrowRight } from "lucide-react";

interface LITTimePickerProps {
  value: string;
  onChange: (newValue: string) => void;
  type?: "range" | "single";
}

export const LITTimePicker: React.FC<LITTimePickerProps> = ({
  value,
  onChange,
  type = "range"
}) => {
  // Parse current value
  const parseValue = (val: string) => {
    const clean = val.replace(/[^0-9-]/g, "");
    const parts = clean.split("-");
    let startH = "00";
    let startM = "00";
    let endH = "00";
    let endM = "00";

    if (parts[0] && parts[0].length >= 4) {
      startH = parts[0].slice(0, 2);
      startM = parts[0].slice(2, 4);
    }
    if (parts[1] && parts[1].length >= 4) {
      endH = parts[1].slice(0, 2);
      endM = parts[1].slice(2, 4);
    } else if (parts[0] && parts[0].length >= 4) {
      endH = startH;
      endM = startM;
    }
    return { startH, startM, endH, endM };
  };

  const { startH, startM, endH, endM } = parseValue(value);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  const updateRange = (sh: string, sm: string, eh: string, em: string) => {
    onChange(`${sh}${sm}-${eh}${em}`);
  };

  const updateSingle = (sh: string, sm: string) => {
    // End time is start time plus 1 minute
    let endMinutes = parseInt(sm, 10) + 1;
    let endHourNum = parseInt(sh, 10);
    if (endMinutes >= 60) {
      endMinutes = 0;
      endHourNum = (endHourNum + 1) % 24;
    }
    const eh = endHourNum.toString().padStart(2, "0");
    const em = endMinutes.toString().padStart(2, "0");
    onChange(`${sh}${sm}-${eh}${em}`);
  };

  if (type === "single") {
    return (
      <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-white/5">
        <Clock size={12} className="text-slate-500 shrink-0" />
        <div className="flex items-center gap-1">
          {/* Hour Select */}
          <div className="relative group">
            <select
              value={startH}
              onChange={(e) => updateSingle(e.target.value, startM)}
              className="appearance-none pr-5 pl-2 py-0.5 bg-slate-950 border border-white/10 hover:border-white/20 rounded font-mono text-xs text-white text-center focus:border-azure focus:outline-none cursor-pointer max-h-40 overflow-y-auto custom-scrollbar"
            >
              {hours.map((h) => (
                <option key={h} value={h} className="bg-slate-900 text-white font-mono">
                  {h}
                </option>
              ))}
            </select>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[8px] group-hover:text-white transition-colors">▼</div>
          </div>

          <span className="text-slate-500 font-mono text-xs">:</span>

          {/* Minute Select */}
          <div className="relative group">
            <select
              value={startM}
              onChange={(e) => updateSingle(startH, e.target.value)}
              className="appearance-none pr-5 pl-2 py-0.5 bg-slate-950 border border-white/10 hover:border-white/20 rounded font-mono text-xs text-white text-center focus:border-azure focus:outline-none cursor-pointer max-h-40 overflow-y-auto custom-scrollbar"
            >
              {minutes.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white font-mono">
                  {m}
                </option>
              ))}
            </select>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[8px] group-hover:text-white transition-colors">▼</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
      <div className="flex items-center justify-between gap-2">
        {/* START */}
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Start</span>
          <div className="flex items-center gap-1">
            <div className="relative group flex-1">
              <select
                value={startH}
                onChange={(e) => updateRange(e.target.value, startM, endH, endM)}
                className="w-full appearance-none pr-5 pl-2 py-1 bg-slate-950 border border-white/10 hover:border-white/20 rounded font-mono text-xs text-white text-center focus:border-azure focus:outline-none cursor-pointer"
              >
                {hours.map((h) => (
                  <option key={h} value={h} className="bg-slate-900 text-white font-mono">
                    {h}
                  </option>
                ))}
              </select>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[8px] group-hover:text-white transition-colors">▼</div>
            </div>

            <span className="text-slate-500 font-mono text-xs">:</span>

            <div className="relative group flex-1">
              <select
                value={startM}
                onChange={(e) => updateRange(startH, e.target.value, endH, endM)}
                className="w-full appearance-none pr-5 pl-2 py-1 bg-slate-950 border border-white/10 hover:border-white/20 rounded font-mono text-xs text-white text-center focus:border-azure focus:outline-none cursor-pointer"
              >
                {minutes.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white font-mono">
                    {m}
                  </option>
                ))}
              </select>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[8px] group-hover:text-white transition-colors">▼</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center pt-4 text-slate-600">
          <ArrowRight size={12} />
        </div>

        {/* END */}
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">End</span>
          <div className="flex items-center gap-1">
            <div className="relative group flex-1">
              <select
                value={endH}
                onChange={(e) => updateRange(startH, startM, e.target.value, endM)}
                className="w-full appearance-none pr-5 pl-2 py-1 bg-slate-950 border border-white/10 hover:border-white/20 rounded font-mono text-xs text-white text-center focus:border-azure focus:outline-none cursor-pointer"
              >
                {hours.map((h) => (
                  <option key={h} value={h} className="bg-slate-900 text-white font-mono">
                    {h}
                  </option>
                ))}
              </select>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[8px] group-hover:text-white transition-colors">▼</div>
            </div>

            <span className="text-slate-500 font-mono text-xs">:</span>

            <div className="relative group flex-1">
              <select
                value={endM}
                onChange={(e) => updateRange(startH, startM, endH, e.target.value)}
                className="w-full appearance-none pr-5 pl-2 py-1 bg-slate-950 border border-white/10 hover:border-white/20 rounded font-mono text-xs text-white text-center focus:border-azure focus:outline-none cursor-pointer"
              >
                {minutes.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white font-mono">
                    {m}
                  </option>
                ))}
              </select>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[8px] group-hover:text-white transition-colors">▼</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
