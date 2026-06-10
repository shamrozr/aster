// Client for the local agent (the only thing this app talks to).
const AGENT = "http://127.0.0.1:6310";

export interface PingResult {
  ok: boolean;
  version?: string;
}

let token: string | null = null;

export async function ping(): Promise<PingResult> {
  try {
    const r = await fetch(`${AGENT}/ping`, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) return { ok: false };
    return await r.json();
  } catch {
    return { ok: false };
  }
}

export interface StatusResult {
  warm: boolean;
  lastMirrorAt: number | null;
  entitled: boolean;
  counts: { orders: number; unsyncedOrders: number; unsyncedChanges: number };
}

/** Offline login: agent verifies the email/password against the mirrored users
 *  table and returns a local session token. (Agent endpoint: Phase 3 next.) */
export async function login(
  email: string,
  password: string
): Promise<{ ok: boolean; token?: string; user?: unknown; error?: string }> {
  try {
    const r = await fetch(`${AGENT}/local/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (r.status === 404) {
      return { ok: false, error: "agent_auth_not_ready" };
    }
    const data = await r.json();
    if (data?.ok && data.token) token = data.token;
    return data;
  } catch {
    return { ok: false, error: "agent_unreachable" };
  }
}

export function authHeader(): Record<string, string> {
  return token ? { "X-Aster-Token": token } : {};
}
