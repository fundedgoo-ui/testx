import admin from "firebase-admin";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// Interfaces
export interface ExchangeRateData {
  base: string;
  rates: Record<string, number>;
  timestamp: number; // UTC Unix timestamp of the update
  lastUpdateUtc: string;
}

export interface CacheMetadata {
  lastFetchedTime: number; // server timestamp in ms
  updateIntervalMs: number;
  cacheHits: number;
  callsConsumed: number;
  status: "success" | "stale" | "error" | "initial";
  errorLog: string | null;
}

// In-Memory Cache
let exchangeRateCache: ExchangeRateData | null = null;
let cacheMetadata: CacheMetadata = {
  lastFetchedTime: 0,
  updateIntervalMs: 5 * 60 * 1000, // Default 5 minutes, will be updated via Config
  cacheHits: 0,
  callsConsumed: 0,
  status: "initial",
  errorLog: null,
};

// Tracking if a backup has been made today (YYYY-MM-DD format)
let lastBackupDate: string | null = null;
let updateTimer: NodeJS.Timeout | null = null;

// Helper to decrypt keys if using standard DB encryption
function decryptValue(text: string): string {
  try {
    const key = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY;
    if (!key) return text;
    const hash = require("crypto").createHash("sha256").update(key).digest();
    const textParts = text.split(":");
    if (textParts.length !== 2) return text;
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = require("crypto").createDecipheriv("aes-256-cbc", hash, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text; // fallback to raw
  }
}

// Validate the ExchangeRate-API Key
export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  if (!apiKey || apiKey.length < 10) {
    return { valid: false, message: "API key is missing or too short." };
  }
  
  try {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
    const response = await fetch(url);
    if (response.ok) {
      return { valid: true, message: "API key is valid." };
    } else if (response.status === 404) {
      return { valid: false, message: "API key not found (404). Please check your key." };
    } else {
      return { valid: false, message: `API key validation failed with status ${response.status}.` };
    }
  } catch (e) {
    return { valid: false, message: `Error validating API key: ${e}` };
  }
}

// Get the ExchangeRate-API Key
async function getApiKey(dbAdmin: any): Promise<string> {
  // 1. Try to fetch from Firebase config
  if (dbAdmin) {
    try {
      const docRef = dbAdmin.collection("apis").doc("api-exchangerate");
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const config = docSnap.data()?.config;
        if (config?.ApiKey) {
          console.log("[ExchangeRate] Using API key from Firestore api-exchangerate.");
          return decryptValue(config.ApiKey);
        }
      }
    } catch (e: any) {
      if (e.message?.includes("PERMISSION_DENIED")) {
        console.warn("[ExchangeRate] Firestore access denied for API key. Using fallbacks.");
      } else {
        console.error("[ExchangeRate] Failed to load Key from Firestore:", e.message);
      }
    }
  }

  // 2. Fallback to Env variable
  const envKey = process.env.EXCHANGERATE_API_KEY;
  if (envKey) {
    console.log("[ExchangeRate] Using API key from Environment Variable.");
    return envKey;
  }

  // 3. User explicit fallback key (provided in request)
  console.warn("[ExchangeRate] API Key is missing or invalid. Falling back to SANDBOX_MODE.");
  return "SANDBOX_MODE";
}

// Get the ExchangeRate-API update interval
async function getUpdateIntervalMinutes(dbAdmin: any): Promise<number> {
  if (dbAdmin) {
    try {
      const docRef = dbAdmin.collection("apis").doc("api-exchangerate");
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const config = docSnap.data()?.config;
        if (config?.UpdateIntervalMinutes) {
          const val = parseInt(config.UpdateIntervalMinutes);
          if (!isNaN(val) && val > 0) {
            return val;
          }
        }
      }
    } catch (e: any) {
       if (!e.message?.includes("PERMISSION_DENIED")) {
         console.error("[ExchangeRate] Failed to load Interval from Firestore:", e.message);
       }
    }
  }

  const envVal = process.env.EXCHANGERATE_UPDATE_INTERVAL_MINUTES;
  if (envVal) {
    const val = parseInt(envVal);
    if (!isNaN(val) && val > 0) return val;
  }

  return 30; // default 30 minutes
}

// Ensure the database table exists for PostgreSQL backups
export async function initPostgresRatesTable(pool: pg.Pool | null) {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sql_rates_history (
        id SERIAL PRIMARY KEY,
        rate_date DATE NOT NULL UNIQUE,
        rates JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[ExchangeRate] Postgres sql_rates_history table initialized.");
  } catch (e) {
    console.error("[ExchangeRate] Fail to initialize Rates Postgres table:", e);
  }
}

