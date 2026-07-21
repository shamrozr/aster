import { useEffect, useState } from "preact/hooks";
import { ping, login, type AsterUser } from "./agent";
import { Pos } from "./pos";
import { Ic, IconSprite } from "./ui/icons";
import { useTheme } from "./ui/theme";

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

  useTheme();

  return (
    <div class="login-shell">
      <IconSprite />
      <header class="login-top">
        <div class="login-brand">
          <span class="m">
            <Ic id="i-pos" size={15} />
          </span>
          Aster
        </div>
        <div class={`login-status ${conn}`}>
          <span class="dotlamp" />
          {conn === "connected" ? "Local service connected" : conn === "checking" ? "Connecting…" : "Local service not found"}
        </div>
      </header>
      <main class="login-center">
        {conn === "notfound" ? (
          <div class="login-card login-notice">
            <h2>Local service not found</h2>
            <p class="sub">The local service isn't running on this computer. Contact your administrator.</p>
            <button onClick={recheck}>Retry</button>
          </div>
        ) : (
          <form class="login-card" onSubmit={onSubmit}>
            <h2>Sign in</h2>
            <p class="sub">Use your staff credentials to open the till.</p>
            <label>
              Email
              <input type="email" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onInput={(e) => setPassword((e.target as HTMLInputElement).value)} required />
            </label>
            <button type="submit" disabled={busy || conn !== "connected"}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            {msg && <p class="msg">{msg}</p>}
          </form>
        )}
      </main>
    </div>
  );
}
