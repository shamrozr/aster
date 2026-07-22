// Client for the local agent (the only thing this app talks to).
import type { Combo, MenuPayload, Order, PaymentConfig, TableRow } from "./types";
import { MOCK, mockLogin, mockPing, mockPos } from "./devMock";

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
  if (MOCK) return mockPing();
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
  if (MOCK) {
    const data = await mockLogin(email, password);
    if (data?.ok && data.token) token = data.token;
    return data;
  }
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
  menu: (): Promise<MenuPayload> => {
    if (MOCK) return mockPos.menu();
    return authed<{ menu: MenuPayload }>("/local/pos/menu").then((d) => d.menu);
  },
  tables: (): Promise<TableRow[]> => {
    if (MOCK) return mockPos.tables();
    return authed<{ tables: TableRow[] }>("/local/pos/tables").then((d) => d.tables);
  },
  combos: (): Promise<Combo[]> => {
    if (MOCK) return mockPos.combos();
    return authed<{ combos: Combo[] }>("/local/pos/combos").then((d) => d.combos);
  },
  config: (): Promise<PaymentConfig> => {
    if (MOCK) return mockPos.config();
    return authed<{ config: PaymentConfig }>("/local/pos/config").then((d) => d.config);
  },
  orders: (): Promise<Order[]> => {
    if (MOCK) return mockPos.orders();
    return authed<{ orders: Order[] }>("/local/pos/orders").then((d) => d.orders);
  },
  // Full detail (incl. items) for a single order.
  order: (orderId: string): Promise<Order> => {
    if (MOCK) return mockPos.order(orderId);
    return authed<{ order: Order }>(`/local/pos/order?id=${encodeURIComponent(orderId)}`).then((d) => d.order);
  },
  create: (payload: unknown): Promise<Order> => {
    // NOTE: combo lines carry FLAT combo fields (comboId/comboName/comboPrice/
    // picks) on each item — the shape the agent reads (pos-repo.ts). Built via
    // toWireItem() in ui/shared.ts; never `COMBO:` JSON stuffed into notes.
    if (MOCK) return mockPos.create(payload);
    return post<{ order: Order }>("/local/pos/order/create", payload).then((d) => d.order);
  },
  // Fires ONLY the new items against a running order (born-offline or continued).
  // The agent's route is singular (/local/pos/order/add-item, { orderId, item }),
  // so we fire each pending line in order — one KOT per item — and return the
  // final order state.
  addItems: async (orderId: string, items: unknown[]): Promise<Order> => {
    if (MOCK) return mockPos.addItems(orderId, items);
    let order: Order | null = null;
    for (const item of items) {
      order = await post<{ order: Order }>("/local/pos/order/add-item", { orderId, item }).then((d) => d.order);
    }
    return order ?? pos.order(orderId);
  },
  // NOTE: void / cancel / force-unlock are intentionally NOT offered offline —
  // those are handled in the online app, which owns the audit trail. Aster's
  // offline path only takes orders, adds items, collects payment, and reprints.
  // Method-agnostic on the wire; the UI restricts to cash offline (comp,
  // discount, and refund are disabled offline — cash-first).
  pay: (orderId: string, method: string, amount: number, note?: string): Promise<Order> => {
    if (MOCK) return mockPos.pay(orderId, method, amount, note);
    return post<{ order: Order }>("/local/pos/order/pay", { orderId, method, amount, note }).then((d) => d.order);
  },
  setStatus: (orderId: string, status: string): Promise<Order> => {
    if (MOCK) return mockPos.setStatus(orderId, status);
    return post<{ order: Order }>("/local/pos/order/status", { orderId, status }).then((d) => d.order);
  },
  // First reprint of an order is free; a subsequent reprint requires
  // managerPin (the agent enforces; UI passes it once the order already has
  // a `reprinted` event). Appends a reprinted event either way.
  reprint: (orderId: string, kind: "kot" | "receipt", managerPin?: string): Promise<{ ok: true }> => {
    if (MOCK) return mockPos.reprint(orderId, kind, managerPin);
    return post<{ ok: true }>("/local/pos/print/reprint", { orderId, kind, managerPin });
  },
};
