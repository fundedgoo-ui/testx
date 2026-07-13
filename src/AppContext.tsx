import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import {
  UserAccount,
  Trade,
  SiteStats,
  Transaction,
  ExternalAPI,
  EducatorProfile,
  ShopPackage,
  SiteRules,
  GlobalSettings,
  Notification,
  AuditLog,
  VerificationRequest,
  LeaderboardEntry,
  EconomicEvent,
  TradingPlatform,
  TradingAccount,
  SymbolConfig,
  CompetitionConfig,
  ReferralRecord,
} from "./types";
import {
  MOCK_TRADES,
  MOCK_SITE_STATS,
  MOCK_APIS,
  MOCK_PACKAGES,
  MOCK_RULES,
  MOCK_LEADERBOARD,
  MOCK_CALENDAR,
  MOCK_EDUCATORS
} from "./mockData";
import { getTradeDateString, getTradePnl } from "./utils/tradeUtils";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import {
  signOut,
  signInAnonymously,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
} from "firebase/firestore";
import {
  fetchTransactions,
  fetchAuditLogs,
  createTransaction,
  createAuditLog,
} from "./lib/postgres";

export type AppView =
  | "dashboard"
  | "challenges"
  | "market"
  | "trades"
  | "payouts"
  | "rules"
  | "shop"
  | "admin"
  | "profile"
  | "leaderboard"
  | "calendar"
  | "terminals"
  | "web-terminal"
  | "competition"
  | "referral"
  | "educators";

