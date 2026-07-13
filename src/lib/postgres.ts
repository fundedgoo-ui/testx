import { Transaction, AuditLog } from '../types';

const resolveToken = (token?: string): string | null => {
  return token || localStorage.getItem("token");
};

export const fetchTransactions = async (token?: string): Promise<Transaction[]> => {
  const headers: HeadersInit = {};
  const activeToken = resolveToken(token);
  if (activeToken) (headers as any)['Authorization'] = `Bearer ${activeToken}`;
  
  const res = await fetch('/api/tx-data', { headers });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return [];
  }
  return res.json();
};

export const fetchAuditLogs = async (token?: string): Promise<AuditLog[]> => {
  const headers: HeadersInit = {};
  const activeToken = resolveToken(token);
  if (activeToken) (headers as any)['Authorization'] = `Bearer ${activeToken}`;

  const res = await fetch('/api/sys-logs', { headers });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return [];
  }
  return res.json();
};

export const createTransaction = async (data: any, token?: string): Promise<Transaction> => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const activeToken = resolveToken(token);
  if (activeToken) (headers as any)['Authorization'] = `Bearer ${activeToken}`;

  const res = await fetch('/api/tx-data', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create transaction');
  return res.json();
};

export const createAuditLog = async (data: any, token?: string): Promise<AuditLog | null> => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const activeToken = resolveToken(token);
  if (activeToken) (headers as any)['Authorization'] = `Bearer ${activeToken}`;

  try {
    const res = await fetch('/api/sys-logs', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Failed to create audit log: [${res.status}] ${errText}`);
      return null;
    }
    return res.json();
  } catch(e) {
    console.warn("Network error creating audit log");
    return null;
  }
};

