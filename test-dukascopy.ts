import { getHistoricalRates, getRealTimeRates } from "dukascopy-node";

async function test() {
  console.log("Testing historical rates EUR/USD...");
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();

    const data = await getHistoricalRates({
      instrument: "eurusd",
      timeframe: "m1",
      dates: {
        from: yesterday,
        to: today,
      },
      format: "json",
    });
    console.log("Historical EUR/USD success, count:", data.length);
    if (data.length > 0) {
      console.log("Sample candle:", data[0]);
    }
  } catch (err: any) {
    console.error("Historical EUR/USD error:", err.message || err);
  }

  console.log("Testing real-time rates EUR/USD...");
  try {
    const ticks = await getRealTimeRates({
      instrument: "eurusd",
      timeframe: "tick",
      format: "json",
      last: 5,
    });
    console.log("Real-time EUR/USD success, count:", ticks.length);
    if (ticks.length > 0) {
      console.log("Sample tick:", ticks[0]);
    }
  } catch (err: any) {
    console.error("Real-time EUR/USD error:", err.message || err);
  }
}

test();
