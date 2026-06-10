import { useEffect, useState } from "preact/hooks";
import { ping, login, type AsterUser } from "./agent";
import { Pos } from "./pos";

type Conn = "checking" | "connected" | "notfound";

export function App() {
  const [conn, setConn] = useState<Conn>("checking");
  const [user, setUser] = useState<AsterUser | null>(null);

  async function check() {
    const r = await ping();
    setConn(r.ok ? "connected" : "notfound");
  }
  useEffect(() => {
    void check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  if (user) return <Pos user={user} onLogout={() => setUser(null)} />;
  return <Login conn={conn} recheck={check} onLogin={setUser} />;
}

function Login({ conn, recheck, onLogin }: { conn: Conn; recheck: () => void; onLogin: (u: AsterUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: Event) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await login(email.trim(), password);
    setBusy(false);
    if (r.ok && r.user) {
      onLogin(r.user);
    } else if (r.error === "agent_unreachable") {
      setMsg("Can't reach the local service.");
    } else if (r.error === "invalid_credentials") {
      setMsg("Wrong email or password.");
    } else {
      setMsg(r.error || "Sign-in failed.");
    }
  }

  return (
    <div class="shell">
      <header class="topbar">
        <div class="brand">Aster Station</div>
        <div class={`dot ${conn}`} title={conn}>
          {conn === "connected" ? "Local service connected" : conn === "checking" ? "Connecting…" : "Local service not found"}
        </div>
      </header>
      <main class="center">
        {conn === "notfound" ? (
          <div class="card notice">
            <h2>Local service not found</h2>
            <p>The local service isn't running on this computer. Contact your administrator.</p>
            <button onClick={recheck}>Retry</button>
          </div>
        ) : (
          <form class="card login" onSubmit={onSubmit}>
            <h2>Sign in</h2>
            <label>
              Email
              <input type="email" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onInput={(e) => setPassword((e.target as HTMLInputElement).value)} required />
            </label>
            <button type="submit" disabled={busy || conn !== "connected"}>{busy ? "Signing in…" : "Sign in"}</button>
            {msg && <p class="msg">{msg}</p>}
          </form>
        )}
      </main>
    </div>
  );
}
