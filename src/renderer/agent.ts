// Client for the local agent (the only thing this app talks to).
import type { MenuPayload, Order, TableRow } from "./types";

const AGENT = "http://127.0.0.1:6310";

let token: string | null = null;

export interface PingResult {
  ok: boolean;
  version?: string;
}

export interface AsterUser {
  userId: string;
  name: string;
  role: string;
  allowedRoutes: string[];
}

export async function ping(): Promise<PingResult> {
  try {
    const r = await fetch(`${AGENT}/ping`, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return { ok: false };
    return await r.json();
  } catch {
    return { ok: false };
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ ok: boolean; token?: string; user?: AsterUser; error?: string }> {
  try {
    const r = await fetch(`${AGENT}/local/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (r.status === 404) return { ok: false, error: "agent_auth_not_ready" };
    const data = await r.json();
    if (data?.ok && data.token) token = data.token;
    return data;
  } catch {
    return { ok: false, error: "agent_unreachable" };
  }
}

export function logout(): void {
  token = null;
}

// ── Authed POS calls ─────────────────────────────────────────
async function authed<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${AGENT}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Aster-Token": token } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await r.json();
  if (!data?.ok) throw new Error(data?.error || `Request failed (${r.status})`);
  return data as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return authed<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export const pos = {
  menu: () => authed<{ menu: MenuPayload }>("/local/pos/menu").then((d) => d.menu),
  tables: () => authed<{ tables: TableRow[] }>("/local/pos/tables").then((d) => d.tables),
  orders: () => authed<{ orders: Order[] }>("/local/pos/orders").then((d) => d.orders),
  create: (payload: unknown) =>
    post<{ order: Order }>("/local/pos/order/create", payload).then((d) => d.order),
  pay: (orderId: string, method: string, amount: number) =>
    post<{ order: Order }>("/local/pos/order/pay", { orderId, method, amount }).then((d) => d.order),
  setStatus: (orderId: string, status: string) =>
    post<{ order: Order }>("/local/pos/order/status", { orderId, status }).then((d) => d.order),
};
