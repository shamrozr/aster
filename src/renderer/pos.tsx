import { useEffect, useMemo, useState } from "preact/hooks";
import { pos, logout, type AsterUser } from "./agent";
import { TERMINAL_CODE, type CartLine, type MenuPayload, type Order } from "./types";

const rs = (n: number) => "Rs " + Math.round(n).toLocaleString();
const SOURCES = ["dine_in", "takeaway", "delivery", "phone"] as const;
const STATUS_FLOW = ["pending", "preparing", "ready", "served"];
const PAY_METHODS = ["cash", "card", "jazzcash", "easypaisa"];

export function Pos({ user, onLogout }: { user: AsterUser; onLogout: () => void }) {
  const [tab, setTab] = useState<"new" | "orders">("new");
  return (
    <div class="pos">
      <header class="pos-top">
        <div class="brand">Aster Station</div>
        <nav class="tabs">
          <button class={tab === "new" ? "on" : ""} onClick={() => setTab("new")}>New Order</button>
          <button class={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}>Orders</button>
        </nav>
        <div class="who">
          {user.name} · {user.role}
          <button class="link" onClick={() => { logout(); onLogout(); }}>Sign out</button>
        </div>
      </header>
      {tab === "new" ? <NewOrder /> : <Orders />}
    </div>
  );
}

function NewOrder() {
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [source, setSource] = useState<(typeof SOURCES)[number]>("dine_in");
  const [placed, setPlaced] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    pos.menu().then((m) => { setMenu(m); setCat(m.categories[0]?.id ?? null); }).catch((e) => setErr(e.message));
  }, []);

  const items = useMemo(
    () => menu?.categories.find((c) => c.id === cat)?.items ?? [],
    [menu, cat]
  );
  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  function add(it: { id: string; name: string; price: number }) {
    setCart((c) => {
      const found = c.find((l) => l.menuItemId === it.id);
      if (found) return c.map((l) => (l.menuItemId === it.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { menuItemId: it.id, name: it.name, unitPrice: it.price, quantity: 1 }];
    });
  }
  function setQty(id: string, q: number) {
    setCart((c) => (q <= 0 ? c.filter((l) => l.menuItemId !== id) : c.map((l) => (l.menuItemId === id ? { ...l, quantity: q } : l))));
  }
  function reset() { setCart([]); setPlaced(null); setErr(null); }

  async function place() {
    setBusy(true); setErr(null);
    try {
      const order = await pos.create({
        terminalCode: TERMINAL_CODE,
        source,
        items: cart.map((l) => ({ menuItemId: l.menuItemId, name: l.name, quantity: l.quantity, unitPrice: l.unitPrice })),
      });
      setPlaced(order);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  async function collect() {
    if (!placed) return;
    setBusy(true); setErr(null);
    try {
      await pos.pay(placed.id, payMethod, placed.total_amount);
      reset();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  return (
    <div class="neworder">
      <section class="menu">
        <div class="cat-tabs">
          {menu?.categories.map((c) => (
            <button key={c.id} class={c.id === cat ? "on" : ""} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>
        <div class="item-grid">
          {items.map((it) => (
            <button key={it.id} class="item" disabled={!it.available} onClick={() => add(it)}>
              <span class="iname">{it.name}</span>
              <span class="iprice">{rs(it.price)}</span>
            </button>
          ))}
          {menu && items.length === 0 && <p class="muted">No items in this category.</p>}
        </div>
      </section>

      <aside class="cart">
        {!placed ? (
          <>
            <div class="src">
              {SOURCES.map((s) => (
                <button key={s} class={s === source ? "on" : ""} onClick={() => setSource(s)}>{s.replace("_", " ")}</button>
              ))}
            </div>
            <div class="lines">
              {cart.length === 0 && <p class="muted">Tap items to add.</p>}
              {cart.map((l) => (
                <div class="line" key={l.menuItemId}>
                  <span class="ln">{l.name}</span>
                  <span class="qty">
                    <button onClick={() => setQty(l.menuItemId, l.quantity - 1)}>−</button>
                    {l.quantity}
                    <button onClick={() => setQty(l.menuItemId, l.quantity + 1)}>+</button>
                  </span>
                  <span class="lt">{rs(l.unitPrice * l.quantity)}</span>
                </div>
              ))}
            </div>
            <div class="totals"><span>Subtotal</span><b>{rs(subtotal)}</b></div>
            {err && <p class="err">{err}</p>}
            <button class="primary" disabled={busy || cart.length === 0} onClick={place}>
              {busy ? "Placing…" : "Place order"}
            </button>
          </>
        ) : (
          <div class="pay">
            <h3>{placed.reference}</h3>
            <div class="totals big"><span>Total</span><b>{rs(placed.total_amount)}</b></div>
            <div class="methods">
              {PAY_METHODS.map((m) => (
                <button key={m} class={m === payMethod ? "on" : ""} onClick={() => setPayMethod(m)}>{m}</button>
              ))}
            </div>
            {err && <p class="err">{err}</p>}
            <button class="primary" disabled={busy} onClick={collect}>{busy ? "Collecting…" : `Collect ${rs(placed.total_amount)}`}</button>
            <button class="link" onClick={reset}>New order without payment</button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try { setOrders(await pos.orders()); } catch (e) { setErr((e as Error).message); }
  }
  useEffect(() => { void load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);

  async function advance(o: Order) {
    const i = STATUS_FLOW.indexOf(o.status);
    const next = STATUS_FLOW[i + 1];
    if (!next) return;
    try { await pos.setStatus(o.id, next); await load(); } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div class="orders">
      {err && <p class="err">{err}</p>}
      {orders.length === 0 && <p class="muted center-pad">No orders yet today.</p>}
      <div class="order-grid">
        {orders.map((o) => {
          const next = STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1];
          return (
            <div class="ocard" key={o.id}>
              <div class="orow"><b>{o.reference}</b><span class={`badge s-${o.status}`}>{o.status}</span></div>
              <div class="orow"><span class="muted">{o.source.replace("_", " ")}</span><span class={`badge p-${o.payment_status}`}>{o.payment_status}</span></div>
              <div class="ototal">{rs(o.total_amount)}</div>
              {next && <button class="advance" onClick={() => advance(o)}>Mark {next}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
