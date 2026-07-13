import { UserAccount, Trade, SiteStats, Transaction, ExternalAPI, ShopPackage, SiteRules, LeaderboardEntry, EconomicEvent, EducatorProfile } from './types';

export const MOCK_USERS: UserAccount[] = [
  {
    id: 'admin-1',
    name: 'Master Admin',
    email: 'admin@prop.com',
    role: 'admin',
    balance: 0,
    equity: 0,
    status: 'active',
    leverage: 'N/A',
    pnl: 0,
    pnlPercentage: 0,
    isVerified: true,
    verificationStatus: 'verified',
    createdAt: 1672531200000,
    winRate: 0,
    totalTrades: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    tradingAccounts: []
  },
  {
    id: 'user-1',
    name: 'Victor Lupascu',
    email: 'victor@fundedgoo.com',
    role: 'user',
    balance: 100000,
    equity: 102450,
    status: 'active',
    leverage: '1:100',
    pnl: 2450,
    pnlPercentage: 2.45,
    isVerified: true,
    verificationStatus: 'verified',
    createdAt: 1714557600000,
    winRate: 68.5,
    totalTrades: 124,
    profitFactor: 2.1,
    maxDrawdown: 1.8,
    tradingAccounts: [
      {
        id: 'acc-1',
        userId: 'user-1',
        platform: 'GOO',
        accountNumber: '8810294',
        broker: 'FUNDEDGOO Liquidity',
        server: 'FUNDEDGOO-Live-01',
        status: 'active',
        leverage: '1:100',
        type: 'evaluation',
        createdAt: 1714557600000
      }
    ]
  }
];

