export type UserRole = 'user' | 'admin' | 'trader' | 'moderator';
export type AccountStatus = 'active' | 'suspended' | 'passed' | 'failed' | 'pending_verification' | 'banned';

export interface ShopPackage {
  id: string;
  name: string;
  price: number;
  allocation: number;
  leverage: string;
  profitTarget: number;
  dailyDrawdown: number;
  totalDrawdown: number;
  newsTrading?: boolean;
  weekendHolding?: boolean;
  isPopular?: boolean;
  platformFees?: { [key in TradingPlatform]?: number };
}

export interface SiteRules {
  content: string;
  updatedAt: string;
}

export interface NewsEvent {
  id: string;
  title: string;
  timestamp: string;
  currency: string;
  durationMinutes: number;
}

export interface ReferralConfig {
  enabled: boolean;
  rewardTier1Amount: number;
  rewardTier1MinPurchase: number;
  rewardTier2ReferralCount: number;
  rewardTier2Amount: number;
  dashboardMessage: string;
  referralViewMessage: string;
}

export interface GlobalSettings {
  leverageCap: number;
  newsEvents: NewsEvent[];
  newsSpreadMultiplier: number;
  referralConfig?: ReferralConfig;
}

export type TradingPlatform = 'GOO';

export interface TradingAccount {
  id: string;
  userId: string;
  platform: TradingPlatform;
  accountNumber: string;
  broker: string;
  server: string;
  status: 'active' | 'suspended' | 'pending' | 'failed';
  leverage: string;
  type: 'evaluation' | 'evaluation-1' | 'evaluation-2' | 'funded' | 'competition';
  competitionId?: string;
  createdAt: number;
  balance?: number;
  equity?: number;
  initialBalance?: number;
  initialFee?: number;
  feeRefunded?: boolean;
  openTrades?: any[];
  pendingOrders?: any[];
  history?: any[];
  rules?: {
    maxDrawdown: number;
    dailyDrawdown: number;
    profitTarget: number;
    consistencyRule?: number;
    targetPenalty?: number;
    newsTrading?: boolean;
    weekendHolding?: boolean;
  },
  payoutMilestones?: {
    amount: number;
    closedAt: number;
    unlockAt: number;
    tradeId: string;
  }[],
  mt5Sync?: {
    enabled: boolean;
    bridgeUrl: string;
    token: string;
  };
  certificates?: Certificate[];
  consistencyWarningsCount?: number;
  scalpWarningsCount?: number;
}

export interface Certificate {
  id: string;
  title: string;
  type: 'phase1' | 'phase2' | 'funded';
  createdAt: number;
  signerName: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  balance: number;
  equity: number;
  status: AccountStatus;
  leverage: string;
  pnl: number;
  pnlPercentage: number;
  isVerified: boolean;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  phone?: string;
  avatar?: string;
  realName?: string;
  lastName?: string;
  fiscalCode?: string;
  birthDate?: string;
  country?: string;
  allowProfileEdit?: boolean;
  createdAt: number;
  // Stats
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  maxDrawdown: number;
  tradingAccounts?: TradingAccount[];
  linkedPaymentMethod?: {
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
    isVerified: boolean;
  };
  referralCode?: string;
  referredBy?: string;
  referrals?: ReferralRecord[];
  lastReportExportAt?: number;
  isHostes?: boolean;
  isBot?: boolean;
}

export interface ReferralRecord {
  id: string;
  userName: string;
  purchaseAmount: number;
  packageTitle: string;
  timestamp: string;
  allocation?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  pnl: number;
  timestamp: number;
  isNewsTrade?: boolean;
  open_time?: number;
  close_time?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'purchase' | 'payout';
  status: 'completed' | 'pending' | 'rejected';
  createdAt: number;
  description: string;
  packageId?: string;
  paymentMethod?: string;
}

export interface CompetitionConfig {
  id: string;
  isActive: boolean;
  isVIP?: boolean;
  entryFee?: number;
  currentMonthName: string; // Used as name
  startDate: string; // ISO date string e.g. "2026-06-01T00:00:00Z"
  endDate?: string; // Optional ISO date string for when the competition ends
  botsEnabled?: boolean;
  botIntensityModifier?: number;
  prizes: {
    first: string;
    second: string;
    third: string;
    fourthToTwentieth: string;
    rest: string;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  type: 'info' | 'success' | 'alert' | 'credential';
  link?: string;
  data?: any;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  docs: {
    type: 'id' | 'residence';
    url: string;
    timestamp: string;
  }[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorId?: string;
  actorName?: string;
  actorRole?: 'admin' | 'moderator' | 'system';
  targetId?: string;
  targetName?: string;
  createdAt: number;
  details: string;
  ip?: string;
  location?: string;
  type: 'security' | 'user_management' | 'financial' | 'system' | 'auth';
}

export interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  event: string;
  impact: 'low' | 'medium' | 'high';
  actual?: string;
  forecast?: string;
  previous?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar?: string;
  pnlPercentage: number;
  winRate: number;
  consistencyScore: number;
  country?: string;
  wonTrades?: number;
  lostTrades?: number;
  favoritePairs?: string[];
  totalTrades?: number;
  id?: string;
  name?: string;
  pnl?: number;
}

export interface ExternalAPI {
  id: string;
  name: string;
  type: 'stripe' | 'firebase' | 'brevo' | 'exchangerate';
  config: Record<string, string>;
  description: string;
  status: 'active' | 'inactive';
}

export interface SiteStats {
  totalUsers: number;
  totalVolume: number;
  payoutsLast30Days: number;
  activeChallenges: number;
}

export type ContentType = 'youtube' | 'pdf' | 'image' | 'video' | 'other';

export interface EducatorCourse {
  id: string;
  title: string;
  description: string;
  price: number;
  isSubscription: boolean;
  createdAt: number;
  contentUrl?: string;
  contentType?: ContentType;
  dailyNote?: string;
}

export interface EducatorProfile {
  id: string;
  userId: string;
  name: string;
  bio: string;
  avatar?: string;
  socialLinks: {
    twitter?: string;
    youtube?: string;
    instagram?: string;
    website?: string;
  };
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  status: 'pending' | 'approved' | 'rejected';
  demoAccountId?: string;
  courses: EducatorCourse[];
  createdAt: number;
  isPro?: boolean;
  hasMasterMentorBadge?: boolean;
  discordUrl?: string;
  guidanceText?: string;
}

export interface SymbolConfig {
  id: string;
  symbol: string;
  spread: number;
  commission: number;
  pipSize: number;
  contractSize: number;
  isActive: boolean;
  updatedAt: number;
}
