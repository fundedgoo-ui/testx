/**
 * Utility functions for parsing trade timestamps and profit/losses (pnl)
 * to ensure robust consistency calculations across different trade formats
 * and timezone issues, preventing false positive policy warnings.
 */

export const getTradeDateString = (t: any): string => {
  if (!t) return new Date().toLocaleDateString();
  
  // Try finding any valid timestamp property on the trade object
  const ms = t.close_time || t.timestamp || t.closeTime || t.open_time || t.openTime;
  if (!ms) return new Date().toLocaleDateString();

  // Firestore Timestamp object support ({seconds, nanoseconds})
  if (typeof ms === 'object' && ms !== null) {
    if (typeof (ms as any).toDate === 'function') {
      try {
        return (ms as any).toDate().toLocaleDateString();
      } catch (e) {
        // Fallback if toDate throws or fails
      }
    }
    if (typeof (ms as any).seconds === 'number') {
      return new Date((ms as any).seconds * 1000).toLocaleDateString();
    }
    if (ms instanceof Date) {
      return ms.toLocaleDateString();
    }
  }

  // String or Number representation
  const d = new Date(ms);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString();
  }

  return new Date().toLocaleDateString();
};

export const getTradePnl = (t: any): number => {
  if (!t) return 0;
  // Handle both 'pnl' and 'profit' fields (used in manual vs terminal trades)
  const val = t.pnl !== undefined ? t.pnl : (t.profit !== undefined ? t.profit : 0);
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};