export const MOCK_TRADES: Trade[] = [
  { id: 't1', symbol: 'EURUSD', type: 'buy', entryPrice: 1.0850, exitPrice: 1.0920, size: 1.0, pnl: 700, timestamp: 1714557600000 },
  { id: 't2', symbol: 'GBPUSD', type: 'sell', entryPrice: 1.2540, exitPrice: 1.2480, size: 0.5, pnl: 300, timestamp: 1714650600000 },
  { id: 't3', symbol: 'NAS100', type: 'buy', entryPrice: 18200, exitPrice: 18350, size: 2.0, pnl: 1450, timestamp: 1714743300000 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', userId: 'user-1', userName: 'Victor Lupascu', amount: 499, type: 'purchase', status: 'completed', createdAt: 1714305600000, description: '100K Challenge Purchase' },
  { id: 'tx-2', userId: 'user-1', userName: 'Victor Lupascu', amount: 1200, type: 'payout', status: 'completed', createdAt: 1714554000000, description: 'Monthly Profit Split' },
];

export const MOCK_APIS: ExternalAPI[] = [
  { id: 'api-stripe', name: 'Stripe Payment Gateway', type: 'stripe', config: { SecretKey: '', WebhookSecret: '', PublicKey: '' }, description: 'Process secure payments', status: 'active' },
  { id: 'api-brevo', name: 'Brevo Email API', type: 'brevo', config: { SecretKey: '', SenderEmail: 'no-reply@fundedgoo.com', SenderName: 'FundedGoo' }, description: 'Send transactional emails via Brevo', status: 'active' },
  { id: 'api-firebase', name: 'Firebase Backend', type: 'firebase', config: { ProjectID: '', APIKey: '', AuthDomain: '', DatabaseURL: '(Optional for Firestore)' }, description: 'Database & Auth services (Note: DatabaseURL is only for Realtime DB)', status: 'active' },
  { id: 'api-exchangerate', name: 'ExchangeRate API', type: 'exchangerate', config: { ApiKey: '', UpdateIntervalMinutes: '30' }, description: 'Forex caching provider & rates backup service', status: 'active' },
];

export const MOCK_PACKAGES: ShopPackage[] = [
  { 
    id: 'p1', 
    name: 'FUNDEDGOO Starter', 
    price: 49, 
    allocation: 5000, 
    leverage: '1:100', 
    profitTarget: 10, 
    dailyDrawdown: 5, 
    totalDrawdown: 10,
    platformFees: { 'GOO': 0 }
  },
  { 
    id: 'p2', 
    name: 'Standard Pro', 
    price: 89, 
    allocation: 10000, 
    leverage: '1:100', 
    profitTarget: 10, 
    dailyDrawdown: 5, 
    totalDrawdown: 10,
    platformFees: { 'GOO': 0 }
  },
  { 
    id: 'p3', 
    name: 'Advanced', 
    price: 159, 
    allocation: 25000, 
    leverage: '1:100', 
    profitTarget: 10, 
    dailyDrawdown: 5, 
    totalDrawdown: 10,
    platformFees: { 'GOO': 0 }
  },
  { 
    id: 'p4', 
    name: 'Pro Trader', 
    price: 299, 
    allocation: 50000, 
    leverage: '1:100', 
    profitTarget: 10, 
    dailyDrawdown: 5, 
    totalDrawdown: 10, 
    isPopular: true,
    platformFees: { 'GOO': 0 }
  },
  { 
    id: 'p5', 
    name: 'Elite Master', 
    price: 499, 
    allocation: 100000, 
    leverage: '1:100', 
    profitTarget: 10, 
    dailyDrawdown: 5, 
    totalDrawdown: 10,
    platformFees: { 'GOO': 0 }
  },
  { 
    id: 'p6', 
    name: 'FUNDEDGOO Institutional', 
    price: 999, 
    allocation: 250000, 
    leverage: '1:100', 
    profitTarget: 10, 
    dailyDrawdown: 5, 
    totalDrawdown: 10,
    platformFees: { 'GOO': 0 }
  },
];

export const MOCK_RULES: SiteRules = {
  updatedAt: new Date().toISOString(),
  content: `# FUNDEDGOO PROPRIETARY TRADING PROTOCOL

## 1. PROFIT TARGET
Traders must achieve a 10% profit target for Phase 1 and 5% for Phase 2. Once these targets are reached on Funded accounts, you are eligible for profit sharing.

## 2. MAXIMUM LOSS & DRAWDOWN
- **Maximum Daily Drawdown**: 5% of the starting balance of the day.
- **Maximum Total Drawdown**: 10% of the initial account balance.
*Breaching these limits results in immediate account termination.*

## 3. THE 45% CONSISTENCY PROTOCOL (EVALUATION ONLY)
To ensure high-quality and sustainable trading performance during the Evaluation phase, we implement a 45% Consistency Rule. Note: This rule applies exclusively to Phase 1 and Phase 2 challenges. Once you advance to a Funded account, this rule is no longer applied.

### What is the 45% Rule?
No single trading day's net profit can exceed 45% of your total profit at the time of your challenge completion. This ensures your success is based on consistent trading rather than a single outlier event.

### How to Calculate Your Limit
Traders can calculate their maximum allowed daily profit using this formula:
**[Total Current Profit] × 0.45 = Max Daily Profit Cap**

*Example:* 
If your total profit is **$10,000**, your limit is **$4,500**. If you made **$5,000** in one day, you have breached the consistency protocol.

### Breach Consequences & How to "Heal"
If the consistency limit is exceeded, you have two options to resolve the breach:

1. **Dilution (The "Trading" Solution)**: Continue trading profitably across multiple days. Since the 45% cap is based on the **Total Profit**, increasing your total profit through consistent smaller wins will eventually raise the allowed cap above your "outlier" day's profit.
   * *Required Total Profit = [Outlier Day Profit] ÷ 0.45*
2. **Profit Adjustment (The "Payout" Solution)**: At the time of payout, the system will automatically deduct the "excess" profit from your outlier day to bring you back into the 45% compliance. You will only be paid up to the allowed cap for that day.

## 4. FEE REFUND POLICY
Your initial evaluation fee is 100% refundable. This refund is added to your **first successful payout** from a Funded account.

## 5. TRADING STYLE
- **HFT**: Prohibited.
- **News Trading**: Allowed only when specified in account rules. If prohibited, profits from news trades will be deducted as a penalty.
- **Weekend Holding**: Forbidden on Funded accounts. All positions must be closed before the Friday market close (21:00 UTC).
- **Crypto Trading**: Available 24/7, including weekends. However, **Overnight Holding** for Crypto positions during weekends is strictly prohibited and will result in an immediate rule breach.
- **Minimum Trading Days**: 5 days per phase.

## 6. PAYOUTS
Payouts are processed every 14 days. We distribute an **80% Profit Split** to the trader. Minimum withdrawal is $100.`
};

export const MOCK_SITE_STATS: SiteStats = {
  totalUsers: 15420,
  totalVolume: 1250000000,
  payoutsLast30Days: 4500000,
  activeChallenges: 3200
};

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 'u1', userName: 'X-Trader', pnlPercentage: 45.2, winRate: 72, consistencyScore: 98, country: 'RO', wonTrades: 108, lostTrades: 42, totalTrades: 150, favoritePairs: ['XAU/USD', 'EUR/USD'], avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack' },
  { rank: 2, userId: 'u2', userName: 'Alpha-Prop', pnlPercentage: 38.5, winRate: 65, consistencyScore: 95, country: 'US', wonTrades: 91, lostTrades: 49, totalTrades: 140, favoritePairs: ['BTC/USD', 'XAU/USD'], avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sasha' },
  { rank: 3, userId: 'u3', userName: 'Victor Lupascu', pnlPercentage: 32.1, winRate: 68, consistencyScore: 92, country: 'RO', wonTrades: 81, lostTrades: 38, totalTrades: 119, favoritePairs: ['EUR/USD', 'GBP/USD'], avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix' },
  { rank: 4, userId: 'u4', userName: 'CyberMind', pnlPercentage: 28.4, winRate: 59, consistencyScore: 88, country: 'GB', wonTrades: 65, lostTrades: 45, totalTrades: 110, favoritePairs: ['GBP/USD', 'EUR/USD'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo' },
  { rank: 5, userId: 'u5', userName: 'GhostTrade', pnlPercentage: 25.7, winRate: 61, consistencyScore: 85, country: 'DE', wonTrades: 55, lostTrades: 35, totalTrades: 90, favoritePairs: ['EUR/USD', 'USD/JPY'], avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=Max' },
  { rank: 6, userId: 'u6', userName: 'Neo-Trader', pnlPercentage: 24.1, winRate: 62, consistencyScore: 84, country: 'US', wonTrades: 52, lostTrades: 32, totalTrades: 84, favoritePairs: ['EUR/USD', 'XAU/USD'], avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Pepper' },
  { rank: 7, userId: 'u7', userName: 'PipsQueen', pnlPercentage: 22.8, winRate: 60, consistencyScore: 83, country: 'GB', wonTrades: 48, lostTrades: 32, totalTrades: 80, favoritePairs: ['GBP/USD', 'EUR/USD'], avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Coco' },
  { rank: 8, userId: 'u8', userName: 'ZenScalp', pnlPercentage: 21.2, winRate: 58, consistencyScore: 81, country: 'FR', wonTrades: 40, lostTrades: 29, totalTrades: 69, favoritePairs: ['EUR/USD', 'USD/JPY'], avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sara' },
  { rank: 9, userId: 'u9', userName: 'BullRun', pnlPercentage: 19.5, winRate: 57, consistencyScore: 80, country: 'ES', wonTrades: 38, lostTrades: 29, totalTrades: 67, favoritePairs: ['BTC/USD', 'ETH/USD'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Harley' },
  { rank: 10, userId: 'u10', userName: 'ShadowPips', pnlPercentage: 18.0, winRate: 55, consistencyScore: 78, country: 'RO', wonTrades: 33, lostTrades: 27, totalTrades: 60, favoritePairs: ['XAU/USD', 'GBP/USD'], avatar: 'https://api.dicebear.com/7.x/micah/svg?seed=Mimi' },
];

export const MOCK_CALENDAR: EconomicEvent[] = [
  { id: 'e1', time: '15:30', currency: 'USD', event: 'CPI m/m', impact: 'high', forecast: '0.3%', previous: '0.4%' },
  { id: 'e2', time: '15:30', currency: 'USD', event: 'Core CPI m/m', impact: 'high', forecast: '0.3%', previous: '0.4%' },
  { id: 'e3', time: '17:00', currency: 'USD', event: 'Crude Oil Inventories', impact: 'medium', forecast: '-1.4M', previous: '-2.5M' },
  { id: 'e4', time: '21:00', currency: 'USD', event: 'FOMC Meeting Minutes', impact: 'high' },
];

export const MOCK_EDUCATORS: EducatorProfile[] = [
  {
    id: 'edu_1',
    userId: 'u1',
    name: 'Alex "Pips" Carter',
    bio: 'Specialized in high-frequency scalping and order block analysis. Live tracking of my $100K evaluation account.',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
    socialLinks: {
      twitter: 'https://twitter.com/alexcarter',
      youtube: 'https://youtube.com/alexcarter'
    },
    tier: 'gold',
    status: 'approved',
    demoAccountId: 'acc_1001',
    courses: [
      {
        id: 'c_1',
        title: 'Mastering Order Blocks',
        description: 'A complete framework for identifying institutional levels.',
        price: 299,
        isSubscription: false,
        createdAt: Date.now() - 864000000
      }
    ],
    createdAt: Date.now() - 30 * 86400000
  }
];
