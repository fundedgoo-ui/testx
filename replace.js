import fs from "fs";

const file = fs.readFileSync("src/components/WebTerminal.tsx", "utf-8");

const startQuery = "{/* Controls Area */}";
const endQuery = "</div>\n    </div>\n  );\n}\n";

const startIndex = file.indexOf(startQuery);
const lastIndex = file.lastIndexOf(endQuery);

if (startIndex === -1 || lastIndex === -1) {
    console.log("Could not find start or end query");
} else {
    const bottomPanelJSX = `
        {/* Bottom Panel */}
        <div className="h-48 md:h-64 border-t border-white/10 flex flex-col bg-slate-950 shrink-0 w-full z-20">
          <div className="flex px-4 border-b border-white/10 shrink-0 overflow-x-auto min-h-[40px]">
            <button
              onClick={() => setActiveBottomTab("positions")}
              className={\`px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap \${activeBottomTab === "positions" ? "border-b-2 border-azure text-azure" : "text-slate-500 hover:text-white"}\`}
            >
              Open Positions ({positions.length})
            </button>
            <button
              onClick={() => setActiveBottomTab("history")}
              className={\`px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap \${activeBottomTab === "history" ? "border-b-2 border-azure text-azure" : "text-slate-500 hover:text-white"}\`}
            >
              History ({history.length})
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 bg-slate-900/30">
            {activeBottomTab === "positions" && (
              <div className="p-2 md:p-4 flex flex-col gap-2">
                {positions.length === 0 && pendingOrders.length === 0 ? (
                  <div className="text-center py-6 opacity-50">
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">
                      No Open/Pending Trades
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest">
                        <th className="py-2 px-3 font-medium">Symbol</th>
                        <th className="py-2 px-3 font-medium">Type</th>
                        <th className="py-2 px-3 font-medium text-right">Lots</th>
                        <th className="py-2 px-3 font-medium text-right">Open Price</th>
                        <th className="py-2 px-3 font-medium text-right">Current Price</th>
                        <th className="py-2 px-3 font-medium text-right">S/L</th>
                        <th className="py-2 px-3 font-medium text-right">T/P</th>
                        <th className="py-2 px-3 font-medium text-right">PnL</th>
                        <th className="py-2 px-3 font-medium text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white-[0.02] text-xs font-mono group">
                          <td className="py-2 px-3 font-bold text-white font-sans">{p.symbol}</td>
                          <td className="py-2 px-3">
                            <span className={\`text-[9px] md:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded \${p.type === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}\`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.lots).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.open_price).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5))}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{prices[p.symbol]?.toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) || "..."}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{p.sl ? Number(p.sl).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{p.tp ? Number(p.tp).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className={\`py-2 px-3 text-right font-bold \${getPositionPnL(p) >= 0 ? "text-green-400" : "text-red-400"}\`}>
                            {getPositionPnL(p) >= 0 ? "+" : ""}{getPositionPnL(p).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} $
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex gap-2 justify-end opacity-50 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => {
                                setExecutionType("edit");
                                setEditingId(p.id);
                                setSl(p.sl ? p.sl.toString() : "");
                                setTp(p.tp ? p.tp.toString() : "");
                                // Open config dialog logic if we had one... wait we don't need a dialog, right side is gone! 
                                // Actually we should probably use Quick Trade for edit... let's just close for now or prompt
                                const newSl = prompt("New Stop Loss (Current: " + (p.sl || 'None') + ")");
                                const newTp = prompt("New Take Profit (Current: " + (p.tp || 'None') + ")");
                                if (newSl !== null || newTp !== null) {
                                  setPositions((prev: any[]) => prev.map(pos => pos.id === p.id ? {...pos, sl: newSl || pos.sl, tp: newTp || pos.tp} : pos));
                                }
                              }} className="text-[9px] font-bold uppercase tracking-widest text-azure hover:text-white px-2 py-1 bg-azure/10 hover:bg-azure/20 rounded">
                                Edit
                              </button>
                              <button onClick={() => closePosition(p.id)} className="text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-white px-2 py-1 bg-red-500/10 hover:bg-red-500/30 rounded">
                                Close
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* PENDING ORDERS */}
                      {pendingOrders.map((p, i) => (
                        <tr key={"pending-"+i} className="border-b border-white/5 hover:bg-white-[0.02] text-xs font-mono group opacity-70">
                          <td className="py-2 px-3 font-bold text-white font-sans">{p.symbol}</td>
                          <td className="py-2 px-3">
                            <span className="text-[9px] md:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-azure/10 text-azure">
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.lots).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.target_price).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5))} <span className="text-[8px] text-slate-500">(Target)</span></td>
                          <td className="py-2 px-3 text-right text-slate-400">{prices[p.symbol]?.toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) || "..."}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{p.sl ? Number(p.sl).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{p.tp ? Number(p.tp).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-500">
                            Pending
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex gap-2 justify-end opacity-50 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setPendingOrders(prev => prev.filter(pos => pos.id !== p.id))} className="text-[9px] font-bold uppercase tracking-widest text-amber-500 hover:text-white px-2 py-1 bg-amber-500/10 hover:bg-amber-500/30 rounded">
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            {activeBottomTab === "history" && (
              <div className="p-2 md:p-4 flex flex-col gap-2">
                {history.length === 0 ? (
                  <div className="text-center py-6 opacity-50">
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">
                      No Trading History
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest">
                        <th className="py-2 px-3 font-medium">Symbol</th>
                        <th className="py-2 px-3 font-medium">Type</th>
                        <th className="py-2 px-3 font-medium text-right">Lots</th>
                        <th className="py-2 px-3 font-medium text-right">Open Price</th>
                        <th className="py-2 px-3 font-medium text-right">Close Price</th>
                        <th className="py-2 px-3 font-medium text-right">S/L</th>
                        <th className="py-2 px-3 font-medium text-right">T/P</th>
                        <th className="py-2 px-3 font-medium text-right">PnL</th>
                        <th className="py-2 px-3 font-medium text-right">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((p, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white-[0.02] text-xs font-mono group opacity-80 hover:opacity-100">
                          <td className="py-2 px-3 font-bold text-white font-sans">{p.symbol}</td>
                          <td className="py-2 px-3">
                            <span className={\`text-[9px] md:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded \${p.type === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}\`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.lots).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.open_price).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5))}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.close_price).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5))}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{p.sl ? Number(p.sl).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{p.tp ? Number(p.tp).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className={\`py-2 px-3 text-right font-bold \${parseFloat(p.pnl) >= 0 ? "text-green-400" : "text-red-400"}\`}>
                            {parseFloat(p.pnl) >= 0 ? "+" : ""}{parseFloat(p.pnl).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} $
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400 text-[10px]">{p.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

    const newContent = file.substring(0, startIndex) + bottomPanelJSX;
    fs.writeFileSync("src/components/WebTerminal.tsx", newContent);
    console.log("Replaced panel successfully");
}
