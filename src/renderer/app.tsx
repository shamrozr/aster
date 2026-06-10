import { useEffect, useState } from "preact/hooks";
import { ping, login } from "./agent";

type Conn = "checking" | "connected" | "notfound";

export function App() {
  const [conn, setConn] = useState<Conn>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function check() {
    setConn("checking");
    const r = await ping();
    setConn(r.ok ? "connected" : "notfound");
  }

  useEffect(() => {
    void check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  async function onLogin(e: Event) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await login(email.trim(), password);
    setBusy(false);
    if (r.ok) {
      setMsg("Signed in.");
    } else if (r.error === "agent_auth_not_ready") {
      setMsg("Local service is up. Offline sign-in is being wired up next.");
    } else if (r.error === "agent_unreachable") {
      setMsg("Can't reach the local service.");
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
            <p>The Aster local service isn't running on this computer. Contact your administrator.</p>
            <button onClick={() => void check()}>Retry</button>
          </div>
        ) : (
          <form class="card login" onSubmit={onLogin}>
            <h2>Sign in</h2>
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
