import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import { useApp } from "../AppContext";
import { getTradeDateString, getTradePnl } from "../utils/tradeUtils";
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Layers,
  Play,
  DollarSign,
  Crosshair,
  X,
  Settings,
  MousePointer2,
  TrendingUp,
  Minus,
  Plus,
  Square,
  Triangle,
  Ruler,
  Type,
  Pencil,
  Eraser,
  Trash2,
  Maximize2,
  Maximize,
  Minimize,
  RotateCcw,
  Search,
  Move,
  ChevronDown,
  GripVertical,
  Trophy,
  Info,
  LayoutList,
  Star,
  Calculator,
  AlertTriangle,
  Bell,
  BellOff
} from "lucide-react";

import { AnimatePresence, motion } from "motion/react";
import { io } from "socket.io-client";
import { ToolSettingsPopup } from "./ToolSettingsPopup";
import Logo from './Logo';
import { LITTimePicker } from "./LITTimePicker";

export default function WebTerminal() {
  const {
    user,
    setActiveView,
    activeAccountId,
    setActiveAccountId,
    updateTradingAccount,
    addNotification,
    apis,
    symbolConfigs,
    globalSettings,
    competitions,
  } = useApp();

  const isStandalone = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'web-terminal';

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const askPriceLineRef = useRef<any>(null);
  const bidPriceLineRef = useRef<any>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapUpper1SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapLower1SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapUpper2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapLower2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapUpper3SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapLower3SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const historicalDataRef = useRef<any[]>([]);
  const lastBarRef = useRef<any>(null);
  const lastBarTimeRef = useRef<number>(0);
  const countdownTimerRef = useRef<HTMLDivElement>(null);
  const pricesRef = useRef<Record<string, number>>({});
  const hoveredVwapValuesRef = useRef<{
    vwap: number | null;
    upper1: number | null;
    lower1: number | null;
    upper2: number | null;
    lower2: number | null;
    upper3: number | null;
    lower3: number | null;
  }>({
    vwap: null,
    upper1: null,
    lower1: null,
    upper2: null,
    lower2: null,
    upper3: null,
    lower3: null,
  });

  // Indicators State
  const [indicators, setIndicators] = useState<string[]>([]);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isVwapSettingsOpen, setIsVwapSettingsOpen] = useState(false);
  const [vwapSettingsTab, setVwapSettingsTab] = useState<'inputs' | 'style'>('inputs');
  const [vwapConfig, setVwapConfig] = useState(() => {
    const saved = localStorage.getItem("terminal_vwap_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            anchor: parsed.anchor || "Session",
            calcMode: parsed.calcMode || "Standard Deviation",
            showVwap: parsed.showVwap !== undefined ? parsed.showVwap : true,
            vwapColor: parsed.vwapColor || "#2962ff",
            vwapWidth: parsed.vwapWidth || 2,
            showBand1: parsed.showBand1 !== undefined ? parsed.showBand1 : (parsed.showUpper !== undefined ? parsed.showUpper : true),
            bandMult1: parsed.bandMult1 !== undefined ? parsed.bandMult1 : (parsed.multiplier !== undefined ? parsed.multiplier : 1.0),
            upperColor1: parsed.upperColor1 || parsed.upperColor || "#00e676",
            lowerColor1: parsed.lowerColor1 || parsed.lowerColor || "#00e676",
            bandWidth1: parsed.bandWidth1 || parsed.upperWidth || 1.5,
            showBand2: parsed.showBand2 !== undefined ? parsed.showBand2 : false,
            bandMult2: parsed.bandMult2 !== undefined ? parsed.bandMult2 : 2.0,
            upperColor2: parsed.upperColor2 || "#ffeb3b",
            lowerColor2: parsed.lowerColor2 || "#ffeb3b",
            bandWidth2: parsed.bandWidth2 || 1.5,
            showBand3: parsed.showBand3 !== undefined ? parsed.showBand3 : false,
            bandMult3: parsed.bandMult3 !== undefined ? parsed.bandMult3 : 3.0,
            upperColor3: parsed.upperColor3 || "#e91e63",
            lowerColor3: parsed.lowerColor3 || "#e91e63",
            bandWidth3: parsed.bandWidth3 || 1.5,
          };
        }
      } catch (e) {
        // fallback
      }
    }
    return {
      anchor: "Session",
      calcMode: "Standard Deviation",
      showVwap: true,
      vwapColor: "#2962ff",
      vwapWidth: 2,
      showBand1: true,
      bandMult1: 1.0,
      upperColor1: "#00e676",
      lowerColor1: "#00e676",
      bandWidth1: 1.5,
      showBand2: false,
      bandMult2: 2.0,
      upperColor2: "#ffeb3b",
      lowerColor2: "#ffeb3b",
      bandWidth2: 1.5,
      showBand3: false,
      bandMult3: 3.0,
      upperColor3: "#e91e63",
      lowerColor3: "#e91e63",
      bandWidth3: 1.5,
    };
  });

  useEffect(() => {
    localStorage.setItem("terminal_vwap_config", JSON.stringify(vwapConfig));
  }, [vwapConfig]);

  // LIT Timings State
  const [isTimingsSettingsOpen, setIsTimingsSettingsOpen] = useState(false);
  const [timingsSettingsTab, setTimingsSettingsTab] = useState<'sessions' | 'lines' | 'daily'>('sessions');
  const [timingsConfig, setTimingsConfig] = useState(() => {
    const saved = localStorage.getItem("terminal_timings_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            showAsianLines: parsed.showAsianLines !== undefined ? parsed.showAsianLines : true,
            showAsianBackground: parsed.showAsianBackground !== undefined ? parsed.showAsianBackground : true,
            showAsianMid: parsed.showAsianMid !== undefined ? parsed.showAsianMid : true,
            asianRangeTime: parsed.asianRangeTime || '1700-0100',
            asianLineWidth: parsed.asianLineWidth || 1,
            asianLineColor: parsed.asianLineColor || '#9c27b0',
            asianMidColor: parsed.asianMidColor || '#9c27b0',
            asianBgColor: parsed.asianBgColor || 'rgba(156, 39, 176, 0.1)',

            showLondonLines: parsed.showLondonLines !== undefined ? parsed.showLondonLines : true,
            showLondonBackground: parsed.showLondonBackground !== undefined ? parsed.showLondonBackground : true,
            londonRangeTime: parsed.londonRangeTime || '0300-0400',
            londonLineWidth: parsed.londonLineWidth || 1,
            londonLineColor: parsed.londonLineColor || '#00bcd4',
            londonBgColor: parsed.londonBgColor || 'rgba(0, 188, 212, 0.1)',

            showNyLines: parsed.showNyLines !== undefined ? parsed.showNyLines : true,
            showNyBackground: parsed.showNyBackground !== undefined ? parsed.showNyBackground : true,
            nyRangeTime: parsed.nyRangeTime || '0800-0900',
            nyLineWidth: parsed.nyLineWidth || 1,
            nyLineColor: parsed.nyLineColor || '#4caf50',
            nyBgColor: parsed.nyBgColor || 'rgba(76, 175, 80, 0.1)',

            showFF: parsed.showFF !== undefined ? parsed.showFF : true,
            ffRange: parsed.ffRange || '0200-0201',
            ffColor: parsed.ffColor || '#000000',
            showMmm1: parsed.showMmm1 !== undefined ? parsed.showMmm1 : true,
            mmm1Range: parsed.mmm1Range || '0430-0431',
            mmm1Color: parsed.mmm1Color || '#000000',
            showMmm2: parsed.showMmm2 !== undefined ? parsed.showMmm2 : true,
            mmm2Range: parsed.mmm2Range || '0630-0631',
            mmm2Color: parsed.mmm2Color || '#000000',
            showLc: parsed.showLc !== undefined ? parsed.showLc : true,
            lcRange: parsed.lcRange || '1100-1101',
            lcColor: parsed.lcColor || '#000000',

            showDailyOpen: parsed.showDailyOpen !== undefined ? parsed.showDailyOpen : true,
            dailyOpenColor: parsed.dailyOpenColor || '#f59e0b',
          };
        }
      } catch (e) {}
    }
    return {
      showAsianLines: true,
      showAsianBackground: true,
      showAsianMid: true,
      asianRangeTime: '1700-0100',
      asianLineWidth: 1,
      asianLineColor: '#9c27b0',
      asianMidColor: '#9c27b0',
      asianBgColor: 'rgba(156, 39, 176, 0.1)',

      showLondonLines: true,
      showLondonBackground: true,
      londonRangeTime: '0300-0400',
      londonLineWidth: 1,
      londonLineColor: '#00bcd4',
      londonBgColor: 'rgba(0, 188, 212, 0.1)',

      showNyLines: true,
      showNyBackground: true,
      nyRangeTime: '0800-0900',
      nyLineWidth: 1,
      nyLineColor: '#4caf50',
      nyBgColor: 'rgba(76, 175, 80, 0.1)',

      showFF: true,
      ffRange: '0200-0201',
      ffColor: '#ffffff',
      showMmm1: true,
      mmm1Range: '0430-0431',
      mmm1Color: '#ffffff',
      showMmm2: true,
      mmm2Range: '0630-0631',
      mmm2Color: '#ffffff',
      showLc: true,
      lcRange: '1100-1101',
      lcColor: '#ffffff',

      showDailyOpen: true,
      dailyOpenColor: '#f59e0b',
    };
  });

  useEffect(() => {
    localStorage.setItem("terminal_timings_config", JSON.stringify(timingsConfig));
  }, [timingsConfig]);

  // Customization state
  const [candlestickConfig, setCandlestickConfig] = useState({
    upColor: "#22c55e",
    downColor: "#ef4444",
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444",
  });
  const [showConfig, setShowConfig] = useState(false);
  const [isCrosshairActive, setIsCrosshairActive] = useState(true);
  const [showCrosshairTooltip, setShowCrosshairTooltip] = useState(() => {
    const saved = localStorage.getItem('terminal_show_crosshair_tooltip');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('terminal_show_crosshair_tooltip', String(showCrosshairTooltip));
  }, [showCrosshairTooltip]);

  const [hideBidAskLabels, setHideBidAskLabels] = useState(() => {
    const saved = localStorage.getItem('terminal_hide_bid_ask_labels');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('terminal_hide_bid_ask_labels', String(hideBidAskLabels));
  }, [hideBidAskLabels]);

  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);
  const [timezoneOffset, setTimezoneOffset] = useState(2); // Default UTC+2
 
  type SessionBox = {
    id: string;
    name: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    color: string;
  };
 
  const [sessionBoxes, setSessionBoxes] = useState<SessionBox[]>([
    { id: "asia", name: "Asia", startHour: 0, startMinute: 0, endHour: 9, endMinute: 0, color: "#10b981" },
    { id: "london", name: "London", startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, color: "#f59e0b" },
    { id: "ny", name: "NY", startHour: 14, startMinute: 0, endHour: 22, endMinute: 0, color: "#8b5cf6" },
  ]);
  const [visibleSessions, setVisibleSessions] = useState<Record<string, boolean>>({
    asia: true,
    london: true,
    ny: true,
  });

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSymbolMenuOpen, setIsSymbolMenuOpen] = useState(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(["EUR/USD", "GBP/USD", "USD/JPY", "NAS100", "US30", "XAU/USD", "BTC/USD"]);
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const [symbolSearch, setSymbolSearch] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const symbolMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
      if (symbolMenuRef.current && !symbolMenuRef.current.contains(event.target as Node)) {
        setIsSymbolMenuOpen(false);
      }
      if (toolMenuRef.current && !toolMenuRef.current.contains(event.target as Node)) {
        setIsToolMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quick Trade State
  const [showQuickTrade, setShowQuickTrade] = useState(false);
  const [qtPos, setQtPos] = useState({ x: 16, y: 16 });
  const [isDraggingQT, setIsDraggingQT] = useState(false);
  const qtDragOffset = useRef({ x: 0, y: 0 });

  // Draggable SL/TP State
  const [dragState, setDragState] = useState<{
    id?: string;
    type: "sl" | "tp" | "order" | "pending" | "preview_order" | "preview_sl" | "preview_tp" | "alarm";
    posType?: string;
    isPending?: boolean;
    initialPrice?: number;
  } | null>(null);
  const draggedPriceRef = useRef<number | null>(null);
  const [forceRender, setForceRender] = useState(0);

  const [slConfirmState, setSlConfirmState] = useState<{
    id: string;
    type: "sl" | "tp";
    price: number;
    initialPrice: string | null;
    wasActive: boolean;
  } | null>(null);

  const handleConfirmSlTp = () => {
    if (!slConfirmState) return;
    const { id, type, price } = slConfirmState;
    setPositions((prev: any[]) =>
      prev.map((p) =>
        p.id === id
          ? { 
              ...p, 
              [type]: price.toString(),
              [type + "_active"]: true 
            }
          : p,
      ),
    );
    addNotification({
      title: `${type === "sl" ? "Stop Loss" : "Take Profit"} Set`,
      message: `Successfully set ${type === "sl" ? "Stop Loss" : "Take Profit"} at ${price}.`,
      type: "success"
    });
    setSlConfirmState(null);
  };

  const handleCancelSlTp = () => {
    if (!slConfirmState) return;
    const { id, type, initialPrice, wasActive } = slConfirmState;
    setPositions((prev: any[]) =>
      prev.map((p) =>
        p.id === id
          ? { 
              ...p, 
              [type]: initialPrice,
              [type + "_active"]: wasActive 
            }
          : p,
      ),
    );
    setSlConfirmState(null);
  };

  const [price, setPrice] = useState<number>(0);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "error" | "disconnected">("disconnected");
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  useEffect(() => {
    fetch('/api/forex/market-status').then(r => r.json()).then(data => {
      if (data && data.serverTime) {
        const sTime = new Date(data.serverTime).getTime();
        setServerTimeOffset(sTime - Date.now());
      }
    }).catch(() => {});
  }, []);

  const [symbol, setSymbol] = useState("EUR/USD");
  const [lotsInput, setLotsInput] = useState<string>("0.10");
  const Lots = parseFloat(lotsInput) || 0;
  const setLots = (val: number) => setLotsInput(val.toFixed(2));

  const [riskPercent, setRiskPercent] = useState(1);
  const [isRiskMode, setIsRiskMode] = useState(false);

  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskCalcAccountBalance, setRiskCalcAccountBalance] = useState(10000);
  const [riskCalcPercent, setRiskCalcPercent] = useState(1);
  const [riskCalcSLPips, setRiskCalcSLPips] = useState(20);
  const [riskCalcSymbol, setRiskCalcSymbol] = useState(symbol);

  useEffect(() => {
    if (isRiskModalOpen) {
      setRiskCalcSymbol(symbol);
    }
  }, [isRiskModalOpen, symbol]);

  // Alarms System State
  const [terminalAlarms, setTerminalAlarms] = useState<{ id: string; symbol: string; price: number; isActive: boolean; isTriggered: boolean }[]>(() => {
    try {
      const stored = localStorage.getItem('terminal_price_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [terminalMuted, setTerminalMuted] = useState(() => {
    try {
      return localStorage.getItem('terminal_alerts_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [activeTerminalAlerts, setActiveTerminalAlerts] = useState<{ id: string; price: number; symbol: string; timestamp: number }[]>([]);
  const [terminalContextMenu, setTerminalContextMenu] = useState<{ x: number; y: number; price: number } | null>(null);

  // Sync terminal alarms to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('terminal_price_alerts', JSON.stringify(terminalAlarms));
    } catch (e) {
      console.error(e);
    }
  }, [terminalAlarms]);

  // Limit terminal/chart alarms to at most 10 items
  useEffect(() => {
    if (terminalAlarms.length > 10) {
      const active = terminalAlarms.filter(a => a.isActive && !a.isTriggered);
      const nonActive = terminalAlarms.filter(a => !a.isActive || a.isTriggered);
      const allowedActive = active.slice(0, 10);
      const remainingSlots = 10 - allowedActive.length;
      const allowedNonActive = nonActive.slice(-remainingSlots);
      setTerminalAlarms([...allowedActive, ...allowedNonActive]);
    }
  }, [terminalAlarms]);

  // Sync terminal muted state
  useEffect(() => {
    localStorage.setItem('terminal_alerts_muted', String(terminalMuted));
  }, [terminalMuted]);

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<string>("cursor");
  const [drawColor, setDrawColor] = useState("#3b82f6");
  const [drawThickness, setDrawThickness] = useState(2);
  const [settingsPopup, setSettingsPopup] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
  } | null>(null);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<any>(null);

  useEffect(() => {
    if (currentDrawing && isDrawing) {
      setCurrentDrawing((prev: any) => ({
        ...prev,
        thickness: drawThickness,
      }));
    }
  }, [drawThickness]);

  const getDistanceToPoint = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  const getDistanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return getDistanceToPoint(px, py, x1, y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return getDistanceToPoint(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
  };

  const handleDrawingClick = (e: React.MouseEvent, id: string) => {
    if (activeTool === "cursor") {
      e.stopPropagation();
      setSelectedDrawingId(id);
    }
  };

  const handleDrawingContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDrawings(prev => prev.filter(d => d.id !== id));
    if (selectedDrawingId === id) setSelectedDrawingId(null);
  };

  const handleChartContextMenu = (e: React.MouseEvent) => {
    if (activeTool === "cursor") return;
    
    e.preventDefault();
    e.stopPropagation();

    if (!chartRef.current || !candlestickSeriesRef.current || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const chart = chartRef.current;
    const series = candlestickSeriesRef.current;
    const threshold = 10; // ~1mm precision threshold

    let closestId = null;
    let minDistance = Infinity;

    drawings.forEach((draw) => {
      let distance = Infinity;
      
      const x1 = draw.start ? chart.timeScale().timeToCoordinate(draw.start.time) : null;
      const y1 = draw.start ? series.priceToCoordinate(draw.start.price) : null;
      const x2 = draw.end ? chart.timeScale().timeToCoordinate(draw.end.time) : null;
      const y2 = draw.end ? series.priceToCoordinate(draw.end.price) : null;

      if (draw.type === "trendline" && x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        distance = getDistanceToSegment(mx, my, x1, y1, x2, y2);
      } else if (draw.type === "hline" && y1 !== null) {
        distance = Math.abs(my - y1);
      } else if (draw.type === "rect" && x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        const d1 = getDistanceToSegment(mx, my, x1, y1, x2, y1);
        const d2 = getDistanceToSegment(mx, my, x2, y1, x2, y2);
        const d3 = getDistanceToSegment(mx, my, x2, y2, x1, y2);
        const d4 = getDistanceToSegment(mx, my, x1, y2, x1, y1);
        distance = Math.min(d1, d2, d3, d4);
      } else if (draw.type === "triangle" && x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        const midX = (x1 + x2) / 2;
        const d1 = getDistanceToSegment(mx, my, midX, y1, x1, y2);
        const d2 = getDistanceToSegment(mx, my, x1, y2, x2, y2);
        const d3 = getDistanceToSegment(mx, my, x2, y2, midX, y1);
        distance = Math.min(d1, d2, d3);
      } else if (draw.type === "path" && draw.points) {
        for (let i = 0; i < draw.points.length - 1; i++) {
          const p1x = chart.timeScale().timeToCoordinate(draw.points[i].time);
          const p1y = series.priceToCoordinate(draw.points[i].price);
          const p2x = chart.timeScale().timeToCoordinate(draw.points[i+1].time);
          const p2y = series.priceToCoordinate(draw.points[i+1].price);
          if (p1x !== null && p1y !== null && p2x !== null && p2y !== null) {
            const segDist = getDistanceToSegment(mx, my, p1x, p1y, p2x, p2y);
            distance = Math.min(distance, segDist);
          }
        }
      }

      if (distance < minDistance) {
        minDistance = distance;
        closestId = draw.id;
      }
    });

    if (closestId && minDistance < threshold) {
      setDrawings(prev => prev.filter(d => d.id !== closestId));
      if (selectedDrawingId === closestId) setSelectedDrawingId(null);
    }
  };

  const handleChartAreaContextMenu = (e: React.MouseEvent) => {
    if (activeTool !== "cursor") return;

    e.preventDefault();
    e.stopPropagation();

    if (!chartRef.current || !candlestickSeriesRef.current || !chartContainerRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const y = clientY - rect.top;

    const chartPrice = candlestickSeriesRef.current.coordinateToPrice(y);
    if (chartPrice !== null && chartPrice > 0) {
      setTerminalContextMenu({
        x: clientX - rect.left,
        y: Math.max(10, Math.min(y, rect.height - 240)),
        price: chartPrice
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawing(false);
        setCurrentDrawing(null);
        setSelectedDrawingId(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedDrawingId) {
        setDrawings(prev => prev.filter(d => d.id !== selectedDrawingId));
        setSelectedDrawingId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDrawingId, isDrawing, currentDrawing]);

  // Floating Toolbar State
  const [toolbarPos, setToolbarPos] = useState({ 
    x: typeof window !== "undefined" ? window.innerWidth - 180 : 300, 
    y: 120 
  });
  const [toolbarOrientation, setToolbarOrientation] = useState<
    "vert" | "horiz"
  >("horiz");
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(true);
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const [toolbarOpacity, setToolbarOpacity] = useState(90);
  const [toolbarScale, setToolbarScale] = useState(1);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const [isResizingToolbar, setIsResizingToolbar] = useState(false);
  const resizeStartDim = useRef({ w: 0, h: 0, x: 0, y: 0 });

  const handleToolbarResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsResizingToolbar(true);
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    resizeStartDim.current = {
      w: toolbarScale,
      h: 0, // Not used for scale but kept for structure
      x: clientX,
      y: clientY,
    };
  };

  const handleToolbarDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingToolbar(true);
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStartOffset.current = {
      x: clientX - toolbarPos.x,
      y: clientY - toolbarPos.y,
    };
  };

  const handleQTDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingQT(true);
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    qtDragOffset.current = {
      x: clientX - qtPos.x,
      y: clientY - qtPos.y,
    };
  };

  const handleGlobalMouseMove = (e: MouseEvent | TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    if (isDraggingToolbar) {
      setToolbarPos({
        x: clientX - dragStartOffset.current.x,
        y: clientY - dragStartOffset.current.y,
      });
    } else if (isDraggingQT) {
      setQtPos({
        x: Math.max(0, Math.min(clientX - qtDragOffset.current.x, window.innerWidth - 150)),
        y: Math.max(0, Math.min(clientY - qtDragOffset.current.y, window.innerHeight - 100)),
      });
    } else if (isResizingToolbar) {
      const deltaX = clientX - resizeStartDim.current.x;
      const newScale = Math.max(
        0.5,
        Math.min(2, resizeStartDim.current.w + deltaX * 0.005),
      );
      setToolbarScale(newScale);
    }
  };

  const handleGlobalMouseUp = () => {
    if (isDraggingToolbar) setIsDraggingToolbar(false);
    if (isResizingToolbar) setIsResizingToolbar(false);
    if (isDraggingQT) setIsDraggingQT(false);
  };

  useEffect(() => {
    if (!chartRef.current) return;
    
    // When a tool is selected, we disable movement and scaling completely
    const isInteracting = activeTool !== "cursor" || isDrawing || !!dragState;
    const canMove = !isInteracting;

    chartRef.current.applyOptions({
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: canMove,
        horzTouchDrag: canMove,
        vertTouchDrag: canMove,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: canMove,
      },
    });
  }, [activeTool, isDrawing, dragState, symbol]); // Added symbol to ensure sync on switch

  useEffect(() => {
    if (isDraggingToolbar || isResizingToolbar || isDraggingQT) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("touchmove", handleGlobalMouseMove, { passive: false });
      window.addEventListener("mouseup", handleGlobalMouseUp);
      window.addEventListener("touchend", handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("touchmove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isDraggingToolbar, isResizingToolbar, isDraggingQT]);

  const [showCopyToast, setShowCopyToast] = useState(false);

  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync SVG dimensions
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSvgDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(chartContainerRef.current);
    return () => obs.disconnect();
  }, []);

  const markersContainerRef = useRef<HTMLDivElement>(null);
  const posMarkersRef = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    let handle: number;
    const syncMarkers = () => {
      if (!candlestickSeriesRef.current || !markersContainerRef.current) {
        handle = requestAnimationFrame(syncMarkers);
        return;
      }
      const series = candlestickSeriesRef.current;
      
      Object.keys(posMarkersRef.current).forEach((key) => {
        const el = posMarkersRef.current[key];
        if (!el) return;
        
        const priceStr = el.dataset.price;
        const draggingId = el.dataset.draggingid;
        const type = el.dataset.type;
        
        if (!priceStr) return;
        let price = parseFloat(priceStr);
        
        if (dragState && dragState.id === draggingId && dragState.type === type && draggedPriceRef.current !== null) {
          price = draggedPriceRef.current;
        } else if (dragState && dragState.id === draggingId && dragState.isPending && type === "pending" && draggedPriceRef.current !== null) {
          price = draggedPriceRef.current;
        }

        const y = series.priceToCoordinate(price);
        if (y !== null && !isNaN(y)) {
          el.style.transform = `translateY(${y - 8}px)`; // -8px to center vertically (h-4 is 16px)
          el.style.display = "flex";
        } else {
          el.style.display = "none";
        }
      });
      handle = requestAnimationFrame(syncMarkers);
    };
    handle = requestAnimationFrame(syncMarkers);
    return () => cancelAnimationFrame(handle);
  }, [dragState]);

  const handleToolbarContextMenu = (e: React.MouseEvent, toolId: string) => {
    e.preventDefault();
    setSettingsPopup({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
    });
  };
 
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target && (target.closest(".terminal-context-menu") || target.closest(".settings-popup"))) {
      return;
    }

    if (
      !chartRef.current ||
      !candlestickSeriesRef.current ||
      !chartContainerRef.current
    )
      return;

    // Do not preventDefault on touch start for cursor mode so we can still scroll/pan
    // if we don't hit an interactive element
    if (activeTool !== "cursor") {
      console.log("handleMouseDown - tool", activeTool);
      e.stopPropagation();
      e.preventDefault();
    }

    const rect = chartContainerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (activeTool === "cursor") {
      const price = candlestickSeriesRef.current.coordinateToPrice(y);
      if (price === null) return;

      // Check if clicking on VWAP lines
      if (indicators.includes("VWAP")) {
        const { vwap, upper1, lower1, upper2, lower2, upper3, lower3 } = hoveredVwapValuesRef.current;
        const pyVwap = vwap !== null && vwapSeriesRef.current ? vwapSeriesRef.current.priceToCoordinate(vwap) : null;
        const pyU1 = upper1 !== null && vwapUpper1SeriesRef.current ? vwapUpper1SeriesRef.current.priceToCoordinate(upper1) : null;
        const pyL1 = lower1 !== null && vwapLower1SeriesRef.current ? vwapLower1SeriesRef.current.priceToCoordinate(lower1) : null;
        const pyU2 = upper2 !== null && vwapUpper2SeriesRef.current ? vwapUpper2SeriesRef.current.priceToCoordinate(upper2) : null;
        const pyL2 = lower2 !== null && vwapLower2SeriesRef.current ? vwapLower2SeriesRef.current.priceToCoordinate(lower2) : null;
        const pyU3 = upper3 !== null && vwapUpper3SeriesRef.current ? vwapUpper3SeriesRef.current.priceToCoordinate(upper3) : null;
        const pyL3 = lower3 !== null && vwapLower3SeriesRef.current ? vwapLower3SeriesRef.current.priceToCoordinate(lower3) : null;

        if (
          (pyVwap !== null && Math.abs(pyVwap - y) < 10) ||
          (pyU1 !== null && Math.abs(pyU1 - y) < 10) ||
          (pyL1 !== null && Math.abs(pyL1 - y) < 10) ||
          (pyU2 !== null && Math.abs(pyU2 - y) < 10) ||
          (pyL2 !== null && Math.abs(pyL2 - y) < 10) ||
          (pyU3 !== null && Math.abs(pyU3 - y) < 10) ||
          (pyL3 !== null && Math.abs(pyL3 - y) < 10)
        ) {
          setIsVwapSettingsOpen(true);
          return; // Stop drag initiation
        }
      }

      const isTouch = "touches" in e;
      const THRESHOLD = isTouch ? 30 : 15; // 30px for touch screens and easier grabbing, 15px for precise mouse clicking
      let found: any = null;
      let minDiff = Infinity;

      const items = [
        ...positions.filter((p: any) => p.symbol === symbol),
        ...pendingOrders
          .filter((p: any) => p.symbol === symbol)
          .map((p: any) => ({ ...p, isPending: true })),
      ];

      // Add pending preview lines to detection
      if (isPreviewActive) {
        if (orderMode === "pending") {
          const pyOrder = candlestickSeriesRef.current!.priceToCoordinate(previewOrderPrice);
          if (pyOrder !== null) {
            const diff = Math.abs(pyOrder - y);
            if (diff < THRESHOLD && diff < minDiff) {
              minDiff = diff;
              found = { type: "preview_order", initialPrice: previewOrderPrice };
            }
          }
        }
        if (previewSl !== null) {
          const pySl = candlestickSeriesRef.current!.priceToCoordinate(previewSl);
          if (pySl !== null) {
            const diff = Math.abs(pySl - y);
            if (diff < THRESHOLD && diff < minDiff) {
              minDiff = diff;
              found = { type: "preview_sl", initialPrice: previewSl };
            }
          }
        }
        if (previewTp !== null) {
          const pyTp = candlestickSeriesRef.current!.priceToCoordinate(previewTp);
          if (pyTp !== null) {
            const diff = Math.abs(pyTp - y);
            if (diff < THRESHOLD && diff < minDiff) {
              minDiff = diff;
              found = { type: "preview_tp", initialPrice: previewTp };
            }
          }
        }
      }

      if (!found) {
        items.forEach((p) => {
        if (!p.isPending) {
          if (p.sl) {
            const py = candlestickSeriesRef.current!.priceToCoordinate(
              parseFloat(p.sl),
            );
            if (
              py !== null &&
              Math.abs(py - y) < THRESHOLD &&
              Math.abs(py - y) < minDiff
            ) {
              minDiff = Math.abs(py - y);
              found = { id: p.id, type: "sl", initialPrice: parseFloat(p.sl), posType: p.type };
            }
          }
          if (p.tp) {
            const py = candlestickSeriesRef.current!.priceToCoordinate(
              parseFloat(p.tp),
            );
            if (
              py !== null &&
              Math.abs(py - y) < THRESHOLD &&
              Math.abs(py - y) < minDiff
            ) {
              minDiff = Math.abs(py - y);
              found = { id: p.id, type: "tp", initialPrice: parseFloat(p.tp), posType: p.type };
            }
          }
          const pOpen = candlestickSeriesRef.current!.priceToCoordinate(
            parseFloat(p.open_price),
          );
          if (
            pOpen !== null &&
            Math.abs(pOpen - y) < THRESHOLD &&
            Math.abs(pOpen - y) < minDiff
          ) {
            minDiff = Math.abs(pOpen - y);
            found = { id: p.id, type: "open_price", position: p, posType: p.type };
          }
        } else {
          const py = candlestickSeriesRef.current!.priceToCoordinate(
            parseFloat(p.target_price),
          );
          if (
            py !== null &&
            Math.abs(py - y) < THRESHOLD &&
            Math.abs(py - y) < minDiff
          ) {
            minDiff = Math.abs(py - y);
            found = {
              id: p.id,
              type: "pending",
              initialPrice: parseFloat(p.target_price),
              posType: p.type,
              isPending: true,
            };
          }
        }
      });

      if (!found) {
        terminalAlarms
          .filter((alarm) => alarm.symbol === symbol && alarm.isActive && !alarm.isTriggered)
          .forEach((alarm) => {
            const pyAlarm = candlestickSeriesRef.current!.priceToCoordinate(alarm.price);
            if (pyAlarm !== null && Math.abs(pyAlarm - y) < THRESHOLD && Math.abs(pyAlarm - y) < minDiff) {
              minDiff = Math.abs(pyAlarm - y);
              found = { id: alarm.id, type: "alarm", initialPrice: alarm.price, symbol: alarm.symbol };
            }
          });
      }
    }

      if (found) {
        // Let the 'X' button handle its own event if clicked
        if ((e.target as HTMLElement).tagName.toLowerCase() === 'button') {
          return;
        }

        if (found.type === "open_price") {
          const p = found.position;
          const openPrice = parseFloat(p.open_price);
          const pips5 = 5 * getPipSize(symbol);
          let newSl = p.sl;
          let newTp = p.tp;
          const decimals = getDecimalsForSymbol(symbol);

          const newlyCreatedSl = !newSl;
          const newlyCreatedTp = !newTp;

          if (!newSl)
            newSl = (p.type === "buy" ? openPrice - pips5 : openPrice + pips5).toFixed(decimals);
          if (!newTp)
            newTp = (p.type === "buy" ? openPrice + pips5 : openPrice - pips5).toFixed(decimals);

          setPositions((prev: any[]) =>
            prev.map((pos) =>
              pos.id === p.id 
                ? { 
                    ...pos, 
                    sl: newSl, 
                    tp: newTp,
                    sl_active: newlyCreatedSl ? false : (pos.sl_active !== undefined ? pos.sl_active : true),
                    tp_active: newlyCreatedTp ? false : (pos.tp_active !== undefined ? pos.tp_active : true)
                  } 
                : pos,
            ),
          );
          // Start dragging SL immediately so user sees something happening
          const slPrice = parseFloat(newSl);
          setDragState({ id: p.id, type: "sl", initialPrice: slPrice, posType: p.type });
          draggedPriceRef.current = slPrice;

          e.stopPropagation();
          if ("touches" in e && e.cancelable) {
            e.preventDefault();
          }
          return;
        }

        setDragState(found);
        draggedPriceRef.current = found.initialPrice;
        e.stopPropagation();
        if ("touches" in e && e.cancelable) {
          e.preventDefault();
        }
      } else {
        // Deselect if clicking empty space with cursor tool
        setSelectedDrawingId(null);
      }
      return;
    }

    if (activeTool !== "cursor") {
      e.preventDefault();
      e.stopPropagation();
    }

    const time = chartRef.current.timeScale().coordinateToTime(x);
    const price = candlestickSeriesRef.current.coordinateToPrice(y);

    if (time === null || price === null) return;

      if (activeTool === "path" || activeTool === "freehand") {
        if (activeTool === "path" && currentDrawing && currentDrawing.type === "path") {
          // Anchor current point and add a new one for follow
          const pts = currentDrawing.points;
          const last = pts[pts.length - 1];
          setCurrentDrawing({
            ...currentDrawing,
            points: [...pts, { ...last }]
          });
        } else {
          // Start a new path or freehand
          setIsDrawing(true);
          setCurrentDrawing({
            id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: activeTool,
            points: [{ time, price }, { time, price }], 
            color: drawColor,
            thickness: drawThickness,
          });
        }
        return;
      }

    setIsDrawing(true);
    setCurrentDrawing({
      id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: activeTool,
      start: { time, price },
      end: { time, price },
      points: activeTool === "path" ? [{ time, price }] : [],
      color: drawColor,
      thickness: drawThickness,
    });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target && (target.closest(".terminal-context-menu") || target.closest(".settings-popup"))) {
      return;
    }

    if (
      !chartRef.current ||
      !candlestickSeriesRef.current ||
      !chartContainerRef.current
    )
      return;

    if (activeTool !== "cursor") {
      e.stopPropagation();
      // e.preventDefault(); // Might interfere with touch if we go global but here it's fine
    }

    // Stop propagation and prevent default only if we are dragging an element
    if (activeTool === "cursor" && dragState && "touches" in e) {
       e.stopPropagation();
       if (e.cancelable) e.preventDefault();
    }

    const rect = chartContainerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (activeTool === "cursor") {
      const price = candlestickSeriesRef.current.coordinateToPrice(y);
      if (dragState && price !== null) {
        chartContainerRef.current.style.cursor = "ns-resize";
        let boundedPrice = price;

        if (dragState.type === "alarm") {
          draggedPriceRef.current = price;
          setForceRender(prev => prev + 1);
          return;
        }

        // Preview Line Drags
        if (dragState.type === "preview_order") {
          setPreviewOrderPrice(price);
          // Auto-switch type based on current market price
          const marketPrice = prices[symbol];
          if (marketPrice) {
            if (price > marketPrice) {
              setPendingType(pendingType.includes("buy") ? "buy stop" : "sell limit");
            } else {
              setPendingType(pendingType.includes("buy") ? "buy limit" : "sell stop" );
            }
          }
          setForceRender(prev => prev + 1);
          return;
        }
        if (dragState.type === "preview_sl") {
          setPreviewSl(price);
          if (orderMode === "market") {
            const decimals = getDecimalsForSymbol(symbol);
            setSl(price.toFixed(decimals));
          }
          setForceRender(prev => prev + 1);
          return;
        }
        if (dragState.type === "preview_tp") {
          setPreviewTp(price);
          if (orderMode === "market") {
            const decimals = getDecimalsForSymbol(symbol);
            setTp(price.toFixed(decimals));
          }
          setForceRender(prev => prev + 1);
          return;
        }

        const currentMarketPrice = prices[symbol];

        if (currentMarketPrice !== undefined && !dragState.isPending) {
          if (dragState.posType === "buy") {
            if (dragState.type === "sl") {
              boundedPrice = Math.min(price as number, currentMarketPrice) as any;
            } else if (dragState.type === "tp") {
              boundedPrice = Math.max(price as number, currentMarketPrice) as any;
            }
          } else if (dragState.posType === "sell") {
            if (dragState.type === "sl") {
              boundedPrice = Math.max(price as number, currentMarketPrice) as any;
            } else if (dragState.type === "tp") {
              boundedPrice = Math.min(price as number, currentMarketPrice) as any;
            }
          }
        }
        
        draggedPriceRef.current = boundedPrice;
        // Optimization: Do NOT call setPositions here to avoid spamming the backend context
        // We will just force a re-render so the useEffect picks up draggedPriceRef
        setForceRender(prev => prev + 1);
        return;
      } else if (!dragState && price !== null) {
        // Hover effect for lines
        const THRESHOLD = 15;
        let isHoveringLine = false;

        // 1. Check interactive preview lines if active
        if (isPreviewActive) {
          const pyOrder = orderMode === "pending" ? candlestickSeriesRef.current!.priceToCoordinate(previewOrderPrice) : null;
          const pySl = previewSl !== null ? candlestickSeriesRef.current!.priceToCoordinate(previewSl) : null;
          const pyTp = previewTp !== null ? candlestickSeriesRef.current!.priceToCoordinate(previewTp) : null;

          if (
            (pyOrder !== null && Math.abs(pyOrder - y) < THRESHOLD) ||
            (pySl !== null && Math.abs(pySl - y) < THRESHOLD) ||
            (pyTp !== null && Math.abs(pyTp - y) < THRESHOLD)
          ) {
            isHoveringLine = true;
            chartContainerRef.current.style.cursor = "ns-resize";
          }
        }

        // 2. If not hovering preview, check existing positions and pending orders
        if (!isHoveringLine) {
          const items = [
            ...positions.filter((p: any) => p.symbol === symbol),
            ...pendingOrders
              .filter((p: any) => p.symbol === symbol)
              .map((p: any) => ({ ...p, isPending: true })),
          ];
          for (const p of items) {
            if (!p.isPending) {
              const pySL = p.sl
                ? candlestickSeriesRef.current!.priceToCoordinate(
                    parseFloat(p.sl),
                  )
                : null;
              const pyTP = p.tp
                ? candlestickSeriesRef.current!.priceToCoordinate(
                    parseFloat(p.tp),
                  )
                : null;
              const pyOpen = candlestickSeriesRef.current!.priceToCoordinate(
                parseFloat(p.open_price),
              );

              if (
                (pySL && Math.abs(pySL - y) < THRESHOLD) ||
                (pyTP && Math.abs(pyTP - y) < THRESHOLD)
              ) {
                isHoveringLine = true;
                chartContainerRef.current.style.cursor = "ns-resize";
                break;
              } else if (pyOpen && Math.abs(pyOpen - y) < THRESHOLD) {
                isHoveringLine = true;
                chartContainerRef.current.style.cursor = "pointer";
                break;
              }
            } else {
              const pyTarget = candlestickSeriesRef.current!.priceToCoordinate(
                parseFloat(p.target_price),
              );
              if (pyTarget && Math.abs(pyTarget - y) < THRESHOLD) {
                isHoveringLine = true;
                chartContainerRef.current.style.cursor = "ns-resize";
                break;
              }
            }
          }
        }

        if (!isHoveringLine) {
          const activeAlarms = terminalAlarms.filter(a => a.symbol === symbol && a.isActive && !a.isTriggered);
          for (const alarm of activeAlarms) {
            const pyAlarm = candlestickSeriesRef.current!.priceToCoordinate(alarm.price);
            if (pyAlarm && Math.abs(pyAlarm - y) < THRESHOLD) {
              isHoveringLine = true;
              chartContainerRef.current.style.cursor = "ns-resize";
              break;
            }
          }
        }

        if (!isHoveringLine && indicators.includes("VWAP")) {
          const { vwap, upper1, lower1, upper2, lower2, upper3, lower3 } = hoveredVwapValuesRef.current;
          const pyVwap = vwap !== null && vwapSeriesRef.current ? vwapSeriesRef.current.priceToCoordinate(vwap) : null;
          const pyU1 = upper1 !== null && vwapUpper1SeriesRef.current ? vwapUpper1SeriesRef.current.priceToCoordinate(upper1) : null;
          const pyL1 = lower1 !== null && vwapLower1SeriesRef.current ? vwapLower1SeriesRef.current.priceToCoordinate(lower1) : null;
          const pyU2 = upper2 !== null && vwapUpper2SeriesRef.current ? vwapUpper2SeriesRef.current.priceToCoordinate(upper2) : null;
          const pyL2 = lower2 !== null && vwapLower2SeriesRef.current ? vwapLower2SeriesRef.current.priceToCoordinate(lower2) : null;
          const pyU3 = upper3 !== null && vwapUpper3SeriesRef.current ? vwapUpper3SeriesRef.current.priceToCoordinate(upper3) : null;
          const pyL3 = lower3 !== null && vwapLower3SeriesRef.current ? vwapLower3SeriesRef.current.priceToCoordinate(lower3) : null;

          if (
            (pyVwap !== null && Math.abs(pyVwap - y) < 10) ||
            (pyU1 !== null && Math.abs(pyU1 - y) < 10) ||
            (pyL1 !== null && Math.abs(pyL1 - y) < 10) ||
            (pyU2 !== null && Math.abs(pyU2 - y) < 10) ||
            (pyL2 !== null && Math.abs(pyL2 - y) < 10) ||
            (pyU3 !== null && Math.abs(pyU3 - y) < 10) ||
            (pyL3 !== null && Math.abs(pyL3 - y) < 10)
          ) {
            isHoveringLine = true;
            chartContainerRef.current.style.cursor = "pointer";
          }
        }

        if (!isHoveringLine) {
          chartContainerRef.current.style.cursor = "crosshair";
        }
      }
    }

    if (!isDrawing || !currentDrawing) return;

    if (activeTool !== "cursor") {
      e.preventDefault();
      e.stopPropagation();
    }

    const time = chartRef.current.timeScale().coordinateToTime(x);
    const price = candlestickSeriesRef.current.coordinateToPrice(y);

    if (time === null || price === null) return;

    if (currentDrawing.type === "path") {
      const newPoints = [...currentDrawing.points];
      newPoints[newPoints.length - 1] = { time, price };
      setCurrentDrawing({
        ...currentDrawing,
        points: newPoints,
      });
    } else if (currentDrawing.type === "freehand") {
      const pts = currentDrawing.points;
      const last = pts[pts.length - 1];
      // Only add point if it moved significantly to keep SVG path clean
      if (Math.abs(last.price - price) > 0.00001 || last.time !== time) {
          setCurrentDrawing({
            ...currentDrawing,
            points: [...pts, { time, price }],
          });
      }
    } else {
      setCurrentDrawing({ ...currentDrawing, end: { time, price } });
    }
  };

  const handleMouseUp = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      const target = e.target as HTMLElement;
      if (target && (target.closest(".terminal-context-menu") || target.closest(".settings-popup"))) {
        return;
      }
    }

    if (isDrawing && currentDrawing && activeTool !== "path" && activeTool !== "freehand") {
      setDrawings([...drawings, currentDrawing]);
      setIsDrawing(false);
      setCurrentDrawing(null);
    }

    if (activeTool === "cursor" && dragState) {
      const finalPrice = draggedPriceRef.current;
      if (finalPrice !== null) {
        const decimals = getDecimalsForSymbol(symbol);
        const formattedPrice = parseFloat(finalPrice.toFixed(decimals));

        if (dragState.type === "alarm") {
          setTerminalAlarms((prev) =>
            prev.map((a) =>
              a.id === dragState.id ? { ...a, price: formattedPrice, isTriggered: false } : a
            )
          );
          setDragState(null);
          draggedPriceRef.current = null;
        } else if (dragState.isPending) {
          setPendingOrders((prev: any[]) =>
            prev.map((p) =>
              p.id === dragState.id ? { ...p, target_price: formattedPrice.toString() } : p,
            ),
          );
          setDragState(null);
          draggedPriceRef.current = null;
        } else if (dragState.type === "sl" || dragState.type === "tp") {
          const pos = positions.find(item => item.id === dragState.id);
          const wasActive = pos ? (dragState.type === "sl" ? pos.sl_active !== false : pos.tp_active !== false) : false;
          const initialVal = pos ? (dragState.type === "sl" ? pos.sl : pos.tp) : null;

          // Tentatively update the price line visually, but do not override the active flag yet
          setPositions((prev: any[]) =>
            prev.map((p) =>
              p.id === dragState.id
                ? { ...p, [dragState.type]: formattedPrice.toString() }
                : p,
            ),
          );

          setSlConfirmState({
            id: dragState.id!,
            type: dragState.type as "sl" | "tp",
            price: formattedPrice,
            initialPrice: initialVal,
            wasActive: wasActive
          });

          setDragState(null);
          draggedPriceRef.current = null;
        } else {
          setPositions((prev: any[]) =>
            prev.map((p) =>
              p.id === dragState.id
                ? { ...p, [dragState.type]: formattedPrice.toString() }
                : p,
            ),
          );
          setDragState(null);
          draggedPriceRef.current = null;
        }
      } else {
        setDragState(null);
        draggedPriceRef.current = null;
      }
      return;
    }

    if (isDrawing && currentDrawing) {
      if (currentDrawing.type === "path") {
        // Points are anchored in MouseDown, finished on double click
        return;
      }
      
      if (currentDrawing.type === "freehand") {
        setDrawings([...drawings, currentDrawing]);
        setIsDrawing(false);
        setCurrentDrawing(null);
        return;
      }
      if (currentDrawing.type === "text") {
        const text = prompt("Enter Note Text:");
        if (text) {
          setDrawings([...drawings, { ...currentDrawing, text }]);
        }
      } else {
        setDrawings([...drawings, currentDrawing]);
      }
      setIsDrawing(false);
      setCurrentDrawing(null);
    }
  };

  const renderDrawings = () => {
    if (!chartRef.current || !candlestickSeriesRef.current) return null;

    const chart = chartRef.current;
    const series = candlestickSeriesRef.current;

    const allDrawings = [...drawings];
    if (isDrawing && currentDrawing) {
      // Only push if it's not already in drawings to avoid duplicate keys
      allDrawings.push(currentDrawing);
    }

    return allDrawings.map((draw) => {
      const isSelected = selectedDrawingId === draw.id;
      const x1 = draw.start ? chart.timeScale().timeToCoordinate(draw.start.time) : null;
      const y1 = draw.start ? series.priceToCoordinate(draw.start.price) : null;
      const x2 = draw.end ? chart.timeScale().timeToCoordinate(draw.end.time) : null;
      const y2 = draw.end ? series.priceToCoordinate(draw.end.price) : null;

      if (draw.type !== "path" && draw.type !== "freehand" && (x1 === null || y1 === null || x2 === null || y2 === null)) return null;

    const commonProps = {
        onClick: (e: React.MouseEvent) => handleDrawingClick(e, draw.id),
        onContextMenu: (e: React.MouseEvent) => handleDrawingContextMenu(e, draw.id),
        className: `transition-all duration-200 ${activeTool === "cursor" ? "cursor-pointer" : "pointer-events-auto"} ${isSelected ? "filter drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]" : ""}`,
        style: { pointerEvents: "auto" } as any
      };

      switch (draw.type) {
        case "trendline":
          return (
            <line
              key={draw.id}
              {...commonProps}
              x1={x1!}
              y1={y1!}
              x2={x2!}
              y2={y2!}
              stroke={isSelected ? "#00f2ff" : draw.color}
              strokeWidth={isSelected ? "3" : (draw.thickness || 2)}
            />
          );
        case "hline":
          return (
            <line
              key={draw.id}
              {...commonProps}
              x1={0}
              y1={y1!}
              x2={svgDimensions.width}
              y2={y1!}
              stroke={isSelected ? "#00f2ff" : draw.color}
              strokeWidth={isSelected ? "3" : (draw.thickness || 2)}
            />
          );
        case "rect":
          return (
            <rect
              key={draw.id}
              {...commonProps}
              x={Math.min(x1!, x2!)}
              y={Math.min(y1!, y2!)}
              width={Math.abs(x2! - x1!)}
              height={Math.abs(y2! - y1!)}
              stroke={isSelected ? "#00f2ff" : draw.color}
              strokeWidth={isSelected ? "3" : (draw.thickness || 2)}
              fill={isSelected ? "rgba(0, 242, 255, 0.2)" : `${draw.color}22`}
            />
          );
        case "triangle":
          const midX = (x1! + x2!) / 2;
          return (
            <polygon
              key={draw.id}
              {...commonProps}
              points={`${midX},${y1} ${x1},${y2} ${x2},${y2}`}
              stroke={isSelected ? "#00f2ff" : draw.color}
              fill={isSelected ? "rgba(0, 242, 255, 0.2)" : `${draw.color}22`}
              strokeWidth={isSelected ? "3" : (draw.thickness || 2)}
            />
          );
        case "path":
        case "freehand":
          if (!draw.points || draw.points.length < 2) return null;
          let allPointsValid = true;
          const d = draw.points
            .map((p: any, i: number) => {
              const px = chart.timeScale().timeToCoordinate(p.time);
              const py = series.priceToCoordinate(p.price);
              if (px === null || py === null) {
                allPointsValid = false;
                return "";
              }
              return `${i === 0 ? "M" : "L"} ${px} ${py}`;
            })
            .join(" ");
          
          if (!allPointsValid) return null;

          return (
            <path
              key={draw.id}
              {...commonProps}
              d={d}
              fill="none"
              stroke={isSelected ? "#00f2ff" : draw.color}
              strokeWidth={isSelected ? "3" : (draw.thickness || 2)}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        case "ruler":
          if (x1 === null || y1 === null || x2 === null || y2 === null) return null;
          const pipDiff =
            Math.abs(draw.end.price - draw.start.price) / getPipSize(symbol);
          return (
            <g key={draw.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#fff"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <rect
                x={(x1 + x2) / 2 - 40}
                y={(y1 + y2) / 2 - 10}
                width="80"
                height="20"
                rx="4"
                fill="#000"
                fillOpacity="0.8"
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize="10"
                fontWeight="bold"
              >
                {pipDiff.toFixed(1)} Pips
              </text>
            </g>
          );
        case "text":
          return (
            <g key={draw.id}>
              <text
                x={x1}
                y={y1}
                fill="#fff"
                fontSize="12"
                fontWeight="bold"
                className="drop-shadow-lg"
              >
                {draw.text}
              </text>
            </g>
          );
        default:
          return null;
      }
    });
  };

  const renderTimings = () => {
    if (!indicators.includes("LIT Timings") || !chartRef.current || !candlestickSeriesRef.current || !historicalDataRef.current || historicalDataRef.current.length === 0) return null;

    const chart = chartRef.current;
    const series = candlestickSeriesRef.current;
    
    const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("Crypto") || symbol.toLowerCase().includes("crypt");
    const tz = isCrypto ? "UTC" : "America/New_York";
    const shiftHours = isCrypto ? 0 : 7;

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });

    const inSessionRange = (barTimeNum: number, sessionStr: string) => {
      const parts = sessionStr.split("-");
      if (parts.length !== 2) return false;
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (end < start) {
        return barTimeNum >= start || barTimeNum < end;
      } else {
        return barTimeNum >= start && barTimeNum < end;
      }
    };

    // Group candles by dayId
    const daysMap = new Map<string, any[]>();
    historicalDataRef.current.forEach(v => {
      try {
        const date = new Date(v.time * 1000);
        const shiftedTimeSec = v.time + shiftHours * 3600;
        const shiftedDate = new Date(shiftedTimeSec * 1000);
        
        const sParts = formatter.formatToParts(shiftedDate);
        let sYear = 1970, sMonth = 1, sDay = 1;
        for (const p of sParts) {
          if (p.type === "year") sYear = parseInt(p.value, 10) || 1970;
          if (p.type === "month") sMonth = parseInt(p.value, 10) || 1;
          if (p.type === "day") sDay = parseInt(p.value, 10) || 1;
        }
        const dayId = `${sYear}-${sMonth}-${sDay}`;

        const parts = formatter.formatToParts(date);
        let hour = 0, minute = 0;
        for (const p of parts) {
          if (p.type === "hour") hour = parseInt(p.value, 10) || 0;
          if (p.type === "minute") minute = parseInt(p.value, 10) || 0;
        }
        if (hour === 24) hour = 0;
        const barTimeNum = hour * 100 + minute;

        if (!daysMap.has(dayId)) {
          daysMap.set(dayId, []);
        }
        daysMap.get(dayId)!.push({
          ...v,
          barTimeNum,
        });
      } catch (e) {}
    });

    const elements: React.ReactNode[] = [];

    daysMap.forEach((dayCandles, dayId) => {
      if (dayCandles.length === 0) return;

      // 1. Daily Open Line
      if (timingsConfig.showDailyOpen) {
        const dailyOpenPrice = dayCandles[0].open;
        const startX = chart.timeScale().timeToCoordinate(dayCandles[0].time);
        const endX = chart.timeScale().timeToCoordinate(dayCandles[dayCandles.length - 1].time);
        const y = series.priceToCoordinate(dailyOpenPrice);

        if (startX !== null && endX !== null && y !== null) {
          elements.push(
            <g key={`do-${dayId}`}>
              <line
                x1={startX}
                y1={y}
                x2={endX}
                y2={y}
                stroke={timingsConfig.dailyOpenColor}
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.7}
              />
              <text
                x={startX + 5}
                y={y - 4}
                fill={timingsConfig.dailyOpenColor}
                fontSize={8}
                fontFamily="monospace"
                className="select-none pointer-events-none opacity-60"
              >
                DO
              </text>
            </g>
          );
        }
      }

      // Helper to process session
      const processSession = (sessionTime: string) => {
        let sessionCandles = dayCandles.filter(c => inSessionRange(c.barTimeNum, sessionTime));
        if (sessionCandles.length === 0) return null;

        const high = Math.max(...sessionCandles.map(c => c.high));
        const low = Math.min(...sessionCandles.map(c => c.low));
        const startTime = sessionCandles[0].time;
        let endTime = sessionCandles[sessionCandles.length - 1].time;

        return { high, low, startTime, endTime, realEndTime: sessionCandles[sessionCandles.length - 1].time };
      };

      // 2. Asian Session
      const asian = processSession(timingsConfig.asianRangeTime);
      if (asian) {
        const xStart = chart.timeScale().timeToCoordinate(asian.startTime);
        const xRealEnd = chart.timeScale().timeToCoordinate(asian.realEndTime);
        const xEnd = chart.timeScale().timeToCoordinate(asian.endTime);
        const yHigh = series.priceToCoordinate(asian.high);
        const yLow = series.priceToCoordinate(asian.low);
        const yMid = series.priceToCoordinate((asian.high + asian.low) / 2);

        if (xStart !== null && yHigh !== null && yLow !== null) {
          if (timingsConfig.showAsianBackground && xRealEnd !== null) {
            elements.push(
              <rect
                key={`asian-bg-${dayId}`}
                x={xStart}
                y={Math.min(yHigh, yLow)}
                width={Math.max(1, xRealEnd - xStart)}
                height={Math.abs(yHigh - yLow)}
                fill={timingsConfig.asianBgColor}
                stroke="none"
              />
            );
          }

          if (timingsConfig.showAsianLines && xEnd !== null) {
            elements.push(
              <g key={`asian-lines-${dayId}`}>
                <line
                  x1={xStart}
                  y1={yHigh}
                  x2={xEnd}
                  y2={yHigh}
                  stroke={timingsConfig.asianLineColor}
                  strokeWidth={timingsConfig.asianLineWidth}
                />
                <line
                  x1={xStart}
                  y1={yLow}
                  x2={xEnd}
                  y2={yLow}
                  stroke={timingsConfig.asianLineColor}
                  strokeWidth={timingsConfig.asianLineWidth}
                />
                <line
                  x1={xStart}
                  y1={yHigh}
                  x2={xStart}
                  y2={yLow}
                  stroke={timingsConfig.asianLineColor}
                  strokeWidth={timingsConfig.asianLineWidth}
                />
                {xRealEnd !== null && (
                  <line
                    x1={xRealEnd}
                    y1={yHigh}
                    x2={xRealEnd}
                    y2={yLow}
                    stroke={timingsConfig.asianLineColor}
                    strokeWidth={timingsConfig.asianLineWidth}
                    strokeDasharray="2,2"
                  />
                )}
                <text
                  x={xStart + 4}
                  y={yHigh + 11}
                  fill={timingsConfig.asianLineColor}
                  fontSize={8}
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none pointer-events-none opacity-80"
                >
                  ASIA
                </text>
              </g>
            );
          }

          if (timingsConfig.showAsianMid && yMid !== null && xEnd !== null) {
            elements.push(
              <line
                key={`asian-mid-${dayId}`}
                x1={xStart}
                y1={yMid}
                x2={xEnd}
                y2={yMid}
                stroke={timingsConfig.asianMidColor}
                strokeWidth={timingsConfig.asianLineWidth}
                strokeDasharray="4,4"
              />
            );
          }
        }
      }

      // 3. London Session
      const london = processSession(timingsConfig.londonRangeTime);
      if (london) {
        const xStart = chart.timeScale().timeToCoordinate(london.startTime);
        const xEnd = chart.timeScale().timeToCoordinate(london.endTime);
        const yHigh = series.priceToCoordinate(london.high);
        const yLow = series.priceToCoordinate(london.low);

        if (xStart !== null && xEnd !== null && yHigh !== null && yLow !== null) {
          if (timingsConfig.showLondonBackground) {
            elements.push(
              <rect
                key={`london-bg-${dayId}`}
                x={xStart}
                y={Math.min(yHigh, yLow)}
                width={Math.max(1, xEnd - xStart)}
                height={Math.abs(yHigh - yLow)}
                fill={timingsConfig.londonBgColor}
                stroke="none"
              />
            );
          }
          if (timingsConfig.showLondonLines) {
            elements.push(
              <g key={`london-lines-${dayId}`}>
                <line
                  x1={xStart}
                  y1={yHigh}
                  x2={xEnd}
                  y2={yHigh}
                  stroke={timingsConfig.londonLineColor}
                  strokeWidth={timingsConfig.londonLineWidth}
                />
                <line
                  x1={xStart}
                  y1={yLow}
                  x2={xEnd}
                  y2={yLow}
                  stroke={timingsConfig.londonLineColor}
                  strokeWidth={timingsConfig.londonLineWidth}
                />
                <line
                  x1={xStart}
                  y1={yHigh}
                  x2={xStart}
                  y2={yLow}
                  stroke={timingsConfig.londonLineColor}
                  strokeWidth={timingsConfig.londonLineWidth}
                />
                <line
                  x1={xEnd}
                  y1={yHigh}
                  x2={xEnd}
                  y2={yLow}
                  stroke={timingsConfig.londonLineColor}
                  strokeWidth={timingsConfig.londonLineWidth}
                />
                <text
                  x={xStart + 4}
                  y={yHigh + 11}
                  fill={timingsConfig.londonLineColor}
                  fontSize={8}
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none pointer-events-none opacity-80"
                >
                  LON
                </text>
              </g>
            );
          }
        }
      }

      // 4. New York Session
      const ny = processSession(timingsConfig.nyRangeTime);
      if (ny) {
        const xStart = chart.timeScale().timeToCoordinate(ny.startTime);
        const xEnd = chart.timeScale().timeToCoordinate(ny.endTime);
        const yHigh = series.priceToCoordinate(ny.high);
        const yLow = series.priceToCoordinate(ny.low);

        if (xStart !== null && xEnd !== null && yHigh !== null && yLow !== null) {
          if (timingsConfig.showNyBackground) {
            elements.push(
              <rect
                key={`ny-bg-${dayId}`}
                x={xStart}
                y={Math.min(yHigh, yLow)}
                width={Math.max(1, xEnd - xStart)}
                height={Math.abs(yHigh - yLow)}
                fill={timingsConfig.nyBgColor}
                stroke="none"
              />
            );
          }
          if (timingsConfig.showNyLines) {
            elements.push(
              <g key={`ny-lines-${dayId}`}>
                <line
                  x1={xStart}
                  y1={yHigh}
                  x2={xEnd}
                  y2={yHigh}
                  stroke={timingsConfig.nyLineColor}
                  strokeWidth={timingsConfig.nyLineWidth}
                />
                <line
                  x1={xStart}
                  y1={yLow}
                  x2={xEnd}
                  y2={yLow}
                  stroke={timingsConfig.nyLineColor}
                  strokeWidth={timingsConfig.nyLineWidth}
                />
                <line
                  x1={xStart}
                  y1={yHigh}
                  x2={xStart}
                  y2={yLow}
                  stroke={timingsConfig.nyLineColor}
                  strokeWidth={timingsConfig.nyLineWidth}
                />
                <line
                  x1={xEnd}
                  y1={yHigh}
                  x2={xEnd}
                  y2={yLow}
                  stroke={timingsConfig.nyLineColor}
                  strokeWidth={timingsConfig.nyLineWidth}
                />
                <text
                  x={xStart + 4}
                  y={yHigh + 11}
                  fill={timingsConfig.nyLineColor}
                  fontSize={8}
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none pointer-events-none opacity-80"
                >
                  NY
                </text>
              </g>
            );
          }
        }
      }

      // Helper for vertical sessions
      const drawVerticalSessionLine = (label: string, sessionRange: string, color: string, enabled: boolean) => {
        if (!enabled) return;
        const [startStr] = sessionRange.split("-");
        const targetVal = parseInt(startStr, 10);
        
        const match = dayCandles.find(c => c.barTimeNum === targetVal);
        if (match) {
          const x = chart.timeScale().timeToCoordinate(match.time);
          if (x !== null) {
            elements.push(
              <g key={`vert-${label}-${dayId}`}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={svgDimensions.height}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  opacity={0.4}
                />
                <text
                  x={x + 4}
                  y={12}
                  fill={color}
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none pointer-events-none opacity-50"
                >
                  {label}
                </text>
              </g>
            );
          }
        }
      };

      // 5. Vertical Lines
      drawVerticalSessionLine("FF", timingsConfig.ffRange, timingsConfig.ffColor, timingsConfig.showFF);
      drawVerticalSessionLine("MMM1", timingsConfig.mmm1Range, timingsConfig.mmm1Color, timingsConfig.showMmm1);
      drawVerticalSessionLine("MMM2", timingsConfig.mmm2Range, timingsConfig.mmm2Color, timingsConfig.showMmm2);
      drawVerticalSessionLine("LC", timingsConfig.lcRange, timingsConfig.lcColor, timingsConfig.showLc);
    });

    return elements;
  };

  const handleDoubleClick = () => {
    if (activeTool === "path" && isDrawing && currentDrawing) {
      // Remove last trailing point (the one that follows the cursor)
      const points = [...currentDrawing.points];
      if (points.length > 2) {
          const finalPoints = points.slice(0, -1);
          setDrawings([...drawings, { ...currentDrawing, points: finalPoints }]);
      }
      setIsDrawing(false);
      setCurrentDrawing(null);
      setActiveTool("cursor");
      return;
    }

    if (hoveredPrice) {
      navigator.clipboard.writeText(Number(hoveredPrice).toFixed(5));
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    }
  };

  const [bottomPanelHeight, setBottomPanelHeight] = useState(180);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const layoutContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResizeMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizingPanel || !layoutContainerRef.current) return;
      
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const containerRect = layoutContainerRef.current.getBoundingClientRect();
      // Ensure the bottom panel doesn't grow larger than the container minus a safe margin for toolbar + chart
      const maxAllowedHeight = containerRect.height - 150; // Leave space for top tools and a minimal chart
      
      const newHeight = containerRect.bottom - clientY;
      
      if (newHeight < 60) {
        setBottomPanelHeight(40); // collapse to tabs only
      } else {
        setBottomPanelHeight(Math.min(newHeight, maxAllowedHeight)); // allow nearly full height while keeping header
      }
    };

    const handleResizeMouseUp = () => {
      setIsResizingPanel(false);
    };

    if (isResizingPanel) {
      window.addEventListener("mousemove", handleResizeMouseMove);
      window.addEventListener("touchmove", handleResizeMouseMove, { passive: false });
      window.addEventListener("mouseup", handleResizeMouseUp);
      window.addEventListener("touchend", handleResizeMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleResizeMouseMove);
      window.removeEventListener("touchmove", handleResizeMouseMove);
      window.removeEventListener("mouseup", handleResizeMouseUp);
      window.removeEventListener("touchend", handleResizeMouseUp);
    };
  }, [isResizingPanel]);

  const handleResizeMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsResizingPanel(true);
    if ("touches" in e && e.cancelable) {
       e.preventDefault();
    }
  };

  const activeAccount =
    user?.tradingAccounts?.find((a) => a.id === activeAccountId) ||
    user?.tradingAccounts?.[0];

  // Use account data if available, otherwise fallback to local
  const [localPositions, setLocalPositions] = useState<any[]>([]);
  const [localPendingOrders, setLocalPendingOrders] = useState<any[]>([]);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [localBalance, setLocalBalance] = useState(100000);
  
  const positions = localPositions;
  const pendingOrders = localPendingOrders;
  const history = localHistory;
  const balance = activeAccount ? activeAccount.balance : localBalance;

  useEffect(() => {
    if (isRiskModalOpen) {
      setRiskCalcAccountBalance(Number((balance || 100000).toFixed(2)));
    }
  }, [isRiskModalOpen, balance]);

  // Sync with account data when it changes from the backend
  useEffect(() => {
    if (activeAccount) {
      // Use the account's arrays if they exist, to stay in sync with Firestore
      setLocalPositions(activeAccount.openTrades || []);
      setLocalPendingOrders(activeAccount.pendingOrders || []);
      setLocalHistory(activeAccount.history || []);
      setLocalBalance(activeAccount.balance || 100000);
    }
  }, [activeAccount?.id]); // Only sync when we switch accounts totally

  const setPositions = (newOrFn: any[] | ((prev: any[]) => any[])) => {
    const nextPositions =
      typeof newOrFn === "function" ? (newOrFn as any)(localPositions) : newOrFn;

    if (activeAccount) {
      updateTradingAccount(activeAccount.id, { openTrades: nextPositions });
    }
    setLocalPositions(nextPositions);
  };

  const setPendingOrders = (newOrFn: any[] | ((prev: any[]) => any[])) => {
    const nextOrders =
      typeof newOrFn === "function" ? (newOrFn as any)(localPendingOrders) : newOrFn;
    
    if (activeAccount) {
      updateTradingAccount(activeAccount.id, { pendingOrders: nextOrders });
    }
    setLocalPendingOrders(nextOrders);
  };

  const setHistory = (newOrFn: any[] | ((prev: any[]) => any[])) => {
    const nextHistory =
      typeof newOrFn === "function" ? (newOrFn as any)(localHistory) : newOrFn;
    if (activeAccount) {
      updateTradingAccount(activeAccount.id, { history: nextHistory });
    }
    setLocalHistory(nextHistory);
  };

  const [activeBottomTab, setActiveBottomTab] = useState<"positions" | "history">("positions");

  // Save changes to active account if it exists
  const setBalance = (newOrFn: any) => {
    let newBalance = typeof newOrFn === "function" ? newOrFn(balance) : newOrFn;
    if (activeAccount) {
      updateTradingAccount(activeAccount.id, { balance: newBalance });
    }
    setLocalBalance(newBalance);
  };

  const [executionType, setExecutionType] = useState<
    "market" | "pending" | "edit"
  >("market");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<
    "S10" | "S30" | "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1"
  >("M1");
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const [pendingType, setPendingType] = useState<
    "buy limit" | "sell limit" | "buy stop" | "sell stop"
  >("buy limit");
  const [pendingPrice, setPendingPrice] = useState<string>("");
  const [sl, setSl] = useState<string>("");
  const [tp, setTp] = useState<string>("");

  // New state for interactive pending preview
  const [orderMode, setOrderMode] = useState<"market" | "pending">("market");
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [previewOrderPrice, setPreviewOrderPrice] = useState<number>(0);
  const [previewSl, setPreviewSl] = useState<number | null>(null);
  const [previewTp, setPreviewTp] = useState<number | null>(null);
  const [marketPreviewDirection, setMarketPreviewDirection] = useState<"buy" | "sell">("buy");
  
  const [closingPosition, setClosingPosition] = useState<any>(null);
  const [closeLots, setCloseLots] = useState<string>("");


  const getContractSizeForSymbol = (sym: string) => {
    const config = symbolConfigs.find((c) => c.symbol === sym);
    if (config?.contractSize) return config.contractSize;
    if (sym.includes("BTC") || sym.includes("ETH")) return 1;
    if (sym.includes("XAU") || sym.includes("GOLD")) return 100;
    if (sym.includes("XAG") || sym.includes("SILVER")) return 5000;
    if (sym.includes("US30") || sym.includes("NAS100") || sym.includes("US500")) return 1;
    return 100000;
  };

  const getDecimalsForSymbol = (sym: string) => {
    if (sym.includes("JPY")) return 3;
    if (sym.includes("BTC") || sym.includes("ETH") || sym.includes("SOL") || sym.includes("XAU") || sym.includes("GOLD")) return 2;
    return 5;
  };

  const getPipValuePerLot = (sym: string, currentP: number) => {
    // Standard forex contract size is 100,000 units. For crypto/commodities it varies.
    let contractSize = getContractSizeForSymbol(sym);

    const pipSize = getPipSize(sym);
    let pipValue = contractSize * pipSize; // Value in QUOTE currency

    const parts = sym.split("/");
    const base = parts[0];
    const quote = parts[1];
    
    // To calculate risk we need pip value in USD (Account Currency)
    if (quote && quote !== "USD") {
      if (prices[`USD/${quote}`]) {
        pipValue = pipValue / prices[`USD/${quote}`];
      } else if (prices[`${quote}/USD`]) {
        pipValue = pipValue * prices[`${quote}/USD`];
      } else if (base === "USD") {
        pipValue = pipValue / (currentP || 1);
      } else if (quote === "JPY") {
        pipValue = pipValue / (prices["USD/JPY"] || 150);
      }
    }

    return pipValue;
  };

  // Auto-calculate lots based on risk and SL
  useEffect(() => {
    if (!isRiskMode || !sl || !price) return;

    const slPrice = parseFloat(sl);
    if (isNaN(slPrice)) return;

    const pips = Math.abs(price - slPrice) / getPipSize(symbol);
    if (pips <= 0) return;

    const riskAmount = (balance * riskPercent) / 100;
    const pipValPerLot = getPipValuePerLot(symbol, price);

    let calculatedLots = riskAmount / (pips * pipValPerLot);

    // Leverage safety cap (don't allow auto-risk to calculate more than 100:1 leverage)
    let contractSize = getContractSizeForSymbol(symbol);

    const currentEquityFallback = balance + positions.reduce((acc, pos) => acc + getPositionPnL(pos), 0);
    const usedMargin = positions.reduce((acc, p) => {
      let cs = getContractSizeForSymbol(p.symbol);
      return acc + (p.open_price * p.lots * cs) / globalSettings.leverageCap;
    }, 0);
    const freeMargin = currentEquityFallback - usedMargin;

    const maxLeverage = globalSettings.leverageCap;
    
    let basePInUSD = 1;
    const gBaseCurrency = symbol.split("/")[0];
    if (gBaseCurrency !== "USD") {
       basePInUSD = prices[`${gBaseCurrency}/USD`] || (prices[`USD/${gBaseCurrency}`] ? 1 / prices[`USD/${gBaseCurrency}`] : price);
    }
    
    const maxLotsByLeverage = Math.max(0, (freeMargin * maxLeverage) / (basePInUSD * contractSize));
    calculatedLots = Math.min(calculatedLots, maxLotsByLeverage);

    // Standardize to 2 decimals, min 0.01
    setLots(Math.max(0.01, Math.round(calculatedLots * 100) / 100));
  }, [isRiskMode, riskPercent, sl, symbol, price, balance]);

  const BASE_TRADING_SYMBOLS = {
    "Forex Majors": ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD"],
    "Forex Crosses": ["EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/AUD", "EUR/CAD", "EUR/NZD", "GBP/JPY", "GBP/CHF", "GBP/AUD", "GBP/CAD", "GBP/NZD", "AUD/JPY", "AUD/CHF", "AUD/CAD", "AUD/NZD", "NZD/JPY", "NZD/CHF", "CAD/JPY", "CHF/JPY"],
    "Forex Exotics": ["USD/TRY", "EUR/TRY", "USD/ZAR", "EUR/ZAR", "USD/MXN", "EUR/MXN", "USD/SGD", "USD/HKD", "USD/SEK", "USD/NOK", "USD/DKK", "USD/PLN", "EUR/PLN", "USD/CNH", "EUR/CNH", "AUD/SGD", "GBP/SGD"],
    "Metals": ["XAU/USD", "XAG/USD"],
    "Indices": ["NAS100", "US30", "US500", "GER40", "UK100", "JPN225", "FRA40", "AUS200", "CHN50"],
    "Commodities": ["USOIL", "UKOIL"],
    "Crypto": ["BTC/USD", "ETH/USD"]
  };

  const baseSymbolsFlat = Object.values(BASE_TRADING_SYMBOLS).flat();
  const dynamicCustomSymbols = symbolConfigs
    .filter(c => c.isActive && !baseSymbolsFlat.includes(c.symbol))
    .map(c => c.symbol);

  const TRADING_SYMBOLS = {
    ...BASE_TRADING_SYMBOLS,
    ...(dynamicCustomSymbols.length > 0 ? {
      "Custom Feeds": dynamicCustomSymbols
    } : {})
  };

  const AVAILABLE_SYMBOLS = Object.values(TRADING_SYMBOLS).flat();

  const filteredSymbols = Object.entries(TRADING_SYMBOLS).reduce((acc, [category, symbols]) => {
    const matched = symbols.filter(s => s?.toLowerCase().includes(symbolSearch?.toLowerCase() || ''));
    if (matched.length > 0) acc[category] = matched;
    return acc;
  }, {} as Record<string, string[]>);

  const getPipSize = (sym: string) => {
    const config = symbolConfigs.find((c) => c.symbol === sym);
    if (config) {
      if ((sym.includes("XAU") || sym.includes("GOLD")) && config.pipSize !== 1.0) return 1.0;
      if ((sym.includes("BTC") || sym.includes("ETH")) && config.pipSize !== 1.0) return 1.0;
      return config.pipSize;
    }
    // Fallback
    if (sym.includes("JPY")) return 0.01;
    if (sym.includes("BTC") || sym.includes("ETH")) return 1.0;
    if (sym.includes("XAU") || sym.includes("GOLD")) return 1.0;
    if (sym.includes("XAG") || sym.includes("SILVER")) return 0.001;
    return 0.0001;
  };

  const [prices, setPrices] = useState<Record<string, number>>({});
  
  const lastTerminalPricesRef = useRef<Record<string, number>>({});

  // Monitor live prices to trigger price alarms
  useEffect(() => {
    let triggeredAny = false;
    const nextAlarms = [...terminalAlarms];

    Object.keys(prices).forEach((sym) => {
      const currentPrice = prices[sym];
      const previousPrice = lastTerminalPricesRef.current[sym];

      if (currentPrice === undefined || previousPrice === undefined || previousPrice === 0) {
        lastTerminalPricesRef.current[sym] = currentPrice;
        return;
      }

      if (currentPrice !== previousPrice) {
        // Find active alarms for this symbol
        nextAlarms.forEach((alarm, index) => {
          if (alarm.symbol === sym && alarm.isActive && !alarm.isTriggered) {
            const minP = Math.min(previousPrice, currentPrice);
            const maxP = Math.max(previousPrice, currentPrice);
            
            // Trigger if crossed or is extremely close (equal)
            const crossed = alarm.price >= minP && alarm.price <= maxP;
            const isNear = Math.abs(currentPrice - alarm.price) / alarm.price < 0.00015; // tight tolerance for crosses

            if (crossed || isNear) {
              triggeredAny = true;
              nextAlarms[index] = { ...alarm, isTriggered: true, isActive: false };
              
              // Add to active screen notifications stack
              setActiveTerminalAlerts((prev) => [
                ...prev,
                { id: Math.random().toString(), price: alarm.price, symbol: sym, timestamp: Date.now() }
              ]);

              // Also add to global notifications
              addNotification({
                title: `🔔 ALARM TRIGGERED: ${sym}`,
                message: `Price reached the set level of $${alarm.price.toLocaleString()}`,
                type: "info"
              });
            }
          }
        });
      }

      lastTerminalPricesRef.current[sym] = currentPrice;
    });

    if (triggeredAny) {
      setTerminalAlarms(nextAlarms);
      
      // Play sound
      if (!terminalMuted) {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const playTone = (freq: number, delay: number, duration: number, vol: number) => {
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
              gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
              gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.05);
              gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
              osc.connect(gainNode);
              gainNode.connect(ctx.destination);
              osc.start(ctx.currentTime + delay);
              osc.stop(ctx.currentTime + delay + duration);
            };
            // Beautiful chime tone chords (classic Rich bell)
            playTone(523.25, 0, 1.2, 0.35); // C5
            playTone(659.25, 0.08, 1.0, 0.3); // E5
            playTone(783.99, 0.16, 0.8, 0.25); // G5
            playTone(1046.50, 0.24, 0.6, 0.2); // C6
          }
        } catch (e) {
          console.error("Audio error:", e);
        }
      }
    }
  }, [prices, terminalAlarms, terminalMuted, addNotification]);
  
  const adjustSl = (direction: "up" | "down") => {
    const step = getPipSize(symbol);
    // Start from current price if empty
    let currentSl = parseFloat(sl);
    const marketPrice = prices[symbol] || price;
    if (isNaN(currentSl) || currentSl === 0) {
      currentSl = marketPrice;
    }

    const newSl = direction === "up" ? currentSl + step : currentSl - step;
    setSl(
      newSl.toFixed(
        symbol.includes("JPY")
          ? 3
          : symbol.includes("BTC") || symbol.includes("XAU")
            ? 2
            : 5,
      ),
    );
  };

  const adjustTp = (direction: "up" | "down") => {
    const step = getPipSize(symbol);
    // Start from current price if empty
    let currentTp = parseFloat(tp);
    const marketPrice = prices[symbol] || price;
    if (isNaN(currentTp) || currentTp === 0) {
      currentTp = marketPrice;
    }

    const newTp = direction === "up" ? currentTp + step : currentTp - step;
    setTp(
      newTp.toFixed(
        symbol.includes("JPY")
          ? 3
          : symbol.includes("BTC") || symbol.includes("XAU")
            ? 2
            : 5,
      ),
    );
  };
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  const [chartReady, setChartReady] = useState(0);

  // Calculate PnL locally in UI with professional precision
  const getPositionPnL = (pos: any) => {
    const currentPrice = prices[pos.symbol];
    if (!currentPrice) return 0; // Don't calculate if no market price yet

    const isBuy = pos.type === "buy";
    const diff = isBuy
      ? currentPrice - pos.open_price
      : pos.open_price - currentPrice;

    const contractSize = getContractSizeForSymbol(pos.symbol);

    let pnl = diff * pos.lots * contractSize;

    // Currency conversion to USD
    const quote = pos.symbol.split("/")[1];
    if (quote === "JPY") {
      // USD/JPY cross: PnL is in JPY, divide by current USD/JPY price
      const usdjpy = prices["USD/JPY"] || currentPrice;
      pnl = pnl / usdjpy;
    }

    return pnl;
  };

  const getPositionPips = (pos: any) => {
    const currentPrice = prices[pos.symbol] || pos.open_price;
    const isBuy = pos.type === "buy";
    const diff = isBuy
      ? currentPrice - pos.open_price
      : pos.open_price - currentPrice;
    return diff / getPipSize(pos.symbol);
  };

  const calculateProjectedPnL = (p: any, targetPrice: number) => {
    const entry = parseFloat(p.open_price);
    const diff = p.type === 'buy' ? targetPrice - entry : entry - targetPrice;
    const pipSize = getPipSize(p.symbol);
    const pips = diff / pipSize;
    
    // Simple PnL calculation for labels
    const contractSize = getContractSizeForSymbol(p.symbol);
    let pnl = diff * p.lots * contractSize;
    
    const quote = p.symbol.split("/")[1];
    if (quote === "JPY") {
       const usdjpy = prices["USD/JPY"] || prices[p.symbol];
       if (usdjpy) pnl = pnl / usdjpy;
    }
    
    return { pnl, pips };
  };

  const currentEquity =
    balance + positions.reduce((acc, pos) => acc + getPositionPnL(pos), 0);

  const consistencyInfo = (() => {
    if (activeAccount?.type !== 'evaluation') return null;
    const dailyProfits: { [date: string]: number } = {};
    history.forEach((t: any) => {
      const d = new Date(t.timestamp || t.close_time).toLocaleDateString();
      dailyProfits[d] = (dailyProfits[d] || 0) + (t.pnl || 0);
    });
    const maxDailyProfit = Math.max(0, ...Object.values(dailyProfits));
    const profitTarget = activeAccount.rules?.profitTarget || 1;
    const limit = profitTarget * 0.45;
    const isViolated = maxDailyProfit > limit;
    return { maxDailyProfit, limit, isViolated };
  })();

  const globalUsedMargin = positions.reduce((acc, p) => {
    let cs = getContractSizeForSymbol(p.symbol);
    return acc + (p.open_price * p.lots * cs) / globalSettings.leverageCap;
  }, 0);

  const globalFreeMargin = currentEquity - globalUsedMargin;
  
  const currentContractSize = getContractSizeForSymbol(symbol);
  const currentMarketPrice = prices[symbol] || price;
  
  let basePInUSD = 1;
  const gBaseCurrency = symbol.split("/")[0];
  if (gBaseCurrency !== "USD") {
     basePInUSD = prices[`${gBaseCurrency}/USD`] || (prices[`USD/${gBaseCurrency}`] ? 1 / prices[`USD/${gBaseCurrency}`] : currentMarketPrice);
  }
  const maxAllowedLots = currentMarketPrice ? Math.max(0, (globalFreeMargin * globalSettings.leverageCap) / (basePInUSD * currentContractSize)) : 0;

  const calculateVolume = (data: any[]) => {
    return data.map(v => ({
      time: v.time,
      value: v.volume || 0,
      color: v.close >= v.open ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)",
    }));
  };

  const calculateVWAP = (data: any[]) => {
    let cumulativeTPV = 0;
    let cumulativeTP2V = 0;
    let cumulativeVolume = 0;
    let currentSessionId = "";
    
    const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("Crypto") || symbol.toLowerCase().includes("crypt");
    const tz = isCrypto ? "UTC" : "America/New_York";
    const shiftHours = isCrypto ? 0 : 7;

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      hour12: false
    });

    const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long"
    });

    const getTzDayOfWeek = (d: Date) => {
      try {
        const dayName = weekdayFormatter.format(d);
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const idx = days.indexOf(dayName);
        return idx >= 0 ? idx : d.getDay();
      } catch (e) {
        return d.getDay();
      }
    };

    const vwapLine: any[] = [];
    const upper1Line: any[] = [];
    const lower1Line: any[] = [];
    const upper2Line: any[] = [];
    const lower2Line: any[] = [];
    const upper3Line: any[] = [];
    const lower3Line: any[] = [];

    data.forEach(v => {
      // Get the correct anchor group ID for this timestamp
      let sessionIdStr = "";
      try {
        const date = new Date(v.time * 1000);
        const parts = formatter.formatToParts(date);
        let yearVal = 1970, monthVal = 1, dayVal = 1, hourVal = 0;
        for (const p of parts) {
          if (p.type === "year") yearVal = parseInt(p.value, 10) || 1970;
          if (p.type === "month") monthVal = parseInt(p.value, 10) || 1;
          if (p.type === "day") dayVal = parseInt(p.value, 10) || 1;
          if (p.type === "hour") hourVal = parseInt(p.value, 10) || 0;
        }

        // Apply Forex session shift if applicable
        const shiftedTimeSec = v.time + shiftHours * 3600;
        const shiftedDate = new Date(shiftedTimeSec * 1000);
        const sParts = formatter.formatToParts(shiftedDate);
        let sYear = yearVal, sMonth = monthVal, sDay = dayVal;
        for (const p of sParts) {
          if (p.type === "year") sYear = parseInt(p.value, 10) || yearVal;
          if (p.type === "month") sMonth = parseInt(p.value, 10) || monthVal;
          if (p.type === "day") sDay = parseInt(p.value, 10) || dayVal;
        }

        const anchor = vwapConfig.anchor || "Session";
        if (anchor === "Week") {
          const dayOfWeek = getTzDayOfWeek(shiftedDate);
          const sundayTime = shiftedTimeSec - dayOfWeek * 24 * 3600;
          const sunDate = new Date(sundayTime * 1000);
          const sunParts = formatter.formatToParts(sunDate);
          let sunY = sYear, sunM = sMonth, sunD = sDay;
          for (const p of sunParts) {
            if (p.type === "year") sunY = parseInt(p.value, 10) || sYear;
            if (p.type === "month") sunM = parseInt(p.value, 10) || sMonth;
            if (p.type === "day") sunD = parseInt(p.value, 10) || sDay;
          }
          sessionIdStr = `W-${sunY}-${sunM}-${sunD}`;
        } else if (anchor === "Month") {
          sessionIdStr = `M-${sYear}-${sMonth}`;
        } else if (anchor === "Quarter") {
          const quarter = Math.floor((sMonth - 1) / 3) + 1;
          sessionIdStr = `Q-${sYear}-${quarter}`;
        } else if (anchor === "Year") {
          sessionIdStr = `Y-${sYear}`;
        } else {
          // Session (default)
          sessionIdStr = `D-${sYear}-${sMonth}-${sDay}`;
        }
      } catch (e) {
        sessionIdStr = "error";
      }

      if (sessionIdStr !== currentSessionId) {
          currentSessionId = sessionIdStr;
          cumulativeTPV = 0;
          cumulativeTP2V = 0;
          cumulativeVolume = 0;
      }
  
      const typicalPrice = (v.high + v.low + v.close) / 3;
      const volume = v.volume > 0 ? v.volume : 1; 
      
      cumulativeTPV += typicalPrice * volume;
      cumulativeTP2V += typicalPrice * typicalPrice * volume;
      cumulativeVolume += volume;

      const vwapVal = cumulativeTPV / cumulativeVolume;
      const variance = Math.max(0, (cumulativeTP2V / cumulativeVolume) - (vwapVal * vwapVal));
      const stdDev = Math.sqrt(variance);

      const basis = vwapConfig.calcMode === "Percentage" ? vwapVal * 0.01 : stdDev;
      
      vwapLine.push({
        time: v.time,
        value: vwapVal,
      });

      upper1Line.push({
        time: v.time,
        value: vwapVal + basis * vwapConfig.bandMult1,
      });
      lower1Line.push({
        time: v.time,
        value: vwapVal - basis * vwapConfig.bandMult1,
      });

      upper2Line.push({
        time: v.time,
        value: vwapVal + basis * vwapConfig.bandMult2,
      });
      lower2Line.push({
        time: v.time,
        value: vwapVal - basis * vwapConfig.bandMult2,
      });

      upper3Line.push({
        time: v.time,
        value: vwapVal + basis * vwapConfig.bandMult3,
      });
      lower3Line.push({
        time: v.time,
        value: vwapVal - basis * vwapConfig.bandMult3,
      });
    });

    return { vwapLine, upper1Line, lower1Line, upper2Line, lower2Line, upper3Line, lower3Line };
  };

  const handleLotsUpdate = (val: number) => {
    let constrained = Math.max(0.01, val);
    setLots(constrained);
  };

  const priceLinesRef = useRef<any[]>([]);

  // Sync Price Lines with Chart
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current) return;
    const series = candlestickSeriesRef.current;

    // Clear old price lines
    priceLinesRef.current.forEach((pl) => {
      try {
        series.removePriceLine(pl);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    const newLines: any[] = [];

    // Draw lines for current symbol positions
    positions
      .filter((p) => p.symbol === symbol)
      .forEach((p) => {
        newLines.push(
          series.createPriceLine({
            price: parseFloat(p.open_price),
            color: p.type === "buy" ? "#22c55e" : "#ef4444",
            lineStyle: 0,
            lineWidth: 2,
            title: `${p.type.toUpperCase()} ${p.lots}`,
            axisLabelVisible: true,
          }),
        );

        if (p.sl) {
          const currentSl = (dragState && dragState.id === p.id && dragState.type === "sl" && draggedPriceRef.current !== null) 
              ? draggedPriceRef.current 
              : parseFloat(p.sl);
          const isActive = p.sl_active !== false;
          newLines.push(
            series.createPriceLine({
              price: currentSl,
              color: isActive ? "#ef4444" : "#f87171",
              lineStyle: isActive ? 1 : 2,
              lineWidth: isActive ? 2 : 1,
              title: isActive ? "SL" : "SL (Inactive - drag to activate)",
              axisLabelVisible: true,
            }),
          );
        }

        if (p.tp) {
          const currentTp = (dragState && dragState.id === p.id && dragState.type === "tp" && draggedPriceRef.current !== null) 
              ? draggedPriceRef.current 
              : parseFloat(p.tp);
          const isActive = p.tp_active !== false;
          newLines.push(
            series.createPriceLine({
              price: currentTp,
              color: isActive ? "#22c55e" : "#4ade80",
              lineStyle: isActive ? 1 : 2,
              lineWidth: isActive ? 2 : 1,
              title: isActive ? "TP" : "TP (Inactive - drag to activate)",
              axisLabelVisible: true,
            }),
          );
        }
      });

    // Draw lines for pending orders
    pendingOrders
      .filter((p) => p.symbol === symbol)
      .forEach((p) => {
        const currentTarget = (dragState && dragState.id === p.id && dragState.isPending && draggedPriceRef.current !== null) 
            ? draggedPriceRef.current 
            : parseFloat(p.target_price);
        newLines.push(
          series.createPriceLine({
            price: currentTarget,
            color: "#3b82f6",
            lineStyle: 2,
            lineWidth: 1,
            title: `PENDING ${p.type}`,
            axisLabelVisible: true,
          }),
        );
      });

    // Draw lines for SL/TP preview when editing
    if (!isPreviewActive && sl && !isNaN(parseFloat(sl))) {
      newLines.push(
        series.createPriceLine({
          price: parseFloat(sl),
          color: "#f87171",
          lineStyle: 3,
          lineWidth: 2,
          title: "New SL",
          axisLabelVisible: true,
        }),
      );
    }
    if (!isPreviewActive && tp && !isNaN(parseFloat(tp))) {
      newLines.push(
        series.createPriceLine({
          price: parseFloat(tp),
          color: "#4ade80",
          lineStyle: 3,
          lineWidth: 2,
          title: "New TP",
          axisLabelVisible: true,
        }),
      );
    }

    // Interactive Pending Preview
    if (isPreviewActive) {
      if (orderMode === "pending") {
        newLines.push(
          series.createPriceLine({
            price: previewOrderPrice,
            color: pendingType.includes("buy") ? "#22c55e" : "#ef4444",
            lineStyle: 0,
            lineWidth: 2,
            title: `NEW ORDER (${pendingType.toUpperCase()})`,
            axisLabelVisible: true,
          })
        );
      } else {
        newLines.push(
          series.createPriceLine({
            price: previewOrderPrice,
            color: marketPreviewDirection === "buy" ? "#22c55e" : "#ef4444",
            lineStyle: 0,
            lineWidth: 2,
            title: `MARKET ${marketPreviewDirection.toUpperCase()} ENTRY`,
            axisLabelVisible: true,
          })
        );
      }
      if (previewSl !== null) {
        newLines.push(
          series.createPriceLine({
            price: previewSl,
            color: "#ef4444",
            lineStyle: 2,
            lineWidth: 1,
            title: "PREVIEW SL",
            axisLabelVisible: true,
          })
        );
      }
      if (previewTp !== null) {
        newLines.push(
          series.createPriceLine({
            price: previewTp,
            color: "#22c55e",
            lineStyle: 2,
            lineWidth: 1,
            title: "PREVIEW TP",
            axisLabelVisible: true,
          })
        );
      }
    }

    // Draw lines for active price alarms
    terminalAlarms
      .filter((alarm) => alarm.symbol === symbol && alarm.isActive && !alarm.isTriggered)
      .forEach((alarm) => {
        const isDraggingThis = dragState && dragState.type === "alarm" && dragState.id === alarm.id && draggedPriceRef.current !== null;
        const displayPrice = isDraggingThis ? draggedPriceRef.current : alarm.price;
        newLines.push(
          series.createPriceLine({
            price: displayPrice,
            color: "rgba(245, 158, 11, 0.45)",
            lineStyle: 1,
            lineWidth: 2,
            title: "🔔",
            axisLabelVisible: true,
          })
        );
      });

    priceLinesRef.current = newLines;
  }, [positions, pendingOrders, symbol, timeframe, sl, tp, chartReady, forceRender, dragState, isPreviewActive, previewOrderPrice, previewSl, previewTp, pendingType, terminalAlarms]);

  // Sync Bid and Ask Spread Lines with current live price
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series || !price) return;

    const config = symbolConfigs.find((c) => c.symbol === symbol);
    const currentSpread = config?.spread || 0;
    const pipSize = getPipSize(symbol);
    const spreadPoints = currentSpread * pipSize;

    const askPrice = price + spreadPoints;
    const bidPrice = price - spreadPoints;

    // We clean up existing lines before drawing new ones to make sure we never accumulate multiple lines
    if (askPriceLineRef.current) {
      try {
        series.removePriceLine(askPriceLineRef.current);
      } catch (e) {}
      askPriceLineRef.current = null;
    }

    if (bidPriceLineRef.current) {
      try {
        series.removePriceLine(bidPriceLineRef.current);
      } catch (e) {}
      bidPriceLineRef.current = null;
    }

    try {
      askPriceLineRef.current = series.createPriceLine({
        price: askPrice,
        color: "rgba(239, 68, 68, 0.45)", // transparent red
        lineStyle: 1, // Dotted
        lineWidth: 1,
        title: hideBidAskLabels ? "" : `ASK (+${currentSpread} Pips)`,
        axisLabelVisible: !hideBidAskLabels,
      });
    } catch (err) {
      console.error("Failed to create Ask spread line:", err);
    }

    try {
      bidPriceLineRef.current = series.createPriceLine({
        price: bidPrice,
        color: "rgba(34, 197, 94, 0.45)", // transparent green
        lineStyle: 1, // Dotted
        lineWidth: 1,
        title: hideBidAskLabels ? "" : `BID (-${currentSpread} Pips)`,
        axisLabelVisible: !hideBidAskLabels,
      });
    } catch (err) {
      console.error("Failed to create Bid spread line:", err);
    }

    return () => {
      if (askPriceLineRef.current) {
        try {
          series.removePriceLine(askPriceLineRef.current);
        } catch (e) {}
        askPriceLineRef.current = null;
      }
      if (bidPriceLineRef.current) {
        try {
          series.removePriceLine(bidPriceLineRef.current);
        } catch (e) {}
        bidPriceLineRef.current = null;
      }
    };
  }, [price, symbol, symbolConfigs, chartReady, hideBidAskLabels]);

  // Sync pendingType and marketPreviewDirection based on positions of previewOrderPrice, SL, TP, and market price
  useEffect(() => {
    if (!isPreviewActive) return;
    const marketPrice = prices[symbol];
    if (!marketPrice) return;

    if (orderMode === "pending") {
      // Determine direction: buy vs sell
      let direction: "buy" | "sell" = pendingType.includes("buy") ? "buy" : "sell";
      if (previewTp !== null && previewSl !== null) {
        if (previewTp > previewOrderPrice && previewSl < previewOrderPrice) {
          direction = "buy";
        } else if (previewTp < previewOrderPrice && previewSl > previewOrderPrice) {
          direction = "sell";
        }
      }

      // Determine stop vs limit based on order price relative to market price
      let nextPendingType = pendingType;
      if (direction === "buy") {
        if (previewOrderPrice > marketPrice) {
          nextPendingType = "buy stop";
        } else {
          nextPendingType = "buy limit";
        }
      } else {
        if (previewOrderPrice > marketPrice) {
          nextPendingType = "sell limit";
        } else {
          nextPendingType = "sell stop";
        }
      }

      if (nextPendingType !== pendingType) {
        setPendingType(nextPendingType);
      }
    } else if (orderMode === "market") {
      if (previewTp !== null && previewSl !== null) {
        let nextDirection = marketPreviewDirection;
        if (previewTp > previewOrderPrice && previewSl < previewOrderPrice) {
          nextDirection = "buy";
        } else if (previewTp < previewOrderPrice && previewSl > previewOrderPrice) {
          nextDirection = "sell";
        }
        if (nextDirection !== marketPreviewDirection) {
          setMarketPreviewDirection(nextDirection);
        }
      }
    }
  }, [previewOrderPrice, previewSl, previewTp, prices, symbol, isPreviewActive, pendingType, orderMode, marketPreviewDirection]);

  // Synchronize manual text input sl/tp changes back to the visual preview lines
  useEffect(() => {
    if (orderMode === "market") {
      const currentSlNum = parseFloat(sl);
      if (!isNaN(currentSlNum) && currentSlNum !== 0) {
        setPreviewSl(currentSlNum);
      } else {
        setPreviewSl(null);
      }
    }
  }, [sl, orderMode]);

  useEffect(() => {
    if (orderMode === "market") {
      const currentTpNum = parseFloat(tp);
      if (!isNaN(currentTpNum) && currentTpNum !== 0) {
        setPreviewTp(currentTpNum);
      } else {
        setPreviewTp(null);
      }
    }
  }, [tp, orderMode]);

  // Keep previewOrderPrice in sync with current live price when in market preview mode
  useEffect(() => {
    if (orderMode === "market" && isPreviewActive) {
      const marketPrice = prices[symbol] || price;
      if (marketPrice) {
        setPreviewOrderPrice(marketPrice);
      }
    }
  }, [prices, symbol, price, orderMode, isPreviewActive]);

  // Auto-activate or de-activate preview lines when panel is shown/hidden or mode changes
  useEffect(() => {
    if (showQuickTrade) {
      if (orderMode === "market") {
        activateMarketPreview();
      } else if (orderMode === "pending") {
        activatePendingPreview();
      }
    } else {
      setIsPreviewActive(false);
      setPreviewSl(null);
      setPreviewTp(null);
      setSl("");
      setTp("");
    }
  }, [showQuickTrade, orderMode]);

  // Re-activate preview when market direction or symbol changes
  useEffect(() => {
    if (isPreviewActive) {
      if (orderMode === "market") {
        activateMarketPreview(marketPreviewDirection);
      } else if (orderMode === "pending") {
        activatePendingPreview();
      }
    }
  }, [symbol, marketPreviewDirection]);

  // Countdown Timer Update Logic
  useEffect(() => {
    let animationFrameId: number;

    const updateTimer = () => {
      const timerEl = countdownTimerRef.current;
      if (!timerEl) return;

      const tfMap: Record<string, number> = {
        S10: 10, S30: 30, M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400, W1: 604800,
      };
      const tfSeconds = tfMap[timeframe] || 60;
      
      const nowSec = Math.floor(Date.now() / 1000);
      const remainder = nowSec % tfSeconds;
      const timeRemaining = tfSeconds - remainder;

      let formatted = "";
      if (timeRemaining < 60) {
        formatted = `00:${timeRemaining.toString().padStart(2, '0')}`;
      } else if (timeRemaining < 3600) {
        const m = Math.floor(timeRemaining / 60);
        const s = timeRemaining % 60;
        formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      } else {
        const h = Math.floor(timeRemaining / 3600);
        const m = Math.floor((timeRemaining % 3600) / 60);
        const s = timeRemaining % 60;
        formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }

      timerEl.innerText = formatted;

      // Position logic
      if (candlestickSeriesRef.current && pricesRef.current) {
        const currentPrice = pricesRef.current[symbol];
        if (currentPrice !== undefined && currentPrice !== null) {
          try {
            const y = candlestickSeriesRef.current.priceToCoordinate(currentPrice);
            if (y !== null) {
              timerEl.style.top = `${Math.max(0, y + 15)}px`; // Position right below the price axis label
              timerEl.style.display = 'block';
            } else {
              timerEl.style.display = 'none';
            }
          } catch(e) {
            timerEl.style.display = 'none';
          }
        } else {
          timerEl.style.display = 'none';
        }
      }

      animationFrameId = requestAnimationFrame(updateTimer);
    };

    animationFrameId = requestAnimationFrame(updateTimer);

    return () => cancelAnimationFrame(animationFrameId);
  }, [timeframe, symbol]);

  // Breach Check Simulator
  useEffect(() => {
     if (!activeAccount || activeAccount.status !== 'active') return;

     const getDeducedInitialBalance = () => {
       let ib = activeAccount.initialBalance || 0;
       if (ib > 0) return ib;
       const currentBal = activeAccount.balance || 10000;
       if (activeAccount.rules?.maxDrawdown && activeAccount.rules.maxDrawdown > 100) {
         return activeAccount.rules.maxDrawdown * 10;
       } else if (activeAccount.rules?.dailyDrawdown && activeAccount.rules.dailyDrawdown > 100) {
         return activeAccount.rules.dailyDrawdown * 20;
       } else {
         const standards = [5000, 10000, 25000, 50000, 100000, 200000];
         let bestAlloc = 10000;
         let minDiff = Infinity;
         standards.forEach(s => {
           const diff = Math.abs(s - currentBal);
           if (diff < minDiff) {
             minDiff = diff;
             bestAlloc = s;
           }
         });
         return bestAlloc;
       }
     };

     const initBalance = getDeducedInitialBalance();
     const currentEq = balance + positions.reduce((acc, pos) => acc + getPositionPnL(pos), 0);
     
     let shouldBreach = false;
     let breachReason = '';

     const getRuleThresholdValue = (val: any, refBalance: number) => {
       const num = parseFloat(val);
       if (isNaN(num) || num <= 0) return 0;
       return num <= 100 ? (refBalance * num) / 100 : num;
     };

     // Standard Evaluation/Competition Drawdown Rules
     if (activeAccount.type) {
        if (!shouldBreach && activeAccount.rules?.dailyDrawdown) {
           const dailyDrawdownLimit = getRuleThresholdValue(activeAccount.rules.dailyDrawdown, initBalance);
           const maxDailyLoss = initBalance - dailyDrawdownLimit;
           if (currentEq <= maxDailyLoss) {
              shouldBreach = true;
              breachReason = `Daily Drawdown Limit Reached ($${dailyDrawdownLimit.toLocaleString()})`;
           }
        }
       if (activeAccount.rules?.maxDrawdown) {
          const maxDrawdownLimit = getRuleThresholdValue(activeAccount.rules.maxDrawdown, initBalance);
          const maxEquityLoss = initBalance - maxDrawdownLimit;
          if (currentEq <= maxEquityLoss) {
             shouldBreach = true;
             breachReason = `Max Total Drawdown Limit Reached ($${maxDrawdownLimit.toLocaleString()})`;
          }
       }
     }

     // Weekend Holding Rule for Funded Accounts (Excluding Crypto which has its own weekend override)
     if (activeAccount.type === 'funded' && isWeekend()) {
        const hasNonCryptoWeekend = positions.some(p => !TRADING_SYMBOLS["Crypto"].includes(p.symbol));
        if (hasNonCryptoWeekend) {
           shouldBreach = true;
           breachReason = 'Weekend Holding Prohibited on Funded Accounts';
        }
     }

     // Crypto Overnight Rule in Weekend (Applies to all accounts including funded)
     const cryptoWeekendOvernight = positions.find(p => 
        TRADING_SYMBOLS["Crypto"].includes(p.symbol) && 
        isWeekend() && 
        isOvernight(p.open_time)
     );

     if (cryptoWeekendOvernight) {
        shouldBreach = true;
        breachReason = 'Crypto Overnight Holding Prohibited during Weekend';
     }

     // No Gambling Rule: Concurrent BUY and SELL on the same pair is prohibited (Hedging)
     if (!shouldBreach) {
        const symbolPositions: { [sym: string]: string[] } = {};
        positions.forEach(p => {
           if (!symbolPositions[p.symbol]) {
              symbolPositions[p.symbol] = [];
           }
           if (!symbolPositions[p.symbol].includes(p.type)) {
              symbolPositions[p.symbol].push(p.type);
           }
        });

        for (const sym in symbolPositions) {
           if (symbolPositions[sym].includes("buy") && symbolPositions[sym].includes("sell")) {
              shouldBreach = true;
              breachReason = `No Gambling Rule Violated (Opposite BUY and SELL positions on same pair ${sym})`;
              break;
           }
        }
     }
     
     if (shouldBreach) {
        alert(`⚠️ Account Breached: ${breachReason}. All open positions will be closed.`);
        
        const historyToPush = positions.map(p => ({
            ...p,
            close_time: Date.now(),
            close_price: prices[p.symbol] || p.open_price,
            pnl: getPositionPnL(p),
            reason: 'Breach Closure'
        }));

        setPositions([]);
        setBalance(currentEq);
        setHistory(prev => [...historyToPush, ...prev]);

        updateTradingAccount(activeAccount.id, {
          status: 'failed', 
          balance: currentEq,
          openTrades: [],
        });
        return;
     }

     // Profit Target Passing Rule for Evaluation/Phase Accounts
     if (activeAccount.type && activeAccount.type.startsWith('evaluation')) {
        const profitTarget = activeAccount.rules?.profitTarget || 0;
        const currentProfit = currentEq - initBalance;
        if (profitTarget > 0 && currentProfit >= profitTarget) {
            // Determine consistency & trading days before evaluating pass
            const dailyProfitsCount: { [date: string]: number } = {};
            history.forEach((t: any) => {
              const d = getTradeDateString(t);
              if (d && d !== "Invalid Date") {
                dailyProfitsCount[d] = (dailyProfitsCount[d] || 0) + getTradePnl(t);
              }
            });
            const maxDailyProfitVal = Math.max(0, ...Object.values(dailyProfitsCount));
            const consistencyLimitVal = profitTarget * 0.45;
            const isConsistentVal = maxDailyProfitVal <= consistencyLimitVal;
            const tradingDaysCountVal = new Set(history.map(t => getTradeDateString(t)).filter(d => d !== "Invalid Date")).size;

            if (!isConsistentVal || tradingDaysCountVal < 3) {
               // Do not pass yet: Outliers exceed 45% limit or less than 3 trading days
               return;
            }
           const targetPercentage = ((profitTarget / initBalance) * 100).toFixed(0);
           
           alert(`🎉 Congratulations! You reached the profit target of $${profitTarget.toLocaleString()} (${targetPercentage}%) to pass the phase. Your account has been stopped and sent for review.`);
           
           const historyToPush = positions.map(p => ({
               ...p,
               close_time: Date.now(),
               close_price: prices[p.symbol] || p.open_price,
               pnl: getPositionPnL(p),
               reason: 'Phase Passed'
           }));

           setPositions([]);
           setBalance(currentEq);
           setHistory(prev => [...historyToPush, ...prev]);

           updateTradingAccount(activeAccount.id, {
             status: 'pending', 
             balance: currentEq,
             openTrades: [],
           });

           addNotification({
             title: "Evaluation Phase Passed! 🎉",
             message: `Congratulations! You reached the profit target of $${profitTarget.toLocaleString()} on account #${activeAccount.accountNumber}. The account was stopped and sent for review!`,
             type: 'success',
             link: '/profile'
           });
        }
     }
  }, [prices, activeAccount, balance, positions, addNotification]);

  // SL / TP / Pending Simulator
  useEffect(() => {
    let toCloseIds: string[] = [];
    let historyToPush: any[] = [];
    let newBalanceAccum = 0;
    let addedPenaltyAccum = 0;

    positions.forEach((pos) => {
      const currentPrice = prices[pos.symbol];
      if (!currentPrice) return;
      let closeIt = false;
      let closedPrice = currentPrice;
      let reason = "";
      const parsedSl = (pos.sl && pos.sl_active !== false) ? parseFloat(pos.sl) : null;
      const parsedTp = (pos.tp && pos.tp_active !== false) ? parseFloat(pos.tp) : null;
      
      if (pos.type === "buy") {
        if (parsedSl && currentPrice <= parsedSl) { closeIt = true; closedPrice = parsedSl; reason = "SL"; }
        else if (parsedTp && currentPrice >= parsedTp) { closeIt = true; closedPrice = parsedTp; reason = "TP"; }
      } else {
        if (parsedSl && currentPrice >= parsedSl) { closeIt = true; closedPrice = parsedSl; reason = "SL"; }
        else if (parsedTp && currentPrice <= parsedTp) { closeIt = true; closedPrice = parsedTp; reason = "TP"; }
      }
      
      if (closeIt) {
        toCloseIds.push(pos.id);
        
        // Calculate PnL exactly at the closing price
        const isBuy = pos.type === "buy";
        const diff = isBuy
          ? closedPrice - pos.open_price
          : pos.open_price - closedPrice;

        const contractSize = getContractSizeForSymbol(pos.symbol);

        let pnl = diff * pos.lots * contractSize;

        const quote = pos.symbol.split("/")[1] || "USD";
        if (quote === "JPY") {
          pnl = pnl / closedPrice;
        }
        
        newBalanceAccum += pnl;

        if (pos.isNewsTrade && reason === "TP" && pnl > 0 && activeAccount?.rules?.newsTrading === false && activeAccount?.type !== 'funded') {
          addedPenaltyAccum += pnl;
        }

        historyToPush.push({
          ...pos,
          close_price: closedPrice,
          close_time: Date.now(),
          pnl,
          reason,
        });
      }
    });

    if (toCloseIds.length > 0) {
      setBalance((b: number) => b + newBalanceAccum);
      setPositions((prev: any[]) =>
        prev.filter((p) => !toCloseIds.includes(p.id)),
      );
      setHistory((prev: any[]) => [...historyToPush, ...prev]);

      if (addedPenaltyAccum > 0 && activeAccount?.type !== 'funded') {
         updateTradingAccount(activeAccount.id, {
            rules: {
               ...activeAccount.rules,
               maxDrawdown: activeAccount.rules?.maxDrawdown || 5000,
               dailyDrawdown: activeAccount.rules?.dailyDrawdown || 2500,
               profitTarget: activeAccount.rules?.profitTarget || 5000,
               targetPenalty: (activeAccount.rules?.targetPenalty || 0) + addedPenaltyAccum
            }
         });
      }
    }

    let toTrigger: any[] = [];
    pendingOrders.forEach((po) => {
      const currentPrice = prices[po.symbol];
      if (!currentPrice || currentPrice <= 0) return;
      let trigger = false;
      let actualTriggerType = "buy";
      if (po.type === "buy limit" && currentPrice <= po.target_price) {
        trigger = true;
        actualTriggerType = "buy";
      }
      if (po.type === "buy stop" && currentPrice >= po.target_price) {
        trigger = true;
        actualTriggerType = "buy";
      }
      if (po.type === "sell limit" && currentPrice >= po.target_price) {
        trigger = true;
        actualTriggerType = "sell";
      }
      if (po.type === "sell stop" && currentPrice <= po.target_price) {
        trigger = true;
        actualTriggerType = "sell";
      }

      if (trigger) {
        toTrigger.push({ ...po, actualTriggerType });
      }
    });

    if (toTrigger.length > 0) {
      executeOrders(toTrigger);
    }
  }, [prices, timeframe, positions, pendingOrders]);

  // Update customizations dynamically
  useEffect(() => {
    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.applyOptions({
        upColor: candlestickConfig.upColor,
        downColor: candlestickConfig.downColor,
        wickUpColor: candlestickConfig.wickUpColor,
        wickDownColor: candlestickConfig.wickDownColor,
      });
    }
  }, [candlestickConfig]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        crosshair: {
          mode: isCrosshairActive ? 0 : 2, // 0 = Normal, 2 = Hidden
          vertLine: {
            visible: isCrosshairActive,
            labelVisible: isCrosshairActive,
          },
          horzLine: {
            visible: isCrosshairActive,
            labelVisible: isCrosshairActive,
          },
        },
      });
    }
  }, [isCrosshairActive]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    if (indicators.includes("VWAP")) {
      const vwapData = calculateVWAP(historicalDataRef.current.length > 0 ? historicalDataRef.current : []);

      // 1. Central VWAP Line
      if (vwapConfig.showVwap) {
        if (!vwapSeriesRef.current) {
          vwapSeriesRef.current = chart.addSeries(LineSeries, {
            color: vwapConfig.vwapColor,
            lineWidth: vwapConfig.vwapWidth,
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
        } else {
          vwapSeriesRef.current.applyOptions({
            color: vwapConfig.vwapColor,
            lineWidth: vwapConfig.vwapWidth,
          });
        }
        vwapSeriesRef.current.setData(vwapData.vwapLine);
      } else {
        if (vwapSeriesRef.current) {
          chart.removeSeries(vwapSeriesRef.current);
          vwapSeriesRef.current = null;
        }
      }

      // 2. Band 1
      if (vwapConfig.showBand1) {
        if (!vwapUpper1SeriesRef.current) {
          vwapUpper1SeriesRef.current = chart.addSeries(LineSeries, {
            color: vwapConfig.upperColor1,
            lineWidth: vwapConfig.bandWidth1,
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
        } else {
          vwapUpper1SeriesRef.current.applyOptions({
            color: vwapConfig.upperColor1,
            lineWidth: vwapConfig.bandWidth1,
          });
        }
        vwapUpper1SeriesRef.current.setData(vwapData.upper1Line);

        if (!vwapLower1SeriesRef.current) {
          vwapLower1SeriesRef.current = chart.addSeries(LineSeries, {
            color: vwapConfig.lowerColor1,
            lineWidth: vwapConfig.bandWidth1,
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
        } else {
          vwapLower1SeriesRef.current.applyOptions({
            color: vwapConfig.lowerColor1,
            lineWidth: vwapConfig.bandWidth1,
          });
        }
        vwapLower1SeriesRef.current.setData(vwapData.lower1Line);
      } else {
        if (vwapUpper1SeriesRef.current) {
          chart.removeSeries(vwapUpper1SeriesRef.current);
          vwapUpper1SeriesRef.current = null;
        }
        if (vwapLower1SeriesRef.current) {
          chart.removeSeries(vwapLower1SeriesRef.current);
          vwapLower1SeriesRef.current = null;
        }
      }

      // 3. Band 2
      if (vwapConfig.showBand2) {
        if (!vwapUpper2SeriesRef.current) {
          vwapUpper2SeriesRef.current = chart.addSeries(LineSeries, {
            color: vwapConfig.upperColor2,
            lineWidth: vwapConfig.bandWidth2,
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
        } else {
          vwapUpper2SeriesRef.current.applyOptions({
            color: vwapConfig.upperColor2,
            lineWidth: vwapConfig.bandWidth2,
          });
        }
        vwapUpper2SeriesRef.current.setData(vwapData.upper2Line);

        if (!vwapLower2SeriesRef.current) {
          vwapLower2SeriesRef.current = chart.addSeries(LineSeries, {
            color: vwapConfig.lowerColor2,
            lineWidth: vwapConfig.bandWidth2,
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
        } else {
          vwapLower2SeriesRef.current.applyOptions({
            color: vwapConfig.lowerColor2,
            lineWidth: vwapConfig.bandWidth2,
          });
        }
        vwapLower2SeriesRef.current.setData(vwapData.lower2Line);
      } else {
        if (vwapUpper2SeriesRef.current) {
          chart.removeSeries(vwapUpper2SeriesRef.current);
          vwapUpper2SeriesRef.current = null;
        }
        if (vwapLower2SeriesRef.current) {
          chart.removeSeries(vwapLower2SeriesRef.current);
          vwapLower2SeriesRef.current = null;
        }
      }

      // 4. Band 3
      if (vwapConfig.showBand3) {
        if (!vwapUpper3SeriesRef.current) {
          vwapUpper3SeriesRef.current = chart.addSeries(LineSeries, {
            color: vwapConfig.upperColor3,
            lineWidth: vwapConfig.bandWidth3,
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
        } else {
          vwapUpper3SeriesRef.current.applyOptions({
            color: vwapConfig.upperColor3,
            lineWidth: vwapConfig.bandWidth3,
          });
        }
        vwapUpper3SeriesRef.current.setData(vwapData.upper3Line);

        if (!vwapLower3SeriesRef.current) {
          vwapLower3SeriesRef.current = chart.addSeries(LineSeries, {
            color: vwapConfig.lowerColor3,
            lineWidth: vwapConfig.bandWidth3,
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
          });
        } else {
          vwapLower3SeriesRef.current.applyOptions({
            color: vwapConfig.lowerColor3,
            lineWidth: vwapConfig.bandWidth3,
          });
        }
        vwapLower3SeriesRef.current.setData(vwapData.lower3Line);
      } else {
        if (vwapUpper3SeriesRef.current) {
          chart.removeSeries(vwapUpper3SeriesRef.current);
          vwapUpper3SeriesRef.current = null;
        }
        if (vwapLower3SeriesRef.current) {
          chart.removeSeries(vwapLower3SeriesRef.current);
          vwapLower3SeriesRef.current = null;
        }
      }
    } else {
      // Remove all if VWAP not enabled
      if (vwapSeriesRef.current) {
        chart.removeSeries(vwapSeriesRef.current);
        vwapSeriesRef.current = null;
      }
      if (vwapUpper1SeriesRef.current) {
        chart.removeSeries(vwapUpper1SeriesRef.current);
        vwapUpper1SeriesRef.current = null;
      }
      if (vwapLower1SeriesRef.current) {
        chart.removeSeries(vwapLower1SeriesRef.current);
        vwapLower1SeriesRef.current = null;
      }
      if (vwapUpper2SeriesRef.current) {
        chart.removeSeries(vwapUpper2SeriesRef.current);
        vwapUpper2SeriesRef.current = null;
      }
      if (vwapLower2SeriesRef.current) {
        chart.removeSeries(vwapLower2SeriesRef.current);
        vwapLower2SeriesRef.current = null;
      }
      if (vwapUpper3SeriesRef.current) {
        chart.removeSeries(vwapUpper3SeriesRef.current);
        vwapUpper3SeriesRef.current = null;
      }
      if (vwapLower3SeriesRef.current) {
        chart.removeSeries(vwapLower3SeriesRef.current);
        vwapLower3SeriesRef.current = null;
      }
    }

    if (indicators.includes("Volume")) {
      if (!volumeSeriesRef.current) {
        volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
          color: "#26a69a",
          priceFormat: {
            type: "volume",
          },
          priceScaleId: "volume",
        });
        
        chart.priceScale("volume").applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });

        if (historicalDataRef.current.length > 0) {
          const volumeData = calculateVolume(historicalDataRef.current);
          volumeSeriesRef.current.setData(volumeData);
        }
      }
    } else {
      if (volumeSeriesRef.current) {
        chart.removeSeries(volumeSeriesRef.current);
        volumeSeriesRef.current = null;
      }
    }
  }, [indicators, vwapConfig, chartReady]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !globalSettings.newsEvents) return;
    try {
      const markers: any[] = [];
      for (const ev of globalSettings.newsEvents) {
        if (!symbol.includes(ev.currency) && ev.currency !== "ALL") continue;
        const timestamp = Math.floor(new Date(ev.timestamp).getTime() / 1000);
        markers.push({
          time: timestamp,
          position: "belowBar",
          color: "#ef4444",
          shape: "arrowUp",
          text: `📰 ${ev.title}`,
          size: 2,
        });
      }
      markers.sort((a, b) => a.time - b.time);
      (candlestickSeriesRef.current as any).setMarkers(markers);
    } catch (e) {
      console.warn("Failed to set news markers:", e);
    }
  }, [globalSettings.newsEvents, symbol, chartReady]);

  useEffect(() => {
    let isCancelled = false;
    if (!chartContainerRef.current) return;
    // Remove any previous chart
    chartContainerRef.current.innerHTML = "";

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      layout: {
        background: { color: "#020617" }, // slate-950
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframe === "S10" || timeframe === "S30",
        rightOffset: 20, // Add space to the right
        shiftVisibleRangeOnNewBar: true,
        tickMarkFormatter: (time: number, tickMarkType: any, locale: string) => {
          const date = new Date((time + timezoneOffset * 3600) * 1000);
          if (tickMarkType === 0) { // Year
            return String(date.getUTCFullYear());
          } else if (tickMarkType === 1) { // Month
            return date.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
          } else if (tickMarkType === 2) { // Day of month
            return String(date.getUTCDate());
          }
          // Time
          return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: timeframe === "S10" || timeframe === "S30" ? "2-digit" : undefined,
            timeZone: "UTC",
          });
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: isCrosshairActive ? 0 : 2,
        vertLine: {
          color: "rgba(255, 255, 255, 0.5)",
          width: 1,
          style: 1,
          labelBackgroundColor: "#3b82f6",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.5)",
          width: 1,
          style: 1,
          labelBackgroundColor: "#3b82f6",
        },
      },
    });

    // Handle crosshair move for full price display
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setHoveredPrice(null);
        setHoveredTime(null);
        hoveredVwapValuesRef.current = {
          vwap: null,
          upper1: null, lower1: null,
          upper2: null, lower2: null,
          upper3: null, lower3: null,
        };
        return;
      }

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price) setHoveredPrice(price);

      // Track active VWAP values for precise click and hover handling
      let vwapVal: number | null = null;
      let u1Val: number | null = null, l1Val: number | null = null;
      let u2Val: number | null = null, l2Val: number | null = null;
      let u3Val: number | null = null, l3Val: number | null = null;

      if (vwapSeriesRef.current) {
        const data = param.seriesData.get(vwapSeriesRef.current) as any;
        if (data && data.value !== undefined) vwapVal = data.value;
      }
      if (vwapUpper1SeriesRef.current) {
        const data = param.seriesData.get(vwapUpper1SeriesRef.current) as any;
        if (data && data.value !== undefined) u1Val = data.value;
      }
      if (vwapLower1SeriesRef.current) {
        const data = param.seriesData.get(vwapLower1SeriesRef.current) as any;
        if (data && data.value !== undefined) l1Val = data.value;
      }
      if (vwapUpper2SeriesRef.current) {
        const data = param.seriesData.get(vwapUpper2SeriesRef.current) as any;
        if (data && data.value !== undefined) u2Val = data.value;
      }
      if (vwapLower2SeriesRef.current) {
        const data = param.seriesData.get(vwapLower2SeriesRef.current) as any;
        if (data && data.value !== undefined) l2Val = data.value;
      }
      if (vwapUpper3SeriesRef.current) {
        const data = param.seriesData.get(vwapUpper3SeriesRef.current) as any;
        if (data && data.value !== undefined) u3Val = data.value;
      }
      if (vwapLower3SeriesRef.current) {
        const data = param.seriesData.get(vwapLower3SeriesRef.current) as any;
        if (data && data.value !== undefined) l3Val = data.value;
      }
      hoveredVwapValuesRef.current = {
        vwap: vwapVal,
        upper1: u1Val, lower1: l1Val,
        upper2: u2Val, lower2: l2Val,
        upper3: u3Val, lower3: l3Val,
      };

      const time = param.time;
      if (time) {
        const date = new Date(
          ((time as number) + timezoneOffset * 3600) * 1000,
        );
        const tStr = date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second:
            timeframe === "M1" || timeframe === "S30" || timeframe === "S10" ? "2-digit" : undefined,
          timeZone: "UTC",
        });
        const dStr = date.toLocaleDateString([], {
          day: "2-digit",
          month: "short",
          year: "2-digit",
          timeZone: "UTC",
        });
        setHoveredTime(`${dStr} ${tStr}`);
      }
    });

    chart.applyOptions({
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date((time + timezoneOffset * 3600) * 1000);
          const tStr = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second:
              timeframe === "M1" || timeframe === "S30" || timeframe === "S10" ? "2-digit" : undefined,
            timeZone: "UTC",
          });
          const dStr = date.toLocaleDateString([], {
            day: "2-digit",
            month: "short",
            year: "2-digit",
            timeZone: "UTC",
          });
          return `${dStr} ${tStr}`;
        },
      },
    });

    const precision = symbol.includes("JPY")
      ? 3
      : symbol.includes("BTC") || symbol.includes("XAU")
        ? 2
        : 5;
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: candlestickConfig.upColor,
      downColor: candlestickConfig.downColor,
      borderVisible: false,
      wickUpColor: candlestickConfig.wickUpColor,
      wickDownColor: candlestickConfig.wickDownColor,
      lastValueVisible: false,
      priceFormat: {
        type: "price",
        precision: precision,
        minMove: 1 / Math.pow(10, precision),
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    setChartReady(Date.now());

    // Force redraw for SVG layer when chart moves
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      setChartReady(Date.now());
    });

    setWsStatus("connecting");

    // Clear previous connection states
    let bSocket: WebSocket | null = null;
    let fallbackLoop: NodeJS.Timeout | null = null;
    let forexPollInterval: NodeJS.Timeout | null = null;

    const isCryptoSym = (TRADING_SYMBOLS["Crypto"] && TRADING_SYMBOLS["Crypto"].includes(symbol)) || 
                        symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL") || symbol.includes("XRP") || 
                        symbol.startsWith("BTC") || symbol.startsWith("ETH");
    
    // Prepare symbol mapping
    const cleanSym = symbol.replace("/", "").replace("_", "").toUpperCase();
    let binanceSym = cleanSym;
    if (binanceSym.endsWith("USD") && !binanceSym.endsWith("USDT")) {
      binanceSym = binanceSym.slice(0, -3) + "USDT";
    } else if (!binanceSym.endsWith("USDT")) {
      binanceSym = `${binanceSym}USDT`;
    }

    // Initialize state vars for aggregating live candles
    let currentLiveBar: any = null;

    const aggregateAndAddBar = (tickTime: number, priceValue: number, volumeValue: number) => {
      const tfMap: Record<string, number> = {
        S10: 10, S30: 30, M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400, W1: 604800,
      };
      const tfSecs = tfMap[timeframe] || 60;
      const barTime = Math.floor(tickTime / tfSecs) * tfSecs;

      if (!currentLiveBar || currentLiveBar.time !== barTime) {
        // commit previous if we have one and register it
        if (currentLiveBar && historicalDataRef.current) {
          const idx = historicalDataRef.current.findIndex(b => b.time === currentLiveBar.time);
          if (idx !== -1) {
            historicalDataRef.current[idx] = currentLiveBar;
          } else {
            historicalDataRef.current.push(currentLiveBar);
          }
        }
        
        currentLiveBar = {
          time: barTime,
          open: priceValue,
          high: priceValue,
          low: priceValue,
          close: priceValue,
          volume: volumeValue
        };
      } else {
        currentLiveBar.high = Math.max(currentLiveBar.high, priceValue);
        currentLiveBar.low = Math.min(currentLiveBar.low, priceValue);
        currentLiveBar.close = priceValue;
        currentLiveBar.volume += volumeValue;
      }

      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.update(currentLiveBar as any);
        // Trigger indicators
        calculateAndSetIndicators();
      }
    };

    const calculateAndSetIndicators = () => {
      if (!historicalDataRef.current || historicalDataRef.current.length === 0) return;
      const dataFull = [...historicalDataRef.current];
      if (currentLiveBar && !dataFull.some(b => b.time === currentLiveBar.time)) {
        dataFull.push(currentLiveBar);
      }
      if (
        vwapSeriesRef.current ||
        vwapUpper1SeriesRef.current ||
        vwapLower1SeriesRef.current ||
        vwapUpper2SeriesRef.current ||
        vwapLower2SeriesRef.current ||
        vwapUpper3SeriesRef.current ||
        vwapLower3SeriesRef.current
      ) {
        const vwapData = calculateVWAP(dataFull);
        if (vwapSeriesRef.current) vwapSeriesRef.current.setData(vwapData.vwapLine);
        if (vwapUpper1SeriesRef.current) vwapUpper1SeriesRef.current.setData(vwapData.upper1Line);
        if (vwapLower1SeriesRef.current) vwapLower1SeriesRef.current.setData(vwapData.lower1Line);
        if (vwapUpper2SeriesRef.current) vwapUpper2SeriesRef.current.setData(vwapData.upper2Line);
        if (vwapLower2SeriesRef.current) vwapLower2SeriesRef.current.setData(vwapData.lower2Line);
        if (vwapUpper3SeriesRef.current) vwapUpper3SeriesRef.current.setData(vwapData.upper3Line);
        if (vwapLower3SeriesRef.current) vwapLower3SeriesRef.current.setData(vwapData.lower3Line);
      }
      if (volumeSeriesRef.current) {
        const volumeData = calculateVolume(dataFull);
        volumeSeriesRef.current.setData(volumeData);
      }
    };

    if (isCryptoSym) {
      // 1. Crypto Loading & Subscribing (Binance Feed)
      let bInterval = "1m";
      if (timeframe === "S10" || timeframe === "S30") bInterval = "1s";
      else if (timeframe === "M1") bInterval = "1m";
      else if (timeframe === "M5") bInterval = "5m";
      else if (timeframe === "M15") bInterval = "15m";
      else if (timeframe === "M30") bInterval = "30m";
      else if (timeframe === "H1") bInterval = "1h";
      else if (timeframe === "H4") bInterval = "4h";
      else if (timeframe === "D1") bInterval = "1d";
      else if (timeframe === "W1") bInterval = "1w";

      const loadBinanceHistorical = async () => {
        try {
          const limit = timeframe === "S10" || timeframe === "S30" ? "800" : "500";
          const histUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSym}&interval=${bInterval}&limit=${limit}`;
          const res = await fetch(histUrl);
          if (!res.ok) throw new Error("Binance status error " + res.status);
          const raw = await res.json();
          
          if (isCancelled) return;

          const candles = raw.map((item: any) => ({
            time: Math.floor(Number(item[0]) / 1000),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5])
          }));

          // Group 1-second ticks into 10s or 30s bars
          let formattedList = candles;
          if (timeframe === "S10" || timeframe === "S30") {
            const step = timeframe === "S10" ? 10 : 30;
            const groupedList: any[] = [];
            let activeGroup: any = null;

            candles.forEach((c: any) => {
              const groupTime = Math.floor(c.time / step) * step;
              if (!activeGroup || activeGroup.time !== groupTime) {
                if (activeGroup) groupedList.push(activeGroup);
                activeGroup = {
                  time: groupTime,
                  open: c.open,
                  high: c.high,
                  low: c.low,
                  close: c.close,
                  volume: c.volume
                };
              } else {
                activeGroup.high = Math.max(activeGroup.high, c.high);
                activeGroup.low = Math.min(activeGroup.low, c.low);
                activeGroup.close = c.close;
                activeGroup.volume += c.volume;
              }
            });
            if (activeGroup) groupedList.push(activeGroup);
            formattedList = groupedList;
          }

          historicalDataRef.current = formattedList;
          if (candlestickSeriesRef.current) {
            candlestickSeriesRef.current.setData(formattedList as any);
            if (formattedList.length > 0) {
              const last = formattedList[formattedList.length - 1];
              currentLiveBar = { ...last };
              setPrice(last.close);
              setPrices(prev => ({ ...prev, [symbol]: last.close }));
            }
          }
          
          calculateAndSetIndicators();
          
        } catch (err) {
          console.error("Failed to fetch Binance historical data:", err);
          setWsStatus("error");
        }
      };

      const connectBinanceSocket = () => {
        try {
          const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSym.toLowerCase()}@kline_${bInterval}`;
          const ws = new WebSocket(wsUrl);
          bSocket = ws;

          ws.onopen = () => {
            if (isCancelled) {
              ws.close();
              return;
            }
            setWsStatus("connected");
          };

          ws.onmessage = (event) => {
            if (isCancelled) return;
            const data = JSON.parse(event.data);
            if (data.e === "kline" && data.k) {
              const k = data.k;
              const tickTime = Math.floor(k.t / 1000);
              const pClose = parseFloat(k.c);
              const vVol = parseFloat(k.v);

              if (timeframe === "S10" || timeframe === "S30") {
                aggregateAndAddBar(tickTime, pClose, vVol / 10);
              } else {
                const pTime = Math.floor(k.t / 1000);
                const bar = {
                  time: pTime,
                  open: parseFloat(k.o),
                  high: parseFloat(k.h),
                  low: parseFloat(k.l),
                  close: pClose,
                  volume: vVol
                };
                currentLiveBar = bar;
                if (candlestickSeriesRef.current) {
                  candlestickSeriesRef.current.update(bar as any);
                  calculateAndSetIndicators();
                }
              }

              setPrice(pClose);
              setPrices(prev => ({ ...prev, [symbol]: pClose }));
            }
          };

          ws.onerror = (e) => {
            console.error("Binance trade socket error:", e);
            setWsStatus("error");
          };

          ws.onclose = () => {
            if (!isCancelled) {
              setWsStatus("disconnected");
              setTimeout(() => {
                if (!isCancelled) connectBinanceSocket();
              }, 3000);
            }
          };
        } catch (e) {
          console.error("Binance trade socket setup exception:", e);
        }
      };

      loadBinanceHistorical().then(() => {
        if (!isCancelled) connectBinanceSocket();
      });

    } else {
      // 2. Forex Loading & Polling (Dukascopy Feed)
      const isForexClosedNow = () => {
        const d = new Date(Date.now() + serverTimeOffset);
        const day = d.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
        const hour = d.getUTCHours();
        if (day === 5 && hour >= 21) return true; 
        if (day === 6) return true; 
        if (day === 0 && hour < 21) return true; 
        return false;
      };
      const isMarketCurrentlyClosed = isForexClosedNow();

      const loadDukascopyHistorical = async () => {
        try {
          const res = await fetch(`/api/forex/candles?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}&count=350`);
          const isFallback = res.headers.get("X-Chart-Fallback") === "true";
          setIsOfflineFallback(isFallback);
          
          if (isFallback) {
            throw new Error("Reference chart feed is currently offline.");
          }
          
          if (!res.ok) throw new Error("Forex historical API status " + res.status);
          const candles = await res.json();
          
          if (!Array.isArray(candles) || candles.length < 10) {
            throw new Error("Forex historical API empty or incomplete response");
          }

          if (isCancelled) return;

          historicalDataRef.current = candles;
          if (candlestickSeriesRef.current) {
            candlestickSeriesRef.current.setData(candles as any);
            if (candles.length > 0) {
              const last = candles[candles.length - 1];
              currentLiveBar = { ...last };
              lastBarRef.current = last;
              lastBarTimeRef.current = last.time;
              setPrice(last.close);
              setPrices(prev => ({ ...prev, [symbol]: last.close }));
            }
          }
          
          calculateAndSetIndicators();
          setWsStatus(isMarketCurrentlyClosed ? "disconnected" : "connected");

        } catch (err) {
          console.error("Forex historical loading error:", err);
          if (isCancelled) return;
          setWsStatus("error");
          setIsOfflineFallback(true);
        }
      };

      const startDukascopyPolling = () => {
        if (isMarketCurrentlyClosed) {
          setWsStatus("disconnected");
          return;
        }

        let dSymbol = symbol.replace("_", "/");
        if (!dSymbol.includes("/")) {
          if (dSymbol.length === 6) dSymbol = dSymbol.slice(0, 3) + "/" + dSymbol.slice(3);
          else if (dSymbol.startsWith("XAU")) dSymbol = "XAU/USD";
        }

        const socket = io();
        bSocket = socket as any; // Using bSocket ref to clean up later

        socket.on("connect", () => {
          console.log("[WebTerminal] Connected to Quotes WebSocket feed");
        });

        socket.emit("subscribe_instrument", symbol);

        socket.on("quotes", (quotes: any) => {
          if (isCancelled) return;
          
          if (quotes && quotes[dSymbol]) {
            const item = quotes[dSymbol];
            const feedTimestamp = item[0] || Date.now();
            const tickTime = Math.floor(feedTimestamp / 1000);
            const bid = parseFloat(item[1] || item.bid);
            const ask = parseFloat(item[2] || item.ask);
            const currentMid = parseFloat(((bid + ask) / 2).toFixed(5));

            aggregateAndAddBar(tickTime, currentMid, 1);

            setPrice(currentMid);
            setPrices(prev => ({ ...prev, [symbol]: currentMid }));
          }
        });
      };

      loadDukascopyHistorical().then(() => {
        if (!isCancelled) startDukascopyPolling();
      });
    }

    return () => {
      isCancelled = true;
      setIsOfflineFallback(false);
      if (bSocket) {
        bSocket.close();
      }
      if (fallbackLoop) {
        clearInterval(fallbackLoop);
      }
      if (forexPollInterval) {
        clearInterval(forexPollInterval);
      }
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      askPriceLineRef.current = null;
      bidPriceLineRef.current = null;
      vwapSeriesRef.current = null;
      vwapUpper1SeriesRef.current = null;
      vwapLower1SeriesRef.current = null;
      vwapUpper2SeriesRef.current = null;
      vwapLower2SeriesRef.current = null;
      vwapUpper3SeriesRef.current = null;
      vwapLower3SeriesRef.current = null;
      historicalDataRef.current = [];
      priceLinesRef.current = [];
      lastBarRef.current = null;
      lastBarTimeRef.current = 0;
    };
  }, [symbol, timeframe, timezoneOffset, favorites]);

  const checkCompetitionRules = () => {
    if (activeAccount?.type === 'competition' && activeAccount.competitionId) {
      const comp = competitions.find(c => c.id === activeAccount.competitionId);
      if (comp && comp.isActive) {
        const now = new Date();
        const compStart = new Date(comp.startDate);
        const compEnd = comp.endDate ? new Date(comp.endDate) : null;
        if (now < compStart) {
          alert(`Competition starts on ${compStart.toLocaleDateString()}. You cannot trade until then.`);
          return false;
        }
        if (compEnd && now > compEnd) {
          alert(`The competition has ended. You cannot place trades anymore.`);
          return false;
        }
      }
    }
    return true;
  };

  const isNewsTime = (sym: string) => {
    const events = globalSettings.newsEvents || [];
    const now = new Date().getTime();
    for (const ev of events) {
      if (!sym.includes(ev.currency) && ev.currency !== "ALL") continue;
      const evTime = new Date(ev.timestamp).getTime();
      const startTime = evTime - (15 * 60 * 1000);
      const endTime = evTime + (15 * 60 * 1000);
      if (now >= startTime && now <= endTime) {
        return true;
      }
    }
    return false;
  };

  const isWeekend = () => {
    const now = new Date(Date.now() + serverTimeOffset);
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    // Standard market close: Friday 21:00 UTC to Sunday 21:00 UTC
    return (day === 6) || (day === 5 && hour >= 21) || (day === 0 && hour < 21);
  };

  const isOvernight = (openTime: number) => {
    if (!openTime) return false;
    const openDate = new Date(openTime);
    const nowDate = new Date();
    return openDate.getUTCDate() !== nowDate.getUTCDate() || 
           openDate.getUTCMonth() !== nowDate.getUTCMonth() || 
           openDate.getUTCFullYear() !== nowDate.getUTCFullYear();
  };

  const isMarketClosed = (sym: string) => {
    const isCrypto = TRADING_SYMBOLS["Crypto"].includes(sym);
    if (isCrypto) return false;
    return isWeekend();
  };

  const placeOrder = async (type: "buy" | "sell") => {
    try {
      if (!activeAccount || activeAccount.status === 'failed' || activeAccount.status === 'suspended') {
        alert("⚠️ This account is FAILED or SUSPENDED. Trading is completely disabled.");
        return;
      }
      if (maxAllowedLots > 0 && Lots > maxAllowedLots) {
        alert(`Lots (${Lots}) exceeds maximum allowed lots (${Math.floor(maxAllowedLots * 100) / 100}) for your available margin.`);
        return;
      }

      if (!checkCompetitionRules()) return;
      
      // Rule prevention: No holding weekend for funded (except Crypto)
      const isCrypto = TRADING_SYMBOLS["Crypto"].includes(symbol);
      if (activeAccount?.type === 'funded' && isWeekend() && !isCrypto) {
          alert("Funded accounts are not permitted to open non-crypto trades during the weekend.");
          return;
      }

      if (isMarketClosed(symbol)) {
         alert("Market is closed. Trading is only available for Crypto pairs during the weekend.");
         return;
      }
      const marketPrice = prices[symbol] || price;
      if (!marketPrice || marketPrice <= 0)
        throw new Error("No price available");

      const config = symbolConfigs.find((c) => c.symbol === symbol);

      let currentSpread = config?.spread || 0;
      const isNews = isNewsTime(symbol);
      if (isNews) {
        currentSpread *= (globalSettings.newsSpreadMultiplier || 10);
      }
      
      const pipSize = getPipSize(symbol);
      const spreadPoints = currentSpread * pipSize;
      
      // We apply spread: buy at ask (higher), sell at bid (lower)
      const fillPrice = type === "buy" ? marketPrice + spreadPoints : marketPrice - spreadPoints;

      // Margin Requirement Calculation
      let contractSize = getContractSizeForSymbol(symbol);

      const leverage = globalSettings.leverageCap;
      const notionalValue = fillPrice * Lots * contractSize;
      const requiredMargin = notionalValue / leverage;

      // Free Margin Check
      const usedMargin = positions.reduce((acc, p) => {
        let cs = getContractSizeForSymbol(p.symbol);
        return acc + (p.open_price * p.lots * cs) / globalSettings.leverageCap;
      }, 0);

      const freeMargin = currentEquity - usedMargin;

      if (requiredMargin > freeMargin) {
        alert(
          `Insufficient Margin! Needed: $${requiredMargin.toFixed(2)}, Available: $${freeMargin.toFixed(2)}`,
        );
        return;
      }

      const newSl = sl ? parseFloat(sl) : null;
      const newTp = tp ? parseFloat(tp) : null;
      if (type === "buy") {
        if (newSl !== null && newSl >= fillPrice) {
          alert(
            `Invalid Stop Loss! SL (${newSl}) must be lower than fill price (${fillPrice.toFixed(5)}).`,
          );
          return;
        }
        if (newTp !== null && newTp <= fillPrice) {
          alert(
            `Invalid Take Profit! TP (${newTp}) must be higher than fill price (${fillPrice.toFixed(5)}).`,
          );
          return;
        }
      } else {
        if (newSl !== null && newSl <= fillPrice) {
          alert(
            `Invalid Stop Loss! SL (${newSl}) must be higher than fill price (${fillPrice.toFixed(5)}).`,
          );
          return;
        }
        if (newTp !== null && newTp >= fillPrice) {
          alert(
            `Invalid Take Profit! TP (${newTp}) must be lower than fill price (${fillPrice.toFixed(5)}).`,
          );
          return;
        }
      }

      const orderPayload = {
        user_id: user?.id,
        tradingAccountId: activeAccountId,
        symbol,
        lots: Lots,
        type,
        fillPrice,
        sl: newSl,
        tp: newTp,
      };

      const idToken = localStorage.getItem("token");

      const req = await fetch("/api/order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify(orderPayload),
      });

      if (req.ok) {
        const data = await req.json();
        if (data.status === "filled") {
          const newPos = {
            id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            symbol: data.symbol,
            type: data.type,
            lots: data.lots,
            open_price: parseFloat(data.fillPrice) || fillPrice,
            sl: sl ? parseFloat(sl) : null,
            tp: tp ? parseFloat(tp) : null,
            open_time: Date.now(),
            isNewsTrade: isNewsTime(data.symbol),
          };
          setPositions((prev) => [...prev, newPos]);
          return;
        }
      }

      // Fallback local placement (now with spread/margin logic already checked)
      const localPos = {
        id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        symbol,
        type,
        lots: Lots,
        open_price: fillPrice,
        sl: newSl,
        tp: newTp,
        open_time: Date.now(),
        isNewsTrade: isNewsTime(symbol),
      };
      setPositions((prev) => [...prev, localPos]);
    } catch (e) {
      console.error("Order placement error:", e);
      alert(
        "Order failed: " + (e instanceof Error ? e.message : "Unknown error"),
      );
    }
  };

  const activatePendingPreview = () => {
    const marketPrice = prices[symbol] || price;
    if (!marketPrice) return;
    
    setIsPreviewActive(true);
    setOrderMode("pending");
    
    // Default 10 pips away
    const offset = 10 * getPipSize(symbol);
    setPreviewOrderPrice(marketPrice + offset);
    setPreviewSl(marketPrice);
    setPreviewTp(marketPrice + 2 * offset);
    setPendingType("buy stop");
    setSl("");
    setTp("");
  };

  const activateMarketPreview = (customDirection?: "buy" | "sell") => {
    const marketPrice = prices[symbol] || price;
    if (!marketPrice) return;

    setIsPreviewActive(true);
    setOrderMode("market");

    const dir = customDirection || marketPreviewDirection;
    const offset = 15 * getPipSize(symbol);
    const decimals = getDecimalsForSymbol(symbol);

    const currentSlNum = parseFloat(sl);
    const currentTpNum = parseFloat(tp);

    const nextSl = (!isNaN(currentSlNum) && currentSlNum !== 0) ? currentSlNum : (dir === "buy" ? marketPrice - offset : marketPrice + offset);
    const nextTp = (!isNaN(currentTpNum) && currentTpNum !== 0) ? currentTpNum : (dir === "buy" ? marketPrice + 2 * offset : marketPrice - 2 * offset);

    setPreviewOrderPrice(marketPrice);
    setPreviewSl(nextSl);
    setPreviewTp(nextTp);

    setSl(nextSl.toFixed(decimals));
    setTp(nextTp.toFixed(decimals));
  };

  const [showPendingConfirm, setShowPendingConfirm] = useState(false);

  const confirmPendingOrder = async () => {
    if (!previewOrderPrice) return;
    if (!activeAccount || activeAccount.status === 'failed' || activeAccount.status === 'suspended') {
      alert("⚠️ This account is FAILED or SUSPENDED. Trading is completely disabled.");
      return;
    }
    
    // Check lots
    if (maxAllowedLots > 0 && Lots > maxAllowedLots) {
      alert(`Lots (${Lots}) exceeds maximum allowed lots (${Math.floor(maxAllowedLots * 100) / 100}) for your available margin.`);
      return;
    }
    
    // Competition rules
    if (!checkCompetitionRules()) return;

    // Market closure check
    const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL");
    if (isMarketClosed(symbol) && !isCrypto) {
       alert("Market is closed for this symbol. Orders can only be placed when the market is open.");
       return;
    }

    const newOrder = {
      id: `po-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      symbol,
      type: pendingType,
      lots: Lots,
      target_price: previewOrderPrice,
      sl: previewSl,
      tp: previewTp,
      open_time: Date.now(),
    };

    setPendingOrders((prev: any[]) => [...prev, newOrder]);
    setIsPreviewActive(false);
    setShowPendingConfirm(false);
    setOrderMode("market");
  };

  const executeOrders = (toTrigger: any[]) => {
    if (toTrigger.length === 0) return;

    const newPositionsFromOrders = toTrigger.map((po) => ({
      id: `pos-${po.id}-${Date.now()}`,
      symbol: po.symbol,
      type: po.actualTriggerType,
      lots: po.lots,
      open_price: po.target_price,
      sl: po.sl,
      tp: po.tp,
      open_time: Date.now(),
    }));

    const nextOrders = localPendingOrders.filter(
      (p) => !toTrigger.find((t) => t.id === p.id),
    );
    const nextPositions = [...localPositions, ...newPositionsFromOrders];

    if (activeAccount) {
      updateTradingAccount(activeAccount.id, {
        pendingOrders: nextOrders,
        openTrades: nextPositions,
      });
    }
    
    setLocalPendingOrders(nextOrders);
    setLocalPositions(nextPositions);
  };

  const placePendingOrder = () => {
    if (!activeAccount || activeAccount.status === 'failed' || activeAccount.status === 'suspended') {
      alert("⚠️ This account is FAILED or SUSPENDED. Trading is completely disabled.");
      return;
    }
    if (maxAllowedLots > 0 && Lots > maxAllowedLots) {
      alert(`Lots (${Lots}) exceeds maximum allowed lots (${Math.floor(maxAllowedLots * 100) / 100}) for your available margin.`);
      return;
    }
    
    if (!checkCompetitionRules()) return;

    // Rule prevention: No holding weekend for funded (except Crypto)
    const isCrypto = TRADING_SYMBOLS["Crypto"].includes(symbol);
    if (activeAccount?.type === 'funded' && isWeekend() && !isCrypto) {
        alert("Funded accounts are not permitted to place non-crypto orders during the weekend.");
        return;
    }

    if (isMarketClosed(symbol)) {
       alert("Market is closed. Pending orders are only available for Crypto pairs during the weekend.");
       return;
    }
    if (!pendingPrice) return alert("Please set a price for the pending order");

    const targetP = parseFloat(pendingPrice);
    const newSl = sl ? parseFloat(sl) : null;
    const newTp = tp ? parseFloat(tp) : null;

    if (pendingType.includes("buy")) {
      if (newSl !== null && newSl >= targetP)
        return alert(
          `Invalid Stop Loss! SL (${newSl}) must be lower than fill price (${targetP.toFixed(5)}).`,
        );
      if (newTp !== null && newTp <= targetP)
        return alert(
          `Invalid Take Profit! TP (${newTp}) must be higher than fill price (${targetP.toFixed(5)}).`,
        );
    } else {
      if (newSl !== null && newSl <= targetP)
        return alert(
          `Invalid Stop Loss! SL (${newSl}) must be higher than fill price (${targetP.toFixed(5)}).`,
        );
      if (newTp !== null && newTp >= targetP)
        return alert(
          `Invalid Take Profit! TP (${newTp}) must be lower than fill price (${targetP.toFixed(5)}).`,
        );
    }

    setPendingOrders((prev) => [
      ...prev,
      {
        id: `po-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        symbol,
        type: pendingType,
        lots: Lots,
        target_price: targetP,
        sl: newSl,
        tp: newTp,
        open_time: Date.now(),
      },
    ]);
    setPendingPrice("");
  };

  const closePosition = (id: string, reason = "Manual") => {
    const p = positions.find((pos) => pos.id === id);
    if (p) {
      const pnl = getPositionPnL(p);
      const closePrice = prices[p.symbol] || p.open_price;

      // Scalping rule: Position held for less than 30 seconds
      const holdTimeSecs = (Date.now() - p.open_time) / 1000;
      let finalReason = reason;
      let isScalpViolation = holdTimeSecs < 30;

      if (isScalpViolation) {
        const warnings = activeAccount?.scalpWarningsCount || 0;
        if (warnings >= 2) {
          // THIRD VIOLATION: FAIL CHALLENGE
          alert(`❌ Challenge Failed: Scalping Rule Violation! You closed a position too quickly (${holdTimeSecs.toFixed(1)}s < 30s threshold). Having previously been warned twice, your account has been automatically CLOSED (FAILED).`);
          
          setBalance((b: number) => b + pnl);
          
          const historyPayload = {
            ...p,
            close_price: closePrice,
            close_time: Date.now(),
            pnl,
            reason: `${reason} (Scalping Violation - FAILED)`
          };
          setHistory((prev) => [historyPayload, ...prev]);

          // Close all other open positions as well
          const breachHistory = positions.filter(pos => pos.id !== id).map(pos => ({
             ...pos,
             close_time: Date.now(),
             close_price: prices[pos.symbol] || pos.open_price,
             pnl: getPositionPnL(pos),
             reason: 'Scalping Breach Closure'
          }));

          setPositions([]);
          setHistory(prev => [...breachHistory, ...prev]);

          updateTradingAccount(activeAccount.id, {
            status: 'failed',
            balance: balance + pnl + breachHistory.reduce((sum, h) => sum + h.pnl, 0),
            openTrades: [],
            scalpWarningsCount: warnings + 1
          });

          addNotification({
            title: "Challenge Failed ❌ - Scalping Violation",
            message: `Account #${activeAccount.accountNumber} has failed because you closed a trade too quickly (${holdTimeSecs.toFixed(1)}s) and breached the 3-strike scalping limit.`,
            type: 'alert'
          });
          return;
        } else if (warnings === 1) {
          // SECOND VIOLATION: WARNING ONLY (STRIKE 2)
          alert(`⚠️ Scalping Rule Warning: You closed this position in less than 30 seconds (${holdTimeSecs.toFixed(1)}s). This is your SECOND warning (2/2 strikes used). A third violation on any trade will automatically CLOSE (FAIL) your account!`);
          
          finalReason = `${reason} (Scalping Warning #2)`;
          updateTradingAccount(activeAccount.id, {
            scalpWarningsCount: 2
          });

          addNotification({
            title: "Scalping Warning (2/2) ⚠️",
            message: `Second scalp violation on account #${activeAccount.accountNumber} (holding time: ${holdTimeSecs.toFixed(1)}s < 30s threshold). Next violation fails the account.`,
            type: 'alert'
          });
        } else {
          // FIRST VIOLATION: WARNING ONLY (STRIKE 1)
          alert(`⚠️ Scalping Rule Warning: You closed this position in less than 30 seconds (${holdTimeSecs.toFixed(1)}s). Top prop firms prohibit rapid scalping/high-volume arbitrage. This is your FIRST warning (1/2 strikes used). You have one remaining warning strike before your account is closed.`);
          
          finalReason = `${reason} (Scalping Warning #1)`;
          updateTradingAccount(activeAccount.id, {
            scalpWarningsCount: 1
          });

          addNotification({
            title: "Scalping Warning (1/2) ⚠️",
            message: `First scalp violation on account #${activeAccount.accountNumber} (holding time: ${holdTimeSecs.toFixed(1)}s < 30s threshold).`,
            type: 'alert'
          });
        }
      }

      setBalance((b: number) => b + pnl);
      setHistory((prev) => [{...p, close_price: closePrice, close_time: Date.now(), pnl, reason: finalReason}, ...prev]);
      
      // Add Payout Milestone for Funded Accounts
      if (pnl > 0 && activeAccount?.type === 'funded') {
        const milestone = {
          amount: pnl,
          closedAt: Date.now(),
          unlockAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
          tradeId: p.id
        };
        updateTradingAccount(activeAccount.id, {
          payoutMilestones: [...(activeAccount.payoutMilestones || []), milestone]
        });
      }

      if (p.isNewsTrade && pnl > 0 && activeAccount?.rules?.newsTrading === false && activeAccount?.type !== 'funded') {
         updateTradingAccount(activeAccount.id, {
            rules: {
               ...activeAccount.rules,
               maxDrawdown: activeAccount.rules?.maxDrawdown || 5000,
               dailyDrawdown: activeAccount.rules?.dailyDrawdown || 2500,
               profitTarget: activeAccount.rules?.profitTarget || 5000,
               targetPenalty: (activeAccount.rules?.targetPenalty || 0) + pnl
            }
         });
      }
    }
    setPositions((prev: any[]) => prev.filter((pos) => pos.id !== id));
  };

  const handleCloseClick = (p: any) => {
    setClosingPosition(p);
    setCloseLots(p.lots.toString());
  };

  const submitClosePosition = () => {
    if (!closingPosition) return;
    const p = positions.find((pos) => pos.id === closingPosition.id);
    if (!p) {
      setClosingPosition(null);
      return;
    }

    let lotsToClose = parseFloat(closeLots);
    if (isNaN(lotsToClose) || lotsToClose <= 0) {
      alert("Invalid lots amount");
      return;
    }

    if (lotsToClose >= p.lots) {
      closePosition(closingPosition.id, "Manual Full");
    } else {
      const ratio = lotsToClose / p.lots;
      const fullPnl = getPositionPnL(p);
      const partialPnl = fullPnl * ratio;
      const closePrice = prices[p.symbol] || p.open_price;
      
      setBalance((b: number) => b + partialPnl);
      setHistory((prev) => [{...p, lots: lotsToClose, close_price: closePrice, close_time: Date.now(), pnl: partialPnl, reason: "Manual Partial"}, ...prev]);
      
      // Add Payout Milestone for Funded Accounts (Partial)
      if (partialPnl > 0 && activeAccount?.type === 'funded') {
        const milestone = {
          amount: partialPnl,
          closedAt: Date.now(),
          unlockAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
          tradeId: p.id + "_" + Date.now()
        };
        updateTradingAccount(activeAccount.id, {
          payoutMilestones: [...(activeAccount.payoutMilestones || []), milestone]
        });
      }

      setPositions((prev: any[]) => prev.map((pos) => pos.id === closingPosition.id ? { ...pos, lots: pos.lots - lotsToClose } : pos));

      if (p.isNewsTrade && partialPnl > 0 && activeAccount?.rules?.newsTrading === false && activeAccount?.type !== 'funded') {
         updateTradingAccount(activeAccount.id, {
            rules: {
               ...activeAccount.rules,
               maxDrawdown: activeAccount.rules?.maxDrawdown || 5000,
               dailyDrawdown: activeAccount.rules?.dailyDrawdown || 2500,
               profitTarget: activeAccount.rules?.profitTarget || 5000,
               targetPenalty: (activeAccount.rules?.targetPenalty || 0) + partialPnl
            }
         });
      }
    }
    setClosingPosition(null);
    setCloseLots("");
  };

  const isLoadingStandalone = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('loading') === 'true';

  if (isLoadingStandalone) {
    return (
      <div className="w-screen h-screen bg-[#020617] text-slate-200 flex flex-col items-center justify-center space-y-6 font-sans select-none z-[1000] relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
        <div className="relative flex flex-col items-center p-8 rounded-[24px] border border-azure/20 bg-slate-950/80 shadow-[0_0_60px_rgba(0,183,255,0.15)] max-w-sm w-full mx-4 backdrop-blur-md">
          {/* Spinning terminal icon */}
          <div className="w-16 h-16 bg-azure/10 rounded-2xl flex items-center justify-center text-azure glow-azure border border-azure/20 mb-6">
            <RefreshCw size={32} className="animate-spin text-azure" />
          </div>
          
          <h2 className="text-lg font-bold font-mono tracking-wider uppercase text-white mb-2">PROVISIONING SECURE NODE...</h2>
          <p className="text-slate-400 text-xs font-mono text-center max-w-xs mb-6">
            Generating custom GOO trading platform instance and establishing ultra-low latency bridge.
          </p>
          
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
            <div className="bg-gradient-to-r from-azure to-blue-500 h-full rounded-full animate-pulse shadow-[0_0_8px_#00f2ff] w-4/5" />
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col z-[500] animate-in fade-in duration-300">
      <header className="h-auto md:h-16 py-4 md:py-0 px-4 md:px-6 border-b border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 glass z-[150] relative gap-4 md:gap-0 overflow-visible">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {!isStandalone && (
            <button
              onClick={() => setActiveView("terminals")}
              className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Logo textClassName="text-lg md:text-xl" />
              <span className="text-azure text-[10px] md:text-xs px-2 py-0.5 rounded border border-azure/20 bg-azure/10">
                GOO TERMINAL
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Direct Market
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 self-end md:self-auto">
          {user?.tradingAccounts && user.tradingAccounts.length > 0 && (
            <div className="flex flex-col items-end mr-4 relative" ref={accountMenuRef}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
                Node Environment
              </span>
              <button
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/10 hover:border-azure/30 transition-all shadow-lg"
              >
                <span className="font-bold text-azure tracking-widest uppercase text-[10px] md:text-xs">
                  {activeAccount ? `${activeAccount.accountNumber} - $${Math.round(activeAccount.balance || activeAccount.initialBalance || 100000).toLocaleString()}` : 'No Account'}
                </span>
                <ChevronDown size={14} className={`text-azure transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isAccountMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: 5 }}
                    exit={{ opacity: 0, y: 0 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-slate-950 border border-azure/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden p-2 z-[500] backdrop-blur-xl"
                  >
                    {user.tradingAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setActiveAccountId(acc.id);
                          setIsAccountMenuOpen(false);
                        }}
                        className={`w-full text-right p-3 rounded-lg text-[10px] font-bold tracking-widest uppercase flex items-center justify-between transition-all ${activeAccount?.id === acc.id ? 'bg-azure text-white shadow-lg' : 'text-slate-300 hover:bg-white/5'}`}
                      >
                         <div className={`w-2 h-2 rounded-full ${activeAccount?.id === acc.id ? 'bg-white' : 'bg-azure'}`} />
                         <span>{acc.accountNumber} - ${Math.round(acc.balance || acc.initialBalance || 100000).toLocaleString()} ({acc.platform})</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {consistencyInfo && (
            <div className="hidden min-[1100px]:flex flex-col items-end px-3 py-1 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
                45% Consistency
              </span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${consistencyInfo.isViolated ? 'bg-toxic-orange animate-pulse' : 'bg-green-500'}`} />
                <span className={`font-mono text-[10px] font-bold ${consistencyInfo.isViolated ? 'text-toxic-orange' : 'text-slate-300'}`}>
                  ${consistencyInfo.maxDailyProfit.toFixed(0)} / ${consistencyInfo.limit.toFixed(0)}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Equity
            </span>
            <span
              className={`font-mono font-bold text-lg ${currentEquity >= balance ? "text-green-400" : "text-red-400"}`}
            >
              $
              {currentEquity.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Free Margin
            </span>
            <span className="font-mono font-bold text-azure text-lg">
              $
              {(
                currentEquity -
                positions.reduce((acc, p) => {
                  let cs = getContractSizeForSymbol(p.symbol);
                  return acc + (p.open_price * p.lots * cs) / globalSettings.leverageCap;
                }, 0)
              ).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Balance
            </span>
            <span className="font-mono font-bold text-slate-200 text-lg">
              $
              {balance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </header>

      {activeAccount?.type === 'competition' && activeAccount.competitionId && (() => {
        const comp = competitions.find(c => c.id === activeAccount.competitionId);
        return comp?.isActive && new Date() < new Date(comp.startDate) ? (
          <div className="bg-yellow-500/20 border-b border-yellow-500/50 p-2 text-center text-yellow-500 text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2 z-[101]">
             <Trophy size={16} /> Competition starts on {new Date(comp.startDate).toLocaleDateString()}. Trading is currently disabled.
          </div>
        ) : null;
      })()}

      <div ref={layoutContainerRef} className="flex-1 flex flex-row min-h-0 relative overflow-hidden">
        {/* Watchlist Sidebar */}
        <AnimatePresence>
          {isWatchlistOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="h-full bg-[#0d1117] border-r border-white/10 flex flex-col shrink-0 overflow-hidden relative z-[60]"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2">
                  <LayoutList size={14} className="text-azure" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Watchlist</span>
                </div>
                <button 
                  onClick={() => setIsWatchlistOpen(false)} 
                  className="p-1 hover:bg-white/5 rounded-md text-slate-500 hover:text-white transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10">
                {Object.entries(TRADING_SYMBOLS).map(([category, symbols]) => {
                  const favsInCategory = symbols.filter(s => favorites.includes(s));
                  if (favsInCategory.length === 0 && category !== "Forex Majors") return null;

                  return (
                    <div key={category} className="mb-2">
                       <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-white/[0.02]">
                         {category}
                       </div>
                       <div className="divide-y divide-white/[0.02]">
                         {(favsInCategory.length > 0 ? favsInCategory : (category === "Forex Majors" ? symbols : [])).map(s => {
                           const isFav = favorites.includes(s);
                           if (!isFav && favsInCategory.length > 0) return null; // Only show non-favs if category is empty and it's Majors
                           
                           const currentP = prices[s] || 0;
                           const precision = s.includes("JPY") ? 3 : (s.includes("BTC") || s.includes("XAU") ? 2 : 5);
                           
                           return (
                             <div
                               key={s}
                               onClick={() => {
                                 setSymbol(s);
                                 setPrice(0);
                               }}
                               className={`w-full group px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-all text-left border-l-2 cursor-pointer ${symbol === s ? 'bg-azure/5 border-azure' : 'border-transparent'}`}
                               role="button"
                               tabIndex={0}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter' || e.key === ' ') {
                                   setSymbol(s);
                                   setPrice(0);
                                 }
                               }}
                             >
                                <div className="flex items-center gap-2">
                                   <div className="flex flex-col pointer-events-none">
                                      <span className={`text-[11.5px] font-bold ${symbol === s ? 'text-azure' : 'text-slate-300'}`}>{s}</span>
                                      <span className="text-[9px] text-slate-600 font-bold uppercase">{s.split('/')[0]}</span>
                                   </div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5 pointer-events-none">
                                   <span className="text-[11.5px] font-mono font-bold text-slate-300">
                                      {currentP ? currentP.toFixed(precision) : '---'}
                                   </span>
                                   <div className="flex items-center gap-1">
                                      <span className="text-[9.5px] font-mono text-green-500 font-bold">+1.24%</span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFavorites(prev => prev.filter(f => f !== s));
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-yellow-500 transition-all pointer-events-auto"
                                      >
                                        <Star size={8} fill={isFav ? "currentColor" : "none"} className={isFav ? "text-yellow-500" : "text-slate-600"} />
                                      </button>
                                   </div>
                                </div>
                             </div>
                           );
                         })}
                       </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="p-3 border-t border-white/5 bg-black/20">
                 <button 
                  onClick={() => setIsSymbolMenuOpen(true)}
                  className="w-full py-1.5 border border-white/10 rounded font-bold text-[9px] uppercase tracking-widest text-slate-500 hover:text-white hover:border-azure/30 transition-all"
                 >
                   + Add Symbol
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chart Area */}
        <div className="flex-1 flex flex-row min-h-0 relative z-10 w-full overflow-hidden">
          {/* Vertical Drawing Tools (TradingView Style) */}
          <div className="w-10 md:w-12 border-r border-white/10 bg-slate-950 flex flex-col items-center py-2 gap-1 shrink-0 z-[60] overflow-y-auto scrollbar-hide">
             {[
               { id: "cursor", icon: MousePointer2, label: "Cursor" },
               { id: "trendline", icon: TrendingUp, label: "Trend" },
               { id: "hline", icon: Minus, label: "Line" },
               { id: "rect", icon: Square, label: "Rect" },
               { id: "triangle", icon: Triangle, label: "Tri" },
               { id: "path", icon: Activity, label: "ZigZag" },
               { id: "freehand", icon: Pencil, label: "Draw" },
               { id: "ruler", icon: Ruler, label: "Measure" },
               { id: "text", icon: Type, label: "Text" },
             ].map((tool) => (
               <button
                 key={tool.id}
                  onContextMenu={(e) => handleToolbarContextMenu(e, tool.id)}
                 onClick={() => {
                   if (isDrawing && currentDrawing && activeTool === "path") {
                     if (currentDrawing.points && currentDrawing.points.length > 2) {
                       setDrawings([...drawings, currentDrawing]);
                     }
                     setIsDrawing(false);
                     setCurrentDrawing(null);
                   }
                   setActiveTool(tool.id as any);
                 }}
                 className={`p-2 rounded-lg transition-all flex flex-col items-center gap-0.5 ${activeTool === tool.id ? "bg-azure text-slate-950 shadow-[0_0_10px_rgba(0,242,255,0.4)]" : "text-slate-500 hover:text-white hover:bg-white/5"}`}
                 title={tool.label}
               >
                 <tool.icon size={18} />
                 <span className="text-[7px] font-bold uppercase tracking-tighter hidden md:block">{tool.label}</span>
               </button>
             ))}
             <div className="h-[1px] w-6 bg-white/5 my-1" />
             <button 
              onClick={() => setDrawings([])}
              className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg"
              title="Clear All"
             >
               <Trash2 size={18} />
             </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0 relative z-10 w-full min-w-0">
          {/* Symbol Tabs */}
          <div className="flex items-center gap-1 px-4 py-1 border-b border-white/5 bg-black/40 overflow-x-auto scrollbar-hide shrink-0 min-h-[36px]">
             {favorites.map(fav => (
               <div 
                key={fav} 
                onClick={() => {
                  setSymbol(fav);
                  setPrice(0);
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg transition-all cursor-pointer border-x border-t relative -mb-[1px] ${symbol === fav ? 'bg-[#0d1117] border-white/10 text-azure' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
               >
                  <span className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">{fav.replace('/', '')}</span>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setFavorites(prev => prev.filter(f => f !== fav));
                    }} 
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-white transition-opacity"
                  >
                    <X size={10} />
                  </button>
                  {symbol === fav && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-azure shadow-[0_0_10px_rgba(0,242,255,0.5)]" />}
               </div>
             ))}
          </div>
          <div className="min-h-[48px] py-1 px-2 md:px-4 border-b border-white/10 flex items-center justify-between glass shrink-0 relative z-50 flex-wrap gap-y-2 overflow-visible">
            <div className="flex items-center gap-2 md:gap-4 shrink-0 overflow-visible">
              <button
                onClick={() => setIsWatchlistOpen(!isWatchlistOpen)}
                className={`p-1.5 rounded-lg transition-all ${isWatchlistOpen ? "bg-azure text-slate-950 shadow-[0_0_15px_rgba(0,242,255,0.4)]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                title="Toggle Watchlist"
              >
                <LayoutList size={18} />
              </button>

              <div className="flex items-center gap-1 md:gap-2 relative" ref={symbolMenuRef}>
                <Crosshair size={14} className="text-azure" />
                <button
                  onClick={() => setIsSymbolMenuOpen(!isSymbolMenuOpen)}
                  className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-lg hover:border-azure/50 transition-all font-bold text-white tracking-widest uppercase text-xs md:text-sm shadow-xl"
                >
                  {symbol}
                  <ChevronDown size={14} className={`text-azure transition-transform ${isSymbolMenuOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isSymbolMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 5, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-72 bg-slate-950 border border-azure/20 rounded-2xl shadow-[0_20px_50px_rgba(0,242,255,0.2)] overflow-hidden z-[2000] backdrop-blur-xl flex flex-col max-h-[80vh]"
                      ref={symbolMenuRef}
                    >
                      <div className="p-3 border-b border-white/5 bg-white/5">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search symbol..."
                            value={symbolSearch}
                            onChange={(e) => setSymbolSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-azure/50 transition-all"
                          />
                        </div>
                      </div>

                      <div className="overflow-y-auto custom-scrollbar p-2 space-y-4">
                        {Object.entries(filteredSymbols).map(([category, symbols]) => (
                          <div key={category} className="space-y-1">
                            <div className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                              {category}
                            </div>
                            <div className="grid grid-cols-2 gap-1 px-1">
                              {symbols.map((sym) => (
                                <div key={sym} className="relative group">
                                  <button
                                    onClick={() => {
                                      setSymbol(sym);
                                      setPrice(0);
                                      setSl("");
                                      setTp("");
                                      setIsSymbolMenuOpen(false);
                                      setSymbolSearch("");
                                    }}
                                    className={`w-full text-center px-2 py-2.5 rounded-lg text-[10px] font-bold tracking-tight transition-all border border-transparent ${symbol === sym ? 'bg-azure text-slate-950 shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'text-slate-300 hover:bg-white/5 hover:border-white/5'}`}
                                  >
                                    {sym}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFavorites(prev => 
                                        prev.includes(sym) ? prev.filter(f => f !== sym) : [...prev, sym]
                                      );
                                    }}
                                    className={`absolute right-1 top-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${favorites.includes(sym) ? 'text-yellow-500 opacity-100' : 'text-slate-600 hover:text-white'}`}
                                  >
                                    <Star size={10} fill={favorites.includes(sym) ? "currentColor" : "none"} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {Object.keys(filteredSymbols).length === 0 && (
                          <div className="p-8 text-center text-slate-500 text-xs italic">
                            No symbols found for "{symbolSearch}"
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="h-4 w-[1px] bg-white/10 mx-1 md:mx-0" />
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    wsStatus === "connected" ? "bg-green-500 animate-pulse" : 
                    wsStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                    wsStatus === "error" ? "bg-red-500" : "bg-slate-600"
                  }`}
                />
                <span
                  className={`font-mono text-xs md:text-sm font-bold ${price ? "text-green-400" : "text-slate-400"}`}
                >
                  {price
                    ? Number(price).toFixed(
                        symbol.includes("JPY")
                          ? 3
                          : symbol.includes("BTC") || symbol.includes("XAU")
                            ? 2
                            : 5,
                      )
                    : "..."}
                </span>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-none">
                    Live
                  </span>
                  <span className="text-[8.5px] font-mono text-azure/60 leading-none">
                    PV: ${getPipValuePerLot(symbol, price || 0).toFixed(2)}/Lot
                  </span>
                </div>
                {isMarketClosed(symbol) && (
                  <div className="ml-2 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-md flex items-center text-[9px] font-bold text-red-400 uppercase tracking-wider">
                    Market Closed
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSymbol(symbol); // Trigger re-render of effect
                  setTimeframe(timeframe);
                }}
                className="p-1.5 md:p-2 rounded-lg bg-slate-900 border border-white/10 text-slate-500 hover:text-white transition-colors"
                title="Refresh Data"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={() => setIsCrosshairActive(!isCrosshairActive)}
                className={`p-1.5 md:p-2 rounded-lg border transition-all ${isCrosshairActive ? "bg-azure/20 border-azure/40 text-azure shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-slate-900 border-white/10 text-slate-500 hover:text-white"}`}
                title="Toggle Measurement Lines"
              >
                <Crosshair size={18} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
                  className="px-2 md:px-4 text-[10px] md:text-xs font-bold font-mono py-1.5 md:py-2 bg-slate-900 border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center min-w-[48px] h-full"
                >
                  {timeframe}
                </button>
                <AnimatePresence>
                  {isTimeframeOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsTimeframeOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-full left-0 pt-2 z-50 origin-top-left"
                      >
                        <div className="bg-slate-900 border border-white/10 rounded-lg overflow-hidden flex flex-col min-w-[48px] md:min-w-[64px] shadow-2xl backdrop-blur-xl bg-slate-900/90">
                          {[
                            "S10",
                            "S30",
                            "M1",
                            "M5",
                            "M15",
                            "M30",
                            "H1",
                            "H4",
                            "D1",
                            "W1",
                          ].map((tf) => (
                            <button
                              key={tf}
                              onClick={() => {
                                setTimeframe(tf as any);
                                setIsTimeframeOpen(false);
                              }}
                              className={`px-3 py-2 text-[10px] md:text-xs font-bold font-mono text-center transition-colors ${tf === timeframe ? "bg-azure/20 text-azure" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative">
                <button
                  onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
                  className={`px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-300 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center min-w-[48px] h-full ${isIndicatorsOpen ? "bg-white/5" : ""}`}
                >
                  <Activity size={16} className="mr-2 opacity-70" />
                  Indicators
                </button>
                <AnimatePresence>
                  {isIndicatorsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsIndicatorsOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-full left-0 pt-2 z-50 origin-top-left min-w-[200px]"
                      >
                        <div className="bg-slate-900 border border-white/10 rounded-lg overflow-hidden flex flex-col py-2">
                          <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Available Indicators
                          </div>
                          {["VWAP", "Volume", "LIT Timings"].map((ind) => (
                            <div
                              key={ind}
                              className={`px-4 py-2 text-xs font-bold font-mono flex items-center justify-between transition-colors hover:bg-slate-800 ${indicators.includes(ind) ? "text-azure" : "text-slate-400 hover:text-white"}`}
                            >
                              <button
                                onClick={() => {
                                  setIndicators(prev => 
                                    prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
                                  );
                                }}
                                className="flex-1 text-left"
                              >
                                {ind}
                              </button>
                              <div className="flex items-center gap-2">
                                {ind === "VWAP" && indicators.includes(ind) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsVwapSettingsOpen(true);
                                      setIsIndicatorsOpen(false);
                                    }}
                                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all"
                                    title="VWAP Settings"
                                  >
                                    <Settings size={12} />
                                  </button>
                                )}
                                {ind === "LIT Timings" && indicators.includes(ind) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsTimingsSettingsOpen(true);
                                      setIsIndicatorsOpen(false);
                                    }}
                                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all"
                                    title="LIT Timings Settings"
                                  >
                                    <Settings size={12} />
                                  </button>
                                )}
                                {indicators.includes(ind) && <span className="text-azure block w-2 h-2 rounded-full bg-azure shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              {!isStandalone && (
                <button
                  onClick={() => setActiveView('rules')}
                  className="px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-300 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center h-full"
                >
                  <Info size={16} className="mr-2 opacity-70" />
                  Rules
                </button>
              )}
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 ml-2 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
              >
                <Settings size={18} />
              </button>

              {/* Alarms Status Header Control */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-lg p-1 ml-2 text-xs font-mono select-none">
                <button
                  onClick={() => setTerminalMuted(prev => !prev)}
                  className={`p-1.5 rounded-md transition-colors ${terminalMuted ? 'text-red-400 hover:bg-red-400/10' : 'text-amber-400 hover:bg-amber-400/10 bg-amber-500/5'}`}
                  title={terminalMuted ? "Enable chime sound" : "Mute chime sound"}
                >
                  {terminalMuted ? <BellOff size={14} /> : <Bell size={14} className="animate-pulse" />}
                </button>
                <span className="text-[9px] text-slate-400 font-extrabold border-l border-white/10 pl-2 pr-1 uppercase tracking-wider">
                  Alarms: <span className="text-amber-400">{terminalAlarms.filter(a => a.symbol === symbol && a.isActive && !a.isTriggered).length}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Lightweight Charts Mount Point */}
          <div
            className="flex-1 w-full bg-[#020617] relative flex"
            onDoubleClick={handleDoubleClick}
            style={{ minHeight: "100px" }}
          >
            <div
              className={`flex-1 relative overflow-hidden ${activeTool !== "cursor" ? "cursor-crosshair" : ""}`}
              onMouseDownCapture={handleMouseDown}
              onMouseMoveCapture={handleMouseMove}
              onMouseUpCapture={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStartCapture={handleMouseDown}
              onTouchMoveCapture={handleMouseMove}
              onTouchEndCapture={handleMouseUp}
              onTouchCancelCapture={handleMouseUp}
              onClick={() => {
                setSettingsPopup(null);
                setTerminalContextMenu(null);
              }}
              onContextMenu={handleChartAreaContextMenu}
            >
              {/* Dedicated chart mount point to avoid React DOM conflicts */}
              <div className="absolute inset-0" ref={chartContainerRef} />

              {/* Full Screen Connection Fallback Overlay */}
              {isOfflineFallback && (
                <div id="connection-fallback-overlay" className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center border border-white/5 rounded-lg select-none">
                  <div className="bg-red-500/10 text-red-500 p-4 rounded-full mb-4 border border-red-500/20 shadow-lg shadow-red-500/5 animate-pulse">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-white tracking-tight">Sorry, you are offline</h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
                    The connection has been lost or the reference chart feed is currently unavailable. We apologize for the inconvenience.
                  </p>
                  <p className="text-xs text-slate-500 mt-4 font-mono select-none">
                    STATUS: OFFLINE
                  </p>
                </div>
              )}

              {/* Countdown Timer overlay */}
              <div 
                ref={countdownTimerRef} 
                className="absolute right-0 text-[10px] font-mono bg-slate-900 text-slate-300 px-1.5 py-[1px] rounded-l-md border-y border-l border-white/10 z-[60] pointer-events-none select-none" 
                style={{ display: 'none' }} 
              />
              
              {/* SL / TP / Pending Line Close Buttons */}
              <div ref={markersContainerRef} className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
                {positions.filter(p => p.symbol === symbol).map(p => (
                  <React.Fragment key={p.id}>
                    {/* Open Price ('x' to close trade altogether) */}
                    <button
                       className="absolute right-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center pointer-events-auto hover:bg-slate-700 hover:text-white transition-colors text-[8px] text-slate-400 font-bold"
                       ref={el => { posMarkersRef.current[`pos_open_${p.id}`] = el; }}
                       data-price={p.open_price}
                       data-draggingid={p.id}
                       data-type="open_price"
                       onClick={(e) => { e.stopPropagation(); handleCloseClick(p); }}
                       onTouchStart={(e) => { e.stopPropagation(); handleCloseClick(p); }}
                    >✕</button>

                    {/* SL Close and Label */}
                    {p.sl && (
                      <>
                        <button
                           className="absolute right-1 w-4 h-4 rounded-full bg-slate-900 border border-red-900/50 flex items-center justify-center pointer-events-auto hover:bg-red-500 hover:text-white transition-colors text-[8px] text-red-500 font-bold"
                           ref={el => { posMarkersRef.current[`pos_sl_${p.id}`] = el; }}
                           data-price={p.sl}
                           data-draggingid={p.id}
                           data-type="sl"
                           onClick={(e) => {
                             e.stopPropagation();
                             setPositions(prev => prev.map(pos => pos.id === p.id ? { ...pos, sl: null } : pos));
                           }}
                           onTouchStart={(e) => {
                             e.stopPropagation();
                             setPositions(prev => prev.map(pos => pos.id === p.id ? { ...pos, sl: null } : pos));
                           }}
                        >✕</button>
                        <div
                           className="absolute right-6 px-1.5 py-0.5 rounded bg-red-500/90 text-white text-[9px] font-bold font-mono pointer-events-none flex items-center gap-1.5 shadow-lg backdrop-blur-sm whitespace-nowrap"
                           ref={el => { posMarkersRef.current[`pos_sl_label_${p.id}`] = el; }}
                           data-price={p.sl}
                           data-draggingid={p.id}
                           data-type="sl"
                        >
                           {(() => {
                              const currentPrice = (dragState && dragState.id === p.id && dragState.type === "sl" && draggedPriceRef.current !== null) 
                                  ? draggedPriceRef.current 
                                  : parseFloat(p.sl);
                              const { pnl, pips } = calculateProjectedPnL(p, currentPrice);
                              return (
                                 <div className="flex items-center gap-1">
                                    <span>{pips.toFixed(1)} pips</span>
                                    <span className="opacity-50">|</span>
                                    <span>{pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                 </div>
                              );
                           })()}
                        </div>
                      </>
                    )}

                    {/* TP Close and Label */}
                    {p.tp && (
                      <>
                        <button
                           className="absolute right-1 w-4 h-4 rounded-full bg-slate-900 border border-green-900/50 flex items-center justify-center pointer-events-auto hover:bg-green-500 hover:text-white transition-colors text-[8px] text-green-500 font-bold"
                           ref={el => { posMarkersRef.current[`pos_tp_${p.id}`] = el; }}
                           data-price={p.tp}
                           data-draggingid={p.id}
                           data-type="tp"
                           onClick={(e) => {
                             e.stopPropagation();
                             setPositions(prev => prev.map(pos => pos.id === p.id ? { ...pos, tp: null } : pos));
                           }}
                           onTouchStart={(e) => {
                             e.stopPropagation();
                             setPositions(prev => prev.map(pos => pos.id === p.id ? { ...pos, tp: null } : pos));
                           }}
                        >✕</button>
                        <div
                           className="absolute right-6 px-1.5 py-0.5 rounded bg-green-500/90 text-white text-[9px] font-bold font-mono pointer-events-none flex items-center gap-1.5 shadow-lg backdrop-blur-sm whitespace-nowrap"
                           ref={el => { posMarkersRef.current[`pos_tp_label_${p.id}`] = el; }}
                           data-price={p.tp}
                           data-draggingid={p.id}
                           data-type="tp"
                        >
                           {(() => {
                              const currentPrice = (dragState && dragState.id === p.id && dragState.type === "tp" && draggedPriceRef.current !== null) 
                                  ? draggedPriceRef.current 
                                  : parseFloat(p.tp);
                              const { pnl, pips } = calculateProjectedPnL(p, currentPrice);
                              return (
                                 <div className="flex items-center gap-1">
                                    <span>{pips.toFixed(1)} pips</span>
                                    <span className="opacity-50">|</span>
                                    <span>{pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                 </div>
                              );
                           })()}
                        </div>
                      </>
                    )}
                  </React.Fragment>
                ))}

                {pendingOrders.filter(p => p.symbol === symbol).map(po => (
                  <button
                     key={po.id}
                     className="absolute right-1 w-4 h-4 rounded-full bg-slate-900 border border-blue-900/50 flex items-center justify-center pointer-events-auto hover:bg-blue-500 hover:text-white transition-colors text-[8px] text-blue-500 font-bold"
                     ref={el => { posMarkersRef.current[`pending_${po.id}`] = el; }}
                     data-price={po.target_price}
                     data-draggingid={po.id}
                     data-type="pending"
                     onClick={(e) => {
                       e.stopPropagation();
                       setPendingOrders(prev => prev.filter(p => p.id !== po.id));
                     }}
                     onTouchStart={(e) => {
                       e.stopPropagation();
                       setPendingOrders(prev => prev.filter(p => p.id !== po.id));
                     }}
                  >✕</button>
                ))}

                {/* Interactive Preview Markers */}
                {isPreviewActive && (
                  <>
                    <div
                      className={`absolute right-6 px-1.5 py-0.5 rounded text-white text-[9px] font-bold font-mono pointer-events-none shadow-lg backdrop-blur-sm whitespace-nowrap transition-all duration-300 ${
                        orderMode === "pending"
                          ? (pendingType.includes("buy") ? "bg-green-500" : "bg-red-500")
                          : (marketPreviewDirection === "buy" ? "bg-green-500" : "bg-red-500")
                      }`}
                      ref={el => { posMarkersRef.current[`preview_order_label`] = el; }}
                      data-price={previewOrderPrice}
                      data-type="preview_order"
                    >
                      {orderMode === "pending" ? `NEW ${pendingType.toUpperCase()}` : `MARKET ${marketPreviewDirection.toUpperCase()}`}
                    </div>
                    {previewSl !== null && (
                      <>
                        <button
                          className="absolute right-1 w-4 h-4 rounded-full bg-slate-900 border border-red-500 flex items-center justify-center pointer-events-auto hover:bg-red-500 hover:text-white transition-colors text-[10px] text-red-500 font-bold"
                          ref={el => { posMarkersRef.current[`preview_sl`] = el; }}
                          data-price={previewSl}
                          data-type="preview_sl"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setPreviewSl(null); 
                            if (orderMode === "market") setSl("");
                          }}
                        >✕</button>
                        <div
                          className="absolute right-6 px-1.5 py-0.5 rounded bg-red-500/90 text-white text-[9px] font-bold font-mono pointer-events-none shadow-lg backdrop-blur-sm whitespace-nowrap"
                          ref={el => { posMarkersRef.current[`preview_sl_label`] = el; }}
                          data-price={previewSl}
                          data-type="preview_sl"
                        >
                          SL PREVIEW ({Math.abs((previewOrderPrice - previewSl) / getPipSize(symbol)).toFixed(1)} pips)
                        </div>
                      </>
                    )}
                    {previewTp !== null && (
                      <>
                        <button
                          className="absolute right-1 w-4 h-4 rounded-full bg-slate-900 border border-green-500 flex items-center justify-center pointer-events-auto hover:bg-green-500 hover:text-white transition-colors text-[10px] text-green-500 font-bold"
                          ref={el => { posMarkersRef.current[`preview_tp`] = el; }}
                          data-price={previewTp}
                          data-type="preview_tp"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setPreviewTp(null); 
                            if (orderMode === "market") setTp("");
                          }}
                        >✕</button>
                        <div
                          className="absolute right-6 px-1.5 py-0.5 rounded bg-green-500/90 text-white text-[9px] font-bold font-mono pointer-events-none shadow-lg backdrop-blur-sm whitespace-nowrap"
                          ref={el => { posMarkersRef.current[`preview_tp_label`] = el; }}
                          data-price={previewTp}
                          data-type="preview_tp"
                        >
                          TP PREVIEW ({Math.abs((previewOrderPrice - previewTp) / getPipSize(symbol)).toFixed(1)} pips)
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <style>{`
        #tv-attr-logo, .tv-embed-widget-wrapper__footer { display: none !important; }
      `}</style>

              {/* Quick Trade Overlay (Floating Top Left) */}
              <div
                className="absolute z-40 flex items-start gap-2 pointer-events-auto"
                style={{
                  top: Math.max(0, qtPos.y),
                  left: Math.max(0, qtPos.x),
                  touchAction: "none"
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="flex bg-slate-900/90 backdrop-blur-md rounded-lg overflow-hidden border border-white/10 shadow-lg">
                  <div
                    className="flex justify-center items-center px-1 bg-white/5 cursor-move hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                    onMouseDown={handleQTDragStart}
                    onTouchStart={handleQTDragStart}
                    title="Drag Widget"
                  >
                    <GripVertical size={14} />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      placeOrder("sell");
                    }}
                    className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white transition-colors flex flex-col items-center justify-center min-w-[50px] border-r border-slate-900/50"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Sell
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuickTrade(!showQuickTrade);
                    }}
                    className={`px-2 flex items-center justify-center transition-colors ${showQuickTrade ? "bg-azure text-slate-950" : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"}`}
                    title="Quick Trade Settings"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showQuickTrade ? "rotate-180" : ""}`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      placeOrder("buy");
                    }}
                    className="px-3 py-1.5 bg-green-500/90 hover:bg-green-500 text-white transition-colors flex flex-col items-center justify-center min-w-[50px] border-l border-slate-900/50"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Buy
                    </span>
                  </button>
                </div>

                {showQuickTrade && (
                  <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-1.5 animate-in slide-in-from-left-4 duration-300 pointer-events-auto w-[240px] max-h-[75vh] overflow-y-auto select-none">
                    {/* Header with Close Button in Top Left Corner */}
                    <div className="flex items-center justify-between pb-1 border-b border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQuickTrade(false);
                        }}
                        className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-md hover:bg-white/10 flex items-center justify-center"
                        title="Close Quick Trade"
                      >
                        <X size={12} />
                      </button>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest pr-1">
                        Quick Trade
                      </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white/5 p-0.5 rounded-lg">
                      <button
                        onClick={() => {
                          setOrderMode("market");
                        }}
                        className={`flex-1 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all ${orderMode === "market" ? "bg-azure text-slate-950 shadow" : "text-slate-400 hover:text-white"}`}
                      >
                        Market
                      </button>
                      <button
                        onClick={() => {
                          setOrderMode("pending");
                        }}
                        className={`flex-1 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all ${orderMode === "pending" ? "bg-azure text-slate-950 shadow" : "text-slate-400 hover:text-white"}`}
                      >
                        Pending
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {/* Lots - Common for both */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                            {TRADING_SYMBOLS["Crypto"]?.includes(symbol) ? `Amount (${symbol.split("/")[0]})` : "Volume (Lots)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLotsUpdate(Lots - 0.1); }}
                            className="w-6 h-6 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-md text-white transition-colors shrink-0"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="text"
                            value={lotsInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^\d*\.?\d*$/.test(val)) setLotsInput(val);
                            }}
                            onBlur={() => {
                              let validLots = parseFloat(lotsInput);
                              if (isNaN(validLots) || validLots <= 0) validLots = 0.01;
                              setLotsInput(validLots.toFixed(2));
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`flex-1 bg-transparent text-center font-mono font-bold text-xs outline-none min-w-0 ${maxAllowedLots > 0 && Lots > maxAllowedLots ? 'text-red-500' : 'text-white'}`}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLotsUpdate(Lots + 0.1); }}
                            className="w-6 h-6 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-md text-white transition-colors shrink-0"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {orderMode === "market" ? (
                        <>
                          {/* Preview Direction Toggle */}
                          <div className="flex flex-col gap-1 bg-white/5 border border-white/5 rounded-lg p-1">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block text-center">
                              Preview Direction
                            </span>
                            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-white/10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMarketPreviewDirection("buy");
                                }}
                                className={`flex-1 py-0.5 text-[8px] font-black uppercase tracking-wider rounded transition-all ${
                                  marketPreviewDirection === "buy"
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                Buy (Long)
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMarketPreviewDirection("sell");
                                }}
                                className={`flex-1 py-0.5 text-[8px] font-black uppercase tracking-wider rounded transition-all ${
                                  marketPreviewDirection === "sell"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                Sell (Short)
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider">SL</span>
                              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); adjustSl("down"); }}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white rounded-md transition-colors shrink-0"
                                >
                                  <Minus size={9} />
                                </button>
                                <input
                                  type="text"
                                  value={sl}
                                  onChange={(e) => setSl(e.target.value)}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className="flex-1 min-w-0 bg-transparent text-white font-mono text-center text-[9px] outline-none"
                                  placeholder="None"
                                />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); adjustSl("up"); }}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white rounded-md transition-colors shrink-0"
                                >
                                  <Plus size={9} />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-green-500 uppercase tracking-wider">TP</span>
                              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); adjustTp("down"); }}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white rounded-md transition-colors shrink-0"
                                >
                                  <Minus size={9} />
                                </button>
                                <input
                                  type="text"
                                  value={tp}
                                  onChange={(e) => setTp(e.target.value)}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className="flex-1 min-w-0 bg-transparent text-white font-mono text-center text-[9px] outline-none"
                                  placeholder="None"
                                />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); adjustTp("up"); }}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white rounded-md transition-colors shrink-0"
                                >
                                  <Plus size={9} />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                             <button
                                onClick={(e) => { e.stopPropagation(); placeOrder("sell"); }}
                                className="group relative overflow-hidden bg-red-500/10 hover:bg-red-500 border border-red-500/20 py-1 rounded-lg transition-all shadow active:scale-95 flex flex-col items-center"
                             >
                                <span className="relative z-10 text-[8px] font-black uppercase text-red-500 group-hover:text-white transition-colors">Sell</span>
                                <div className="text-[9px] font-mono font-bold text-red-500/70 group-hover:text-white/70">
                                   {price ? Number(price).toFixed(symbol.includes("JPY") ? 3 : 5) : "..."}
                                </div>
                             </button>
                             <button
                                onClick={(e) => { e.stopPropagation(); placeOrder("buy"); }}
                                className="group relative overflow-hidden bg-green-500/10 hover:bg-green-500 border border-green-500/20 py-1 rounded-lg transition-all shadow active:scale-95 flex flex-col items-center"
                             >
                                <span className="relative z-10 text-[8px] font-black uppercase text-green-500 group-hover:text-white transition-colors">Buy</span>
                                <div className="text-[9px] font-mono font-bold text-green-500/70 group-hover:text-white/70">
                                   {price ? Number(price).toFixed(symbol.includes("JPY") ? 3 : 5) : "..."}
                                </div>
                             </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {(() => {
                            const isBuyPending = pendingType.includes("buy");
                            const activeBg = isBuyPending ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20";
                            const activeText = isBuyPending ? "text-green-400" : "text-red-400";
                            const activeBadge = isBuyPending ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400";
                            const activeBtn = isBuyPending ? "bg-green-500 text-slate-950 shadow hover:bg-green-400" : "bg-red-500 text-slate-950 shadow hover:bg-red-400";
                            
                            return (
                              <>
                                <div className={`flex flex-col gap-1 p-1.5 ${activeBg} rounded-lg border transition-all duration-300`}>
                                  <div className="flex justify-between items-center">
                                     <span className={`text-[8px] font-bold ${activeText} uppercase tracking-wider`}>
                                       {isBuyPending ? "BUY PENDING" : "SELL PENDING"}
                                     </span>
                                     <span className={`text-[7px] ${activeBadge} px-1.5 py-0.5 rounded-full font-bold`}>ACTIVE</span>
                                  </div>
                                  <p className="text-[8px] text-slate-400 italic leading-snug">
                                     Drag the <span className={`${activeText} font-bold`}>{isBuyPending ? "GREEN" : "RED"}</span> line to set price. 
                                     Drag <span className="text-red-400 font-bold">RED</span> for SL and <span className="text-green-400 font-bold">GREEN</span> for TP.
                                  </p>
                                </div>
                                
                                {!showPendingConfirm ? (
                                  <button
                                     onClick={(e) => { e.stopPropagation(); setShowPendingConfirm(true); }}
                                     className={`w-full ${activeBtn} font-black uppercase tracking-wider py-1 rounded-lg hover:scale-[1.01] active:scale-95 transition-all flex flex-col items-center`}
                                  >
                                     <span className="text-[8px]">Place Pending Order</span>
                                     <span className="text-[9px] font-mono">{pendingType.toUpperCase()} @ {previewOrderPrice.toFixed(5)}</span>
                                  </button>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                     <p className={`text-[8px] text-center ${activeText} font-bold animate-pulse`}>Confirm Order?</p>
                                     <div className="flex gap-1.5">
                                        <button
                                           onClick={(e) => { e.stopPropagation(); setShowPendingConfirm(false); }}
                                           className="flex-1 bg-white/5 hover:bg-white/10 text-white/50 text-[8px] font-bold py-1 rounded-lg transition-all"
                                        >
                                           Back
                                        </button>
                                        <button
                                           onClick={(e) => { e.stopPropagation(); confirmPendingOrder(); }}
                                           className={`flex-[2] ${activeBtn} text-[8px] font-black uppercase py-1 rounded-lg shadow transition-all`}
                                        >
                                           Yes, Place Order
                                        </button>
                                     </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          
                          <button
                             onClick={() => { setIsPreviewActive(false); setOrderMode("market"); }}
                             className="w-full text-[8px] font-bold text-slate-500 hover:text-white uppercase transition-colors pt-0.5"
                          >
                             Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {showCopyToast && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-azure text-slate-950 px-6 py-3 rounded-2xl font-black shadow-[0_0_30px_rgba(59,130,246,0.6)] animate-in zoom-in duration-200 border-2 border-white/20 backdrop-blur-xl">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase tracking-tighter opacity-70">
                      Price Copied
                    </span>
                    <span className="text-xl font-mono">
                      {hoveredPrice?.toFixed(
                        symbol.includes("JPY")
                          ? 3
                          : symbol.includes("BTC") || symbol.includes("XAU")
                            ? 2
                            : 5,
                      )}
                    </span>
                  </div>
                </div>
              )}

              {isCrosshairActive && showCrosshairTooltip && hoveredPrice !== null && (
                <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1 mt-14">
                  <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Price
                    </p>
                    <p className="text-sm font-mono font-bold text-white leading-none">
                      {Number(hoveredPrice).toFixed(
                        symbol.includes("JPY")
                          ? 3
                          : symbol.includes("BTC") || symbol.includes("XAU")
                            ? 2
                            : 5,
                      )}
                    </p>
                  </div>
                  {hoveredTime && (
                    <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg w-fit">
                      <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">
                        {hoveredTime}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SVG Drawing Layer */}
              <svg
                ref={svgRef}
                onContextMenu={handleChartContextMenu}
                className={`absolute inset-0 z-20 ${activeTool !== "cursor" ? "pointer-events-auto" : "pointer-events-none"}`}
                style={{ width: "100%", height: "100%" }}
              >
                {renderDrawings()}
                {renderTimings()}
              </svg>

              {/* Custom Alarms Context Menu */}
              {terminalContextMenu && (
                <div
                  className="terminal-context-menu absolute z-[999] bg-slate-950/95 border border-amber-500/30 rounded-lg p-2.5 w-52 shadow-[0_12px_30px_rgba(0,0,0,0.85)] text-left font-mono text-[9px]"
                  style={{
                    left: `${Math.min(terminalContextMenu.x, svgDimensions.width - 225)}px`,
                    top: `${terminalContextMenu.y}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1.5">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Bell size={10} className="fill-amber-400/10 animate-bounce" />
                      <span className="font-extrabold uppercase tracking-wide text-[8px]">Price Alarm</span>
                    </div>
                    <button
                      onClick={() => setTerminalContextMenu(null)}
                      className="text-slate-500 hover:text-white p-0.5 rounded hover:bg-white/5 transition-colors"
                    >
                      <X size={9} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-slate-900 border border-white/5 rounded-md p-1.5 flex justify-between items-center">
                      <span className="text-slate-400 text-[7px] uppercase font-bold">Price:</span>
                      <span className="text-white text-[11px] font-bold leading-none">
                        ${terminalContextMenu.price.toFixed(symbol.includes("JPY") ? 3 : (symbol.includes("BTC") || symbol.includes("XAU") ? 2 : 5))}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          const activeAlarmsCount = terminalAlarms.filter(a => a.symbol === symbol && a.isActive && !a.isTriggered).length;
                          if (activeAlarmsCount >= 2) {
                            addNotification({
                              title: "⚠️ Limit Reached",
                              message: `You can have a maximum of 2 active alarms at the same time for ${symbol}. Please delete or disable an existing alarm.`,
                              type: "alert"
                            });
                            return;
                          }
                          const newAlarm = {
                            id: Math.random().toString(),
                            symbol: symbol,
                            price: terminalContextMenu.price,
                            isActive: true,
                            isTriggered: false
                          };
                          setTerminalAlarms((prev) => [...prev, newAlarm]);
                          addNotification({
                            title: "🔔 Alarm Added",
                            message: `Set price alarm at $${terminalContextMenu.price.toFixed(symbol.includes("JPY") ? 3 : (symbol.includes("BTC") || symbol.includes("XAU") ? 2 : 5))}`,
                            type: "success"
                          });
                          setTerminalContextMenu(null);
                        }}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-1 rounded bg-amber-500 hover:bg-amber-400 font-extrabold uppercase tracking-wider text-[7.5px] transition-all flex items-center justify-center gap-1"
                      >
                        <Plus size={9} strokeWidth={3} />
                        <span>Set Alarm</span>
                      </button>
                    </div>

                    {/* Sound and toggle state */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[7.5px]">
                      <span className="text-slate-500 font-bold uppercase">Alert Sound</span>
                      <button
                        onClick={() => setTerminalMuted(prev => !prev)}
                        className={`px-1.5 py-0.5 rounded font-bold uppercase transition-colors flex items-center gap-0.5 ${
                          terminalMuted 
                            ? 'bg-red-500/15 text-red-400 border border-red-500/10' 
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10'
                        }`}
                      >
                        {terminalMuted ? <BellOff size={8} /> : <Bell size={8} />}
                        <span>{terminalMuted ? "Muted" : "On"}</span>
                      </button>
                    </div>

                    {/* Alarms scrollable list specifically for this symbol */}
                    {terminalAlarms.filter(a => a.symbol === symbol).length > 0 && (
                      <div className="border-t border-white/5 pt-1.5">
                        <span className="text-slate-500 block mb-0.5 uppercase font-bold text-[7px]">Active Alarms ({terminalAlarms.filter(a => a.symbol === symbol && a.isActive).length})</span>
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                          {terminalAlarms.filter(a => a.symbol === symbol).map((alarm) => (
                            <div
                              key={alarm.id}
                              className={`flex justify-between items-center p-0.5 px-1 rounded bg-slate-900 border border-white/5 text-[7.5px] ${alarm.isTriggered ? 'opacity-40 line-through' : ''}`}
                            >
                              <span className="text-slate-300 font-bold">
                                ${alarm.price.toFixed(symbol.includes("JPY") ? 3 : (symbol.includes("BTC") || symbol.includes("XAU") ? 2 : 5))}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => {
                                    setTerminalAlarms(prev => {
                                      const existing = prev.find(a => a.id === alarm.id);
                                      if (existing && !existing.isActive && !existing.isTriggered) {
                                        // User is trying to activate the alarm
                                        const activeAlarmsCount = prev.filter(a => a.symbol === symbol && a.isActive && !a.isTriggered).length;
                                        if (activeAlarmsCount >= 2) {
                                          addNotification({
                                            title: "⚠️ Limit Reached",
                                            message: `You can have a maximum of 2 active alarms at the same time for ${symbol}.`,
                                            type: "alert"
                                          });
                                          return prev;
                                        }
                                      }
                                      return prev.map(a => a.id === alarm.id ? { ...a, isActive: !a.isActive, isTriggered: false } : a);
                                    });
                                  }}
                                  className={`text-[6px] px-1 py-0.5 rounded font-black ${
                                    alarm.isTriggered
                                      ? "bg-slate-800 text-slate-500"
                                      : alarm.isActive
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "bg-red-500/10 text-red-400"
                                  }`}
                                >
                                  {alarm.isTriggered ? "HIT" : alarm.isActive ? "ON" : "MUTED"}
                                </button>
                                <button
                                  onClick={() => setTerminalAlarms(prev => prev.filter(a => a.id !== alarm.id))}
                                  className="text-slate-500 hover:text-red-400 p-0.5"
                                >
                                  <X size={8} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {showConfig && (
              <div className="absolute top-4 right-4 z-20 bg-slate-900 border border-white/20 p-4 rounded-xl w-64 space-y-4 shadow-xl">
                <h4 className="text-white font-bold text-sm uppercase tracking-widest">
                  Chart Style
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label>Up Color</label>
                  <input
                    type="color"
                    value={candlestickConfig.upColor}
                    onChange={(e) =>
                      setCandlestickConfig((prev) => ({
                        ...prev,
                        upColor: e.target.value,
                      }))
                    }
                  />
                  <label>Down Color</label>
                  <input
                    type="color"
                    value={candlestickConfig.downColor}
                    onChange={(e) =>
                      setCandlestickConfig((prev) => ({
                        ...prev,
                        downColor: e.target.value,
                      }))
                    }
                  />
                  <label>Wick Up</label>
                  <input
                    type="color"
                    value={candlestickConfig.wickUpColor}
                    onChange={(e) =>
                      setCandlestickConfig((prev) => ({
                        ...prev,
                        wickUpColor: e.target.value,
                      }))
                    }
                  />
                  <label>Wick Down</label>
                  <input
                    type="color"
                    value={candlestickConfig.wickDownColor}
                    onChange={(e) =>
                      setCandlestickConfig((prev) => ({
                        ...prev,
                        wickDownColor: e.target.value,
                      }))
                    }
                  />
                  <label>Timezone</label>
                  <select
                    value={timezoneOffset}
                    onChange={(e) => setTimezoneOffset(Number(e.target.value))}
                    className="bg-slate-800 border border-white/10 rounded px-1 text-[10px] text-white"
                  >
                    {Array.from({ length: 25 }, (_, i) => i - 12).map((tz) => (
                      <option key={tz} value={tz} className="bg-slate-900 text-white">
                        UTC {tz >= 0 ? "+" : ""}
                        {tz}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center">Hover Tooltip</label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="toggle-hover-tooltip"
                      checked={showCrosshairTooltip}
                      onChange={(e) => setShowCrosshairTooltip(e.target.checked)}
                      className="rounded border-white/10 bg-slate-850 text-azure focus:ring-0 cursor-pointer h-3.5 w-3.5"
                    />
                  </div>
                  <label className="flex items-center text-slate-300">Hide Bid/Ask Labels</label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="toggle-hide-bid-ask-labels"
                      checked={hideBidAskLabels}
                      onChange={(e) => setHideBidAskLabels(e.target.checked)}
                      className="rounded border-white/10 bg-slate-850 text-azure focus:ring-0 cursor-pointer h-3.5 w-3.5"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowConfig(false)}
                  className="w-full py-2 bg-azure/20 text-azure font-bold rounded-lg mt-2"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

        
        {/* Bottom Panel */}
        <div
          className="h-4 cursor-row-resize bg-slate-900 border-y border-white/5 hover:bg-white/5 transition-colors w-full z-30 touch-none flex items-center justify-center shrink-0 group relative"
          onMouseDown={handleResizeMouseDown}
          onTouchStart={handleResizeMouseDown}
        >
          <div className="w-16 h-1 bg-white/10 rounded-full group-hover:bg-azure transition-colors" />
        </div>
        <div style={{ height: bottomPanelHeight }} className="border-t border-white/10 flex flex-col bg-slate-950 shrink-0 w-full z-20 overflow-hidden">
          <div className="flex px-4 border-b border-white/10 shrink-0 overflow-x-auto min-h-[40px]">
            <button
              onClick={() => setActiveBottomTab("positions")}
              className={`px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap ${activeBottomTab === "positions" ? "border-b-2 border-azure text-azure" : "text-slate-500 hover:text-white"}`}
            >
              Open Positions ({positions.length + pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveBottomTab("history")}
              className={`px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap ${activeBottomTab === "history" ? "border-b-2 border-azure text-azure" : "text-slate-500 hover:text-white"}`}
            >
              History ({history.length})
            </button>
          </div>
          <div className="flex-1 overflow-auto min-h-0 bg-slate-900/30">
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
                    <thead className="sticky top-0 bg-slate-900 z-10 shadow-md">
                      <tr className="border-b border-white/10 text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest bg-slate-950/80">
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
                        <tr key={i} className={`border-b border-white/5 hover:bg-white-[0.02] text-xs font-mono group ${p.isNewsTrade ? 'bg-red-500/10 hover:bg-red-500/20' : ''}`}>
                          <td className="py-2 px-3 font-bold text-white font-sans">
                            {p.symbol}
                            {p.isNewsTrade && <span className="ml-2 text-[9px] bg-red-500 text-white px-1 py-0.5 rounded uppercase">News</span>}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-[9px] md:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${p.type === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.lots).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.open_price).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5))}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{prices[p.symbol]?.toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) || "..."}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{p.sl ? Number(p.sl).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{p.tp ? Number(p.tp).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className={`py-2 px-3 text-right font-bold ${getPositionPnL(p) >= 0 ? "text-green-400" : "text-red-400"}`}>
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
                              <button onClick={() => handleCloseClick(p)} className="text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-white px-2 py-1 bg-red-500/10 hover:bg-red-500/30 rounded">
                                Close
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* PENDING ORDERS */}
                      {pendingOrders.map((p) => (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white-[0.02] text-xs font-mono group opacity-70">
                          <td className="py-2 px-3 font-bold text-white font-sans">{p.symbol}</td>
                          <td className="py-2 px-3">
                            <span className="text-[9px] md:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-azure/10 text-azure">
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.lots).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.target_price).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5))} <span className="text-[9.5px] text-slate-500">(Target)</span></td>
                          <td className="py-2 px-3 text-right text-slate-400">{prices[p.symbol]?.toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) || "..."}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{p.sl ? Number(p.sl).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className="py-2 px-3 text-right text-slate-400">{p.tp ? Number(p.tp).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-500">
                            Pending
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex gap-2 justify-end opacity-50 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setPendingOrders(prev => prev.filter(pos => pos.id !== p.id))} 
                                className="text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-white px-2 py-1 bg-red-500/10 hover:bg-red-500/30 rounded"
                              >
                                Cancel Order
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
                    <thead className="sticky top-0 bg-slate-900 z-10 shadow-md">
                      <tr className="border-b border-white/10 text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest bg-slate-950/80">
                        <th className="py-2 px-3 font-medium">Symbol</th>
                        <th className="py-2 px-3 font-medium">Type</th>
                        <th className="py-2 px-3 font-medium text-right">Lots</th>
                        <th className="py-2 px-3 font-medium text-right">Open Price</th>
                        <th className="py-2 px-3 font-medium text-right">Close Price</th>
                        <th className="py-2 px-3 font-medium text-right">S/L</th>
                        <th className="py-2 px-3 font-medium text-right">T/P</th>
                        <th className="py-2 px-3 font-medium text-right">PnL</th>
                        <th className="py-2 px-3 font-medium text-center">Open/Close Time</th>
                        <th className="py-2 px-3 font-medium text-right">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((p, i) => (
                        <tr key={i} className={`border-b border-white/5 hover:bg-white-[0.02] text-xs font-mono group opacity-80 hover:opacity-100 ${p.isNewsTrade ? 'bg-red-500/10' : ''}`}>
                          <td className="py-2 px-3 font-bold text-white font-sans">
                            {p.symbol}
                            {p.isNewsTrade && <span className="ml-2 text-[9px] bg-red-500 text-white px-1 py-0.5 rounded uppercase">News</span>}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-[9px] md:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${p.type === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.lots).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.open_price).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5))}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(p.close_price).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5))}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{p.sl ? Number(p.sl).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{p.tp ? Number(p.tp).toFixed(p.symbol.includes("JPY") ? 3 : (p.symbol.includes("BTC")||p.symbol.includes("XAU") ? 2 : 5)) : "-"}</td>
                          <td className={`py-2 px-3 text-right font-bold ${parseFloat(p.pnl) >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {parseFloat(p.pnl) >= 0 ? "+" : ""}{parseFloat(p.pnl).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} $
                          </td>
                          <td className="py-2 px-3 text-center text-[10px] text-slate-400 select-all">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-green-400/85">In: {p.open_time ? new Date(p.open_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date(p.open_time).toLocaleDateString([], { month: '2-digit', day: '2-digit' }) : '---'}</span>
                              <span className="text-rose-400/85">Out: {p.close_time ? new Date(p.close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date(p.close_time).toLocaleDateString([], { month: '2-digit', day: '2-digit' }) : (p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date(p.timestamp).toLocaleDateString([], { month: '2-digit', day: '2-digit' }) : '---')}</span>
                            </div>
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
    </div>

      {closingPosition && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm flex flex-col gap-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold uppercase tracking-widest text-sm">Close Position</h3>
              <button 
                onClick={() => setClosingPosition(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Symbol</span>
                <span className="text-white font-bold">{closingPosition.symbol}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Type</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${closingPosition.type === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {closingPosition.type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Lots</span>
                <span className="text-white font-mono">{Number(closingPosition.lots).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Est. P/L</span>
                {(() => {
                  const currentPrice = prices[closingPosition.symbol];
                  const totalPnl = getPositionPnL(closingPosition);
                  const lotsToClose = parseFloat(closeLots);
                  const validLots = isNaN(lotsToClose) ? 0 : Math.min(lotsToClose / closingPosition.lots, 1);
                  const displayPnl = totalPnl * validLots;
                  return (
                    <div className="flex flex-col items-end">
                       <span className={`font-mono font-bold ${displayPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                         {displayPnl >= 0 ? "+" : "-"}${Math.abs(displayPnl).toFixed(2)}
                       </span>
                       <span className="text-[9px] text-slate-500">
                          @ {currentPrice ? currentPrice.toFixed(5) : "---"}
                       </span>
                    </div>
                  );
                })()}
              </div>
              
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Lots to Close</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={closingPosition.lots}
                  value={closeLots}
                  onChange={(e) => setCloseLots(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-center focus:outline-none focus:border-azure"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => setClosingPosition(null)}
                  className="py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitClosePosition}
                  className="py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30 font-mono shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                >
                  Close {parseFloat(closeLots) < closingPosition.lots ? "Partial" : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {slConfirmState && (
        <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-150">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm flex flex-col gap-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-white font-bold uppercase tracking-widest text-xs flex items-center gap-1.5">
                <span className={slConfirmState.type === "sl" ? "text-red-500" : "text-green-500"}>●</span>
                Confirm {slConfirmState.type === "sl" ? "Stop Loss" : "Take Profit"}
              </h3>
              <button 
                onClick={handleCancelSlTp}
                className="text-slate-500 hover:text-white transition-colors"
                id="cancel-confirm-sltp-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="text-center py-2 space-y-2 font-sans">
              <p className="text-xs text-slate-300">
                Are you sure you want to set your {slConfirmState.type === "sl" ? "Stop Loss" : "Take Profit"} here?
              </p>
              <div className="bg-slate-950/60 border border-white/5 py-3 px-4 rounded-xl font-mono text-xl font-bold text-white tracking-wide">
                Price: {slConfirmState.price.toFixed(getDecimalsForSymbol(symbol))}
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancelSlTp}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10 hover:bg-white/5 text-slate-300 transition-colors"
                id="dismiss-sltp-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSlTp}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-950 transition-colors ${
                  slConfirmState.type === "sl" 
                    ? "bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/20" 
                    : "bg-green-500 hover:bg-green-400 shadow-lg shadow-green-500/20"
                }`}
                id="approve-sltp-btn"
              >
                Yes, Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Calculator Modal */}
      {isRiskModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-white">
                <Calculator size={18} className="text-azure" />
                <h3 className="font-bold uppercase tracking-widest text-sm">Risk Calculator</h3>
              </div>
              <button
                onClick={() => setIsRiskModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto scrollbar-hide">
              {/* Symbol Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Trading Pair
                </label>
                <select
                  value={riskCalcSymbol}
                  onChange={(e) => setRiskCalcSymbol(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-azure transition-colors appearance-none"
                >
                   {Object.keys(prices).length > 0 ? (
                     Object.keys(prices).map((s) => (
                       <option key={s} value={s}>{s}</option>
                     ))
                   ) : (
                     <option value={symbol}>{symbol}</option>
                   )}
                </select>
              </div>

              {/* Account Balance */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Account Balance ($)
                </label>
                <input
                  type="number"
                  value={riskCalcAccountBalance}
                  onChange={(e) => setRiskCalcAccountBalance(Number(e.target.value))}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-azure transition-colors"
                />
              </div>

              {/* Risk Percentage */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Risk Percentage (%)
                  </label>
                  <span className="text-xs font-mono text-azure">
                    ${((riskCalcAccountBalance * riskCalcPercent) / 100).toFixed(2)}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={riskCalcPercent}
                  onChange={(e) => setRiskCalcPercent(Number(e.target.value))}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-azure transition-colors"
                />
              </div>

              {/* Stop Loss (Pips) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {riskCalcSymbol.includes("BTC") || riskCalcSymbol.includes("ETH") || riskCalcSymbol.includes("SOL") ? "Stop Loss ($ Distance)" : "Stop Loss (Pips)"}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={riskCalcSLPips}
                  onChange={(e) => setRiskCalcSLPips(Number(e.target.value))}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-azure transition-colors"
                />
              </div>

              {/* Results & Action */}
              <div className="bg-azure/10 border border-azure/30 rounded-xl p-4 mt-2">
                <div className="flex justify-between items-end mb-4">
                  <div className="text-[10px] font-bold text-azure uppercase tracking-widest">
                    {riskCalcSymbol.includes("BTC") || riskCalcSymbol.includes("ETH") || riskCalcSymbol.includes("SOL") ? `Recommended Amount (${riskCalcSymbol.split("/")[0]})` : "Recommended Lot Size"}
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {(() => {
                      const riskAmount = (riskCalcAccountBalance * riskCalcPercent) / 100;
                      const currentPrice = prices[riskCalcSymbol] || (riskCalcSymbol === symbol ? price : 1);
                      const pipValPerLot = getPipValuePerLot(riskCalcSymbol, currentPrice);
                      const calculatedLots = riskAmount / ((riskCalcSLPips > 0 ? riskCalcSLPips : 1) * (pipValPerLot || 1));
                      let contractSize = getContractSizeForSymbol(riskCalcSymbol);
                      
                      let basePriceInUSD = 1;
                      const baseCurrency = riskCalcSymbol.split("/")[0];
                      if (baseCurrency !== "USD" && baseCurrency) {
                         basePriceInUSD = prices[`${baseCurrency}/USD`] || (prices[`USD/${baseCurrency}`] ? 1 / prices[`USD/${baseCurrency}`] : currentPrice);
                      }
                      
                      const maxLeverage = globalSettings.leverageCap;
                      const maxLotsByLeverage = Math.max(0, (riskCalcAccountBalance * maxLeverage) / (basePriceInUSD * contractSize));
                      const finalLots = Math.min(calculatedLots, maxLotsByLeverage);
                      return Math.max(0.01, Math.round(finalLots * 100) / 100).toFixed(2);
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const riskAmount = (riskCalcAccountBalance * riskCalcPercent) / 100;
                     const currentPrice = prices[riskCalcSymbol] || (riskCalcSymbol === symbol ? price : 1);
                    const pipValPerLot = getPipValuePerLot(riskCalcSymbol, currentPrice);
                    const calculatedLots = riskAmount / ((riskCalcSLPips > 0 ? riskCalcSLPips : 1) * (pipValPerLot || 1));
                    let contractSize = getContractSizeForSymbol(riskCalcSymbol);
                    
                    let basePriceInUSD = 1;
                    const baseCurrency = riskCalcSymbol.split("/")[0];
                    if (baseCurrency !== "USD" && baseCurrency) {
                       basePriceInUSD = prices[`${baseCurrency}/USD`] || (prices[`USD/${baseCurrency}`] ? 1 / prices[`USD/${baseCurrency}`] : currentPrice);
                    }
                    
                    const maxLeverage = globalSettings.leverageCap;
                    const maxLotsByLeverage = Math.max(0, (riskCalcAccountBalance * maxLeverage) / (basePriceInUSD * contractSize));
                    const finalLots = Math.min(calculatedLots, maxLotsByLeverage);
                    if (riskCalcSymbol !== symbol) {
                       setSymbol(riskCalcSymbol); // Auto-switch if calculating for different symbol
                    }
                    handleLotsUpdate(Math.max(0.01, Math.round(finalLots * 100) / 100));
                    setIsRiskModalOpen(false);
                  }}
                  className="w-full py-3 bg-azure text-slate-950 font-bold uppercase tracking-widest text-xs rounded-xl shadow-[0_0_15px_rgba(0,242,255,0.4)] hover:bg-cyan-400 transition-colors"
                >
                  Apply Lot Size
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isVwapSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 select-none settings-popup">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-azure" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">VWAP Settings</h3>
              </div>
              <button
                onClick={() => setIsVwapSettingsOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="px-6 py-2 bg-slate-950/40 border-b border-white/5 flex gap-4">
              <button
                onClick={() => setVwapSettingsTab("inputs")}
                className={`text-[10px] font-bold uppercase tracking-widest py-2 transition-colors border-b-2 ${
                  vwapSettingsTab === "inputs"
                    ? "border-azure text-azure"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Inputs
              </button>
              <button
                onClick={() => setVwapSettingsTab("style")}
                className={`text-[10px] font-bold uppercase tracking-widest py-2 transition-colors border-b-2 ${
                  vwapSettingsTab === "style"
                    ? "border-azure text-azure"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Style
              </button>
            </div>

            {/* Content Container */}
            <div className="p-6 max-h-[380px] overflow-y-auto space-y-5 custom-scrollbar">
              {vwapSettingsTab === "inputs" ? (
                <>
                  {/* Anchor Period Select */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Anchor Period</span>
                      <span className="text-[8px] text-slate-500 uppercase font-mono">VWAP reset interval</span>
                    </div>
                    <select
                      value={vwapConfig.anchor}
                      onChange={(e) => setVwapConfig(prev => ({ ...prev, anchor: e.target.value }))}
                      className="bg-slate-950 border border-white/10 rounded-lg text-xs text-white px-2.5 py-1.5 focus:border-azure focus:outline-none cursor-pointer"
                    >
                      <option value="Session">Session</option>
                      <option value="Week">Week</option>
                      <option value="Month">Month</option>
                      <option value="Quarter">Quarter</option>
                      <option value="Year">Year</option>
                    </select>
                  </div>

                  {/* Bands Calculation Mode */}
                  <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Bands Calculation Mode</span>
                      <span className="text-[8px] text-slate-500 uppercase font-mono">Standard Deviation or Percent</span>
                    </div>
                    <select
                      value={vwapConfig.calcMode}
                      onChange={(e) => setVwapConfig(prev => ({ ...prev, calcMode: e.target.value as any }))}
                      className="bg-slate-950 border border-white/10 rounded-lg text-xs text-white px-2.5 py-1.5 focus:border-azure focus:outline-none cursor-pointer"
                    >
                      <option value="Standard Deviation">Standard Deviation</option>
                      <option value="Percentage">Percentage</option>
                    </select>
                  </div>

                  {/* Multipliers Grid */}
                  <div className="border-t border-white/5 pt-4 space-y-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">Band Multipliers</span>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Band 1</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0.01"
                          max="20.0"
                          value={vwapConfig.bandMult1}
                          onChange={(e) => setVwapConfig(prev => ({ ...prev, bandMult1: Math.max(0.01, parseFloat(e.target.value) || 1.0) }))}
                          className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-lg font-mono text-xs text-white text-center focus:border-azure focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Band 2</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0.01"
                          max="20.0"
                          value={vwapConfig.bandMult2}
                          onChange={(e) => setVwapConfig(prev => ({ ...prev, bandMult2: Math.max(0.01, parseFloat(e.target.value) || 2.0) }))}
                          className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-lg font-mono text-xs text-white text-center focus:border-azure focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Band 3</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0.01"
                          max="20.0"
                          value={vwapConfig.bandMult3}
                          onChange={(e) => setVwapConfig(prev => ({ ...prev, bandMult3: Math.max(0.01, parseFloat(e.target.value) || 3.0) }))}
                          className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-lg font-mono text-xs text-white text-center focus:border-azure focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Central VWAP Line */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vwapConfig.showVwap}
                          onChange={(e) => setVwapConfig(prev => ({ ...prev, showVwap: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        VWAP Central Line
                      </label>
                    </div>
                    {vwapConfig.showVwap && (
                      <div className="grid grid-cols-2 gap-4 pl-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={vwapConfig.vwapColor}
                              onChange={(e) => setVwapConfig(prev => ({ ...prev, vwapColor: e.target.value }))}
                              className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-[9px] font-mono text-slate-300 uppercase">{vwapConfig.vwapColor}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Width ({vwapConfig.vwapWidth}px)</span>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="0.5"
                            value={vwapConfig.vwapWidth}
                            onChange={(e) => setVwapConfig(prev => ({ ...prev, vwapWidth: parseFloat(e.target.value) }))}
                            className="w-full accent-azure bg-slate-950 h-1.5 rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Band 1 Styles */}
                  <div className="space-y-3 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vwapConfig.showBand1}
                          onChange={(e) => setVwapConfig(prev => ({ ...prev, showBand1: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Band 1 (Mult: {vwapConfig.bandMult1})
                      </label>
                    </div>
                    {vwapConfig.showBand1 && (
                      <div className="space-y-3 pl-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Upper Color</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={vwapConfig.upperColor1}
                                onChange={(e) => setVwapConfig(prev => ({ ...prev, upperColor1: e.target.value }))}
                                className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                              />
                              <span className="text-[9px] font-mono text-slate-300 uppercase">{vwapConfig.upperColor1}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Lower Color</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={vwapConfig.lowerColor1}
                                onChange={(e) => setVwapConfig(prev => ({ ...prev, lowerColor1: e.target.value }))}
                                className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                              />
                              <span className="text-[9px] font-mono text-slate-300 uppercase">{vwapConfig.lowerColor1}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Width ({vwapConfig.bandWidth1}px)</span>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="0.5"
                            value={vwapConfig.bandWidth1}
                            onChange={(e) => setVwapConfig(prev => ({ ...prev, bandWidth1: parseFloat(e.target.value) }))}
                            className="w-full accent-azure bg-slate-950 h-1.5 rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Band 2 Styles */}
                  <div className="space-y-3 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vwapConfig.showBand2}
                          onChange={(e) => setVwapConfig(prev => ({ ...prev, showBand2: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Band 2 (Mult: {vwapConfig.bandMult2})
                      </label>
                    </div>
                    {vwapConfig.showBand2 && (
                      <div className="space-y-3 pl-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Upper Color</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={vwapConfig.upperColor2}
                                onChange={(e) => setVwapConfig(prev => ({ ...prev, upperColor2: e.target.value }))}
                                className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                              />
                              <span className="text-[9px] font-mono text-slate-300 uppercase">{vwapConfig.upperColor2}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Lower Color</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={vwapConfig.lowerColor2}
                                onChange={(e) => setVwapConfig(prev => ({ ...prev, lowerColor2: e.target.value }))}
                                className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                              />
                              <span className="text-[9px] font-mono text-slate-300 uppercase">{vwapConfig.lowerColor2}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Width ({vwapConfig.bandWidth2}px)</span>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="0.5"
                            value={vwapConfig.bandWidth2}
                            onChange={(e) => setVwapConfig(prev => ({ ...prev, bandWidth2: parseFloat(e.target.value) }))}
                            className="w-full accent-azure bg-slate-950 h-1.5 rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Band 3 Styles */}
                  <div className="space-y-3 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vwapConfig.showBand3}
                          onChange={(e) => setVwapConfig(prev => ({ ...prev, showBand3: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Band 3 (Mult: {vwapConfig.bandMult3})
                      </label>
                    </div>
                    {vwapConfig.showBand3 && (
                      <div className="space-y-3 pl-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Upper Color</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={vwapConfig.upperColor3}
                                onChange={(e) => setVwapConfig(prev => ({ ...prev, upperColor3: e.target.value }))}
                                className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                              />
                              <span className="text-[9px] font-mono text-slate-300 uppercase">{vwapConfig.upperColor3}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Lower Color</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={vwapConfig.lowerColor3}
                                onChange={(e) => setVwapConfig(prev => ({ ...prev, lowerColor3: e.target.value }))}
                                className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                              />
                              <span className="text-[9px] font-mono text-slate-300 uppercase">{vwapConfig.lowerColor3}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Width ({vwapConfig.bandWidth3}px)</span>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="0.5"
                            value={vwapConfig.bandWidth3}
                            onChange={(e) => setVwapConfig(prev => ({ ...prev, bandWidth3: parseFloat(e.target.value) }))}
                            className="w-full accent-azure bg-slate-950 h-1.5 rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-950/50 border-t border-white/5 flex items-center justify-between">
              <button
                onClick={() => {
                  setVwapConfig({
                    anchor: "Session",
                    calcMode: "Standard Deviation",
                    showVwap: true,
                    vwapColor: "#3b82f6",
                    vwapWidth: 2,
                    showBand1: true,
                    bandMult1: 1.0,
                    upperColor1: "#10b981",
                    lowerColor1: "#ef4444",
                    bandWidth1: 1.5,
                    showBand2: true,
                    bandMult2: 2.0,
                    upperColor2: "#06b6d4",
                    lowerColor2: "#ec4899",
                    bandWidth2: 1.5,
                    showBand3: true,
                    bandMult3: 3.0,
                    upperColor3: "#f59e0b",
                    lowerColor3: "#8b5cf6",
                    bandWidth3: 1.5,
                  });
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsVwapSettingsOpen(false)}
                className="px-4 py-2 bg-azure text-slate-950 font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(0,242,255,0.2)]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {isTimingsSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 select-none settings-popup">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-azure" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">LIT Timings Settings</h3>
              </div>
              <button
                onClick={() => setIsTimingsSettingsOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="px-6 py-2 bg-slate-950/40 border-b border-white/5 flex gap-4">
              <button
                onClick={() => setTimingsSettingsTab("sessions")}
                className={`text-[10px] font-bold uppercase tracking-widest py-2 transition-colors border-b-2 ${
                  timingsSettingsTab === "sessions"
                    ? "border-azure text-azure"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Sessions
              </button>
              <button
                onClick={() => setTimingsSettingsTab("lines")}
                className={`text-[10px] font-bold uppercase tracking-widest py-2 transition-colors border-b-2 ${
                  timingsSettingsTab === "lines"
                    ? "border-azure text-azure"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Vertical Lines
              </button>
              <button
                onClick={() => setTimingsSettingsTab("daily")}
                className={`text-[10px] font-bold uppercase tracking-widest py-2 transition-colors border-b-2 ${
                  timingsSettingsTab === "daily"
                    ? "border-azure text-azure"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Daily Open
              </button>
            </div>

            {/* Content Container */}
            <div className="p-6 max-h-[380px] overflow-y-auto space-y-5 custom-scrollbar text-left">
              {timingsSettingsTab === "sessions" && (
                <>
                  {/* Asian Session Configuration */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-azure block">Asian Session</span>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Range Time</span>
                        <LITTimePicker
                          value={timingsConfig.asianRangeTime}
                          onChange={(val) => setTimingsConfig(prev => ({ ...prev, asianRangeTime: val }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Border Color</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={timingsConfig.asianLineColor}
                            onChange={(e) => setTimingsConfig(prev => ({ ...prev, asianLineColor: e.target.value }))}
                            className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                          />
                          <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.asianLineColor}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Middle Line Color</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={timingsConfig.asianMidColor}
                            onChange={(e) => setTimingsConfig(prev => ({ ...prev, asianMidColor: e.target.value }))}
                            className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                          />
                          <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.asianMidColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Box Fill Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={timingsConfig.asianBgColor.startsWith('rgba') ? '#9c27b0' : timingsConfig.asianBgColor}
                          onChange={(e) => {
                            const hex = e.target.value;
                            // Convert to rgba with 10% opacity for tradingview background vibe
                            const r = parseInt(hex.slice(1,3), 16);
                            const g = parseInt(hex.slice(3,5), 16);
                            const b = parseInt(hex.slice(5,7), 16);
                            setTimingsConfig(prev => ({ ...prev, asianBgColor: `rgba(${r}, ${g}, ${b}, 0.1)` }));
                          }}
                          className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                        />
                        <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.asianBgColor}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showAsianLines}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showAsianLines: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Show Range Border Box
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showAsianBackground}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showAsianBackground: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Show Box Background Fill
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showAsianMid}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showAsianMid: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Show Middle Line (Precise Midpoint)
                      </label>
                    </div>

                    <div className="flex flex-col gap-1 pt-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Line Width ({timingsConfig.asianLineWidth}px)</span>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={timingsConfig.asianLineWidth}
                        onChange={(e) => setTimingsConfig(prev => ({ ...prev, asianLineWidth: parseInt(e.target.value, 10) }))}
                        className="w-full accent-azure bg-slate-950 h-1.5 rounded"
                      />
                    </div>
                  </div>

                  {/* London Session Configuration */}
                  <div className="space-y-4 border-t border-white/5 pt-4 mt-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-azure block">London Session</span>
                    
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Range Time</span>
                        <LITTimePicker
                          value={timingsConfig.londonRangeTime}
                          onChange={(val) => setTimingsConfig(prev => ({ ...prev, londonRangeTime: val }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Border Color</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={timingsConfig.londonLineColor}
                            onChange={(e) => setTimingsConfig(prev => ({ ...prev, londonLineColor: e.target.value }))}
                            className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                          />
                          <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.londonLineColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Box Fill Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={timingsConfig.londonBgColor.startsWith('rgba') ? '#00bcd4' : timingsConfig.londonBgColor}
                          onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1,3), 16);
                            const g = parseInt(hex.slice(3,5), 16);
                            const b = parseInt(hex.slice(5,7), 16);
                            setTimingsConfig(prev => ({ ...prev, londonBgColor: `rgba(${r}, ${g}, ${b}, 0.1)` }));
                          }}
                          className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                        />
                        <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.londonBgColor}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showLondonLines}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showLondonLines: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Show Range Border Box
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showLondonBackground}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showLondonBackground: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Show Box Background Fill
                      </label>
                    </div>

                    <div className="flex flex-col gap-1 pt-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Line Width ({timingsConfig.londonLineWidth}px)</span>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={timingsConfig.londonLineWidth}
                        onChange={(e) => setTimingsConfig(prev => ({ ...prev, londonLineWidth: parseInt(e.target.value, 10) }))}
                        className="w-full accent-azure bg-slate-950 h-1.5 rounded"
                      />
                    </div>
                  </div>

                  {/* New York Session Configuration */}
                  <div className="space-y-4 border-t border-white/5 pt-4 mt-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-azure block">New York Session</span>
                    
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Range Time</span>
                        <LITTimePicker
                          value={timingsConfig.nyRangeTime}
                          onChange={(val) => setTimingsConfig(prev => ({ ...prev, nyRangeTime: val }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Border Color</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={timingsConfig.nyLineColor}
                            onChange={(e) => setTimingsConfig(prev => ({ ...prev, nyLineColor: e.target.value }))}
                            className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                          />
                          <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.nyLineColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Box Fill Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={timingsConfig.nyBgColor.startsWith('rgba') ? '#4caf50' : timingsConfig.nyBgColor}
                          onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1,3), 16);
                            const g = parseInt(hex.slice(3,5), 16);
                            const b = parseInt(hex.slice(5,7), 16);
                            setTimingsConfig(prev => ({ ...prev, nyBgColor: `rgba(${r}, ${g}, ${b}, 0.1)` }));
                          }}
                          className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                        />
                        <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.nyBgColor}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showNyLines}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showNyLines: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Show Range Border Box
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showNyBackground}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showNyBackground: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Show Box Background Fill
                      </label>
                    </div>

                    <div className="flex flex-col gap-1 pt-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Line Width ({timingsConfig.nyLineWidth}px)</span>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={timingsConfig.nyLineWidth}
                        onChange={(e) => setTimingsConfig(prev => ({ ...prev, nyLineWidth: parseInt(e.target.value, 10) }))}
                        className="w-full accent-azure bg-slate-950 h-1.5 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {timingsSettingsTab === "lines" && (
                <div className="space-y-5">
                  {/* Frankfurt Vertical */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showFF}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showFF: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Frankfurt (FF) Vertical
                      </label>
                    </div>
                    {timingsConfig.showFF && (
                      <div className="grid grid-cols-2 gap-4 pl-6 items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Time</span>
                          <LITTimePicker
                            value={timingsConfig.ffRange}
                            onChange={(val) => setTimingsConfig(prev => ({ ...prev, ffRange: val }))}
                            type="single"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={timingsConfig.ffColor}
                              onChange={(e) => setTimingsConfig(prev => ({ ...prev, ffColor: e.target.value }))}
                              className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.ffColor}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MMM1 Vertical */}
                  <div className="space-y-2.5 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showMmm1}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showMmm1: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Macro MMM 1 Vertical
                      </label>
                    </div>
                    {timingsConfig.showMmm1 && (
                      <div className="grid grid-cols-2 gap-4 pl-6 items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Time</span>
                          <LITTimePicker
                            value={timingsConfig.mmm1Range}
                            onChange={(val) => setTimingsConfig(prev => ({ ...prev, mmm1Range: val }))}
                            type="single"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={timingsConfig.mmm1Color}
                              onChange={(e) => setTimingsConfig(prev => ({ ...prev, mmm1Color: e.target.value }))}
                              className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.mmm1Color}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MMM2 Vertical */}
                  <div className="space-y-2.5 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showMmm2}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showMmm2: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Macro MMM 2 Vertical
                      </label>
                    </div>
                    {timingsConfig.showMmm2 && (
                      <div className="grid grid-cols-2 gap-4 pl-6 items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Time</span>
                          <LITTimePicker
                            value={timingsConfig.mmm2Range}
                            onChange={(val) => setTimingsConfig(prev => ({ ...prev, mmm2Range: val }))}
                            type="single"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={timingsConfig.mmm2Color}
                              onChange={(e) => setTimingsConfig(prev => ({ ...prev, mmm2Color: e.target.value }))}
                              className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.mmm2Color}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* London Close Vertical */}
                  <div className="space-y-2.5 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showLc}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showLc: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        London Close (LC) Vertical
                      </label>
                    </div>
                    {timingsConfig.showLc && (
                      <div className="grid grid-cols-2 gap-4 pl-6 items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Time</span>
                          <LITTimePicker
                            value={timingsConfig.lcRange}
                            onChange={(val) => setTimingsConfig(prev => ({ ...prev, lcRange: val }))}
                            type="single"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={timingsConfig.lcColor}
                              onChange={(e) => setTimingsConfig(prev => ({ ...prev, lcColor: e.target.value }))}
                              className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                            <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.lcColor}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {timingsSettingsTab === "daily" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timingsConfig.showDailyOpen}
                          onChange={(e) => setTimingsConfig(prev => ({ ...prev, showDailyOpen: e.target.checked }))}
                          className="rounded border-white/10 bg-slate-950 text-azure focus:ring-azure/30"
                        />
                        Show Daily Open (DO) Line
                      </label>
                    </div>
                    {timingsConfig.showDailyOpen && (
                      <div className="flex flex-col gap-1 pl-6">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Line Color</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={timingsConfig.dailyOpenColor}
                            onChange={(e) => setTimingsConfig(prev => ({ ...prev, dailyOpenColor: e.target.value }))}
                            className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                          />
                          <span className="text-[9px] font-mono text-slate-300 uppercase">{timingsConfig.dailyOpenColor}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-950/50 border-t border-white/5 flex items-center justify-between">
              <button
                onClick={() => {
                  setTimingsConfig({
                    showAsianLines: true,
                    showAsianBackground: true,
                    showAsianMid: true,
                    asianRangeTime: '1700-0100',
                    asianLineWidth: 1,
                    asianLineColor: '#9c27b0',
                    asianMidColor: '#9c27b0',
                    asianBgColor: 'rgba(156, 39, 176, 0.1)',

                    showLondonLines: true,
                    showLondonBackground: true,
                    londonRangeTime: '0300-0400',
                    londonLineWidth: 1,
                    londonLineColor: '#00bcd4',
                    londonBgColor: 'rgba(0, 188, 212, 0.1)',

                    showNyLines: true,
                    showNyBackground: true,
                    nyRangeTime: '0800-0900',
                    nyLineWidth: 1,
                    nyLineColor: '#4caf50',
                    nyBgColor: 'rgba(76, 175, 80, 0.1)',

                    showFF: true,
                    ffRange: '0200-0201',
                    ffColor: '#ffffff',
                    showMmm1: true,
                    mmm1Range: '0430-0431',
                    mmm1Color: '#ffffff',
                    showMmm2: true,
                    mmm2Range: '0630-0631',
                    mmm2Color: '#ffffff',
                    showLc: true,
                    lcRange: '1100-1101',
                    lcColor: '#ffffff',

                    showDailyOpen: true,
                    dailyOpenColor: '#f59e0b',
                  });
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsTimingsSettingsOpen(false)}
                className="px-4 py-2 bg-azure text-slate-950 font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(0,242,255,0.2)]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {settingsPopup && (
        <ToolSettingsPopup
          color={drawColor}
          thickness={drawThickness}
          onColorChange={setDrawColor}
          onThicknessChange={setDrawThickness}
          onClose={() => setSettingsPopup(null)}
          position={settingsPopup.position}
        />
      )}

      {/* Floating Price Alerts Corner Overlay Stack */}
      <div className="fixed top-24 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeTerminalAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 100, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.25 } }}
              className="relative overflow-hidden bg-slate-950/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-[0_12px_45px_rgba(245,158,11,0.25)] flex items-start gap-4 text-left border-l-[6px] border-l-amber-500 pointer-events-auto select-none"
            >
              <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
              <div className="bg-amber-500/10 p-2 text-amber-400 shrink-0 self-center animate-pulse">
                <Bell size={18} className="fill-amber-400/10" />
              </div>
              <div className="font-mono flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase">ALARM TRIGGERED</span>
                  <span className="text-[7.5px] text-slate-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-white font-bold mt-1">
                  Price of <span className="text-cyan-400 font-extrabold">{alert.symbol}</span> reached the alert of <span className="text-amber-400 font-extrabold underline">${alert.price.toFixed(alert.symbol.includes("JPY") ? 3 : (alert.symbol.includes("BTC") || alert.symbol.includes("XAU") ? 2 : 5))}</span>
                </p>
                <p className="text-[7.5px] text-slate-400 mt-0.5 leading-tight uppercase">
                  The configured target price threshold has been crossed.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTerminalAlerts(prev => prev.filter(pi => pi.id !== alert.id));
                }}
                className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-md transition-colors"
                aria-label="Close alert"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