// Generate rich fallback mock rates for sandbox mode
function generateMockRates(): Record<string, number> {
  return {
    USD: 1.0,
    EUR: 0.9234,
    GBP: 0.7891,
    JPY: 156.45,
    CHF: 0.9082,
    CAD: 1.3654,
    AUD: 1.5032,
    NZD: 1.6310,
    RON: 4.5821,
    XAU: 0.000414, // ~2415 USD / ounce
    BTC: 0.0000147, // ~68000 USD / BTC
    ETH: 0.0002857, // ~3500 USD / ETH
  };
}

// Dynamic call to the API with robust fallback
export async function fetchExchangeRates(dbAdmin: any, pool: pg.Pool | null, apiKey?: string): Promise<ExchangeRateData> {
  if (!apiKey) {
    apiKey = await getApiKey(dbAdmin);
  }
  const now = new Date();

  // If SANDBOX mode, simulate successful fetch
  if (apiKey === "SANDBOX_MODE" || apiKey.includes("SANDBOX")) {
    console.log("[ExchangeRate] Fetching from mock provider (Sandbox Mode)...");
    const mockRates = generateMockRates();
    cacheMetadata.status = "success";
    cacheMetadata.errorLog = "Running in simulated sandbox mode. Set EXCHANGERATE_API_KEY in environment/Firestore API Config for real data.";
    cacheMetadata.lastFetchedTime = Date.now();
    
    exchangeRateCache = {
      base: "USD",
      rates: mockRates,
      timestamp: Math.floor(Date.now() / 1000),
      lastUpdateUtc: now.toUTCString(),
    };
    return exchangeRateCache;
  }

  try {
    // V6 URL format: https://v6.exchangerate-api.com/v6/API_KEY/latest/USD
    if (!apiKey || apiKey.length < 10 || apiKey === "SANDBOX_MODE") {
      if (apiKey === "SANDBOX_MODE") {
        throw new Error("SANDBOX_MODE triggered");
      }
      console.error("[ExchangeRate] Invalid API key length or missing:", apiKey ? apiKey.length : "empty");
      throw new Error("Invalid API key provided, skipping network request.");
    }
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
    console.log(`[ExchangeRate] Calling API URL: ${url.replace(apiKey, "HIDDEN_KEY")}`);
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Upstream returned 404. The API key might be invalid or the endpoint is incorrect. Status: 404`);
      }
      throw new Error(`Upstream returned service error status ${response.status}`);
    }

    const data = await response.json();
    if (data.result === "error") {
      throw new Error(`ExchangeRate-API responded with error: ${data["error-type"] || "unknown"}`);
    }

    // Capture success response
    const conversionRates = data.conversion_rates || {};
    
    // Auto-add default gold or crypto fallback values if they are missing in free packages
    if (!conversionRates.XAU) conversionRates.XAU = 0.000414; // ~2415 USD/oz
    if (!conversionRates.BTC) conversionRates.BTC = 0.0000147; // ~68k USD
    if (!conversionRates.ETH) conversionRates.ETH = 0.0002857; // ~3.5k USD

    exchangeRateCache = {
      base: data.base_code || "USD",
      rates: conversionRates,
      timestamp: data.time_last_update_unix || Math.floor(Date.now() / 1000),
      lastUpdateUtc: data.time_last_update_utc || now.toUTCString(),
    };

    cacheMetadata.lastFetchedTime = Date.now();
    cacheMetadata.callsConsumed += 1;
    cacheMetadata.status = "success";
    cacheMetadata.errorLog = null;

    console.log(`[ExchangeRate] Update successful. Total calls consumed: ${cacheMetadata.callsConsumed}. Saved rates: ${Object.keys(conversionRates).length}`);
    return exchangeRateCache;
    
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[ExchangeRate] API Call Error, attempting fallback to cache:", errorMsg);
    
    cacheMetadata.status = "error";
    cacheMetadata.errorLog = `Fetch failed: ${errorMsg}. Using stale cached rates values.`;

    if (exchangeRateCache) {
      console.log("[ExchangeRate] Successfully fell back to existing cache data.");
      return exchangeRateCache;
    } else {
      console.log("[ExchangeRate] No prior cache exists, generating sandbox bootstrap data as ultimate fallback.");
      const mockRates = generateMockRates();
      exchangeRateCache = {
        base: "USD",
        rates: mockRates,
        timestamp: Math.floor(Date.now() / 1000),
        lastUpdateUtc: now.toUTCString(),
      };
      return exchangeRateCache;
    }
  }
}

// Perform daily historical backup into Firestore/Postgres
export async function performDailyBackup(dbAdmin: any, pool: pg.Pool | null, rates: Record<string, number>) {
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  if (lastBackupDate === dateStr) {
    return; // Already backed up today
  }

  console.log(`[ExchangeRate] Commencing daily history backup for ${dateStr}...`);

  // 1. PostgreSQL backup
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO sql_rates_history (rate_date, rates) VALUES ($1, $2::jsonb) 
         ON CONFLICT (rate_date) DO UPDATE SET rates = EXCLUDED.rates`,
        [dateStr, JSON.stringify(rates)]
      );
      console.log(`[ExchangeRate] Saved historical Rates to PostgreSQL for ${dateStr}`);
    } catch (e) {
      console.error("[ExchangeRate] Postgres daily history save error:", e);
    }
  }

  // 2. Firebase Firestore Backup
  if (dbAdmin) {
    try {
      await dbAdmin.collection("ratesHistory").doc(dateStr).set({
        date: dateStr,
        rates: rates,
        timestamp: new Date(),
      });
      console.log(`[ExchangeRate] Saved historical Rates to Firestore for ${dateStr}`);
    } catch (e) {
      console.error("[ExchangeRate] Firestore daily history save error:", e);
    }
  }

  lastBackupDate = dateStr;
}

