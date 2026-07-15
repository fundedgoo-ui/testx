import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();
import pg from "pg";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import admin from 'firebase-admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, getDocs, limit, collectionGroup } from 'firebase/firestore';
import { getAuth as getClientAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as fs from 'fs';
import crypto from 'crypto';
import { getHistoricalRates, getRealTimeRates } from "dukascopy-node";
import pRetry from "p-retry";
import { initializeExchangeRates, getRatesFromCache } from "./exchangeRateService";
import { GoogleGenAI, Type } from "@google/genai";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "fundedgoo-secret-secure-key-2026";

// Global error handlers to prevent grpc-js from crashing the server on authentication failure
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Removed nodemailer import

// Read Firebase config
const firebaseConfigStr = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
const firebaseConfig = JSON.parse(firebaseConfigStr);

// Initialize Admin SDK
let firebaseAdminApp: admin.app.App;

// --- Client-side Firebase SDK Wrapper for Server Side fallback ---
class ClientDocSnapshot {
  constructor(public id: string, public exists: boolean, private _data: any, public ref: any) {}
  data() { return this._data; }
}

class ClientQuerySnapshot {
  public size: number;
  constructor(public docs: ClientDocSnapshot[]) {
    this.size = docs.length;
  }
  forEach(callback: (doc: ClientDocSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

class ClientDoc {
  constructor(private db: any, private path: string) {}
  async get() {
    const snap = await getDoc(doc(this.db, this.path));
    return new ClientDocSnapshot(snap.id, snap.exists(), snap.data(), snap.ref);
  }
  async set(data: any, options?: any) {
    await setDoc(doc(this.db, this.path), data, options);
  }
  async update(data: any) {
    await updateDoc(doc(this.db, this.path), data);
  }
  async delete() {
    await deleteDoc(doc(this.db, this.path));
  }
  collection(name: string) {
    return new ClientCollection(this.db, `${this.path}/${name}`);
  }
}

class ClientQuery {
  constructor(private db: any, private q: any) {}
  where(field: string, op: any, val: any) {
    const newQ = query(this.q, where(field, op, val));
    return new ClientQuery(this.db, newQ);
  }
  limit(val: number) {
    const newQ = query(this.q, limit(val));
    return new ClientQuery(this.db, newQ);
  }
  async get() {
    const snap = await getDocs(this.q);
    const docs = snap.docs.map(d => new ClientDocSnapshot(d.id, d.exists(), d.data(), d.ref));
    return new ClientQuerySnapshot(docs);
  }
}

class ClientCollection {
  constructor(private db: any, private path: string) {}
  doc(id: string) {
    return new ClientDoc(this.db, `${this.path}/${id}`);
  }
  async add(data: any) {
    const ref = await addDoc(collection(this.db, this.path), data);
    return { id: ref.id, ref };
  }
  where(field: string, op: any, val: any) {
    const q = query(collection(this.db, this.path), where(field, op, val));
    return new ClientQuery(this.db, q);
  }
  limit(val: number) {
    const q = query(collection(this.db, this.path), limit(val));
    return new ClientQuery(this.db, q);
  }
  async get() {
    const snap = await getDocs(collection(this.db, this.path));
    const docs = snap.docs.map(d => new ClientDocSnapshot(d.id, d.exists(), d.data(), d.ref));
    return new ClientQuerySnapshot(docs);
  }
}

class ClientCollectionGroup {
  constructor(private db: any, private collectionId: string) {}
  where(field: string, op: any, val: any) {
    const q = query(collectionGroup(this.db, this.collectionId), where(field, op, val));
    return new ClientQuery(this.db, q);
  }
  async get() {
    const snap = await getDocs(collectionGroup(this.db, this.collectionId));
    const docs = snap.docs.map(d => new ClientDocSnapshot(d.id, d.exists(), d.data(), d.ref));
    return new ClientQuerySnapshot(docs);
  }
}

class ClientDbWrapper {
  constructor(private db: any) {}
  collection(name: string) {
    return new ClientCollection(this.db, name);
  }
  collectionGroup(name: string) {
    return new ClientCollectionGroup(this.db, name);
  }
}

let dbAdmin: any;

async function initFirebase() {
  // Override environment variable to fix "aud" claim issue with verifyIdToken when using ADC
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
  process.env.GCLOUD_PROJECT = firebaseConfig.projectId;

  if (admin.apps.length) {
    firebaseAdminApp = admin.app();
  } else {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountVar) {
      try {
        const serviceAccount = JSON.parse(serviceAccountVar);
        firebaseAdminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: firebaseConfig.projectId,
        });
        console.log(`Firebase Admin initialized with service account. Project: ${firebaseAdminApp.options.projectId}`);
      } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT, falling back to ADC");
        firebaseAdminApp = admin.initializeApp({
          projectId: firebaseConfig.projectId
        });
      }
    } else {
      try {
        // In AI Studio / Cloud Run, initialization with no arguments uses metadata server (ADC)
        // and automatically picks up the correct project.
        firebaseAdminApp = admin.initializeApp({
          projectId: firebaseConfig.projectId
        });
        console.log(`Firebase Admin initialized with ADC for project ${firebaseConfig.projectId}.`);
      } catch (e) {
        console.error("ADC initialization failed, falling back to config projectId");
        firebaseAdminApp = admin.initializeApp({
          projectId: firebaseConfig.projectId
        });
      }
    }
  }

  // Database ID from config or environment
  const databaseId = 
    process.env.VITE_FIREBASE_DATABASE_ID || 
    firebaseConfig.firestoreDatabaseId || 
    undefined;

  dbAdmin = getAdminFirestore(firebaseAdminApp, databaseId);
  console.log(`[Firebase] Services Ready. Project: ${firebaseAdminApp.options.projectId}, Database: ${databaseId || '(default)'}`);

  // Test reachability once carefully
  try {
    const testDoc = await dbAdmin.collection('_health_').doc('test').get();
    console.log("[Firebase] Firestore connectivity test successful with Admin SDK.");
  } catch (e: any) {
    console.warn("[Firebase] Admin SDK returned PERMISSION_DENIED. Initializing Client SDK wrapper fallback...");
    try {
      const config = {
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
      };
      
      const clientApp = initClientApp(config, "server-client-app-fallback");
      const clientDb = getClientFirestore(clientApp, databaseId || '(default)');
      const clientAuth = getClientAuth(clientApp);
      
      console.log("[Firebase Fallback] Logging in as admin@prop.com using Client SDK...");
      await signInWithEmailAndPassword(clientAuth, 'admin@prop.com', 'adminpassword');
      console.log("[Firebase Fallback] Login successful! Creating ClientDbWrapper...");
      
      dbAdmin = new ClientDbWrapper(clientDb);
      console.log("[Firebase Fallback] ClientDbWrapper initialized. All Firestore queries will run under admin authenticated session.");
    } catch (fallbackErr: any) {
      console.error("[Firebase Fallback] Client-side fallback initialization failed:", fallbackErr.message);
      dbAdmin = null;
    }
  }

  if (dbAdmin) {
    // Ensure admin@prop.com exists
    (async () => {
      try {
        const existing = await firebaseAdminApp.auth().getUserByEmail('admin@prop.com');
        console.log(`[Firebase] Admin account found: ${existing.email}`);
        
        // Ensure doc exists
        const doc = await dbAdmin.collection('users').doc(existing.uid).get();
        if (!doc.exists) {
          await dbAdmin.collection('users').doc(existing.uid).set({
            id: existing.uid,
            name: existing.displayName || 'System Admin',
            email: 'admin@prop.com',
            role: 'admin',
            createdAt: Date.now(),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${existing.uid}`
          });
          console.log("[Firebase] Admin profile recreated in Firestore.");
        }
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          try {
            const userRecord = await firebaseAdminApp.auth().createUser({
              email: 'admin@prop.com',
              password: 'adminpassword',
              displayName: 'System Admin'
            });
            console.log("[Firebase] Admin user admin@prop.com created successfully in Auth.");
            
            // Also create Firestore document for the admin
            await dbAdmin.collection('users').doc(userRecord.uid).set({
              id: userRecord.uid,
              name: 'System Admin',
              email: 'admin@prop.com',
              role: 'admin',
              createdAt: Date.now(),
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userRecord.uid}`
            });
            console.log("[Firebase] Admin user profile created in Firestore.");
          } catch (createErr: any) {
            if (createErr.code === 'auth/operation-not-allowed') {
              console.log("[Firebase] Note: Email/Password provider is disabled in Firebase Console.");
            } else {
              console.log("[Firebase] Note: Admin user creation deferred:", createErr.message);
            }
          }
        } else {
          console.log("[Firebase] Note: Admin user status checked:", e.message);
        }
      }
    })();

    // Run Bot Profiles Initialization in the background
    (async () => {
      // Initialize Bot Profiles
      try {
        await initBotProfiles();
      } catch (e) {
        console.log("[Firebase] Note: Bot profiles check deferred:", e);
      }

      // Seed essential data if missing
      try {
        await seedEssentialData();
      } catch (e) {
        console.log("[Firebase] Note: Essential data check deferred:", e);
      }
    })();
  }
}

