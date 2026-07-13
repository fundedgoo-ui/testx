import React from 'react';
import { 
  AreaChart, 
  Area, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const defaultFallbackData = [
  { name: '00:00', price: 100000 },
  { name: '04:00', price: 100450 },
  { name: '08:00', price: 100300 },
  { name: '12:00', price: 100650 },
  { name: '16:00', price: 100550 },
  { name: '20:00', price: 100900 },
  { name: '23:59', price: 101200 },
];

export interface MiniChartProp {
  color?: string;
  data?: { name: string; price: number }[];
  heightClass?: string;
}

export default function MiniChart({ 
  color = "#00f2ff", 
  data = defaultFallbackData,
  heightClass = "h-14" 
}: MiniChartProp) {
  return (
    <div className={`w-full mt-3 ${heightClass}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`colorPrice-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Tooltip 
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-950/95 border border-white/15 px-2 py-1 rounded text-[9px] font-mono shadow-xl text-white">
                    <span className="font-bold">${Math.round(payload[0].value).toLocaleString()}</span>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            fillOpacity={1} 
            fill={`url(#colorPrice-${color.replace('#', '')})`} 
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