// Background scheduler checker (runs every minute to check if 23:55 or if cache expired)
async function runLoopTick(dbAdmin: any, pool: pg.Pool | null) {
  const now = new Date();
  const currentTimestamp = now.getTime();

  // 1. Check if cache interval has elapsed
  const configuredMinutes = await getUpdateIntervalMinutes(dbAdmin);
  const intervalMs = configuredMinutes * 60 * 1000;
  
  cacheMetadata.updateIntervalMs = intervalMs;

  const isStale = currentTimestamp - cacheMetadata.lastFetchedTime >= intervalMs;
  if (!exchangeRateCache || isStale) {
    console.log(`[ExchangeRate] Cache is ${!exchangeRateCache ? "empty" : "stale"}. Fetching now...`);
    await fetchExchangeRates(dbAdmin, pool);
  }

  // 2. Check if daily backup is needed (Trigger between 23:50 and 23:59 or simply if day changes)
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const todayDateStr = now.toISOString().split("T")[0];

  const shouldTryBackup = (currentHour === 23 && currentMinute >= 50) || lastBackupDate !== todayDateStr;
  
  if (shouldTryBackup && exchangeRateCache && lastBackupDate !== todayDateStr) {
    await performDailyBackup(dbAdmin, pool, exchangeRateCache.rates);
  }
}

// Public API Getters
export function getRatesFromCache() {
  cacheMetadata.cacheHits += 1;
  return {
    success: true,
    data: exchangeRateCache,
    metadata: {
      ...cacheMetadata,
      nextScheduledFetchTime: cacheMetadata.lastFetchedTime + cacheMetadata.updateIntervalMs,
    },
  };
}

// Initialize the entire service
export async function initializeExchangeRates(dbAdmin: any, pool: pg.Pool | null) {
  console.log("[ExchangeRate] Initializing exchange rates background service...");
  
  // Validate key
  const apiKey = await getApiKey(dbAdmin);
  const validation = await validateApiKey(apiKey);
  if (!validation.valid) {
    console.warn(`[ExchangeRate] API Key Validation Warning: ${validation.message}`);
    // Bootstraps fake rates if invalid key
    if (!exchangeRateCache) {
      exchangeRateCache = {
        base: "USD",
        rates: generateMockRates(),
        timestamp: Math.floor(Date.now() / 1000),
        lastUpdateUtc: new Date().toUTCString(),
      };
      cacheMetadata.status = "error";
      cacheMetadata.errorLog = validation.message;
    }
  } else {
    console.log(`[ExchangeRate] API Key Validation Success: ${validation.message}`);
    // If cache is empty, fetch immediately on startup
    if (!exchangeRateCache) {
      await fetchExchangeRates(dbAdmin, pool, apiKey);
    }
  }

  // Create DB structure if Postgres is available
  await initPostgresRatesTable(pool);

  // Perform a daily backup trace for today if it doesn't already exist
  if (exchangeRateCache) {
    await performDailyBackup(dbAdmin, pool, exchangeRateCache.rates);
  }

  // Clear previous timer and set 1-minute tick check
  if (updateTimer) {
    clearInterval(updateTimer);
  }

  updateTimer = setInterval(() => {
    runLoopTick(dbAdmin, pool).catch((err) => {
      console.error("[ExchangeRate] Error in background rates tick loop:", err);
    });
  }, 60000); // Check state every minute

  console.log(`[ExchangeRate] Background rates scheduler fully active (Tick: 60s, Interval: ${process.env.EXCHANGERATE_UPDATE_INTERVAL_MINUTES || "30"} minutes)`);
}