interface AppContextType {
  user: UserAccount | null;
  isAuthReady: boolean;
  firestoreQuotaExceeded: boolean;
  users: UserAccount[];
  trades: Trade[];
  stats: SiteStats;
  transactions: Transaction[];
  apis: ExternalAPI[];
  packages: ShopPackage[];
  rules: SiteRules;
  globalSettings: GlobalSettings;
  competitions: CompetitionConfig[];
  educators: EducatorProfile[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  verificationRequests: VerificationRequest[];
  leaderboard: LeaderboardEntry[];
  calendar: EconomicEvent[];
  symbolConfigs: SymbolConfig[];
  promotions: any[];
  activeView: AppView;
  activeAccountId: string | null;
  setActiveAccountId: (id: string | null) => void;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
  mobileMenuOpen: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  setIsAdmin: (val: boolean) => void;
  setMobileMenuOpen: (val: boolean) => void;
  setActiveView: (view: AppView) => void;
  addNotification: (
    notif: Omit<Notification, "id" | "timestamp" | "read" | "createdAt">,
    targetUserId?: string
  ) => void;
  markNotifAsRead: (id: string) => void;
  deleteAccount: () => void;
  addAuditLog: (
    log: Omit<AuditLog, "id" | "createdAt">,
  ) => void;
  submitVerification: (
    docs: { type: "id" | "residence"; url: string }[],
  ) => void;
  handleVerificationRequest: (
    requestId: string,
    status: "approved" | "rejected",
  ) => void;
  // Admin Actions
  updateUser: (userId: string, data: Partial<UserAccount>) => void;
  updateUserProfile: (data: Partial<UserAccount>) => Promise<void>;
  deleteUser: (userId: string) => void;
  updateAPI: (apiId: string, data: Partial<ExternalAPI>) => void;
  addAPI: (data: Omit<ExternalAPI, "id">) => void;
  addUser: (data: Partial<UserAccount>, password: string) => Promise<void>;
  createHostesUser: (data: { name: string; email: string; country: string; alias: string }) => Promise<void>;
  addManualTrade: (accountId: string, trade: { 
    symbol: string; 
    type: 'buy' | 'sell'; 
    lots: number; 
    entryPrice: number; 
    exitPrice: number; 
    sl?: number; 
    tp?: number; 
    timestamp: number;
    closeTime: number;
  }, userId: string) => Promise<void>;
  updatePackage: (pkgId: string, data: Partial<ShopPackage>) => void;
  deletePackage: (pkgId: string) => void;
  addPackage: (data: Omit<ShopPackage, "id">) => void;
  updateRules: (content: string) => void;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  updateSymbolConfig: (
    id: string,
    data: Partial<SymbolConfig>,
  ) => Promise<void>;
  addSymbolConfig: (
    data: Omit<SymbolConfig, "id" | "updatedAt">,
  ) => Promise<void>;
  deleteSymbolConfig: (
    id: string,
  ) => Promise<void>;
  updateCompetitions: (comps: CompetitionConfig[]) => Promise<void>;
  generateTradingAccount: (
    pkg: ShopPackage,
    platform: TradingPlatform,
    type: "evaluation" | "funded" | "competition",
    targetUserId?: string,
    competitionId?: string
  ) => Promise<TradingAccount | undefined>;
  updateTradingAccount: (acctId: string, data: Partial<TradingAccount>) => void;
  linkPaymentMethod: (card: { last4: string; brand: string; cardholderName: string; expiryMonth: number; expiryYear: number }) => Promise<void>;
  processReferral: (referrerCode: string, buyerName: string, pkgId: string) => Promise<void>;
  incrementPromoUsage: (code: string) => Promise<void>;
  applyAsEducator: (
    bio: string, 
    socialLinks: {twitter?: string; youtube?: string; instagram?: string; website?: string},
    paymentMethod: 'card' | 'balance',
    cardDetails?: { last4: string; brand: string; cardholderName: string }
  ) => Promise<void>;
  fetchWithAuth: (url: string, options?: any) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('accountId') || null;
    } catch {
      return null;
    }
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firestoreQuotaExceeded, setFirestoreQuotaExceeded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__onFirestoreQuotaExceeded = () => {
        setFirestoreQuotaExceeded(true);
      };
      if ((window as any).__firestoreQuotaExceeded) {
        setFirestoreQuotaExceeded(true);
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__onFirestoreQuotaExceeded;
      }
    };
  }, []);

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (user && user.tradingAccounts) {
      let combinedTrades: any[] = [];
      user.tradingAccounts.forEach((acc: any) => {
        if (acc.history && Array.isArray(acc.history)) {
          combinedTrades.push(...acc.history);
        }
      });
      // Sort by close_time descending
      combinedTrades.sort((a,b) => (b.close_time || b.timestamp || 0) - (a.close_time || a.timestamp || 0));
      setTrades(combinedTrades as Trade[]);
    }
  }, [user?.tradingAccounts]);

  const processingRef = React.useRef<Set<string>>(new Set());

  // Automated account protection system: monitors user trading accounts in real-time.
  // Stops purchased / gifted accounts when limits are exceeded on minus or plus (excluding competition ones).
  useEffect(() => {
    if (!user || !user.tradingAccounts || user.tradingAccounts.length === 0) return;

    user.tradingAccounts.forEach(async (acc: any) => {
      if (acc.status !== "active") return;
      if (acc.type === "competition") return; // exclude competition accounts: "Inafara de cele de concurs"
      if (processingRef.current.has(acc.id)) return;

      const getDeducedInitialBalance = () => {
        let ib = acc.initialBalance || 0;
        if (ib > 0) return ib;
        const currentBal = acc.balance || 10000;
        if (acc.rules?.maxDrawdown && acc.rules.maxDrawdown > 100) {
          return acc.rules.maxDrawdown * 10;
        } else if (acc.rules?.dailyDrawdown && acc.rules.dailyDrawdown > 100) {
          return acc.rules.dailyDrawdown * 20;
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

      const initialBalance = getDeducedInitialBalance();
      const currentBalance = acc.balance || 10000;
      const openPnL = (acc.openTrades || []).reduce(
        (sum: number, t: any) => sum + parseFloat(t.pnl || 0),
        0
      );
      const currentEquity = currentBalance + openPnL;

      // Helper to dynamically resolve percentage or absolute dollar limits from admin
      const getRuleThresholdValue = (val: any, refBalance: number) => {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) return 0;
        // If value is small (<= 100), treat as percentage, otherwise treat as absolute dollar amount
        return num <= 100 ? (refBalance * num) / 100 : num;
      };

      // Drawdown limits (pe minus) set dynamically in Admin or falls back to standard 5% / 10%
      const maxDrawdownLimit = getRuleThresholdValue(acc.rules?.maxDrawdown, initialBalance) || (initialBalance * 0.10);
      const dailyDrawdownLimit = getRuleThresholdValue(acc.rules?.dailyDrawdown, initialBalance) || (initialBalance * 0.05);

      const maxLimitBreached = (currentEquity <= (initialBalance - maxDrawdownLimit)) || (currentBalance <= (initialBalance - maxDrawdownLimit));
      const dailyLimitBreached = (currentEquity <= (initialBalance - dailyDrawdownLimit)) || (currentBalance <= (initialBalance - dailyDrawdownLimit));

      const isMinusBreached = maxLimitBreached || dailyLimitBreached;

      // Profit target limits (pe plus) including any dynamic news penalty
      const baseProfitTarget = getRuleThresholdValue(acc.rules?.profitTarget, initialBalance) || (initialBalance * 0.10);
      const targetPenalty = parseFloat(acc.rules?.targetPenalty || 0);
      const actualProfitTarget = baseProfitTarget + targetPenalty;
      const currentProfit = currentEquity - initialBalance;
      const isPlusBreached = currentProfit >= actualProfitTarget;

      // Consistency rule calculations (45% outlier of total target)
      const history = acc.history || [];
      const dailyProfits: { [date: string]: number } = {};
      history.forEach((t: any) => {
        const d = getTradeDateString(t);
        // Exclude Invalid Days and fallback trades where possible, but keep standard groups
        if (d && d !== "Invalid Date") {
          dailyProfits[d] = (dailyProfits[d] || 0) + getTradePnl(t);
        }
      });
      const maxDailyProfit = Math.max(0, ...Object.values(dailyProfits));
      const consistencyLimitVal = actualProfitTarget * 0.45;
      const consistencyViolations = Object.keys(dailyProfits).filter(d => dailyProfits[d] > consistencyLimitVal);
      const violatingDaysCount = consistencyViolations.length;
      const tradingDays = new Set(history.map(t => getTradeDateString(t)).filter(d => d !== "Invalid Date")).size;

      // Trigger if drawdown limit reached, or multiple consistency violations occurred, or profit target reached
      if (isMinusBreached || violatingDaysCount >= 2 || isPlusBreached) {
        // Mark as processing to avoid duplicate parallel executions in the render hooks
        processingRef.current.add(acc.id);

        if (isMinusBreached) {
          let breachReason = "";
          if (maxLimitBreached) breachReason = `Max Total Drawdown Limit Reached ($${maxDrawdownLimit.toLocaleString()})`;
          else if (dailyLimitBreached) breachReason = `Daily Drawdown Limit Reached ($${dailyDrawdownLimit.toLocaleString()})`;

          console.warn(`[Automated Protection] Account #${acc.accountNumber} breached: ${breachReason}. Suspending/stopping account.`);

          // Close active positions at current equity to solidify balance
          const nextBalance = currentEquity;
          const closedHistory = (acc.openTrades || []).map((p: any) => ({
            ...p,
            close_time: Date.now(),
            close_price: p.open_price, // fallback
            pnl: parseFloat(p.pnl || 0),
            reason: "Automated Breach Closure"
          }));

          const existingHistory = acc.history || [];
          const updatedHistory = [...closedHistory, ...existingHistory];

          // Notify user
          const msg = `⚠️ Account #${acc.accountNumber} failed the drawdown rules limits (${breachReason}) and has been CLOSED (FAILED).`;
          try {
            alert(msg);
          } catch {
            // ignore alert blocker
          }

          addNotification({
            title: "Challenge Failed ❌",
            message: `Account #${acc.accountNumber} was closed because it breached the drawdown limit (${breachReason}).`,
            type: "alert"
          });

          await updateTradingAccount(acc.id, {
            status: "failed", // Set status to failed
            balance: nextBalance,
            openTrades: [],
            history: updatedHistory
          });
        } 
        else if (violatingDaysCount >= 2) {
          console.warn(`[Automated Protection] Account #${acc.accountNumber} breached consistency rule on 2 different days. Failing account.`);

          const nextBalance = currentEquity;
          const closedHistory = (acc.openTrades || []).map((p: any) => ({
            ...p,
            close_time: Date.now(),
            close_price: p.open_price, // fallback
            pnl: parseFloat(p.pnl || 0),
            reason: "Consistency Rule Exceeded 2 Days"
          }));

          const existingHistory = acc.history || [];
          const updatedHistory = [...closedHistory, ...existingHistory];

          const msg = `❌ Challenge Failed: Account #${acc.accountNumber} has been blocked because you exceeded the 45% consistency rule ($${consistencyLimitVal.toLocaleString()}) on 2 separate days. You can buy another challenge to try again.`;
          try {
            alert(msg);
          } catch {
            // ignore alert blocker
          }

          addNotification({
            title: "Challenge Failed ❌",
            message: `Account #${acc.accountNumber} failed: Exceeded consistency rule on 2 different trading days.`,
            type: "alert"
          });

          await updateTradingAccount(acc.id, {
            status: "failed", // Set status to failed
            balance: nextBalance,
            openTrades: [],
            history: updatedHistory,
            consistencyWarningsCount: violatingDaysCount
          });
        }
        else if (isPlusBreached) {
          // Verify if they satisfy both: NO consistency violations AND minimum 3 trading days
          const isConsistent = violatingDaysCount === 0;

          if (!isConsistent) {
            // Outlier daily profit exceeds 45% consistency rule limit.
            // Do not suspend them, but do not promote. Let them keep trading to dilute outliers.
            processingRef.current.delete(acc.id);
            console.log(`[Automated Protection] Account #${acc.accountNumber} hit target but violates 45% Consistency (Max Day: $${maxDailyProfit.toFixed(1)} > Limit: $${consistencyLimitVal.toFixed(1)}). Outlier needs to be diluted.`);
            return;
          }

          if (tradingDays < 3) {
            // Less than 3 trading days. Let them keep trading.
            processingRef.current.delete(acc.id);
            console.log(`[Automated Protection] Account #${acc.accountNumber} hit target but has only ${tradingDays} trading days. Minimum 3 trading days required.`);
            return;
          }

          // Wholly consistent! Move to transition/elevation
          const nextBalance = initialBalance; // reset to initial capital for next phase
          const closedHistory = (acc.openTrades || []).map((p: any) => ({
            ...p,
            close_time: Date.now(),
            close_price: p.open_price,
            pnl: parseFloat(p.pnl || 0),
            reason: "Phase Passed"
          }));
          const existingHistory = acc.history || [];
          const updatedHistory = [...closedHistory, ...existingHistory];

          if (acc.type === "evaluation-1") {
            // Phase 1 -> Phase 2 (evaluation-2, 8% target)
            const msg = `🎉 Congratulations! Account #${acc.accountNumber} has successfully passed Phase 1! You have been promoted to Phase 2 with a reduced target of 8%.`;
            try {
              alert(msg);
            } catch {}

            addNotification({
              title: "Phase 1 Passed! 🎉",
              message: `Account #${acc.accountNumber} has passed Phase 1. You have been automatically promoted to Phase 2 with an 8% target! Happy trading.`,
              type: "success"
            });

            await updateTradingAccount(acc.id, {
              type: "evaluation-2",
              balance: nextBalance,
              equity: nextBalance,
              openTrades: [],
              history: updatedHistory,
              rules: {
                ...acc.rules,
                profitTarget: initialBalance * 0.08, // Dynamic 8% target for phase 2
                targetPenalty: 0 // Reset news penalties
              }
            });
          } else {
            // Phase 2 or normal evaluation -> Funded stage
            const msg = `🎉 Congratulations! Account #${acc.accountNumber} has passed the evaluation! The account has been sent for verification to receive Live Funds (Funded Account).`;
            try {
              alert(msg);
            } catch {}

            addNotification({
              title: "Evaluation Completed! 🏆",
              message: `Account #${acc.accountNumber} has successfully passed the evaluation and has been sent for confirmation for a live funded contract!`,
              type: "success"
            });

            await updateTradingAccount(acc.id, {
              status: "pending", // mark as pending review/approval for Funded contract
              balance: nextBalance,
              equity: nextBalance,
              openTrades: [],
              history: updatedHistory
            });
          }
        }

        // Release processing flag to let states settle
        setTimeout(() => {
          processingRef.current.delete(acc.id);
        }, 1500);
      } else {
        // Here we handle the FIRST single consistency violation warning
        if (violatingDaysCount === 1) {
          const currentWarnings = parseInt(acc.consistencyWarningsCount || 0);
          if (currentWarnings < 1) {
            processingRef.current.add(acc.id);
            console.log(`[Automated Protection] Account #${acc.accountNumber} warned for first consistency violation.`);

            const msg = `⚠️ Consistency Warning for Account #${acc.accountNumber}: Your daily profit has exceeded the 45% consistency rule limit ($${consistencyLimitVal.toLocaleString()}). This is your FIRST warning. A second violation on another day will result in immediate FAILURE of your challenge.`;
            try {
              alert(msg);
            } catch {}

            addNotification({
              title: "Consistency Warning ⚠️",
              message: `Account #${acc.accountNumber} daily profit exceeded the 45% consistency limit ($${consistencyLimitVal.toLocaleString()}). This is your first warning! Trade on other days to dilute this outlier.`,
              type: "alert"
            });

            await updateTradingAccount(acc.id, {
              consistencyWarningsCount: 1
            });

            setTimeout(() => {
              processingRef.current.delete(acc.id);
            }, 1500);
          }
        }
      }
    });
  }, [user?.tradingAccounts, user?.id]);

  const [stats, setStats] = useState<SiteStats>({
    totalUsers: 0,
    payoutsLast30Days: 0,
    activeChallenges: 0,
    totalVolume: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [apis, setApis] = useState<ExternalAPI[]>(MOCK_APIS);
  const [packages, setPackages] = useState<ShopPackage[]>(MOCK_PACKAGES);
  const [rules, setRules] = useState<SiteRules>(MOCK_RULES);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ leverageCap: 100, newsSpreadMultiplier: 10, newsEvents: [] });
  const [competitions, setCompetitions] = useState<CompetitionConfig[]>([]);
  const [educators, setEducators] = useState<EducatorProfile[]>(MOCK_EDUCATORS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<
    VerificationRequest[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);
  const [calendar, setCalendar] = useState<EconomicEvent[]>([]);
  const [symbolConfigs, setSymbolConfigs] = useState<SymbolConfig[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);

  const [activeView, setActiveView] = useState<AppView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'web-terminal') {
        return 'web-terminal';
      }
    } catch (e) {
      console.error(e);
    }
    return "dashboard";
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper for REST requests with JWT Authorization
  const fetchWithAuth = async (url: string, options: any = {}) => {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const response = await fetch(url, {
      ...options,
      headers
    });
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        setUser(null);
        setIsAdmin(false);
        setIsStaff(false);
      }
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  };

  // JWT-Based Authentication Initialization
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthReady(true);
        return;
      }
      try {
        const data = await fetchWithAuth("/api/auth/me");
        if (data) {
          setUser(data);
          const isSuperAdmin = 
            data.email === 'websiteanglia@gmail.com' || 
            data.email === 'admin@prop.com' ||
            data.email === 'florinelvictorlupascu@gmail.com' ||
            data.email === 'fundedgoo@gmail.com' ||
            data.email === 'cloudcomun@gmail.com';
          setIsAdmin(data.role === "admin" || isSuperAdmin);
          setIsModerator(data.role === "moderator");
          setIsStaff(data.role === "admin" || data.role === "moderator" || isSuperAdmin);
          
          if (!activeView || activeView === 'dashboard') {
            setActiveView((data.role === "admin" || data.role === "moderator" || isSuperAdmin) ? "admin" : "dashboard");
          }
          // Authenticate anonymously with Firebase Auth for client-side storage & firestore
          signInAnonymously(auth).catch((e) => console.warn("Firebase anonymous sign-in failed:", e));
        }
      } catch (err) {
        console.error("JWT auth initialization failed:", err);
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setIsAuthReady(true);
      }
    };
    initializeAuth();
  }, []);

  // Sync PostgreSQL Data periodically (Consolidated Background Polling)
  useEffect(() => {
    if (!user) return;

    const syncAllData = async () => {
      try {
        // Fetch Packages
        const pkgs = await fetchWithAuth("/api/packages").catch(() => MOCK_PACKAGES);
        setPackages(pkgs);

        // Fetch Rules
        const fetchedRules = await fetchWithAuth("/api/rules").catch(() => MOCK_RULES);
        setRules(fetchedRules);

        // Fetch Global Settings
        const settings = await fetchWithAuth("/api/settings").catch(() => ({
          leverageCap: 100,
          newsSpreadMultiplier: 10,
          newsEvents: [],
          referralConfig: { enabled: true, rewardTier1Amount: 5000, rewardTier1MinPurchase: 10000, rewardTier2ReferralCount: 10, rewardTier2Amount: 100000, dashboardMessage: "", referralViewMessage: "" }
        }));
        setGlobalSettings(settings);

        // Fetch Competitions
        const comps = await fetchWithAuth("/api/competitions").catch(() => []);
        setCompetitions(comps);

        // Fetch Promotions
        const promos = await fetchWithAuth("/api/promotions").catch(() => []);
        setPromotions(promos);

        // Fetch Notifications
        const notifs = await fetchWithAuth("/api/notifications").catch(() => []);
        setNotifications(notifs);

        // Fetch Leaderboard
        const lb = await fetchWithAuth("/api/leaderboard").catch(() => MOCK_LEADERBOARD);
        setLeaderboard(lb);

        // Fetch Symbol Configs
        const syms = await fetchWithAuth("/api/symbol-configs").catch(() => []);
        setSymbolConfigs(syms);

        // Fetch Calendar
        const cal = await fetchWithAuth("/api/economic-events").catch(() => []);
        setCalendar(cal);

        // Fetch Educators
        const edus = await fetchWithAuth("/api/educators").catch(() => MOCK_EDUCATORS);
        setEducators(edus);

        // Fetch Transactions & Audit Logs
        const txs = await fetchWithAuth("/api/tx-data").catch(() => []);
        setTransactions(txs);

        if (isStaff) {
          const sysLogs = await fetchWithAuth("/api/sys-logs").catch(() => []);
          setAuditLogs(sysLogs);
        }

        // Fetch and Sync User profile (including current trading accounts)
        const me = await fetchWithAuth("/api/auth/me").catch(() => null);
        if (me) {
          setUser(me);
        }

      } catch (err) {
        console.error("Error syncing Postgres data:", err);
      }
    };

    syncAllData();
    const interval = setInterval(syncAllData, 10000);
    return () => clearInterval(interval);
  }, [user?.id, isStaff]);

  // Poll MT5 positions periodically to stay synced with the VPS bridge
  useEffect(() => {
    if (!user || user.role === "admin") return;
    
    const pollMt5 = async () => {
      // Only poll if the active account exists and has MT5 sync enabled
      const currentActiveAcc = user?.tradingAccounts?.find(a => a.id === activeAccountId);
      if (!currentActiveAcc?.mt5Sync?.enabled) return;

      try {
        const positions = await fetchWithAuth("/api/mt5-positions");
        if (Array.isArray(positions) && activeAccountId) {
          // Find the active account and update its openTrades
          setUser(prev => {
            if (!prev || !prev.tradingAccounts) return prev;
            const updatedAccounts = prev.tradingAccounts.map(acc => {
              if (acc.id === activeAccountId && acc.mt5Sync?.enabled) {
                return { ...acc, openTrades: positions };
              }
              return acc;
            });
            return { ...prev, tradingAccounts: updatedAccounts };
          });
        }
      } catch (e) {
        // Silently fail if bridge is not responding or not configured
      }
    };

    const interval = setInterval(pollMt5, 10000);
    pollMt5();
    return () => clearInterval(interval);
  }, [user?.id, activeAccountId, user?.tradingAccounts]);

  const addAuditLog = async (
    logData: Omit<AuditLog, "id" | "createdAt" >,
  ) => {
    try {
      await fetchWithAuth("/api/sys-logs", {
        method: "POST",
        body: JSON.stringify({
          ...logData,
          actorRole: logData.actorRole || (user?.role as any),
          createdAt: Date.now(),
        })
      }).catch(() => {});
    } catch (e) {
      console.error("Error evaluating audit log state:", e);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Login failed");
      }
      const { token, user: loggedUser } = await response.json();
      localStorage.setItem("token", token);
      setUser(loggedUser);
      const isSuperAdmin = 
        loggedUser.email === 'websiteanglia@gmail.com' || 
        loggedUser.email === 'admin@prop.com' ||
        loggedUser.email === 'florinelvictorlupascu@gmail.com' ||
        loggedUser.email === 'fundedgoo@gmail.com' ||
        loggedUser.email === 'cloudcomun@gmail.com';
      setIsAdmin(loggedUser.role === "admin" || isSuperAdmin);
      setIsModerator(loggedUser.role === "moderator");
      setIsStaff(loggedUser.role === "admin" || loggedUser.role === "moderator" || isSuperAdmin);
      
      if (!activeView || activeView === 'dashboard') {
        setActiveView((loggedUser.role === "admin" || loggedUser.role === "moderator" || isSuperAdmin) ? "admin" : "dashboard");
      }
      signInAnonymously(auth).catch((e) => console.warn("Firebase anonymous sign-in failed:", e));
    } catch (error: any) {
      // If it's the admin email and it doesn't exist, create it automatically for convenience
      if (
        email === "admin@prop.com" &&
        (error.message?.includes("not found") || error.message?.includes("invalid"))
      ) {
        console.log("Admin account missing, creating it now...");
        await registerWithEmail("Super Admin", email, password);
        return;
      }
      throw error;
    }
  };

  const registerWithEmail = async (
    name: string,
    email: string,
    password: string,
  ) => {
    try {
      console.log("Starting registration for:", email);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Registration failed");
      }
      const { token, user: registeredUser } = await response.json();
      localStorage.setItem("token", token);
      setUser(registeredUser);
      const isSuperAdmin = 
        registeredUser.email === 'websiteanglia@gmail.com' || 
        registeredUser.email === 'admin@prop.com' ||
        registeredUser.email === 'florinelvictorlupascu@gmail.com' ||
        registeredUser.email === 'fundedgoo@gmail.com' ||
        registeredUser.email === 'cloudcomun@gmail.com';
      setIsAdmin(registeredUser.role === "admin" || isSuperAdmin);
      setIsModerator(registeredUser.role === "moderator");
      setIsStaff(registeredUser.role === "admin" || registeredUser.role === "moderator" || isSuperAdmin);
      
      if (!activeView || activeView === 'dashboard') {
        setActiveView((registeredUser.role === "admin" || registeredUser.role === "moderator" || isSuperAdmin) ? "admin" : "dashboard");
      }
      signInAnonymously(auth).catch((e) => console.warn("Firebase anonymous sign-in failed:", e));
    } catch (err) {
      console.error("Registration error:", err);
      throw err;
    }
  };

  const login = async () => {
    alert("Please sign in using your email and password.");
  };

  const logout = async () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAdmin(false);
    setIsModerator(false);
    setIsStaff(false);
    setActiveView("dashboard");
  };

  const deleteAccount = () => {
    if (!user) return;
    logout();
  };

  const addNotification = async (
    notif: Omit<Notification, "id" | "read" | "createdAt">,
    targetUserId?: string
  ) => {
    const userId = targetUserId || user?.id;
    if (!userId) return;
    const ref = doc(collection(db, "users", userId, "notifications"));
    await setDoc(ref, {
      ...notif,
      id: ref.id,
      read: false,
      createdAt: Date.now(),
    }).catch((err) =>
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `users/${userId}/notifications`,
      ),
    );
  };

  const markNotifAsRead = async (id: string) => {
    if (!user) return;
    const ref = doc(db, "users", user.id, "notifications", id);
    await updateDoc(ref, { read: true }).catch((err) =>
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${user.id}/notifications`,
      ),
    );
  };

  const submitVerification = (
    newDocs: { type: "id" | "residence"; url: string }[],
  ) => {
    // KYC implementation placeholder
  };

  const handleVerificationRequest = async (
    requestId: string,
    status: "approved" | "rejected",
  ) => {
    if (!isStaff) return;
    try {
      const reqRef = doc(db, "verificationRequests", requestId);
      const reqSnap = await getDoc(reqRef);
      if (!reqSnap.exists()) return;
      
      const reqData = reqSnap.data();
      await updateDoc(reqRef, { status });
      
      // Update user verification status
      const userRef = doc(db, "users", reqData.userId);
      await updateDoc(userRef, { 
        isVerified: status === 'approved',
        verificationStatus: status === 'approved' ? 'verified' : 'rejected'
      });

      addAuditLog({
        action: `VERIFY_${status.toUpperCase()}`,
        actorId: user?.id,
        actorName: user?.name,
        targetId: reqData.userId,
        targetName: reqData.userName,
        details: `KYC Request ${status} for ${reqData.userName}`,
        type: 'user_management'
      });

      addNotification({
        title: status === 'approved' ? "Identity Verified!" : "Verification Rejected",
        message: status === 'approved' 
          ? "Your identity has been successfully verified. You now have full access to payouts." 
          : "Your identity verification was rejected. Please check your documents and try again.",
        type: status === 'approved' ? "success" : "alert",
      }, reqData.userId);

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `verificationRequests/${requestId}`);
    }
  };

  const updateUser = async (userId: string, data: Partial<UserAccount>) => {
    if (!isStaff) return;
    const ref = doc(db, "users", userId);
    
    try {
      const userSnap = await getDoc(ref);
      if (userSnap.exists()) {
        const targetUser = userSnap.data() as UserAccount;
        
        // SECURITY GATE: Moderators cannot modify Admins
        if (isModerator && !isAdmin && targetUser.role === 'admin') {
          throw new Error("Access denied: Moderators cannot modify administrator accounts.");
        }

        // If role is being changed, we want to log it and notify the user
        if (data.role) {
          if (targetUser.role !== data.role) {
            console.log(`Role change detected for ${userId}: ${targetUser.role} -> ${data.role}`);
            
            // Send notification to the target user
            await addNotification({
              title: "Role Updated",
              message: `Administrator has changed your role to ${data.role.toUpperCase()}.`,
              type: "info",
            }, userId);

            // Log the action
            addAuditLog({
              action: 'CHANGE_ROLE',
              actorId: user?.id,
              actorName: user?.name,
              actorRole: user?.role as any,
              targetId: userId,
              targetName: targetUser.name,
              details: `Changed role from ${targetUser.role} to ${data.role}`,
              type: 'user_management'
            });
          }
        }
      }

      // Optimistic UI update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
      if (user?.id === userId) {
        setUser(prev => prev ? { ...prev, ...data } : null);
      }

      await updateDoc(ref, data);
    } catch (err) {
      console.error("Update User Error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateUserProfile = async (data: Partial<UserAccount>) => {
    if (!user) {
      console.warn("[Postgres] Cannot update profile: No user loaded.");
      return;
    }
    console.log(`[Postgres] Attempting to update profile for ${user.id}:`, data);
    
    // Prevent updating sensitive fields if not admin
    const { role, balance, equity, status, ...safeData } = data as any;
    
    try {
      await fetchWithAuth("/api/users/profile", {
        method: "POST",
        body: JSON.stringify(safeData)
      });
      console.log(`[Postgres] Profile updated successfully for ${user.id}`);
      // Update local state
      setUser(prev => prev ? { ...prev, ...safeData } : null);
    } catch (err: any) {
      console.error(`[Postgres] Profile update failed for ${user.id}:`, err);
      throw err;
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isAdmin) return;
    console.log("Attempting to delete user:", userId);
    try {
      const userRef = doc(db, "users", userId);
      
      // Delete trading accounts
      const accountsSnap = await getDocs(collection(userRef, "tradingAccounts"));
      for (const docSnap of accountsSnap.docs) {
        await deleteDoc(docSnap.ref);
      }
      
      // Delete notifications
      const notifsSnap = await getDocs(collection(userRef, "notifications"));
      for (const docSnap of notifsSnap.docs) {
        await deleteDoc(docSnap.ref);
      }
      
      await deleteDoc(userRef);
      console.log("Successfully deleted user:", userId);
    } catch (err) {
      console.error("Failed to delete user:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  const updateAPI = async (apiId: string, data: Partial<ExternalAPI>) => {
    if (!isAdmin) return;
    const ref = doc(db, "apis", apiId);
    await updateDoc(ref, data).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `apis/${apiId}`),
    );
  };

  const addAPI = (data: Omit<ExternalAPI, "id">) => {
    const newApi: ExternalAPI = {
      ...data,
      id: `api-${Date.now()}`,
      status: "active",
    };
    setApis((prev) => [...prev, newApi]);
  };

  const createHostesUser = async (data: { name: string; email: string; country: string; alias: string }) => {
    if (!isAdmin) return;
    try {
      const hostesId = `hostes_${Date.now()}`;
      const newUser: UserAccount = {
        id: hostesId,
        name: data.alias,
        realName: data.name,
        email: data.email,
        country: data.country,
        role: 'trader',
        balance: 100000,
        equity: 100000,
        status: 'active',
        leverage: '1:100',
        pnl: 0,
        pnlPercentage: 0,
        isVerified: true,
        verificationStatus: 'verified',
        createdAt: Date.now(),
        winRate: 0,
        totalTrades: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        isHostes: true
      };
      await setDoc(doc(db, "users", hostesId), newUser);
      
      // Auto enroll in active competitions
      for (const comp of competitions) {
        if (comp.isActive) {
           const compPackage: ShopPackage = {
              id: `competition-pkg-${comp.id}`,
              name: `Competition ${comp.currentMonthName}`,
              allocation: 100000,
              price: 0,
              profitTarget: 0,
              totalDrawdown: 10,
              dailyDrawdown: 5,
              leverage: '1:100'
            };
            await generateTradingAccount(compPackage, 'GOO', 'competition', hostesId, comp.id);
        }
      }

      addAuditLog({
        action: 'CREATE_HOSTES',
        actorId: user?.id,
        actorName: user?.name,
        details: `Created hostes trader: ${data.name} (${data.alias})`,
        type: 'user_management'
      });
      
      addNotification({
        title: "Hostes Created",
        message: `${data.alias} has been created and enrolled in active competitions.`,
        type: "success"
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "users");
    }
  };

  const addManualTrade = async (accountId: string, trade: any, userId: string) => {
    if (!isAdmin) return;
    try {
      // Find symbol config for contract size
      const config = symbolConfigs.find(c => c.symbol === trade.symbol) || { pipSize: 0.0001, contractSize: 100000 };
      const contractSize = config.contractSize || 100000;
      
      const priceDiff = trade.type === 'buy' ? trade.exitPrice - trade.entryPrice : trade.entryPrice - trade.exitPrice;
      const profit = priceDiff * contractSize * trade.lots;

      const newHistoryEntry = {
        symbol: trade.symbol,
        type: trade.type,
        lots: trade.lots,
        open_price: trade.entryPrice,
        close_price: trade.exitPrice,
        sl: trade.sl || 0,
        tp: trade.tp || 0,
        timestamp: trade.timestamp,
        close_time: trade.closeTime,
        profit: parseFloat(profit.toFixed(2)),
        isManual: true
      };

      const accountRef = doc(db, "users", userId, "tradingAccounts", accountId);
      const accountSnap = await getDoc(accountRef);
      if (accountSnap.exists()) {
        const accData = accountSnap.data();
        const history = accData.history || [];
        const newBalance = (accData.balance || 0) + profit;
        
        await updateDoc(accountRef, {
          history: [...history, newHistoryEntry],
          balance: parseFloat(newBalance.toFixed(2)),
          equity: parseFloat(newBalance.toFixed(2))
        });
      }
      
      addAuditLog({
        action: 'ADD_MANUAL_TRADE',
        actorId: user?.id,
        actorName: user?.name,
        details: `Added manual trade to account ${accountId} (Profit: $${profit})`,
        type: 'system'
      });

      addNotification({
        title: "Trade Sim Added",
        message: `Manual trade added: ${trade.symbol} ${trade.type} ${trade.lots} lots. PnL: $${profit.toFixed(2)}`,
        type: "info"
      });
    } catch (err) {
      console.error("Failed to add manual trade:", err);
      throw err;
    }
  };

  const addUser = async (data: Partial<UserAccount>, password: string) => {
    if (!isAdmin) return;
    if (password.length < 6) {
      throw new Error("Password should be at least 6 characters.");
    }
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name || "Trader",
          email: data.email || "",
          password
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create user on backend.");
      }
      const { user: newUser } = await response.json();
      
      // Update any supplementary fields (such as role or status) if needed using updateUser helper
      if (data.role && data.role !== "trader") {
        await updateUser(newUser.id, { role: data.role });
      }
    } catch (err) {
      console.error("Failed to add user:", err);
      throw err;
    }
  };

  const updatePackage = async (pkgId: string, data: Partial<ShopPackage>) => {
    if (!isAdmin) return;
    const ref = doc(db, "packages", pkgId);
    await updateDoc(ref, data).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `packages/${pkgId}`)
    );
  };

  const addPackage = async (data: Omit<ShopPackage, "id">) => {
    if (!isAdmin) return;
    const newId = `pkg-${Date.now()}`;
    const newPackage: ShopPackage = {
      ...data,
      id: newId,
    };
    const ref = doc(db, "packages", newId);
    await setDoc(ref, newPackage).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `packages/${newId}`)
    );
  };

  const deletePackage = async (pkgId: string) => {
    if (!isAdmin) return;
    const ref = doc(db, "packages", pkgId);
    await deleteDoc(ref).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `packages/${pkgId}`)
    );
  };

  const updateRules = async (content: string) => {
    if (!isAdmin) return;
    const ref = doc(db, "system", "rules");
    await setDoc(ref, { content, updatedAt: new Date().toISOString() }, { merge: true }).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, "system/rules")
    );
  };

  const updateGlobalSettings = async (settings: Partial<GlobalSettings>) => {
    const updated = { ...globalSettings, ...settings };
    setGlobalSettings(updated);
    
    // Also save to firebase
    try {
      await setDoc(doc(db, "system", "globalSettings"), updated, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "system/globalSettings");
    }
  };

  const updateCompetitions = async (list: CompetitionConfig[]) => {
    const ref = doc(db, "system", "competitionsList");
    await setDoc(ref, { list }, { merge: true }).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, "system/competitionsList")
    );
  };

  const updateSymbolConfig = async (
    id: string,
    data: Partial<SymbolConfig>,
  ) => {
    if (!isAdmin) return;
    const ref = doc(db, "symbolConfigs", id);
    await updateDoc(ref, { ...data, updatedAt: Date.now() }).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `symbolConfigs/${id}`),
    );
  };

  const addSymbolConfig = async (
    data: Omit<SymbolConfig, "id" | "updatedAt">,
  ) => {
    if (!isAdmin) return;
    const ref = doc(collection(db, "symbolConfigs"));
    await setDoc(ref, {
      ...data,
      id: ref.id,
      updatedAt: Date.now(),
    }).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `symbolConfigs/${ref.id}`),
    );
  };

  const deleteSymbolConfig = async (id: string) => {
    if (!isAdmin) return;
    const ref = doc(db, "symbolConfigs", id);
    await deleteDoc(ref).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `symbolConfigs/${id}`),
    );
  };

  const generateTradingAccount = async (
    pkg: ShopPackage,
    platform: TradingPlatform,
    type: "evaluation" | "funded" | "competition",
    targetUserId?: string,
    competitionId?: string
  ) => {
    const userId = targetUserId || user?.id;
    if (!userId) return;

    const accountRef = doc(collection(db, "users", userId, "tradingAccounts"));
    const newAcc: any = {
      id: accountRef.id,
      userId,
      platform,
      accountNumber: `700${Math.floor(10000 + Math.random() * 90000)}${Date.now().toString().slice(-2)}`,
      broker: "FundedGoo Markets",
      server: "FundedGoo-Live",
      status: "active",
      leverage: pkg.leverage || "1:100",
      type,
      createdAt: Date.now(),
      balance: pkg.allocation || 0,
      equity: pkg.allocation || 0,
      initialBalance: pkg.allocation || 0,
      initialFee: pkg.price || 0,
      feeRefunded: false,
      openTrades: [],
      history: [],
      rules: {
        maxDrawdown: pkg.totalDrawdown
          ? (pkg.allocation * pkg.totalDrawdown) / 100
          : pkg.allocation * 0.1 || 0,
        dailyDrawdown: pkg.dailyDrawdown
          ? (pkg.allocation * pkg.dailyDrawdown) / 100
          : pkg.allocation * 0.05 || 0,
        profitTarget: pkg.profitTarget
          ? (pkg.allocation * pkg.profitTarget) / 100
          : pkg.allocation * 0.1 || 0,
        consistencyRule: 0.45,
        newsTrading: pkg.newsTrading ?? true,
        weekendHolding: pkg.weekendHolding ?? true,
      },
    };

    if (competitionId) {
      newAcc.competitionId = competitionId;
    }

    try {
      await setDoc(accountRef, newAcc);
      
      // Deduct balance if price > 0 and user is the one paying
      if (pkg.price > 0 && userId === user?.id) {
        const userRef = doc(db, "users", userId);
        const newBalance = (user?.balance || 0) - pkg.price;
        await updateDoc(userRef, { balance: newBalance });
        
        // Also create a transaction record
        try {
          await createTransaction({
            userId: userId,
            userName: user?.name || "Trader",
            amount: pkg.price,
            type: 'purchase',
            status: 'completed',
            createdAt: Date.now(),
            description: `Entry fee for ${pkg.name}`,
            packageId: pkg.id,
          });
        } catch (txErr) {
          console.error("Failed to create transaction record:", txErr);
        }
      }

      // Update local state immediately for better UX
      if (userId === user?.id) {
        setUser((prev) => {
          if (!prev) return null;
          const accounts = prev.tradingAccounts || [];
          if (accounts.some(a => a.id === newAcc.id)) return prev;
          return {
            ...prev,
            balance: prev.balance - (pkg.price || 0),
            tradingAccounts: [...accounts, newAcc],
          };
        });
        
        // Add notification automatically
        const notifRef = doc(collection(db, "users", userId, "notifications"));
        const notif = {
          id: notifRef.id,
          title: "Account provisioned",
          message: `Your ${type === 'competition' ? 'Competition' : type} account #${newAcc.accountNumber} ($${newAcc.balance.toLocaleString()}) is ready.`,
          type: "success",
          createdAt: Date.now(),
          read: false
        };
        await setDoc(notifRef, notif);
      } else {
        // Also update the users state if it's not the current user
        setUsers(prev => prev.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              tradingAccounts: [...(u.tradingAccounts || []), newAcc]
            };
          }
          return u;
        }));
      }
      
      return newAcc;
    } catch (e: any) {
      console.error("Firestore failed to save account:", e.message || e);
      handleFirestoreError(e, OperationType.CREATE, `users/${userId}/tradingAccounts/${accountRef.id}`);
      throw e;
    }
  };

  const updateTradingAccount = async (
    acctId: string,
    data: Partial<TradingAccount>,
  ) => {
    if (!user) return;

    // Optimistic UI update
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tradingAccounts:
          prev.tradingAccounts?.map((a) =>
            a.id === acctId ? { ...a, ...data } : a,
          ) || [],
      };
    });

    try {
      const accountRef = doc(db, "users", user.id, "tradingAccounts", acctId);
      const snap = await getDoc(accountRef);
      if (snap.exists()) {
        await updateDoc(accountRef, data);
      } else {
        console.warn(`Attempted to update non-existent account ${acctId}. If this was just created, it might be a sync issue.`);
      }
    } catch (e: any) {
      console.error("Firestore failed for account update", e.message || e);
    }
  };

  const linkPaymentMethod = async (card: { last4: string; brand: string; cardholderName: string; expiryMonth: number; expiryYear: number }) => {
    if (!user) return;
    const ref = doc(db, "users", user.id);
    const data = {
      linkedPaymentMethod: {
        ...card,
        isVerified: true
      }
    };
    
    setUser(prev => prev ? { ...prev, ...data } : null);
    await updateDoc(ref, data);
    
    addNotification({
      title: "Card Saved",
      message: `${card.brand} card ending in ${card.last4} has been saved for payouts.`,
      type: "success"
    });

    addAuditLog({
      action: 'LINK_PAYMENT_METHOD',
      actorId: user.id,
      actorName: user.name,
      details: `Card linked: ${card.brand} ****${card.last4}`,
      type: 'financial'
    });
  };

  const processReferral = async (referrerCode: string, buyerName: string, pkgId: string) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("referralCode", "==", referrerCode));
      const querySnap = await getDocs(q);
      
      if (querySnap.empty) return;
      
      const referrerDoc = querySnap.docs[0];
      const referrerData = referrerDoc.data() as UserAccount;
      
      const newReferral: ReferralRecord = {
        id: `ref-${Date.now()}`,
        userName: buyerName,
        purchaseAmount: pkg.price,
        packageTitle: pkg.name,
        timestamp: new Date().toISOString(),
        allocation: pkg.allocation
      };
      
      const updatedReferrals = [...(referrerData.referrals || []), newReferral];
      await updateDoc(referrerDoc.ref, { referrals: updatedReferrals });
      
      // Auto-award rewards based on config
      const refConfig = globalSettings.referralConfig || {
        enabled: true,
        rewardTier1Amount: 5000,
        rewardTier1MinPurchase: 10000,
        rewardTier2ReferralCount: 10,
        rewardTier2Amount: 100000
      };

      if (!refConfig.enabled) return;

      const validReferralsCount = updatedReferrals.filter(
        (r) => (r.allocation || 0) >= refConfig.rewardTier1MinPurchase
      ).length;

      if (pkg.allocation >= refConfig.rewardTier1MinPurchase) {
        const giftPkg = packages.find(p => p.allocation === refConfig.rewardTier1Amount) || packages.find(p => p.allocation >= refConfig.rewardTier1Amount) || packages[0];
        if (giftPkg) {
          await generateTradingAccount(giftPkg, 'GOO', 'evaluation', referrerData.id);
          addNotification({
            title: "Referral Gift!",
            message: `You earned a free $${refConfig.rewardTier1Amount.toLocaleString()} account because ${buyerName} purchased a qualifying account.`,
            type: "success"
          }, referrerData.id);
        }
      }
      
      if (validReferralsCount > 0 && validReferralsCount % refConfig.rewardTier2ReferralCount === 0 && pkg.allocation >= refConfig.rewardTier1MinPurchase) {
        const bigGiftPkg = packages.find(p => p.allocation === refConfig.rewardTier2Amount) || packages.find(p => p.allocation >= refConfig.rewardTier2Amount) || packages[0];
        if (bigGiftPkg) {
          await generateTradingAccount(bigGiftPkg, 'GOO', 'evaluation', referrerData.id);
          addNotification({
            title: "Referral Achievement!",
            message: `${refConfig.rewardTier2ReferralCount} qualifying referrals reached! You've been awarded a free $${refConfig.rewardTier2Amount.toLocaleString()} account.`,
            type: "success"
          }, referrerData.id);
        }
      }
    } catch (e) {
      console.error("Referral process error:", e);
    }
  };

  const incrementPromoUsage = async (code: string) => {
    if (!code) return;
    try {
      const q = query(collection(db, 'promotions'), where('discountCode', '==', code.toUpperCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, 'promotions', snap.docs[0].id);
        const currentCount = snap.docs[0].data().usageCount || 0;
        await updateDoc(docRef, { usageCount: currentCount + 1 });
      }
    } catch (e) {
      console.error("Promo increment error:", e);
    }
  };

  const applyAsEducator = async (
    bio: string, 
    socialLinks: {twitter?: string; youtube?: string; instagram?: string; website?: string},
    paymentMethod: 'card' | 'balance',
    cardDetails?: { last4: string; brand: string; cardholderName: string }
  ) => {
    if (!user) throw new Error("Not logged in");
    
    // Validate balance if selected
    if (paymentMethod === 'balance') {
      if (user.balance < 25) {
        throw new Error("Insufficient balance. $25 administration fee required.");
      }
    }

    try {
      // 1. Create secure payment Transaction record
      const txRef = doc(collection(db, "transactions"));
      const newTransaction: Transaction = {
        id: txRef.id,
        userId: user.id,
        userName: user.name || "User",
        amount: 25,
        type: 'purchase',
        status: 'completed',
        createdAt: Date.now(),
        description: "Educator Application Fee",
        paymentMethod: paymentMethod === 'balance' ? 'account_balance' : `${cardDetails?.brand || 'Card'} ****${cardDetails?.last4 || '4242'}`
      };
      await setDoc(txRef, newTransaction);

      // 2. Perform Account Balance deductions if needed
      if (paymentMethod === 'balance') {
        const nextBalance = user.balance - 25;
        await updateDoc(doc(db, "users", user.id), { balance: nextBalance });
        setUser(prev => prev ? { ...prev, balance: nextBalance } : null);
      }

      // 3. Create educator profile
      const newEducator: any = {
        userId: user.id,
        name: user.name,
        bio,
        socialLinks,
        tier: 'bronze',
        status: 'pending',
        courses: [],
        createdAt: Date.now()
      };
      
      const docRef = doc(collection(db, "educators"));
      newEducator.id = docRef.id;
      await setDoc(docRef, newEducator);
      
      // Notify administrator & user
      addNotification({
        title: "New Educator Application",
        message: `${user.name} applied to be a mentor. $25 fee paid via ${newTransaction.paymentMethod}.`,
        type: "alert"
      }, "admin");

      addNotification({
        title: "Application Received & Fee Paid",
        message: "Your $25 mentor administration fee was successfully processed. Your profile is now pending review.",
        type: "success"
      }, user.id);

      // Update local transaction state list
      setTransactions(prev => [newTransaction, ...prev]);

    } catch (error) {
      console.error("Error applying as educator:", error);
      throw error;
    }
  };

  const handleSetActiveView = (view: AppView) => {
    if (view === "web-terminal") {
      let isStandalone = false;
      try {
        isStandalone = new URLSearchParams(window.location.search).get('view') === 'web-terminal';
      } catch (e) {}
      if (!isStandalone) {
        const accountParam = activeAccountId ? `&accountId=${activeAccountId}` : '';
        window.open(`/?view=web-terminal${accountParam}`, "_blank");
        return;
      }
    }
    setActiveView(view);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthReady,
        firestoreQuotaExceeded,
        users,
        trades,
        stats,
        transactions,
        apis,
        packages,
        rules,
        globalSettings,
        competitions,
        educators,
        notifications,
        auditLogs,
        verificationRequests,
        leaderboard,
        calendar,
        symbolConfigs,
        promotions,
        activeAccountId,
        setActiveAccountId,
        activeView,
        isAdmin,
        isModerator,
        isStaff,
        setIsAdmin,
        mobileMenuOpen,
        setMobileMenuOpen,
        setActiveView: handleSetActiveView,
        login,
        loginWithEmail,
        registerWithEmail,
        logout,
        deleteAccount,
        addNotification,
        markNotifAsRead,
        addAuditLog,
        submitVerification,
        handleVerificationRequest,
        updateUser,
        updateUserProfile,
        deleteUser,
        addUser,
        updateAPI,
        addAPI,
        updatePackage,
        deletePackage,
        addPackage,
        updateRules,
        updateGlobalSettings,
        updateCompetitions,
        updateSymbolConfig,
        addSymbolConfig,
        deleteSymbolConfig,
        generateTradingAccount,
        updateTradingAccount,
        createHostesUser,
        addManualTrade,
        linkPaymentMethod,
        processReferral,
        incrementPromoUsage,
        applyAsEducator,
        fetchWithAuth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