async function seedEssentialData() {
  if (!dbAdmin) return;

  // 1. Seed Packages
  const packagesSnap = await dbAdmin.collection('packages').limit(1).get();
  if (packagesSnap.empty) {
    console.log("[Firebase] Seeding default packages...");
    const defaultPackages = [
      { id: 'p1', name: 'FUNDEDGOO Starter', price: 49, allocation: 5000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
      { id: 'p2', name: 'Standard Pro', price: 89, allocation: 10000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
      { id: 'p3', name: 'Advanced', price: 159, allocation: 25000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
      { id: 'p4', name: 'Pro Trader', price: 299, allocation: 50000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, isPopular: true, platformFees: { 'GOO': 0 } },
      { id: 'p5', name: 'Elite Master', price: 499, allocation: 100000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
      { id: 'p6', name: 'FUNDEDGOO Institutional', price: 999, allocation: 250000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
    ];
    for (const pkg of defaultPackages) {
      await dbAdmin.collection('packages').doc(pkg.id).set(pkg);
    }
  }

  // 2. Seed Rules
  const rulesDoc = await dbAdmin.collection('rules').doc('global').get();
  if (!rulesDoc.exists) {
    console.log("[Firebase] Seeding default rules...");
    await dbAdmin.collection('rules').doc('global').set({
      updatedAt: new Date().toISOString(),
      content: `# FUNDEDGOO PROPRIETARY TRADING PROTOCOL\n\n## 1. PROFIT TARGET\n...`
    });
  }

  // 3. Seed APIs (empty placeholders)
  const apisSnap = await dbAdmin.collection('apis').limit(1).get();
  if (apisSnap.empty) {
    console.log("[Firebase] Seeding API placeholders...");
    const defaultApis = [
      { id: 'api-stripe', name: 'Stripe Payment Gateway', type: 'stripe', config: { SecretKey: '', WebhookSecret: '', PublicKey: '' }, description: 'Process secure payments', status: 'active' },
      { id: 'api-brevo', name: 'Brevo Email API', type: 'brevo', config: { SecretKey: '', SenderEmail: 'no-reply@fundedgoo.com', SenderName: 'FundedGoo' }, description: 'Send transactional emails via Brevo', status: 'active' },
      { id: 'api-exchangerate', name: 'ExchangeRate API', type: 'exchangerate', config: { ApiKey: '', UpdateIntervalMinutes: '30' }, description: 'Forex caching provider & rates backup service', status: 'active' },
    ];
    for (const api of defaultApis) {
      await dbAdmin.collection('apis').doc(api.id).set(api);
    }
  }
}

async function initBotProfiles() {
  const profiles = [
    {
      id: 'aggressive',
      name: 'Aggressive Scalper',
      minTradeInterval: 15,
      maxTradeInterval: 60,
      minDuration: 5,
      maxDuration: 120,
      buyProbability: 0.5,
      preferredInstruments: ['XAUUSD', 'NAS100', 'US30'],
      lotSizeRange: [0.5, 5.0],
      riskLevel: 'aggressive'
    },
    {
      id: 'balanced',
      name: 'Balanced Day Trader',
      minTradeInterval: 60,
      maxTradeInterval: 240,
      minDuration: 60,
      maxDuration: 480,
      buyProbability: 0.5,
      preferredInstruments: ['EURUSD', 'GBPUSD', 'XAUUSD'],
      lotSizeRange: [0.1, 1.0],
      riskLevel: 'balanced'
    },
    {
      id: 'conservative',
      name: 'Conservative Swing',
      minTradeInterval: 120,
      maxTradeInterval: 480,
      minDuration: 300,
      maxDuration: 1440,
      buyProbability: 0.5,
      preferredInstruments: ['EURUSD', 'USDJPY', 'AUDUSD'],
      lotSizeRange: [0.01, 0.2],
      riskLevel: 'conservative'
    }
  ];

  for (const p of profiles) {
    await dbAdmin.collection('botProfiles').doc(p.id).set(p, { merge: true });
  }
}

// Bot Cache State to prevent Firestore Quota hits
let cachedBots: any[] | null = null;
let botCacheTime = 0;
let cachedBotProfiles: Map<string, any> | null = null;
let botProfilesCacheTime = 0;
let cachedCompetitionsList: any[] | null = null;
let competitionsListCacheTime = 0;

async function getCachedBots() {
  const now = Date.now();
  if (cachedBots && (now - botCacheTime < 1800000)) { // 30 minutes cache
    return cachedBots;
  }
  
  const db = getDb();
  if (db) {
    try {
      const res = await db.query("SELECT * FROM sql_users WHERE is_bot = TRUE");
      const bots = res.rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        country: r.country,
        botProfile: r.bot_profile_id || 'balanced',
        isActive: r.status === 'active',
        ...r
      }));
      cachedBots = bots;
      botCacheTime = now;
      console.log(`Bot Engine Cache: Cached ${bots.length} active bots from Postgres.`);
      return bots;
    } catch (e) {
      console.error("Postgres getCachedBots error:", e);
    }
  }

  try {
    const botSnap = await dbAdmin.collection('users').where('isBot', '==', true).get();
    const bots = botSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((b: any) => b.isActive !== false && b.status !== 'inactive');
    cachedBots = bots;
    botCacheTime = now;
    console.log(`Bot Engine Cache: Cached ${bots.length} active bots from Firestore.`);
    return bots;
  } catch (e: any) {
    const errText = String(e?.message || e);
    if (errText.includes('RESOURCE_EXHAUSTED') || errText.includes('Quota') || errText.includes('quota') || errText.includes('limit exceeded')) {
      console.warn("Bot Engine Cache Note: Firestore/DB Quota exhausted while fetching bots. Using cache/local fallback.");
    } else {
      console.error("Bot Engine Cache: Failed to fetch bots:", e);
    }
    if (!cachedBots || cachedBots.length === 0) {
      cachedBots = [
        { id: "bot-1", isBot: true, name: "Ionut F.", email: "ionut@profit.com", country: "RO", alias: "Alpha Trader" },
        { id: "bot-2", isBot: true, name: "Maria G.", email: "maria@profit.com", country: "RO", alias: "Golden Eagle" },
        { id: "bot-3", isBot: true, name: "Stanimir P.", email: "stanimir@profit.com", country: "BG", alias: "Balkan Bull" }
      ];
    }
    return cachedBots;
  }
}

async function getCachedBotProfiles() {
  const now = Date.now();
  if (cachedBotProfiles && (now - botProfilesCacheTime < 3600000)) { // 1 hour cache
    return cachedBotProfiles;
  }

  // Use a simple in-memory map of bot profiles since they are static
  const profilesMap = new Map();
  profilesMap.set("conservative", { id: "conservative", name: "Conservative", winRate: 55, dailyRisk: 1, minTradeInterval: 120, maxTradeInterval: 480, minDuration: 300, maxDuration: 1440, buyProbability: 0.5, preferredInstruments: ['EURUSD', 'USDJPY', 'AUDUSD'], lotSizeRange: [0.01, 0.2] });
  profilesMap.set("aggressive", { id: "aggressive", name: "Aggressive", winRate: 62, dailyRisk: 3, minTradeInterval: 15, maxTradeInterval: 60, minDuration: 5, maxDuration: 120, buyProbability: 0.5, preferredInstruments: ['XAUUSD', 'NAS100', 'US30'], lotSizeRange: [0.5, 5.0] });
  profilesMap.set("balanced", { id: "balanced", name: "Balanced", winRate: 60, dailyRisk: 2, minTradeInterval: 60, maxTradeInterval: 240, minDuration: 60, maxDuration: 480, buyProbability: 0.5, preferredInstruments: ['EURUSD', 'GBPUSD', 'XAUUSD'], lotSizeRange: [0.1, 1.0] });
  
  cachedBotProfiles = profilesMap;
  botProfilesCacheTime = now;
  return profilesMap;
}

async function getCachedActiveCompetitions() {
  const now = Date.now();
  if (cachedCompetitionsList && (now - competitionsListCacheTime < 300000)) { // 5 minutes cache
    return cachedCompetitionsList;
  }

  const db = getDb();
  if (db) {
    try {
      const res = await db.query("SELECT * FROM sql_competitions WHERE is_active = TRUE");
      const comps = res.rows.map(r => ({
        id: r.id,
        name: r.name,
        isActive: r.is_active,
        botsEnabled: r.bots_enabled,
        currentMonthName: r.current_month_name,
        startDate: r.start_date,
        endDate: r.end_date,
        prizes: r.prizes ? JSON.parse(r.prizes) : {},
        rules: r.rules ? JSON.parse(r.rules) : {}
      }));
      cachedCompetitionsList = comps;
      competitionsListCacheTime = now;
      return comps;
    } catch (e) {
      console.error("Postgres getCachedActiveCompetitions error:", e);
    }
  }

  try {
    const compListSnap = await dbAdmin.collection('system').doc('competitionsList').get();
    if (compListSnap.exists && compListSnap.data()?.list) {
      const list = compListSnap.data()!.list || [];
      const active = list.filter((c: any) => c.isActive && c.botsEnabled !== false);
      cachedCompetitionsList = active;
      competitionsListCacheTime = now;
      return active;
    }
    return [];
  } catch (e: any) {
    const errText = String(e?.message || e);
    if (errText.includes('RESOURCE_EXHAUSTED') || errText.includes('Quota') || errText.includes('quota') || errText.includes('limit exceeded')) {
      console.warn("Bot Engine Cache Note: Firestore/DB Quota exhausted while fetching competitions. Using cache/local fallback.");
    } else {
      console.error("Bot Engine Cache: Failed to fetch competitions:", e);
    }
    if (!cachedCompetitionsList || cachedCompetitionsList.length === 0) {
      cachedCompetitionsList = [
        { id: "monthly-default", isActive: true, botsEnabled: true, currentMonthName: "Competition Month" }
      ];
    }
    return cachedCompetitionsList;
  }
}

// Bot Engine Logic
async function runBotEngine() {
  const db = getDb();
  if (!db) return;

  try {
    // 1. Get active competitions with bots enabled (cached!)
    const activeComps = await getCachedActiveCompetitions();
    if (activeComps.length === 0) return;

    // Prefetch all bots (cached!)
    const botsList = await getCachedBots();
    if (botsList.length === 0) return;

    for (const comp of activeComps) {
      const compId = comp.id;
      console.log(`Bot Engine: Processing competition ${compId}`);

      // 2. Fetch all trading accounts for this competition in one batch
      const enrolledRes = await db.query(
        "SELECT * FROM sql_trading_accounts WHERE competition_id = $1 AND type = 'competition'",
        [compId]
      );
      
      const enrolledAccounts = enrolledRes.rows.map(acc => ({
        id: acc.id,
        userId: acc.user_id,
        accountNumber: acc.account_number,
        status: acc.status,
        balance: Number(acc.balance),
        equity: Number(acc.equity),
        initialBalance: Number(acc.initial_balance),
        type: acc.type,
        competitionId: acc.competition_id,
        createdAt: Number(acc.created_at)
      }));

      // Ensure bots are enrolled using the list we just fetched!
      await enrollBotsInCompetitionOptimized(compId, enrolledAccounts, botsList);

      // Re-fetch to get any newly enrolled bots
      const updatedEnrolledRes = await db.query(
        "SELECT * FROM sql_trading_accounts WHERE competition_id = $1 AND type = 'competition'",
        [compId]
      );
      const updatedAccounts = updatedEnrolledRes.rows.map(acc => ({
        id: acc.id,
        userId: acc.user_id,
        accountNumber: acc.account_number,
        status: acc.status,
        balance: Number(acc.balance),
        equity: Number(acc.equity),
        initialBalance: Number(acc.initial_balance),
        type: acc.type,
        competitionId: acc.competition_id,
        createdAt: Number(acc.created_at)
      }));

      const pseudoEnrolledDocs = updatedAccounts.map(acc => ({
        data: () => acc,
        id: acc.id
      }));

      // 3. Handle bot trading activity (pass pre-fetched accounts and bots list!)
      await processBotTradingOptimized(compId, comp, pseudoEnrolledDocs, botsList);
    }
  } catch (e) {
    console.error("Bot Engine Loop Error:", e);
  }
}

async function enrollBotsInCompetitionOptimized(compId: string, enrolledAccounts: any[], botsList: any[]) {
  const db = getDb();
  if (!db) return;

  const enrolledUserIds = new Set(enrolledAccounts.map(acc => acc.userId));

  for (const bot of botsList) {
    const botId = bot.id;
    if (!enrolledUserIds.has(botId)) {
      console.log(`Bot Engine: Enrolling bot ${botId} in competition ${compId}`);
      const accId = `bot-acc-${botId}-${compId}`;
      const accNum = `BOT-${Math.floor(100000 + Math.random() * 900000)}`;
      try {
        await db.query(`
          INSERT INTO sql_trading_accounts (
            id, user_id, platform, account_number, broker, server, status, leverage, type, competition_id, created_at, balance, equity, initial_balance, rules, open_trades, pending_orders, history, payout_milestones, certificates
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `, [
          accId,
          botId,
          "GOO",
          accNum,
          "FundedGoo Markets",
          "FundedGoo-Live",
          "active",
          "1:100",
          "competition",
          compId,
          Date.now(),
          100000,
          100000,
          100000,
          JSON.stringify({ maxDrawdown: 10000, dailyDrawdown: 5000, profitTarget: 10000 }),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([])
        ]);
        console.log(`Bot ${botId} enrolled in competition ${compId} via Postgres`);
      } catch (err) {
        console.error(`Failed to enroll bot ${botId} in competition:`, err);
      }
    }
  }
}

async function processBotTradingOptimized(compId: string, comp: any, enrolledDocs: any[], botsList: any[]) {
  const db = getDb();

  // Create bot lookup map for fast in-memory checks
  const botMap = new Map();
  botsList.forEach(b => botMap.set(b.id, b));

  // Only keep enrolled accounts that belong to known bots
  const enrolledBotDocs = enrolledDocs.filter(doc => botMap.has(doc.data().userId));
  console.log(`Bot Engine: Processing trading for ${enrolledBotDocs.length} enrolled bots in ${compId}`);

  // Fetch bot profiles once, or look up cached map
  const profilesMap = await getCachedBotProfiles();

  // 1 query for all open positions in competition instead of N queries!
  const openPositionsByBot = new Map<string, any[]>();
  if (!db && dbAdmin) {
    const openPositionsSnap = await dbAdmin.collection('bot_positions')
      .where('competitionId', '==', compId)
      .where('status', '==', 'open')
      .get();
      
    openPositionsSnap.docs.forEach(doc => {
      const pos = doc.data();
      const botId = pos.userId;
      if (botId) {
        if (!openPositionsByBot.has(botId)) {
          openPositionsByBot.set(botId, []);
        }
        openPositionsByBot.get(botId)!.push({ ref: doc.ref, id: doc.id, ...pos });
      }
    });
  }

  // Optimized single batch query for all positions opened in the last 24 hours in this competition
  const tradesLast24hByBot = new Map<string, number>();
  if (!db && dbAdmin) {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const positionsLast24hSnap = await dbAdmin.collection('bot_positions')
        .where('competitionId', '==', compId)
        .where('openTime', '>=', oneDayAgo)
        .get();
      
      positionsLast24hSnap.docs.forEach(doc => {
        const p = doc.data();
        const bId = p.userId;
        if (bId) {
          tradesLast24hByBot.set(bId, (tradesLast24hByBot.get(bId) || 0) + 1);
        }
      });
      console.log(`Bot Engine: Cached 24h trade statistics for competition ${compId}. Found ${positionsLast24hSnap.size} trades.`);
    } catch (e) {
      console.error("Error fetching last 24h positions in Bot Engine:", e);
    }
  } else if (db) {
    try {
      const res = await db.query(
        "SELECT user_id, COUNT(*) as count FROM sql_positions WHERE competition_id = $1 AND open_time >= NOW() - INTERVAL '24 hours' GROUP BY user_id",
        [compId]
      );
      res.rows.forEach(r => {
        tradesLast24hByBot.set(r.user_id, parseInt(r.count));
      });
    } catch (e) {
      console.error("Error fetching last 24h positions in SQL:", e);
    }
  }

  for (const doc of enrolledBotDocs) {
    const acc = doc.data();
    const botId = acc.userId;
    if (!botId) continue;

    const bot = botMap.get(botId);
    if (!bot) continue;

    const profileId = bot.botProfile || 'balanced';
    const profile = profilesMap.get(profileId);
    if (!profile) continue;

    // A. Check for expiring trades
    if (db) {
      await closeExpiredBotTrades(db, botId, compId);
    } else {
      const botSpecificOpenPositionsDocuments = openPositionsByBot.get(botId) || [];
      await closeExpiredBotTradesOptimizedFirestore(botId, compId, botSpecificOpenPositionsDocuments);
    }

    // B. Check open count
    let openCount = 0;
    if (db) {
      const posResult = await db.query("SELECT COUNT(*) FROM sql_positions WHERE user_id = $1 AND status = 'open'", [botId]);
      openCount = parseInt(posResult.rows[0].count);
    } else {
      openCount = (openPositionsByBot.get(botId) || []).length;
    }

    // C. Calculate deterministic daily limit (1, 2, or 3) based on botId hash
    // This distributes the limits beautifully without requiring persistent fields
    let hash = 0;
    for (let i = 0; i < botId.length; i++) {
      hash += botId.charCodeAt(i);
    }
    const dailyLimit = (hash % 3) + 1; // 1, 2, or 3 trades max per 24 hours

    // D. Evaluate trade opportunity
    const tradesToday = tradesLast24hByBot.get(botId) || 0;
    if (tradesToday < dailyLimit) {
      // With a 2-hour loop interval (12 opportunities per 24h), a 25% chance of trading
      // in any tick perfectly staggers and randomizes when they execute.
      const staggerChance = 0.25;
      if (Math.random() < staggerChance) {
        const maxPositions = profile.riskLevel === 'aggressive' ? 5 : 2;
        if (openCount < maxPositions) {
          await openBotTrade(db, botId, profile, compId);
          // Increment in-memory counter to prevent double-opening in the same tick run
          tradesLast24hByBot.set(botId, tradesToday + 1);
        }
      }
    } else {
      console.log(`Bot Engine: Bot ${botId} reached daily limit of ${dailyLimit} trades today (has ${tradesToday}). Skipping.`);
    }
  }
}


async function openBotTrade(db: pg.Pool | null, botId: string, profile: any, compId: string) {
  const symbol = profile.preferredInstruments[Math.floor(Math.random() * profile.preferredInstruments.length)];
  const type = Math.random() < (profile.buyProbability || 0.5) ? 'buy' : 'sell';
  const lots = (Math.random() * (profile.lotSizeRange[1] - profile.lotSizeRange[0]) + profile.lotSizeRange[0]).toFixed(2);
  const duration = Math.floor(Math.random() * (profile.maxDuration - profile.minDuration) + profile.minDuration);
  
  const baselinePrices: Record<string, number> = {
    'EURUSD': 1.0850,
    'GBPUSD': 1.2650,
    'USDJPY': 150.20,
    'XAUUSD': 2024.50,
    'US30': 38500.0,
    'NAS100': 17800.0,
    'BTCUSD': 62000.0,
    'ETHUSD': 3400.0
  };
  
  const baseOpen = baselinePrices[symbol] || 100.0;
  // Slight random offset from baseline
  const openPriceRaw = baseOpen * (1 + (Math.random() * 0.002 - 0.001));
  const prec = symbol.includes("JPY") ? 3 : (symbol.includes("BTC") || symbol.includes("XAU") || symbol.includes("US30") || symbol.includes("NAS100") || symbol.includes("ETH")) ? 2 : 5;
  const openPrice = parseFloat(openPriceRaw.toFixed(prec));
  const closeAt = Date.now() + duration * 60000;

  if (db) {
    await db.query(
      "INSERT INTO sql_positions (user_id, symbol, lots, open_price, type, status, open_time, details, competition_id) VALUES ($1, $2, $3, $4, $5, 'open', NOW(), $6, $7)",
      [botId, symbol, lots, openPrice, type, JSON.stringify({ closeAt, isBot: true }), compId]
    );
  } else if (dbAdmin) {
    await dbAdmin.collection('bot_positions').add({
      userId: botId,
      symbol,
      lots,
      openPrice,
      type,
      status: 'open',
      openTime: Date.now(),
      closeAt,
      competitionId: compId
    });
  }
  console.log(`Bot ${botId} opened ${type} ${lots} ${symbol} for comp ${compId}`);
}

async function closeExpiredBotTrades(db: pg.Pool | null, botId: string, compId: string) {
  try {
    if (db) {
      const openTrades = await db.query("SELECT * FROM sql_positions WHERE user_id = $1 AND status = 'open'", [botId]);
      for (const trade of openTrades.rows) {
        if (!trade.details) continue;
        try {
          const details = JSON.parse(trade.details);
          if (details.closeAt && Date.now() > details.closeAt) {
            const pnlPerLot = (Math.random() * 500) - 200; 
            const pnl = Math.round(pnlPerLot * parseFloat(trade.lots) * 100) / 100;
            
            const priceDiffRaw = (pnl / parseFloat(trade.lots)) / 100000; 
            const priceDiff = trade.type === 'buy' ? priceDiffRaw : -priceDiffRaw;
            const closePriceRaw = parseFloat(trade.open_price) + priceDiff;
            const prec = trade.symbol.includes("JPY") ? 3 : (trade.symbol.includes("BTC") || trade.symbol.includes("XAU") || trade.symbol.includes("US30") || trade.symbol.includes("NAS100") || trade.symbol.includes("ETH")) ? 2 : 5;
            const closePrice = parseFloat(closePriceRaw.toFixed(prec));

            await db.query(
              "UPDATE sql_positions SET status = 'closed', close_price = $1, close_time = NOW(), pnl = $2 WHERE id = $3",
              [closePrice, pnl, trade.id]
            );
            console.log(`Bot ${botId} closed trade ${trade.id} PnL: ${pnl.toFixed(2)}`);

            if (trade.competition_id && dbAdmin) {
               const accId = `bot-acc-${botId}-${trade.competition_id}`;
               const accRef = dbAdmin.collection('users').doc(botId).collection('tradingAccounts').doc(accId);
               const accSnap = await accRef.get();
               if (accSnap.exists) {
                 const acc = accSnap.data();
                 const newBalance = Math.round(((acc.balance || 0) + pnl) * 100) / 100;
                 const history = acc.history || [];
                 history.push({
                   symbol: trade.symbol,
                   type: trade.type,
                   lots: trade.lots,
                   open_price: trade.open_price,
                   close_price: closePrice,
                   profit: Math.round(pnl * 100) / 100
                 });
                 if (history.length > 50) history.shift();
                 
                 await accRef.update({ balance: newBalance, equity: newBalance, history });
               }
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } else if (dbAdmin) {
      const openTradesSnap = await dbAdmin.collection('bot_positions')
        .where('userId', '==', botId)
        .where('competitionId', '==', compId)
        .where('status', '==', 'open')
        .get();
        
      for (const doc of openTradesSnap.docs) {
        const trade = doc.data();
        if (trade.closeAt && Date.now() > trade.closeAt) {
          const pnlPerLot = (Math.random() * 500) - 200; 
          const pnl = Math.round(pnlPerLot * parseFloat(trade.lots) * 100) / 100;
          
          const priceDiffRaw = (pnl / parseFloat(trade.lots)) / 100000; 
          const priceDiff = trade.type === 'buy' ? priceDiffRaw : -priceDiffRaw;
          const closePriceRaw = parseFloat(trade.openPrice) + priceDiff;
          const prec = trade.symbol.includes("JPY") ? 3 : (trade.symbol.includes("BTC") || trade.symbol.includes("XAU") || trade.symbol.includes("US30") || trade.symbol.includes("NAS100") || trade.symbol.includes("ETH")) ? 2 : 5;
          const closePrice = parseFloat(closePriceRaw.toFixed(prec));

          await doc.ref.update({
            status: 'closed',
            closePrice: closePrice,
            closeTime: Date.now(),
            pnl: pnl
          });
          console.log(`Bot ${botId} closed Firestore trade ${doc.id} PnL: ${pnl.toFixed(2)}`);

          const accId = `bot-acc-${botId}-${compId}`;
          const accRef = dbAdmin.collection('users').doc(botId).collection('tradingAccounts').doc(accId);
          const accSnap = await accRef.get();
          if (accSnap.exists) {
            const acc = accSnap.data();
            const newBalance = Math.round(((acc.balance || 0) + pnl) * 100) / 100;
            const history = acc.history || [];
            history.push({
              symbol: trade.symbol,
              type: trade.type,
              lots: trade.lots,
              open_price: trade.openPrice,
              close_price: closePrice,
              profit: Math.round(pnl * 100) / 100
            });
            if (history.length > 50) history.shift();
            
            await accRef.update({ balance: newBalance, equity: newBalance, history });
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

async function closeExpiredBotTradesOptimizedFirestore(botId: string, compId: string, openDocs: any[]) {
  if (!dbAdmin) return;
  try {
    for (const trade of openDocs) {
      if (trade.closeAt && Date.now() > trade.closeAt) {
        const pnlPerLot = (Math.random() * 500) - 200; 
        const pnl = Math.round(pnlPerLot * parseFloat(trade.lots) * 100) / 100;
        
        const priceDiffRaw = (pnl / parseFloat(trade.lots)) / 100000; 
        const priceDiff = trade.type === 'buy' ? priceDiffRaw : -priceDiffRaw;
        const closePriceRaw = parseFloat(trade.openPrice) + priceDiff;
        const prec = trade.symbol.includes("JPY") ? 3 : (trade.symbol.includes("BTC") || trade.symbol.includes("XAU") || trade.symbol.includes("US30") || trade.symbol.includes("NAS100") || trade.symbol.includes("ETH")) ? 2 : 5;
        const closePrice = parseFloat(closePriceRaw.toFixed(prec));

        await trade.ref.update({
          status: 'closed',
          closePrice: closePrice,
          closeTime: Date.now(),
          pnl: pnl
        });
        console.log(`Bot ${botId} closed Firestore trade ${trade.id} PnL: ${pnl.toFixed(2)}`);

        const accId = `bot-acc-${botId}-${compId}`;
        const accRef = dbAdmin.collection('users').doc(botId).collection('tradingAccounts').doc(accId);
        const accSnap = await accRef.get();
        if (accSnap.exists) {
          const acc = accSnap.data();
          const newBalance = Math.round(((acc.balance || 0) + pnl) * 100) / 100;
          const history = acc.history || [];
          history.push({
            symbol: trade.symbol,
            type: trade.type,
            lots: trade.lots,
            open_price: trade.openPrice,
            close_price: closePrice,
            profit: Math.round(pnl * 100) / 100
          });
          if (history.length > 50) history.shift();
          
          await accRef.update({ balance: newBalance, equity: newBalance, history });
        }
      }
    }
  } catch (e) {
    console.error("Error in closeExpiredBotTradesOptimizedFirestore:", e);
  }
}



function getEncryptionKey() {
  const key = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY;
  if (!key) {
    return crypto.createHash('sha256').update('default-dev-key').digest();
  }
  return crypto.createHash('sha256').update(key).digest();
}

const ENCRYPTION_KEY = getEncryptionKey(); // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string) {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text;
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text; // probably not encrypted, just return raw
  }
}

const { Pool } = pg;
let pool: pg.Pool | null = null;
function getDb() {
  if (!pool && process.env.DATABASE_URL) {
    const connStr = process.env.DATABASE_URL;
    let useSsl = false;
    
    // Default to using SSL in production (e.g. external connections)
    if (process.env.NODE_ENV === "production" || !!process.env.FIREBASE_SERVICE_ACCOUNT) {
      useSsl = true;
    }
    
    // Explicitly disable SSL for known internal/private hostnames or local connections
    if (
      connStr.includes("railway.internal") || 
      connStr.includes(".internal") ||
      connStr.includes("10.132.") ||  // Railway private IPv4 space
      connStr.includes("10.0.") ||    // Common private IPv4
      connStr.includes("192.168.") || // Common private IPv4
      connStr.includes("172.16.") ||  // Common private IPv4
      connStr.includes("[fd12:") ||   // Railway private IPv6 address
      connStr.includes("localhost") ||
      connStr.includes("127.0.0.1") ||
      connStr.includes("sslmode=disable")
    ) {
      useSsl = false;
      console.log("[Postgres] Connection is identified as internal/local private network. Disabling SSL.");
    } else {
      console.log(`[Postgres] Initializing Pool. SSL enabled: ${useSsl}`);
    }

    pool = new Pool({
      connectionString: connStr,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function seedEssentialPostgresData(db: pg.Pool) {
  // 1. Packages
  const packagesCheck = await db.query("SELECT * FROM sql_packages LIMIT 1");
  if (packagesCheck.rows.length === 0) {
    console.log("[Postgres] Seeding default packages...");
    const defaultPackages = [
      { id: 'p1', name: 'FUNDEDGOO Starter', price: 49, allocation: 5000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
      { id: 'p2', name: 'Standard Pro', price: 89, allocation: 10000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
      { id: 'p3', name: 'Advanced', price: 159, allocation: 25000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
      { id: 'p4', name: 'Pro Trader', price: 299, allocation: 50000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, isPopular: true, platformFees: { 'GOO': 0 } },
      { id: 'p5', name: 'Elite Master', price: 499, allocation: 100000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
      { id: 'p6', name: 'FUNDEDGOO Institutional', price: 999, allocation: 250000, leverage: '1:100', profitTarget: 10, dailyDrawdown: 5, totalDrawdown: 10, platformFees: { 'GOO': 0 } },
    ];
    for (const pkg of defaultPackages) {
      await db.query(`
        INSERT INTO sql_packages (id, name, price, allocation, leverage, profit_target, daily_drawdown, total_drawdown_limit, platform_fees, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [pkg.id, pkg.name, pkg.price, pkg.allocation, pkg.leverage, pkg.profitTarget, pkg.dailyDrawdown, pkg.totalDrawdown, JSON.stringify(pkg.platformFees), Date.now()]);
    }
  }

  // 2. Rules
  const rulesCheck = await db.query("SELECT * FROM sql_system_settings WHERE key = $1", ["rules"]);
  if (rulesCheck.rows.length === 0) {
    console.log("[Postgres] Seeding default rules...");
    const defaultRules = {
      updatedAt: new Date().toISOString(),
      content: `# FUNDEDGOO PROPRIETARY TRADING PROTOCOL\n\n## 1. PROFIT TARGET\n- Phase 1: 10% profit target of initial balance.\n- Phase 2: 5% profit target.\n- Funded Stage: No profit target, request a payout after 14 calendar days.\n\n## 2. DRAWDOWN LIMITS\n- Daily Drawdown: 5% maximum daily loss, calculated based on previous day's end-of-day equity/balance.\n- Total Drawdown: 10% maximum total loss from the initial balance. Breach of this rule results in permanent account suspension.\n\n## 3. SCALPING & NEWS TRADING RULES\n- High-impact news events: Trading during 2 minutes before and after high-impact news is prohibited.\n- No Gambling Rule: Opening concurrent BUY and SELL positions on the same pair is strictly forbidden. Breaking this rule will result in instant failure and account suspension.`
    };
    await db.query("INSERT INTO sql_system_settings (key, value) VALUES ($1, $2)", ["rules", JSON.stringify(defaultRules)]);
  }

  // 3. Global Settings
  const settingsCheck = await db.query("SELECT * FROM sql_system_settings WHERE key = $1", ["globalSettings"]);
  if (settingsCheck.rows.length === 0) {
    console.log("[Postgres] Seeding default global settings...");
    const defaultSettings = {
      leverageCap: 100,
      newsSpreadMultiplier: 10,
      newsEvents: [],
      referralConfig: {
        enabled: true,
        rewardTier1Amount: 5000,
        rewardTier1MinPurchase: 10000,
        rewardTier2ReferralCount: 10,
        rewardTier2Amount: 100000,
        dashboardMessage: "Refer someone who buys an account +10K and get a $5,000 gift. Sell 10 accounts for a $100,000 account.",
        referralViewMessage: "Refer someone who buys an account > $10,000 and get a $5,000 gift. Reach 10 successful sales and receive a $100,000 institutional account."
      }
    };
    await db.query("INSERT INTO sql_system_settings (key, value) VALUES ($1, $2)", ["globalSettings", JSON.stringify(defaultSettings)]);
  }

  // 4. APIs
  const apisCheck = await db.query("SELECT * FROM sql_system_settings WHERE key = $1", ["apis"]);
  if (apisCheck.rows.length === 0) {
    console.log("[Postgres] Seeding API configurations...");
    const defaultApis = [
      { id: 'api-stripe', name: 'Stripe Payment Gateway', type: 'stripe', config: { SecretKey: '', WebhookSecret: '', PublicKey: '' }, description: 'Process secure payments', status: 'active' },
      { id: 'api-brevo', name: 'Brevo Email API', type: 'brevo', config: { SecretKey: '', SenderEmail: 'no-reply@fundedgoo.com', SenderName: 'FundedGoo' }, description: 'Send transactional emails via Brevo', status: 'active' },
      { id: 'api-exchangerate', name: 'ExchangeRate API', type: 'exchangerate', config: { ApiKey: '', UpdateIntervalMinutes: '30' }, description: 'Forex caching provider & rates backup service', status: 'active' },
    ];
    await db.query("INSERT INTO sql_system_settings (key, value) VALUES ($1, $2)", ["apis", JSON.stringify(defaultApis)]);
  }

  // 5. Symbol Configs
  const symbolsCheck = await db.query("SELECT * FROM sql_symbol_configs LIMIT 1");
  if (symbolsCheck.rows.length === 0) {
    console.log("[Postgres] Seeding symbol configurations...");
    const defaults = [
      { symbol: "EUR/USD", spread: 1.5, pipSize: 0.0001, contractSize: 100000, commission: 0, isActive: true },
      { symbol: "GBP/USD", spread: 1.8, pipSize: 0.0001, contractSize: 100000, commission: 0, isActive: true },
      { symbol: "USD/JPY", spread: 1.2, pipSize: 0.01, contractSize: 100000, commission: 0, isActive: true },
      { symbol: "XAU/USD", spread: 3.5, pipSize: 0.1, contractSize: 100, commission: 0, isActive: true },
      { symbol: "BTC/USD", spread: 3.0, pipSize: 1.0, contractSize: 1, commission: 0, isActive: true },
    ];
    for (const d of defaults) {
      await db.query(`
        INSERT INTO sql_symbol_configs (id, symbol, spread, pip_size, contract_size, commission, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ["sym_" + Math.random().toString(36).substring(2, 11), d.symbol, d.spread, d.pipSize, d.contractSize, d.commission, d.isActive, Date.now()]);
    }
  }

  // 6. Promotions
  const promosCheck = await db.query("SELECT * FROM sql_promotions LIMIT 1");
  if (promosCheck.rows.length === 0) {
    await db.query(`
      INSERT INTO sql_promotions (id, code, discount, description, usage_count, max_usage, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, ["promo_10", "PROMO10", 10, "10% discount on all challenge accounts", 5, 100, true]);
  }

  // 7. Competitions
  const compsCheck = await db.query("SELECT * FROM sql_competitions LIMIT 1");
  if (compsCheck.rows.length === 0) {
    const defaultConfig = {
      id: 'monthly-' + new Date().getMonth(),
      name: `Competition ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      isActive: true,
      botsEnabled: true,
      currentMonthName: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59),
      prizes: JSON.stringify({
        first: "250k Evaluation Account",
        second: "100k Evaluation Account",
        third: "50k Evaluation Account",
        fourthToTwentieth: "5k Evaluation Account",
        rest: "70% Discount Code for 100k & 250k Accounts"
      }),
      rules: JSON.stringify({
        maxDrawdown: 10000,
        dailyDrawdown: 5000,
        profitTarget: 10000
      })
    };
    await db.query(`
      INSERT INTO sql_competitions (id, name, is_active, bots_enabled, current_month_name, start_date, end_date, prizes, rules)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [defaultConfig.id, defaultConfig.name, defaultConfig.isActive, defaultConfig.botsEnabled, defaultConfig.currentMonthName, defaultConfig.startDate, defaultConfig.endDate, defaultConfig.prizes, defaultConfig.rules]);
  }

  // 8. Leaderboard
  const lbCheck = await db.query("SELECT * FROM sql_leaderboard LIMIT 1");
  if (lbCheck.rows.length === 0) {
    const MOCK_LEADERBOARD = [
      { userId: "lb-1", name: "Alpha Scalper", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alpha", rank: 1, gain: 45.2, profit: 45200, trades: 142, winRate: 78.5, isBot: true },
      { userId: "lb-2", name: "FundedPro", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=fundedpro", rank: 2, gain: 38.1, profit: 38100, trades: 89, winRate: 65.2, isBot: false },
      { userId: "lb-3", name: "Balkan Bull", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=balkan", rank: 3, gain: 32.5, profit: 32500, trades: 110, winRate: 60.1, isBot: true },
      { userId: "lb-4", name: "Zen Trader", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zen", rank: 4, gain: 28.7, profit: 28700, trades: 65, winRate: 72.3, isBot: false },
      { userId: "lb-5", name: "Golden Eagle", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gold", rank: 5, gain: 25.4, profit: 25400, trades: 154, winRate: 58.9, isBot: true },
    ];
    for (const entry of MOCK_LEADERBOARD) {
      await db.query(`
        INSERT INTO sql_leaderboard (id, user_id, name, avatar, rank, gain, profit, trades, win_rate, is_bot)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, ["lb_" + Math.random().toString(36).substring(2, 11), entry.userId, entry.name, entry.avatar, entry.rank, entry.gain, entry.profit, entry.trades, entry.winRate, entry.isBot]);
    }
  }

  // 9. Educators
  const educatorsCheck = await db.query("SELECT * FROM sql_educators LIMIT 1");
  if (educatorsCheck.rows.length === 0) {
    const MOCK_EDUCATORS = [
      { id: "edu1", name: "Stefan Mandra", specialty: "Crypto & Gold Scalping", telegram: "https://t.me/stefan_mandra", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=stefan", bio: "Stefan has 8+ years of experience in high frequency trading and futures.", status: "approved" },
      { id: "edu2", name: "Andrei G.", specialty: "ICT & SMC Mentorship", telegram: "https://t.me/andrei_ict", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=andrei", bio: "Andrei specializes in Inner Circle Trader methodologies and market liquidity pools.", status: "approved" }
    ];
    for (const edu of MOCK_EDUCATORS) {
      await db.query(`
        INSERT INTO sql_educators (id, name, specialty, telegram, avatar, bio, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [edu.id, edu.name, edu.specialty, edu.telegram, edu.avatar, edu.bio, edu.status]);
    }
  }
}

// Ensure the tables exist
async function initDb(retries = 20, delayMs = 3000) {
  const db = getDb();
  if (!db) {
    console.warn("DATABASE_URL not found. Skipping PostgreSQL initialization.");
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Postgres] Connection attempt ${attempt}/${retries}...`);
      // Run a quick query to test connectivity before launching tables creation
      await db.query("SELECT 1");

      console.log("[Postgres] Connection successful! Creating tables and runs database migrations...");

      await db.query(`
        CREATE TABLE IF NOT EXISTS sql_users (
          id VARCHAR(128) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          balance NUMERIC DEFAULT 0,
          equity NUMERIC DEFAULT 0,
          status VARCHAR(50) DEFAULT 'active',
          leverage VARCHAR(20) DEFAULT '1:100',
          pnl NUMERIC DEFAULT 0,
          pnl_percentage NUMERIC DEFAULT 0,
          is_verified BOOLEAN DEFAULT FALSE,
          verification_status VARCHAR(50) DEFAULT 'unverified',
          phone VARCHAR(50),
          avatar TEXT,
          real_name VARCHAR(255),
          last_name VARCHAR(255),
          fiscal_code VARCHAR(100),
          birth_date VARCHAR(50),
          country VARCHAR(100) DEFAULT 'Global',
          allow_profile_edit BOOLEAN DEFAULT TRUE,
          created_at NUMERIC DEFAULT 0,
          win_rate NUMERIC DEFAULT 0,
          total_trades INTEGER DEFAULT 0,
          profit_factor NUMERIC DEFAULT 0,
          max_drawdown NUMERIC DEFAULT 0,
          is_hostes BOOLEAN DEFAULT FALSE,
          is_bot BOOLEAN DEFAULT FALSE,
          bot_profile_id VARCHAR(128),
          referral_code VARCHAR(50),
          referred_by VARCHAR(128),
          referrals TEXT,
          linked_payment_method TEXT,
          last_report_export_at NUMERIC
        );
        
        CREATE TABLE IF NOT EXISTS sql_trading_accounts (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(128) REFERENCES sql_users(id) ON DELETE CASCADE,
          platform VARCHAR(50) DEFAULT 'GOO',
          account_number VARCHAR(50) NOT NULL UNIQUE,
          broker VARCHAR(100) DEFAULT 'FundedGoo Markets',
          server VARCHAR(100) DEFAULT 'FundedGoo-Live',
          status VARCHAR(50) DEFAULT 'active',
          leverage VARCHAR(20) DEFAULT '1:100',
          type VARCHAR(50) NOT NULL,
          competition_id VARCHAR(128),
          created_at NUMERIC NOT NULL,
          balance NUMERIC DEFAULT 100000,
          equity NUMERIC DEFAULT 100000,
          initial_balance NUMERIC DEFAULT 100000,
          initial_fee NUMERIC DEFAULT 0,
          fee_refunded BOOLEAN DEFAULT FALSE,
          open_trades TEXT,
          pending_orders TEXT,
          history TEXT,
          rules TEXT,
          payout_milestones TEXT,
          mt5_sync TEXT,
          certificates TEXT,
          consistency_warnings_count INTEGER DEFAULT 0,
          scalp_warnings_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sql_packages (
          id VARCHAR(128) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          price NUMERIC NOT NULL,
          allocation NUMERIC NOT NULL,
          leverage VARCHAR(50) NOT NULL,
          profit_target NUMERIC NOT NULL,
          daily_drawdown NUMERIC NOT NULL,
          total_drawdown_limit NUMERIC NOT NULL,
          platform_fees TEXT,
          is_popular BOOLEAN DEFAULT FALSE,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at NUMERIC DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sql_competitions (
          id VARCHAR(128) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          bots_enabled BOOLEAN DEFAULT TRUE,
          current_month_name VARCHAR(100),
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          prizes TEXT,
          rules TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sql_promotions (
          id VARCHAR(128) PRIMARY KEY,
          code VARCHAR(100) NOT NULL UNIQUE,
          discount NUMERIC NOT NULL,
          description TEXT,
          usage_count INTEGER DEFAULT 0,
          max_usage INTEGER DEFAULT 100,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sql_notifications (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(128) REFERENCES sql_users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'info',
          read BOOLEAN DEFAULT FALSE,
          created_at NUMERIC NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sql_leaderboard (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(128),
          name VARCHAR(255) NOT NULL,
          avatar TEXT,
          rank INTEGER NOT NULL,
          gain NUMERIC NOT NULL,
          profit NUMERIC NOT NULL,
          trades INTEGER NOT NULL,
          win_rate NUMERIC NOT NULL,
          is_bot BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sql_symbol_configs (
          id VARCHAR(128) PRIMARY KEY,
          symbol VARCHAR(50) NOT NULL UNIQUE,
          spread NUMERIC NOT NULL,
          pip_size NUMERIC NOT NULL,
          contract_size NUMERIC NOT NULL,
          commission NUMERIC DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          updated_at NUMERIC NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sql_economic_events (
          id VARCHAR(128) PRIMARY KEY,
          time VARCHAR(20) NOT NULL,
          currency VARCHAR(10) NOT NULL,
          event VARCHAR(255) NOT NULL,
          impact VARCHAR(20) DEFAULT 'low',
          forecast VARCHAR(50),
          previous VARCHAR(50),
          actual VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sql_educators (
          id VARCHAR(128) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          bio TEXT,
          specialty VARCHAR(100),
          telegram VARCHAR(255),
          avatar TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sql_verification_requests (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(128) REFERENCES sql_users(id) ON DELETE CASCADE,
          full_name VARCHAR(255) NOT NULL,
          id_number VARCHAR(100) NOT NULL,
          address TEXT NOT NULL,
          id_document TEXT,
          address_document TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sql_system_settings (
          key VARCHAR(128) PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sql_transactions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL,
          amount NUMERIC NOT NULL,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          payment_method VARCHAR(100),
          description TEXT
        );

        CREATE TABLE IF NOT EXISTS sql_audit_logs (
          id SERIAL PRIMARY KEY,
          action VARCHAR(255) NOT NULL,
          user_id VARCHAR(128),
          target_id VARCHAR(128),
          target_name VARCHAR(255),
          type VARCHAR(100) NOT NULL,
          details TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sql_positions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL,
          symbol VARCHAR(50) NOT NULL,
          lots NUMERIC NOT NULL,
          open_price NUMERIC NOT NULL,
          type VARCHAR(10) NOT NULL,
          sl NUMERIC,
          tp NUMERIC,
          open_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          close_price NUMERIC,
          close_time TIMESTAMP,
          pnl NUMERIC,
          status VARCHAR(20) DEFAULT 'open'
        );

        CREATE TABLE IF NOT EXISTS sql_user_verifications (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      try {
        await db.query(`ALTER TABLE sql_audit_logs ADD COLUMN IF NOT EXISTS actor_name VARCHAR(255);`);
        await db.query(`ALTER TABLE sql_audit_logs ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50);`);
        await db.query(`ALTER TABLE sql_positions ADD COLUMN IF NOT EXISTS details TEXT;`);
        await db.query(`ALTER TABLE sql_positions ADD COLUMN IF NOT EXISTS competition_id VARCHAR(128);`);

        // Add missing columns to sql_users
        await db.query(`
          ALTER TABLE sql_users 
          ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
          ADD COLUMN IF NOT EXISTS avatar TEXT,
          ADD COLUMN IF NOT EXISTS real_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS fiscal_code VARCHAR(100),
          ADD COLUMN IF NOT EXISTS birth_date VARCHAR(50),
          ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Global';
        `).catch((err: any) => console.log('ALTER TABLE sql_users skipped or failed:', err.message));

      } catch(e) {
        console.error("Migration failed:", e);
      }

      // Seed default admin
      const adminCheck = await db.query("SELECT * FROM sql_users WHERE email = $1", ["admin@prop.com"]);
      if (adminCheck.rows.length === 0) {
        const hash = await bcrypt.hash("admin123", 10);
        await db.query(`
          INSERT INTO sql_users (id, name, email, password_hash, role, balance, equity, status, leverage, is_verified, verification_status, created_at, win_rate, total_trades, profit_factor, max_drawdown)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          "admin-uid-123456",
          "System Admin",
          "admin@prop.com",
          hash,
          "admin",
          1000000,
          1000000,
          "active",
          "1:100",
          true,
          "verified",
          Date.now(),
          0, 0, 0, 0
        ]);
        console.log("PostgreSQL: Seeded default admin@prop.com / admin123");
      }

      await seedEssentialPostgresData(db);
      console.log("PostgreSQL initialized successfully.");
      return; // Exit function on success
    } catch (error: any) {
      console.warn(`[Postgres] Connection attempt ${attempt} failed. Error: ${error.message}`);
      if (attempt === retries) {
        console.error("[Postgres] Max retries reached. Database initialization failed permanently:", error);
      } else {
        console.log(`[Postgres] Waiting ${delayMs / 1000}s before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
}

let stripeClient: Stripe | null = null;

// Brevo Email API using fetch
async function getBrevoConfig() {
  // 1. Try Firestore config first (allows updating via Admin Panel)
  try {
    const docRef = dbAdmin.collection('apis').doc('api-brevo');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const config = docSnap.data()?.config;
      if (config?.SecretKey) {
        return {
          apiKey: decrypt(config.SecretKey),
          senderEmail: config.SenderEmail || "no-reply@fundedgoo.com",
          senderName: config.SenderName || "FundedGoo"
        };
      }
    }
  } catch (e) {
    console.error("Failed to fetch Brevo config from Firestore:", e);
  }

  // 2. Fallback to Env Vars
  if (process.env.BREVO_API_KEY) {
    return {
      apiKey: process.env.BREVO_API_KEY,
      senderEmail: process.env.BREVO_SENDER_EMAIL || "no-reply@fundedgoo.com",
      senderName: process.env.BREVO_SENDER_NAME || "FundedGoo"
    };
  }
  
  return null;
}

async function sendVerificationEmail(email: string, token: string) {
  const brevo = await getBrevoConfig();
  if (!brevo) {
    console.warn("Brevo API not configured in Admin. Skipping verification email.");
    return;
  }

  const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: white; border-radius: 12px;">
      <h1 style="color: #f97316;">Salut!</h1>
      <p>Îți mulțumim că te-ai alăturat FundedGoo. Te rugăm să îți confirmi adresa de email apăsând pe butonul de mai jos:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirmă Email</a>
      </div>
      <p style="font-size: 14px; color: #94a3b8;">Dacă nu ai creat tu acest cont, poți ignora acest email.</p>
    </div>
  `;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevo.apiKey
      },
      body: JSON.stringify({
        sender: {
          name: brevo.senderName,
          email: brevo.senderEmail
        },
        to: [{ email }],
        subject: "Confirmare Cont FundedGoo",
        htmlContent
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Brevo API Error:", errData);
      throw new Error("Failed to send email via Brevo.");
    }
    console.log(`Verification email sent successfully to ${email}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
}

async function getStripe(): Promise<Stripe> {
  // 1. Try Firestore config first (allows updating via Admin Panel)
  try {
    const docRef = dbAdmin.collection('apis').doc('api-stripe');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const config = docSnap.data()?.config;
      if (config?.SecretKey) {
        console.log("Using Stripe key from Firestore.");
        const decryptedKey = decrypt(config.SecretKey);
        return new Stripe(decryptedKey, {});
      }
    }
    console.log("No config found in Firestore for api-stripe, falling back to ENV.");
  } catch (e) {
    console.error("Failed to fetch Stripe key from Firestore:", e);
  }

  // 2. Fallback to Env Vars
  const envKey = process.env.STRIPE_SECRET_KEY;
  if (envKey && envKey.startsWith('sk_')) {
    console.log("Using Stripe key from Environment Variable.");
    return new Stripe(envKey, {});
  }

  throw new Error(
    "STRIPE_SECRET_KEY is missing. Please configure it in the Admin Panel or Settings menu.",
  );
}

// ==========================================
// DUKASCOPY-NODE: LIVE FEED STATE
// ==========================================
const mapSymbolToDukascopy = (uiSymbol: string): any => {
  const sym = uiSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (sym === "NAS100") return "usatechidxusd";
  if (sym === "US30") return "usa30idxusd";
  if (sym === "US500") return "usa500idxusd";
  if (sym === "GER40") return "deuidxeur";
  if (sym === "UK100") return "gbridxgbp";
  if (sym === "JPN225") return "jpnidxjpy";
  if (sym === "USOIL" || sym === "WTI") return "lightcmdusd";
  if (sym === "UKOIL" || sym === "BRENT") return "brentcmdusd";
  return sym.toLowerCase();
};

const liveRatesMap: Record<string, any> = {};
const activeInstruments = new Set<string>(["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD", "XAU/USD", "XAG/USD", "NAS100", "US30"]);

async function startLiveFeed(io: SocketIOServer) {
  console.log("[Dukascopy] Starting high-frequency live feed mechanism (max 250ms lag)...");
  
  const poll = async () => {
    let updated = false;

    await Promise.all(
      Array.from(activeInstruments).map(async (inst) => {
        try {
          const dukSym = mapSymbolToDukascopy(inst);
          const ticks = await getRealTimeRates({
            instrument: dukSym,
            timeframe: "tick",
            format: "json",
            last: 1
          });
          
          if (ticks && ticks.length > 0) {
            const t: any = ticks[0];
            // Only update if timestamp advanced
            if (liveRatesMap[inst] && liveRatesMap[inst][0] === t.timestamp) return;
            
            liveRatesMap[inst] = [
              t.timestamp, 
              t.bidPrice, 
              t.askPrice
            ];
            updated = true;
          }
        } catch (err: any) {
           // Silently catch to avoid polluting logs on connection drops
        }
      })
    );

    if (updated) {
      io.emit("quotes", liveRatesMap);
    }
    
    // Rerun immediately after waiting 250ms (achieving max 250ms lag)
    setTimeout(poll, 250);
  };
  
  // Start the loop
  poll();
}

async function startServer() {
  try {
    await initFirebase();
  } catch (e) {
    console.error("CRITICAL: Firebase initialization failed during startup:", e);
  }
  const app = express();
  const PORT = 3000;

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Client connected to WebSockets");
    socket.on("subscribe_instrument", (sym) => {
      if (typeof sym === "string" && sym.trim()) {
        activeInstruments.add(sym.trim());
        socket.emit("quotes", liveRatesMap); // Give immediately current value
      }
    });
  });

  app.use(express.json());

  // API Routes
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error("Auth Error: Missing Authorization header");
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error("Auth Error: Malformed Authorization header - missing 'Bearer ' prefix");
      return res.status(401).json({ error: 'Unauthorized: Malformed header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token === "" || token === "undefined" || token === "null") {
      console.error("Auth Error: Malformed Authorization header - token is empty or invalid string");
      return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        uid: decoded.id,
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        ...decoded
      };
      next();
    } catch (error: any) {
      console.error("Auth Error: JWT verify failed. Message:", error?.message);
      res.status(401).json({ error: 'Unauthorized: Invalid token', details: error?.message });
    }
  };

  // JWT Auth endpoints
  app.post("/api/auth/register", async (req: any, res: any) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });

      const existingCheck = await db.query("SELECT * FROM sql_users WHERE email = $1", [email]);
      if (existingCheck.rows.length > 0) {
        return res.status(400).json({ error: "Email is already registered" });
      }

      const hash = await bcrypt.hash(password, 10);
      const id = "usr_" + crypto.randomBytes(8).toString("hex");
      const role = email === "admin@prop.com" ? "admin" : "trader";

      const newUser = {
        id,
        name,
        email,
        role,
        balance: 0,
        equity: 0,
        status: "active",
        leverage: "1:100",
        pnl: 0,
        pnl_percentage: 0,
        is_verified: false,
        verification_status: "unverified",
        created_at: Date.now(),
        win_rate: 0,
        total_trades: 0,
        profit_factor: 0,
        max_drawdown: 0,
        referral_code: id.substring(4, 10).toUpperCase(),
        referrals: JSON.stringify([]),
        linked_payment_method: JSON.stringify(null)
      };

      await db.query(`
        INSERT INTO sql_users (
          id, name, email, password_hash, role, balance, equity, status, leverage, pnl, pnl_percentage, is_verified, verification_status, created_at, win_rate, total_trades, profit_factor, max_drawdown, referral_code, referrals, linked_payment_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      `, [
        newUser.id, newUser.name, newUser.email, hash, newUser.role, newUser.balance, newUser.equity, newUser.status, newUser.leverage, newUser.pnl, newUser.pnl_percentage, newUser.is_verified, newUser.verification_status, newUser.created_at, newUser.win_rate, newUser.total_trades, newUser.profit_factor, newUser.max_drawdown, newUser.referral_code, newUser.referrals, newUser.linked_payment_method
      ]);

      const token = jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: "7d" });

      const frontendUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        balance: newUser.balance,
        equity: newUser.equity,
        status: newUser.status,
        leverage: newUser.leverage,
        pnl: newUser.pnl,
        pnlPercentage: newUser.pnl_percentage,
        isVerified: newUser.is_verified,
        verificationStatus: newUser.verification_status,
        createdAt: newUser.created_at,
        winRate: newUser.win_rate,
        totalTrades: newUser.total_trades,
        profitFactor: newUser.profit_factor,
        maxDrawdown: newUser.max_drawdown,
        referralCode: newUser.referral_code,
        referrals: [],
        linkedPaymentMethod: null,
        tradingAccounts: []
      };

      res.status(201).json({ token, user: frontendUser });
    } catch (e: any) {
      console.error("Register Error:", e);
      let errMsg = e.message || "Internal error during registration";
      if (e.code === 'ECONNREFUSED' || (e.errors && e.errors.some((err: any) => err.code === 'ECONNREFUSED')) || errMsg.includes('ECONNREFUSED')) {
        errMsg = "Baza de date PostgreSQL nu este accesibilă (Connection Refused). Te rugăm să verifici dacă serviciul tău Postgres pe Railway este pornit, dacă are credite suficiente/este activ și dacă variabila DATABASE_URL este configurată corect.";
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/auth/login", async (req: any, res: any) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });

      const result = await db.query("SELECT * FROM sql_users WHERE email = $1", [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Load trading accounts
      const accountsResult = await db.query("SELECT * FROM sql_trading_accounts WHERE user_id = $1", [user.id]);
      const tradingAccounts = accountsResult.rows.map(acc => ({
        id: acc.id,
        userId: acc.user_id,
        platform: acc.platform,
        accountNumber: acc.account_number,
        broker: acc.broker,
        server: acc.server,
        status: acc.status,
        leverage: acc.leverage,
        type: acc.type,
        competitionId: acc.competition_id,
        createdAt: Number(acc.created_at),
        balance: Number(acc.balance),
        equity: Number(acc.equity),
        initialBalance: Number(acc.initial_balance),
        initialFee: Number(acc.initial_fee),
        feeRefunded: acc.fee_refunded,
        openTrades: acc.open_trades ? JSON.parse(acc.open_trades) : [],
        pendingOrders: acc.pending_orders ? JSON.parse(acc.pending_orders) : [],
        history: acc.history ? JSON.parse(acc.history) : [],
        rules: acc.rules ? JSON.parse(acc.rules) : {},
        payoutMilestones: acc.payout_milestones ? JSON.parse(acc.payout_milestones) : [],
        mt5Sync: acc.mt5_sync ? JSON.parse(acc.mt5_sync) : null,
        certificates: acc.certificates ? JSON.parse(acc.certificates) : [],
        consistencyWarningsCount: acc.consistency_warnings_count,
        scalpWarningsCount: acc.scalp_warnings_count
      }));

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

      const frontendUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance: Number(user.balance),
        equity: Number(user.equity),
        status: user.status,
        leverage: user.leverage,
        pnl: Number(user.pnl),
        pnlPercentage: Number(user.pnl_percentage),
        isVerified: user.is_verified,
        verificationStatus: user.verification_status,
        phone: user.phone,
        avatar: user.avatar,
        realName: user.real_name,
        lastName: user.last_name,
        fiscalCode: user.fiscal_code,
        birthDate: user.birth_date,
        country: user.country,
        allowProfileEdit: user.allow_profile_edit,
        createdAt: Number(user.created_at),
        winRate: Number(user.win_rate),
        totalTrades: Number(user.total_trades),
        profitFactor: Number(user.profit_factor),
        maxDrawdown: Number(user.max_drawdown),
        referralCode: user.referral_code,
        referredBy: user.referred_by,
        referrals: user.referrals ? JSON.parse(user.referrals) : [],
        linkedPaymentMethod: user.linked_payment_method ? JSON.parse(user.linked_payment_method) : null,
        tradingAccounts
      };

      res.json({ token, user: frontendUser });
    } catch (e: any) {
      console.error("Login Error:", e);
      let errMsg = e.message || "Internal error during login";
      if (e.code === 'ECONNREFUSED' || (e.errors && e.errors.some((err: any) => err.code === 'ECONNREFUSED')) || errMsg.includes('ECONNREFUSED')) {
        errMsg = "Baza de date PostgreSQL nu este accesibilă (Connection Refused). Te rugăm să verifici dacă serviciul tău Postgres pe Railway este pornit, dacă are credite suficiente/este activ și dacă variabila DATABASE_URL este configurată corect.";
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });

      const result = await db.query("SELECT * FROM sql_users WHERE id = $1", [req.user.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = result.rows[0];

      // Load trading accounts
      const accountsResult = await db.query("SELECT * FROM sql_trading_accounts WHERE user_id = $1", [user.id]);
      const tradingAccounts = accountsResult.rows.map(acc => ({
        id: acc.id,
        userId: acc.user_id,
        platform: acc.platform,
        accountNumber: acc.account_number,
        broker: acc.broker,
        server: acc.server,
        status: acc.status,
        leverage: acc.leverage,
        type: acc.type,
        competitionId: acc.competition_id,
        createdAt: Number(acc.created_at),
        balance: Number(acc.balance),
        equity: Number(acc.equity),
        initialBalance: Number(acc.initial_balance),
        initialFee: Number(acc.initial_fee),
        feeRefunded: acc.fee_refunded,
        openTrades: acc.open_trades ? JSON.parse(acc.open_trades) : [],
        pendingOrders: acc.pending_orders ? JSON.parse(acc.pending_orders) : [],
        history: acc.history ? JSON.parse(acc.history) : [],
        rules: acc.rules ? JSON.parse(acc.rules) : {},
        payoutMilestones: acc.payout_milestones ? JSON.parse(acc.payout_milestones) : [],
        mt5Sync: acc.mt5_sync ? JSON.parse(acc.mt5_sync) : null,
        certificates: acc.certificates ? JSON.parse(acc.certificates) : [],
        consistencyWarningsCount: acc.consistency_warnings_count,
        scalpWarningsCount: acc.scalp_warnings_count
      }));

      const frontendUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance: Number(user.balance),
        equity: Number(user.equity),
        status: user.status,
        leverage: user.leverage,
        pnl: Number(user.pnl),
        pnlPercentage: Number(user.pnl_percentage),
        isVerified: user.is_verified,
        verificationStatus: user.verification_status,
        phone: user.phone,
        avatar: user.avatar,
        realName: user.real_name,
        lastName: user.last_name,
        fiscalCode: user.fiscal_code,
        birthDate: user.birth_date,
        country: user.country,
        allowProfileEdit: user.allow_profile_edit,
        createdAt: Number(user.created_at),
        winRate: Number(user.win_rate),
        totalTrades: Number(user.total_trades),
        profitFactor: Number(user.profit_factor),
        maxDrawdown: Number(user.max_drawdown),
        referralCode: user.referral_code,
        referredBy: user.referred_by,
        referrals: user.referrals ? JSON.parse(user.referrals) : [],
        linkedPaymentMethod: user.linked_payment_method ? JSON.parse(user.linked_payment_method) : null,
        tradingAccounts
      };

      res.json(frontendUser);
    } catch (e: any) {
      console.error("Auth Me Error:", e);
      res.status(500).json({ error: e.message || "Internal error during fetch profile" });
    }
  });

  // Packages Endpoint
  app.get("/api/packages", async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT * FROM sql_packages ORDER BY price ASC");
      const pkgs = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        price: Number(row.price),
        allocation: Number(row.allocation),
        leverage: row.leverage,
        profitTarget: Number(row.profit_target),
        dailyDrawdown: Number(row.daily_drawdown),
        totalDrawdown: Number(row.total_drawdown_limit),
        platformFees: row.platform_fees ? JSON.parse(row.platform_fees) : {},
        isPopular: row.is_popular,
        description: row.description,
        isActive: row.is_active
      }));
      res.json(pkgs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Rules Endpoint
  app.get("/api/rules", async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT value FROM sql_system_settings WHERE key = $1", ["rules"]);
      if (result.rows.length > 0) {
        res.json(JSON.parse(result.rows[0].value));
      } else {
        res.json({ content: "No rules defined yet.", updatedAt: new Date().toISOString() });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Global Settings Endpoint
  app.get("/api/settings", async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT value FROM sql_system_settings WHERE key = $1", ["globalSettings"]);
      if (result.rows.length > 0) {
        res.json(JSON.parse(result.rows[0].value));
      } else {
        res.json({ leverageCap: 100, newsSpreadMultiplier: 10, newsEvents: [] });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Competitions Endpoint
  app.get("/api/competitions", async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT * FROM sql_competitions ORDER BY start_date DESC");
      const comps = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        isActive: row.is_active,
        botsEnabled: row.bots_enabled,
        currentMonthName: row.current_month_name,
        startDate: row.start_date,
        endDate: row.end_date,
        prizes: row.prizes ? JSON.parse(row.prizes) : {},
        rules: row.rules ? JSON.parse(row.rules) : {}
      }));
      res.json(comps);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Join Competition Endpoint
  app.post("/api/competitions/join", authenticate, async (req: any, res: any) => {
    try {
      const { competitionId } = req.body;
      if (!competitionId) return res.status(400).json({ error: "Competition ID is required" });

      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });

      // Check if user already joined
      const existing = await db.query(
        "SELECT * FROM sql_trading_accounts WHERE user_id = $1 AND type = 'competition' AND competition_id = $2",
        [req.user.id, competitionId]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: "You have already registered for this competition" });
      }

      // Load competition rules
      const compCheck = await db.query("SELECT * FROM sql_competitions WHERE id = $1", [competitionId]);
      if (compCheck.rows.length === 0) {
        return res.status(404).json({ error: "Competition not found" });
      }

      const comp = compCheck.rows[0];
      const compRules = comp.rules ? JSON.parse(comp.rules) : { maxDrawdown: 10000, dailyDrawdown: 5000, profitTarget: 10000 };

      // Generate a brand new competition trading account
      const id = "acc_" + crypto.randomBytes(8).toString("hex");
      const accNum = "9" + Math.floor(100000 + Math.random() * 900000).toString(); // e.g. 9123456

      await db.query(`
        INSERT INTO sql_trading_accounts (
          id, user_id, platform, account_number, broker, server, status, leverage, type, competition_id, created_at, balance, equity, initial_balance, rules, open_trades, pending_orders, history, payout_milestones, certificates
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `, [
        id,
        req.user.id,
        "GOO",
        accNum,
        "FundedGoo Markets",
        "FundedGoo-Live",
        "active",
        "1:100",
        "competition",
        competitionId,
        Date.now(),
        100000, // balance
        100000, // equity
        100000, // initialBalance
        JSON.stringify({
          maxDrawdown: Number(compRules.maxDrawdown || 10000),
          dailyDrawdown: Number(compRules.dailyDrawdown || 5000),
          profitTarget: Number(compRules.profitTarget || 10000)
        }),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([])
      ]);

      // Return the newly created account
      res.json({
        id,
        userId: req.user.id,
        platform: "GOO",
        accountNumber: accNum,
        broker: "FundedGoo Markets",
        server: "FundedGoo-Live",
        status: "active",
        leverage: "1:100",
        type: "competition",
        competitionId,
        createdAt: Date.now(),
        balance: 100000,
        equity: 100000,
        initialBalance: 100000,
        rules: {
          maxDrawdown: Number(compRules.maxDrawdown || 10000),
          dailyDrawdown: Number(compRules.dailyDrawdown || 5000),
          profitTarget: Number(compRules.profitTarget || 10000)
        },
        openTrades: [],
        pendingOrders: [],
        history: [],
        payoutMilestones: [],
        certificates: []
      });

      // Emit socket.io event to notify about new participant
      io.emit("competition_update", { competitionId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Promotions Endpoint
  app.get("/api/promotions", async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT * FROM sql_promotions WHERE is_active = TRUE");
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Notifications Endpoint
  app.get("/api/notifications", authenticate, async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT * FROM sql_notifications WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
      const notifs = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
        read: row.read,
        createdAt: Number(row.created_at)
      }));
      res.json(notifs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Mark notification read
  app.post("/api/notifications/read", authenticate, async (req: any, res: any) => {
    try {
      const { id } = req.body;
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      await db.query("UPDATE sql_notifications SET read = TRUE WHERE id = $1 AND user_id = $2", [id, req.user.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Leaderboard Endpoint
  app.get("/api/leaderboard", async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT * FROM sql_leaderboard ORDER BY rank ASC LIMIT 10");
      const lb = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        avatar: row.avatar,
        rank: row.rank,
        gain: Number(row.gain),
        profit: Number(row.profit),
        trades: row.trades,
        winRate: Number(row.win_rate),
        isBot: row.is_bot
      }));
      res.json(lb);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Symbol Configs Endpoint
  app.get("/api/symbol-configs", async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT * FROM sql_symbol_configs WHERE is_active = TRUE");
      const syms = result.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        spread: Number(row.spread),
        pipSize: Number(row.pip_size),
        contractSize: Number(row.contract_size),
        commission: Number(row.commission),
        isActive: row.is_active,
        updatedAt: Number(row.updated_at)
      }));
      res.json(syms);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Economic Events Endpoint
  app.get("/api/economic-events", async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT * FROM sql_economic_events ORDER BY id ASC");
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Educators Endpoint
  app.get("/api/educators", async (req: any, res: any) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      const result = await db.query("SELECT * FROM sql_educators ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Register Educator Endpoint
  app.post("/api/educators/register", authenticate, async (req: any, res: any) => {
    try {
      const { specialty, telegram, bio } = req.body;
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });
      
      const id = "edu_" + crypto.randomBytes(8).toString("hex");
      await db.query(`
        INSERT INTO sql_educators (id, name, bio, specialty, telegram, avatar, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, req.user.name, bio, specialty, telegram, req.user.avatar || "", "pending"]);

      res.status(201).json({ success: true, message: "Educator application submitted successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Verification Requests Endpoint (submit)
  app.post("/api/verification-requests", authenticate, async (req: any, res: any) => {
    try {
      const { fullName, idNumber, address, idDocument, addressDocument } = req.body;
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });

      const id = "vr_" + crypto.randomBytes(8).toString("hex");
      await db.query(`
        INSERT INTO sql_verification_requests (id, user_id, full_name, id_number, address, id_document, address_document, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [id, req.user.id, fullName, idNumber, address, idDocument, addressDocument, "pending"]);

      await db.query("UPDATE sql_users SET verification_status = 'pending' WHERE id = $1", [req.user.id]);

      res.status(201).json({ success: true, message: "Verification request submitted successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Profile Update Endpoint
  app.post("/api/users/profile", authenticate, async (req: any, res: any) => {
    console.log(`[API] /api/users/profile called by ${req.user.id}`, req.body);
    try {
      const { name, phone, avatar, realName, lastName, fiscalCode, birthDate, country } = req.body;
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });

      await db.query(`
        UPDATE sql_users
        SET name = COALESCE($1, name),
            phone = COALESCE($2, phone),
            avatar = COALESCE($3, avatar),
            real_name = COALESCE($4, real_name),
            last_name = COALESCE($5, last_name),
            fiscal_code = COALESCE($6, fiscal_code),
            birth_date = COALESCE($7, birth_date),
            country = COALESCE($8, country)
        WHERE id = $9
      `, [
        name !== undefined ? name : null,
        phone !== undefined ? phone : null,
        avatar !== undefined ? avatar : null,
        realName !== undefined ? realName : null,
        lastName !== undefined ? lastName : null,
        fiscalCode !== undefined ? fiscalCode : null,
        birthDate !== undefined ? birthDate : null,
        country !== undefined ? country : null,
        req.user.id
      ]);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const isAdminMiddleware = async (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const isSuperAdmin = 
      req.user.email === 'websiteanglia@gmail.com' || 
      req.user.email === 'admin@prop.com' ||
      req.user.email === 'florinelvictorlupascu@gmail.com' ||
      req.user.email === 'fundedgoo@gmail.com' ||
      req.user.email === 'cloudcomun@gmail.com' ||
      req.user.uid === '92Lluf6ztBasw1COuRRXHteVJfr1' ||
      req.user.uid === 'XyFVhiDlrNVP5WIpaA56mGq5wUI3';
      
    if (isSuperAdmin) {
      next();
    } else {
      try {
        const userSnap = await dbAdmin.collection('users').doc(req.user.uid).get();
        if (userSnap.exists && userSnap.data()?.role === 'admin') {
           return next();
        }
        const adminSnap = await dbAdmin.collection('admins').doc(req.user.uid).get();
        if (adminSnap.exists) {
          next();
        } else {
          res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
      } catch (err: any) {
        console.error("Firebase Admin Error:", err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };

  const isStaffMiddleware = async (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const isSuperAdmin = 
      req.user.email === 'websiteanglia@gmail.com' || 
      req.user.email === 'admin@prop.com' ||
      req.user.email === 'florinelvictorlupascu@gmail.com' ||
      req.user.email === 'fundedgoo@gmail.com' ||
      req.user.email === 'cloudcomun@gmail.com' ||
      req.user.uid === '92Lluf6ztBasw1COuRRXHteVJfr1' ||
      req.user.uid === 'XyFVhiDlrNVP5WIpaA56mGq5wUI3';
      
    if (isSuperAdmin) {
      return next();
    }
    
    try {
      const userSnap = await dbAdmin.collection('users').doc(req.user.uid).get();
      if (userSnap.exists && (userSnap.data()?.role === 'admin' || userSnap.data()?.role === 'moderator')) {
        return next();
      }

      const adminSnap = await dbAdmin.collection('admins').doc(req.user.uid).get();
      if (adminSnap.exists) {
        next();
      } else {
        res.status(403).json({ error: 'Forbidden: Staff access required' });
      }
    } catch (err: any) {
      console.error("Firebase Admin Error:", err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  app.post("/api/order", authenticate, async (req: any, res: any) => {
    const { user_id, tradingAccountId, symbol, lots, type, fillPrice, sl, tp } = req.body;

    // Security: Ensure user only places orders for themselves
    if (user_id !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden: Cannot place order for another user" });
    }

    // We trust the frontend's explicit fillPrice to maintain sync with the client's realtime price
    const finalFillPrice = parseFloat(fillPrice);
    if (isNaN(finalFillPrice)) {
      return res
        .status(400)
        .json({ error: "fillPrice is required and must be a valid number" });
    }

    const db = getDb();
    if (db) {
      try {
        await db.query(
          "INSERT INTO sql_positions (user_id, symbol, lots, open_price, type, sl, tp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [user_id, symbol, lots, finalFillPrice, type, sl || null, tp || null],
        );
      } catch (error) {
        console.error("Failed to insert position", error);
      }
    }

    // Forward to MT5 Bridge if account is configured for sync
    if (user_id && tradingAccountId) {
      try {
        const acctRef = dbAdmin.collection('users').doc(user_id).collection('tradingAccounts').doc(tradingAccountId);
        const acctSnap = await acctRef.get();
        if (acctSnap.exists) {
          const acctData = acctSnap.data();
          if (acctData?.mt5Sync?.enabled && acctData.mt5Sync.bridgeUrl) {
            const { bridgeUrl, token } = acctData.mt5Sync;
            console.log(`Forwarding order for account ${tradingAccountId} to MT5 Bridge: ${bridgeUrl}`);
            
            const response = await fetch(`${bridgeUrl}/place_trade`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
              },
              body: JSON.stringify({
                symbol: symbol.replace("/", ""), 
                type: type.toUpperCase(),
                volume: lots,
                sl: sl || 0,
                tp: tp || 0
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.warn(`MT5 Bridge responded with error: ${response.status} - ${errorText}`);
            } else {
              const bridgeResult = await response.json();
              console.log(`MT5 Bridge execution result:`, bridgeResult);
            }
          }
        }
      } catch (e) {
        console.error("Failed to communicate with per-account MT5 Bridge:", e);
      }
    }

    res.json({
      status: "filled",
      symbol,
      type,
      lots,
      fillPrice: finalFillPrice,
    });
  });

  app.get("/api/equity/:user_id", authenticate, async (req: any, res: any) => {
    const { user_id } = req.params;
    
    // Security: Only owner or staff
    if (user_id !== req.user.uid) {
       let isStaff = false;
       const isSuperAdmin = req.user.email === 'websiteanglia@gmail.com' || req.user.email === 'admin@prop.com';
       if (isSuperAdmin) {
         isStaff = true;
       } else {
         try {
           const userSnap = await dbAdmin.collection('users').doc(req.user.uid).get();
           const role = userSnap.data()?.role;
           if (role === 'admin' || role === 'moderator') isStaff = true;
           else {
             const adminSnap = await dbAdmin.collection('admins').doc(req.user.uid).get();
             if (adminSnap.exists) isStaff = true;
           }
         } catch (err: any) {
           console.error("Firebase Admin Error:", err);
           return res.status(500).json({ error: 'Internal Server Error' });
         }
       }
       if (!isStaff) {
         return res.status(403).json({ error: "Forbidden" });
       }
    }
    
    // In a full implementation, this sums user balance + PnL from open positions
    // PnL = (current_price - open_price) * lots * multiplier
    res.json({ equity: 100000, balance: 100000, active_positions: 0 });
  });
  app.get("/api/tx-data", authenticate, async (req: any, res: any) => {
    const db = getDb();
    if (!db) return res.json([]);
    try {
      // Check if user is staff (admin or moderator)
      let isStaff = false;
      const isSuperAdmin = 
        req.user.email === 'websiteanglia@gmail.com' || 
        req.user.email === 'admin@prop.com' ||
        req.user.email === 'florinelvictorlupascu@gmail.com' ||
        req.user.uid === '92Lluf6ztBasw1COuRRXHteVJfr1';
      
      if (isSuperAdmin) {
        isStaff = true;
      } else {
        const userSnap = await dbAdmin.collection('users').doc(req.user.uid).get();
        const role = userSnap.data()?.role;
        if (role === 'admin' || role === 'moderator') {
          isStaff = true;
        } else {
          const adminSnap = await dbAdmin.collection('admins').doc(req.user.uid).get();
          if (adminSnap.exists) isStaff = true;
        }
      }

      // Security: Staff can see all tx, users see only theirs
      const result = await db.query(
        'SELECT id, user_id as "userId", amount, type, status, date as "createdAt", payment_method as "paymentMethod", description FROM sql_transactions WHERE ($1 = TRUE OR user_id = $2) ORDER BY date DESC',
        [isStaff, req.user.uid]
      );
      res.json(result.rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "DB Error" });
    }
  });

  app.post("/api/tx-data", authenticate, async (req: any, res: any) => {
    const db = getDb();
    if (!db) return res.json({ id: Date.now() });
    try {
      const { user_id, amount, type, status, payment_method, description } =
        req.body;

      // Security: Users can only insert their own transactions
      if (user_id !== req.user.uid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const result = await db.query(
        'INSERT INTO sql_transactions (user_id, amount, type, status, payment_method, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id as "userId", amount, type, status, date as "createdAt", payment_method as "paymentMethod", description',
        [user_id, amount, type, status, payment_method, description],
      );
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "DB Error" });
    }
  });

  app.post("/api/trading-accounts", authenticate, async (req: any, res: any) => {
    const db = getDb();
    if (!db) return res.status(500).json({ error: "Database not ready" });
    try {
      const account = req.body;
      const userId = account.userId;
      
      // Security Check
      if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({ error: "Forbidden: Access denied to create trading account for another user" });
      }

      await db.query(`
        INSERT INTO sql_trading_accounts (
          id, user_id, platform, account_number, broker, server, status, leverage, type, competition_id, created_at, balance, equity, initial_balance, initial_fee, fee_refunded, rules, open_trades, pending_orders, history, payout_milestones, mt5_sync, certificates
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (id) DO UPDATE SET
          platform = EXCLUDED.platform,
          account_number = EXCLUDED.account_number,
          status = EXCLUDED.status,
          leverage = EXCLUDED.leverage,
          balance = EXCLUDED.balance,
          equity = EXCLUDED.equity,
          rules = EXCLUDED.rules,
          open_trades = EXCLUDED.open_trades,
          pending_orders = EXCLUDED.pending_orders,
          history = EXCLUDED.history,
          payout_milestones = EXCLUDED.payout_milestones,
          mt5_sync = EXCLUDED.mt5_sync,
          certificates = EXCLUDED.certificates
      `, [
        account.id,
        userId,
        account.platform || "GOO",
        account.accountNumber,
        account.broker || "FundedGoo Markets",
        account.server || "FundedGoo-Live",
        account.status || "active",
        account.leverage || "1:100",
        account.type,
        account.competitionId || null,
        Number(account.createdAt || Date.now()),
        Number(account.balance || 0),
        Number(account.equity || 0),
        Number(account.initialBalance || 0),
        Number(account.initialFee || 0),
        account.feeRefunded || false,
        JSON.stringify(account.rules || {}),
        JSON.stringify(account.openTrades || []),
        JSON.stringify(account.pendingOrders || []),
        JSON.stringify(account.history || []),
        JSON.stringify(account.payoutMilestones || []),
        JSON.stringify(account.mt5Sync || null),
        JSON.stringify(account.certificates || [])
      ]);

      res.json({ success: true });
    } catch (e: any) {
      console.error("Error creating/upserting trading account:", e);
      res.status(500).json({ error: e.message || "Failed to create/upsert trading account" });
    }
  });

  app.post("/api/trading-accounts/update", authenticate, async (req: any, res: any) => {
    const db = getDb();
    if (!db) return res.status(500).json({ error: "Database not ready" });
    try {
      const { id, data } = req.body;
      if (!id || !data) return res.status(400).json({ error: "id and data are required" });

      // Check existence and ownership
      const existing = await db.query("SELECT * FROM sql_trading_accounts WHERE id = $1", [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "Account not found" });
      }

      const account = existing.rows[0];
      if (account.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({ error: "Forbidden: Access denied to update this account" });
      }

      // Build dynamic update query
      const fieldsToUpdate: string[] = [];
      const values: any[] = [];
      let index = 1;

      if (data.balance !== undefined) {
        fieldsToUpdate.push(`balance = $${index++}`);
        values.push(Number(data.balance));
      }
      if (data.equity !== undefined) {
        fieldsToUpdate.push(`equity = $${index++}`);
        values.push(Number(data.equity));
      }
      if (data.status !== undefined) {
        fieldsToUpdate.push(`status = $${index++}`);
        values.push(data.status);
      }
      if (data.openTrades !== undefined) {
        fieldsToUpdate.push(`open_trades = $${index++}`);
        values.push(JSON.stringify(data.openTrades));
      }
      if (data.pendingOrders !== undefined) {
        fieldsToUpdate.push(`pending_orders = $${index++}`);
        values.push(JSON.stringify(data.pendingOrders));
      }
      if (data.history !== undefined) {
        fieldsToUpdate.push(`history = $${index++}`);
        values.push(JSON.stringify(data.history));
      }
      if (data.rules !== undefined) {
        fieldsToUpdate.push(`rules = $${index++}`);
        values.push(JSON.stringify(data.rules));
      }
      if (data.payoutMilestones !== undefined) {
        fieldsToUpdate.push(`payout_milestones = $${index++}`);
        values.push(JSON.stringify(data.payoutMilestones));
      }
      if (data.mt5Sync !== undefined) {
        fieldsToUpdate.push(`mt5_sync = $${index++}`);
        values.push(JSON.stringify(data.mt5Sync));
      }
      if (data.certificates !== undefined) {
        fieldsToUpdate.push(`certificates = $${index++}`);
        values.push(JSON.stringify(data.certificates));
      }

      if (fieldsToUpdate.length === 0) {
        return res.json({ success: true, message: "No fields to update" });
      }

      values.push(id);
      const queryText = `UPDATE sql_trading_accounts SET ${fieldsToUpdate.join(", ")} WHERE id = $${index}`;
      await db.query(queryText, values);

      res.json({ success: true });
    } catch (e: any) {
      console.error("Error updating trading account:", e);
      res.status(500).json({ error: e.message || "Failed to update trading account" });
    }
  });

  app.post("/api/gemini/analyze-post", authenticate, async (req: any, res: any) => {
    try {
      const { description, authorName } = req.body;
      if (!description || description.trim() === "") {
        return res.status(400).json({ error: "Descrierea postării este obligatorie pentru analiză." });
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.status(400).json({ 
          error: "Cheia API Gemini (GEMINI_API_KEY) nu este configurată în sistem. Vă rugăm să o adăugați în Settings > Secrets." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Analyze this technical trading chart setup:
"${description}"
Published by: ${authorName || "Verified Trader"}

Please perform a structured and professional strategic analysis in Romanian language (since the platform users speak Romanian). Be objective, highly specialized, and helpful. Re-organize it clearly, rate its viability, propose alternative indicators or ideas, and design a potential hedging/alternative trade setup.

Format and return your analysis strictly as a JSON object with the following structure:
{
  "summary": "O scurtă descriere/rezumat de un paragraf extrem de elegant și concis.",
  "orderSteps": ["Etapa 1: ...", "Etapa 2: ..."],
  "indicatorsAndPatterns": ["Exemplu indicator 1", "Exemplu pattern 2"],
  "evaluationText": "O evaluare detaliată și profundă în limba română a viabilității strategiei de tranzacționare, explicând vulnerabilitățile și punctele forte.",
  "innovativeIdeas": ["Ideea de îmbunătățire nr. 1: ...", "Ideea de îmbunătățire nr. 2: ..."],
  "alternativeSetup": "O descriere elegantă a unui setup alternativ de tranzacționare (de ex: un ordin de tip stop, strategii de hedging sau o altă zonă de interes)."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              orderSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              indicatorsAndPatterns: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              evaluationText: { type: Type.STRING },
              innovativeIdeas: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              alternativeSetup: { type: Type.STRING }
            },
            required: ["summary", "orderSteps", "indicatorsAndPatterns", "evaluationText", "innovativeIdeas", "alternativeSetup"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Răspuns gol din partea Gemini.");
      }

      const parsedResult = JSON.parse(resultText);
      res.json(parsedResult);
    } catch (err: any) {
      console.error("Gemini Post Analysis Error:", err);
      res.status(500).json({ error: "Eroare la procesarea analizei AI: " + err.message });
    }
  });

  app.post("/api/admin/encrypt", authenticate, isAdminMiddleware, async (req: any, res: any) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });
    const encrypted = encrypt(text);
    res.json({ encrypted });
  });

  // Bot Management Endpoints
  app.get("/api/admin/bots", authenticate, isStaffMiddleware, async (req: any, res: any) => {
    try {
      if (!dbAdmin) {
        return res.json([]);
      }
      const botSnap = await dbAdmin.collection('users').where('isBot', '==', true).get();
      const bots: any[] = [];
      botSnap.forEach((d: any) => bots.push({ id: d.id, ...d.data() }));
      res.json(bots);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/bots/generate", authenticate, isAdminMiddleware, async (req: any, res: any) => {
    try {
      const { count = 5, profile = 'balanced' } = req.body;
      
      const regionData = [
        {
          countries: ["Romania", "Germany", "France", "Italy", "Spain", "UK", "Poland", "Netherlands", "Turkey", "Sweden"],
          firstNames: ["Andrei", "Stefan", "Elena", "Marcus", "Julia", "David", "Sophie", "Luca", "Maria", "Victor", "Alexander", "Mihai", "Emma", "Oliver", "Johan", "Clara", "Antoine"],
          lastInitials: ["M.", "B.", "G.", "V.", "K.", "L.", "T.", "P.", "S.", "D.", "R.", "C."]
        },
        {
          countries: ["USA", "Canada", "Australia", "New Zealand"],
          firstNames: ["James", "John", "Robert", "Michael", "William", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Noah", "Liam", "Mason", "Jacob", "William", "Ethan", "James"],
          lastInitials: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "W.", "T.", "R.", "M."]
        },
        {
          countries: ["Japan", "South Korea", "Singapore", "Malaysia", "Vietnam", "Thailand"],
          firstNames: ["Yuki", "Kenji", "Hana", "Ji-hoon", "Seo-yeon", "Min-jun", "Wei", "Siti", "Ahmad", "Nguyen", "Tran", "Somchai", "Chen", "Lee"],
          lastInitials: ["T.", "K.", "L.", "W.", "C.", "P.", "N.", "H."]
        },
        {
          countries: ["Russia", "Ukraine", "Belarus", "Kazakhstan"],
          firstNames: ["Ivan", "Dmitry", "Sergey", "Nikolay", "Anna", "Maria", "Ekaterina", "Svetlana", "Vladimir", "Mikhail", "Artem", "Sofia"],
          lastInitials: ["I.", "P.", "S.", "V.", "M.", "K.", "R."]
        }
      ];

      const created = [];
      for (let i = 0; i < count; i++) {
        // Pick a random region
        const region = regionData[Math.floor(Math.random() * regionData.length)];
        const botCountry = region.countries[Math.floor(Math.random() * region.countries.length)];
        const firstName = region.firstNames[Math.floor(Math.random() * region.firstNames.length)];
        
        let lastName = region.lastInitials[Math.floor(Math.random() * region.lastInitials.length)];
        // Add random variation to avoid name collision if possible (only 1-3 digits so it looks like a gamer handle or initial)
        if (Math.random() > 0.7) {
          lastName = lastName.replace('.', '') + ' ' + Math.floor(Math.random() * 99);
        }

        const name = `${firstName} ${lastName}`;
        const id = `bot-${Math.random().toString(36).substring(2, 10)}`;
        
        // Use DiceBear avatars with appropriate styles (avataaars, bottts, identicon, lorelei, etc. for variety)
        const styles = ['avataaars', 'lorelei', 'notionists', 'adventurer', 'micah'];
        const avatarStyle = styles[Math.floor(Math.random() * styles.length)];

        // Generate realistic created date between 1 and 180 days ago
        const createdAt = Date.now() - (Math.floor(Math.random() * 180) + 1) * 24 * 60 * 60 * 1000;

        const botData = {
          id,
          name,
          email: `${id}@bot.fundedgoo.com`,
          role: 'trader',
          isBot: true,
          botProfile: profile, // 'balanced', 'aggressive', 'scalper', etc.
          country: botCountry,
          avatar: `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${id}`,
          createdAt,
          status: 'verified'
        };
        try {
          await dbAdmin.collection('users').doc(id).set(botData);
        } catch (dbErr: any) {
          console.error("DB Error creating bot:", dbErr);
          throw dbErr;
        }
        created.push(botData);
      }
      res.json({ message: `Successfully generated ${count} bots! You will see them populated below shortly.`, created });
    } catch (e: any) {
      console.error("General error generating bots:", e);
      res.status(500).json({ error: e.message, stack: e.stack });
    }
  });

  app.post("/api/admin/bots/action", authenticate, isAdminMiddleware, async (req: any, res: any) => {
    try {
      const { botId } = req.body;
      const db = getDb();
      if (!db) throw new Error("DB not connected");
      
      const botSnap = await dbAdmin.collection('users').doc(botId).get();
      if (!botSnap.exists || !botSnap.data().isBot) throw new Error("Bot not found");
      
      const profileId = botSnap.data().botProfile || 'balanced';
      const profSnap = await dbAdmin.collection('botProfiles').doc(profileId).get();
      const profile = profSnap.exists ? profSnap.data() : { preferredInstruments: ['EURUSD'], buyProbability: 0.5, lotSizeRange: [0.1, 1.0], minDuration: 30, maxDuration: 120 };
      
      await openBotTrade(db, botId, profile, 'manual');
      res.json({ success: true, message: "Manual trade forced for bot" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/bots/toggle-active", authenticate, isAdminMiddleware, async (req: any, res: any) => {
    try {
      const { botId } = req.body;
      const botRef = dbAdmin.collection('users').doc(botId);
      const botSnap = await botRef.get();
      if (!botSnap.exists || !botSnap.data().isBot) throw new Error("Bot not found");

      const currentActive = botSnap.data().isActive !== false;
      const newActive = !currentActive;

      await botRef.update({ 
        isActive: newActive,
        status: newActive ? 'verified' : 'inactive'
      });

      // Clear cache so changes apply immediately
      cachedBots = null;

      res.json({ success: true, isActive: newActive, message: `Bot ${newActive ? 'activated' : 'deactivated'} successfully` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/bots/delete", authenticate, isAdminMiddleware, async (req: any, res: any) => {
    try {
      const { botId } = req.body;
      const botRef = dbAdmin.collection('users').doc(botId);
      const botSnap = await botRef.get();
      if (!botSnap.exists || !botSnap.data().isBot) throw new Error("Bot not found");

      // 1. Delete bot user document
      await botRef.delete();

      // 2. Delete bot's trading accounts
      const accountsSnap = await botRef.collection('tradingAccounts').get();
      for (const doc of accountsSnap.docs) {
        await doc.ref.delete();
      }

      // 3. Clear cache
      cachedBots = null;

      res.json({ success: true, message: "Bot and accounts deleted" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/sys-logs", authenticate, isStaffMiddleware, async (req: any, res: any) => {
    const db = getDb();
    if (!db) return res.json([]);
    try {
      const result = await db.query(
        'SELECT id, action, user_id as "actorId", actor_name as "actorName", actor_role as "actorRole", target_id as "targetId", target_name as "targetName", type, details, timestamp as "createdAt" FROM sql_audit_logs ORDER BY timestamp DESC',
      );
      res.json(result.rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "DB Error", details: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/sys-logs", authenticate, async (req: any, res: any) => {
    const db = getDb();
    if (!db) return res.json({ id: Date.now() });
    try {
      const { action, targetId, targetName, type, details, actorName, actorRole } =
        req.body;

      // Security: Users can only log their own actions (or we log them automatically)
      // For now, only authenticated users can log
      const result = await db.query(
        'INSERT INTO sql_audit_logs (action, user_id, actor_name, actor_role, target_id, target_name, type, details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, action, user_id as "actorId", actor_name as "actorName", actor_role as "actorRole", target_id as "targetId", target_name as "targetName", type, details, timestamp as "createdAt"',
        [action, req.user.uid, actorName || null, actorRole || null, targetId || null, targetName || null, type || 'system', details || null],
      );
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "DB Error", details: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/create-checkout-session", authenticate, async (req: any, res: any) => {
    try {
      const { packageId, packageName, price, userEmail, platform, discountCode } = req.body;

      // Security: Ensure email matches authenticated user
      if (userEmail !== req.user.email) {
        return res.status(403).json({ error: "Email mismatch" });
      }

      let finalPrice = price;
      let appliedDiscount = 0;

      if (discountCode) {
        const promoSnap = await dbAdmin.collection('promotions')
          .where('discountCode', '==', discountCode.toUpperCase())
          .where('isActive', '==', true)
          .get();

        if (!promoSnap.empty) {
          const promoContent = promoSnap.docs[0];
          const promo = promoContent.data();
          let isValid = true;
          
          if (promo.validUntil && new Date(promo.validUntil).getTime() < new Date().getTime()) {
            isValid = false;
          }
          if (promo.usageLimit > 0 && (promo.usageCount || 0) >= promo.usageLimit) {
            isValid = false;
          }
          if (isValid && promo.targetAllocation && promo.targetAllocation !== 'all') {
            const pkgDoc = await dbAdmin.collection('packages').doc(packageId).get();
            if (pkgDoc.exists) {
              const pkgData = pkgDoc.data();
              if (pkgData && Number(pkgData.allocation) !== Number(promo.targetAllocation)) {
                isValid = false;
              }
            } else {
              isValid = false;
            }
          }

          if (isValid) {
            // Check if it's for everyone or for this specific user
            if (promo.showToAll) {
              appliedDiscount = promo.discountRate;
            } else if (promo.targetUserIds) {
               // We need to resolve the user ID from email first if we want to be strict
               const userSnap = await dbAdmin.collection('users')
                 .where('email', '==', userEmail)
                 .get();
               if (!userSnap.empty) {
                  const userId = userSnap.docs[0].id;
                  if (promo.targetUserIds.includes(userId)) {
                    appliedDiscount = promo.discountRate;
                  }
               }
            }
          }
        }
      }

      if (appliedDiscount > 0) {
        finalPrice = price * (1 - appliedDiscount / 100);
      }

      console.log(`Purchase package: ${packageId}, discountCode used: ${discountCode}, discount applied: ${appliedDiscount}%`);

      let stripe;
      try {
        stripe = await getStripe();
      } catch (stripeInitErr: any) {
        console.warn("Stripe is not configured. Redirecting to sandbox/demo checkout success URL.", stripeInitErr.message);
        const demoSessionId = `demo_${packageId}_${platform || 'DX'}_${discountCode || ''}_${Date.now()}`;
        const demoUrl = `${req.headers.origin}/?session_id=${demoSessionId}&status=success`;
        return res.json({ id: demoSessionId, url: demoUrl });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${packageName} Challenge`,
                description: `Prop firm challenge account: ${packageName}${discountCode ? ` (Discount code: ${discountCode})` : ''}`,
              },
              unit_amount: Math.round(finalPrice * 100), // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${req.headers.origin}/shop?status=cancel`,
        customer_email: userEmail,
        metadata: {
          packageId,
          userEmail,
          platform: platform || 'DX',
          discountCode: discountCode || '',
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/competitions/:id/participants", authenticate, async (req: any, res: any) => {
    try {
      const compId = req.params.id;
      const db = getDb();
      if (!db) return res.status(500).json({ error: "Database not ready" });

      const queryText = `
        SELECT ta.*, u.name, u.last_name, u.country
        FROM sql_trading_accounts ta
        JOIN sql_users u ON ta.user_id = u.id
        WHERE ta.type = 'competition' AND ta.competition_id = $1
      `;
      const result = await db.query(queryText, [compId]);
      const participants = result.rows.map(row => {
        const historyArr = row.history ? JSON.parse(row.history) : [];
        const shortName = row.name.split(' ')[0] + ' ' + (row.last_name ? row.last_name.charAt(0) + '.' : '');
        return {
          id: row.id,
          userId: row.user_id,
          shortName: shortName.trim(),
          country: row.country || 'Global',
          balance: Number(row.balance),
          equity: Number(row.equity),
          trades: historyArr
        };
      });
      participants.sort((a: any, b: any) => b.balance - a.balance);
      res.json(participants);
    } catch (e: any) {
      console.error('Error fetching participants:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/verify-checkout-session", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "No session ID" });
      
      if (sessionId.startsWith("demo_")) {
        // Safe sandbox session ID structure: `demo_${packageId}_${platform}_${discountCode}_${timestamp}`
        const parts = sessionId.split("_");
        return res.json({
          paid: true,
          packageId: parts[1],
          platform: parts[2] || 'DX',
          discountCode: parts[3] || ''
        });
      }

      const stripe = await getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        res.json({
          paid: true,
          packageId: session.metadata?.packageId,
          platform: session.metadata?.platform,
          discountCode: session.metadata?.discountCode
        });
      } else {
        res.json({ paid: false });
      }
    } catch (e: any) {
      console.error("Verification error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/mt5-positions", authenticate, async (req: any, res: any) => {
    const mt5BridgeUrl = process.env.MT5_BRIDGE_URL;
    if (!mt5BridgeUrl) return res.json([]);
    
    try {
      const response = await fetch(`${mt5BridgeUrl}/get_positions`, {
        headers: { 
          'X-Bridge-Token': process.env.MT5_BRIDGE_SECRET || ''
        }
      });
      if (response.ok) {
        const positions = await response.json();
        return res.json(positions);
      }
      res.status(response.status).json({ error: "Bridge returned error" });
    } catch (e) {
      console.error("Failed to fetch MT5 positions:", e);
      res.status(500).json({ error: "Bridge connection failed" });
    }
  });

  // ==========================================
  // FEED: MARKET STATUS
  // ==========================================
  app.get("/api/forex/market-status", (req, res) => {
    const d = new Date();
    const day = d.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const hour = d.getUTCHours();
    
    let isClosed = false;
    // Market closes Friday 21:00 UTC and opens Sunday 21:00 UTC
    if (day === 5 && hour >= 21) isClosed = true; 
    if (day === 6) isClosed = true; 
    if (day === 0 && hour < 21) isClosed = true; 

    res.json({ isClosed, serverTime: d.toISOString() });
  });

  // Public Dukascopy Forex proxy endpoints (Free & No API Key)
  // ==========================================
  // DUKASCOPY-NODE: CANDLES (HISTORICAL)
  // ==========================================
  const candlesCache = new Map<string, { timestamp: number, data?: any[], promise?: Promise<any[]> }>();

  app.get("/api/forex/candles", async (req, res) => {
    const { symbol = "EUR/USD", interval = "1Min", count = "300" } = req.query;
    const uiTf = String(interval).toUpperCase();
    try {
      if (typeof activeInstruments !== 'undefined') activeInstruments.add(String(symbol)); // Subscribe to live feed

      // Map TF to dukascopy-node standard
      const mapTimeframe: Record<string, string> = {
        'M1': 'm1', '1MIN': 'm1', 'S10': 'm1', 'S30': 'm1',
        'M5': 'm5', '5MIN': 'm5',
        'M15': 'm15', '15MIN': 'm15',
        'M30': 'm30', '30MIN': 'm30',
        'H1': 'h1', '1HOUR': 'h1',
        'H4': 'h4', '4HOUR': 'h4',
        'D1': 'd1', '1DAY': 'd1',
        'W1': 'd1', '1WEEK': 'd1'
      };
      const dInterval = mapTimeframe[uiTf] || 'm1';
      const numCount = parseInt(String(count), 10) || 300;
      
      const cacheKey = `${String(symbol)}_${dInterval}_${numCount}`;
      const now = Date.now();
      const cached = candlesCache.get(cacheKey);
      
      // Cache valid for 30 seconds to prevent spamming Dukascopy
      if (cached && cached.data && now - cached.timestamp < 30000) {
        return res.json(cached.data);
      }

      // If already fetching, wait for the existing promise to resolve
      if (cached && cached.promise) {
        const data = await cached.promise;
        return res.json(data);
      }

      const dukSym = typeof mapSymbolToDukascopy === 'function' ? mapSymbolToDukascopy(String(symbol)) : String(symbol).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      const intervalMsMap: Record<string, number> = {
        'm1': 60000,
        'm5': 300000,
        'm15': 900000,
        'm30': 1800000,
        'h1': 3600000,
        'h4': 14400000,
        'd1': 86400000
      };
      
      const tsEnd = new Date();
      // Look back far enough to account for missing data and get required count
      const tsStart = new Date(tsEnd.getTime() - ((intervalMsMap[dInterval] || 60000) * numCount * 2.5));

      const fetchPromise = (async () => {
        const data = await pRetry(async () => {
          return await getHistoricalRates({
            instrument: dukSym,
            timeframe: dInterval as any,
            dates: { from: tsStart, to: tsEnd },
            format: "json"
          });
        }, { retries: 2 });
        
        if (!data || data.length === 0) {
          throw new Error("No data returned from dukascopy-node for " + symbol);
        }

        // Map to Lightweight Charts format
        let candles = data.map((c: any) => ({
          time: Math.floor(c.timestamp / 1000), // Time trebuie să fie in secunde pe platforma noastra (Lightweight charts)
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0
        }));

        candles.sort((a: any, b: any) => a.time - b.time);

        if (candles.length > numCount) {
          candles = candles.slice(-numCount);
        }
        return candles;
      })();

      // Store the promise in the cache to coalesce multiple simultaneous requests
      candlesCache.set(cacheKey, { timestamp: now, promise: fetchPromise });

      const finalCandles = await fetchPromise;
      candlesCache.set(cacheKey, { timestamp: Date.now(), data: finalCandles });
      
      res.json(finalCandles);
    } catch (e: any) {
      console.log(`[Feed/Dukascopy] API Fetch Failed for ${symbol}: ${e.message || e}`);
      return res.json([]);
    }
  });

  // ==========================================
  // DUKASCOPY-NODE: QUOTES (REAL-TIME POLLING FROM BACKGROUND FEED)
  // ==========================================
  app.get("/api/forex/quotes", async (req, res) => {
    const { instruments = "EUR/USD" } = req.query;
    try {
      const list = String(instruments || "EUR/USD").split(",");
      const result: Record<string, any> = {};
      const nowMs = Date.now();

      for (const origSym of list) {
        const sym = origSym.trim();
        if (!sym) continue;
        
        if (typeof activeInstruments !== 'undefined') activeInstruments.add(sym); // Keep hot in live feed
        
        if (typeof liveRatesMap !== 'undefined' && liveRatesMap[sym]) {
          const payload = liveRatesMap[sym]; // [timestamp, bid, ask]
          result[sym] = payload;
        } else {
          // Provide an immediate cached snapshot fallback until the live feed connects
          const ratesData = getRatesFromCache();
          const rates = ratesData?.success ? (ratesData?.data?.rates || {}) : {};
          
          const s = sym.toUpperCase().replace("_", "/");
          let basePrice = 1.08520;
          if (s.includes("EUR/USD")) basePrice = rates["EUR"] ? (rates["USD"] || 1.0) / rates["EUR"] : 1.08520;
          else if (s.includes("GBP/USD")) basePrice = rates["GBP"] ? (rates["USD"] || 1.0) / rates["GBP"] : 1.26850;
          else if (s.includes("USD/JPY")) basePrice = rates["USD"] && rates["JPY"] ? rates["JPY"] / rates["USD"] : 155.620;
          else if (s.includes("XAU")) basePrice = rates["XAU"] ? (rates["USD"] || 1.0) / rates["XAU"] : 2341.50;
          else if (s.includes("BTC")) basePrice = rates["BTC"] ? (rates["USD"] || 1.0) / rates["BTC"] : 68500.00;
          else if (s.includes("ETH")) basePrice = rates["ETH"] ? (rates["USD"] || 1.0) / rates["ETH"] : 3750.00;

          const spread = s.includes("JPY") ? 0.012 : 0.00015;
          result[sym] = [nowMs, basePrice - spread, basePrice];
        }
      }

      res.setHeader("X-Chart-Fallback", "false"); 
      res.json(result);
    } catch (e: any) {
      console.log(`[Feed] Error retrieving quotes for ${instruments}: ${e.message || e}`);
      res.status(500).json({ error: "Feed error" });
    }
  });

  // ExchangeRate-API Rates Endpoints
  app.get("/api/rates", async (req, res) => {
    try {
      const cachedData = getRatesFromCache();
      res.json(cachedData);
    } catch (e: any) {
      console.error("Rates fetch error:", e);
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.get("/api/rates/history", async (req, res) => {
    const db = getDb();
    try {
      if (db) {
        const result = await db.query(
          "SELECT rate_date as date, rates FROM sql_rates_history ORDER BY rate_date DESC LIMIT 30"
        );
        return res.json({ success: true, history: result.rows });
      } else if (dbAdmin) {
        const snapshot = await dbAdmin.collection("ratesHistory")
          .orderBy("date", "desc")
          .limit(30)
          .get();
        const history: any[] = [];
        snapshot.forEach((doc: any) => {
          history.push(doc.data());
        });
        return res.json({ success: true, history });
      } else {
        return res.status(503).json({ success: false, error: "Database not connected" });
      }
    } catch (e: any) {
      console.error("Rates history error:", e);
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.post("/api/rates/refresh", authenticate, isAdminMiddleware, async (req: any, res: any) => {
    try {
      const { fetchExchangeRates } = await import("./exchangeRateService");
      const rates = await fetchExchangeRates(dbAdmin, getDb());
      res.json({ success: true, message: "Manual refresh completed successfully", rates });
    } catch (e: any) {
      console.error("Manual refresh error:", e);
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.get("/api/health", async (req, res) => {
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    let postgresStatus = "disconnected";
    let postgresError = null;

    if (hasDatabaseUrl) {
      try {
        const db = getDb();
        if (db) {
          await db.query("SELECT 1");
          postgresStatus = "connected";
        } else {
          postgresStatus = "no_pool";
        }
      } catch (e: any) {
        postgresStatus = "failed";
        postgresError = e.message || String(e);
      }
    } else {
      postgresStatus = "missing_database_url_env";
    }

    const firestoreStatus = dbAdmin ? "connected" : "disconnected";

    res.json({
      status: "ok",
      postgres: {
        status: postgresStatus,
        hasUrl: hasDatabaseUrl,
        error: postgresError
      },
      firestore: {
        status: firestoreStatus
      }
    });
  });

  // Verification Routes
  app.post("/api/auth/send-verification", authenticate, async (req: any, res: any) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Missing email" });

    const db = getDb();
    if (!db) return res.status(500).json({ error: "Database not connected" });

    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

      await db.query(
        "INSERT INTO sql_user_verifications (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)",
        [req.user.uid, email, token, expiresAt]
      );

      await sendVerificationEmail(email, token);
      res.json({ success: true, message: "Verification email sent" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to process verification" });
    }
  });

  app.get("/api/auth/verify-email", async (req: any, res: any) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token missing" });

    const db = getDb();
    if (!db) return res.status(500).json({ error: "Database not connected" });

    try {
      const result = await db.query(
        "UPDATE sql_user_verifications SET verified = TRUE WHERE token = $1 AND expires_at > NOW() AND verified = FALSE RETURNING user_id, email",
        [token]
      );

      if (result.rowCount === 0) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Optionally update Firebase user as well if needed
      // const userId = result.rows[0].user_id;
      // await admin.auth().updateUser(userId, { emailVerified: true });

      res.send(`
        <html>
          <body style="font-family: sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh;">
            <div style="text-align: center; padding: 40px; background: #1e293b; border-radius: 12px; border: 1px solid #334155;">
              <h1 style="color: #f97316;">Succes!</h1>
              <p>Email-ul tău a fost confirmat cu succes. Te poți întoarce în aplicație.</p>
              <a href="/" style="display: inline-block; margin-top: 20px; color: #38bdf8; text-decoration: none;">Înapoi la site</a>
            </div>
          </body>
        </html>
      `);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Serve statically if dist is already built, or fall back to Vite middleware
  const hasDist = fs.existsSync(path.join(process.cwd(), "dist/index.html"));
  if (process.env.NODE_ENV !== "production" && !hasDist) {
    console.log("[Vite] Starting development server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Production/Static] Serving compiled assets from dist folder...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", async () => {
    await initDb();
    
    // Feed realtime initialization (dukascopy-node poll loop)
    startLiveFeed(io);

    // Start ExchangeRate background caching service
    try {
      console.log("[ExchangeRate] Initializing with Admin SDK status:", !!dbAdmin);
      await initializeExchangeRates(dbAdmin, getDb());
    } catch (e: any) {
      console.error("[ExchangeRate] Initialization failed:", e.message);
    }
    
    // Start Bot Engine - Optimized to run once every 2 hours (7,200,000 ms)
    console.log("Starting Bot Engine Loop (2h, 7200000ms)...");
    setInterval(runBotEngine, 7200000);
    // Run once immediately after startup
    runBotEngine().catch(e => console.error("Initial Bot Engine run failed:", e));

    // Bootstrap admins in Firestore for security rules backup in the background
    (async () => {
      const superAdmins = ['XyFVhiDlrNVP5WIpaA56mGq5wUI3', '92Lluf6ztBasw1COuRRXHteVJfr1'];
      for (const uid of superAdmins) {
        try {
          if (dbAdmin) {
            await dbAdmin.collection('admins').doc(uid).set({ 
              uid, 
              role: 'admin', 
              bootstrapped: true,
              updatedAt: new Date() 
            }, { merge: true });
            console.log(`Admin ${uid} bootstrapped.`);
          }
        } catch (e) {
          console.error(`Failed to bootstrap admin ${uid}:`, e);
        }
      }
    })();

    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: startServer failed to start:", err);
});
