import { useEffect, useMemo, useState } from "preact/hooks";
import { pos, logout, type AsterUser } from "./agent";
import {
  TERMINAL_CODE,
  DEFAULT_ENABLED_METHODS,
  type CartLine,
  type CartModifier,
  type Combo,
  type MenuItem,
  type MenuPayload,
  type ModifierGroup,
  type Order,
  type PaymentConfig,
  type PaymentMethodDef,
  type Variant,
} from "./types";

const rs = (n: number) => "Rs " + Math.round(n).toLocaleString();
const SOURCES = ["dine_in", "takeaway", "delivery", "phone"] as const;
const STATUS_FLOW = ["pending", "preparing", "ready", "served"];
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function lineTotal(l: CartLine): number {
  const mods = l.modifiers.reduce((s, m) => s + m.priceAdjustment, 0);
  return (l.unitPrice + mods) * l.quantity;
}
function roundCash(n: number, nearest: number): number {
  if (!nearest || nearest <= 0) return n;
  return Math.round(n / nearest) * nearest;
}

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
  const [combos, setCombos] = useState<Combo[]>([]);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [deals, setDeals] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [source, setSource] = useState<(typeof SOURCES)[number]>("dine_in");
  const [placed, setPlaced] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Item/combo sheets
  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);
  const [comboSheet, setComboSheet] = useState<Combo | null>(null);

  useEffect(() => {
    pos.menu().then((m) => { setMenu(m); setCat(m.categories[0]?.id ?? null); }).catch((e) => setErr(e.message));
    pos.combos().then(setCombos).catch(() => {});
    pos.config().then(setConfig).catch(() => {});
  }, []);

  const items = useMemo(() => menu?.categories.find((c) => c.id === cat)?.items ?? [], [menu, cat]);
  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0);
  const taxRate = config?.orderConfig?.taxRate ?? 0;
  const scRate = config?.orderConfig?.serviceChargeRate ?? 0;
  const tax = Math.round((subtotal * taxRate) / 100);
  const sc = Math.round((subtotal * scRate) / 100);
  const total = subtotal + tax + sc;

  // Dynamic payment tiles from synced config (fallback to defaults).
  const tiles: PaymentMethodDef[] = useMemo(() => {
    const enabled = config?.paymentMethods?.enabledMethods ?? DEFAULT_ENABLED_METHODS;
    const defs = config?.methodDefs ?? [];
    if (!defs.length) {
      // No defs synced yet — render bare keys.
      return enabled.filter((k) => k !== "complimentary").map((k) => ({
        key: k, label: k, shortLabel: k, category: "primary",
        requiresManagerPin: false, requiresRef: false, requiresBankAccount: false,
        requiresStaffSelect: false, requiresWalletContact: false,
      }));
    }
    return defs.filter((d) => enabled.includes(d.key) && d.key !== "complimentary");
  }, [config]);

  function addLine(line: CartLine) {
    setCart((c) => {
      // Merge only when truly identical (same item, variant, no modifiers, not a combo).
      if (!line.comboId && line.modifiers.length === 0) {
        const found = c.find(
          (l) => l.menuItemId === line.menuItemId && l.variantId === line.variantId && l.modifiers.length === 0 && !l.comboId
        );
        if (found) return c.map((l) => (l === found ? { ...l, quantity: l.quantity + line.quantity } : l));
      }
      return [...c, line];
    });
  }
  function onItemTap(it: MenuItem) {
    if ((it.variants?.length ?? 0) > 0 || (it.modifierGroups?.length ?? 0) > 0) {
      setSheetItem(it);
    } else {
      addLine({ lineId: uid(), menuItemId: it.id, name: it.name, unitPrice: it.price, quantity: 1, modifiers: [] });
    }
  }
  function setQty(lineId: string, q: number) {
    setCart((c) => (q <= 0 ? c.filter((l) => l.lineId !== lineId) : c.map((l) => (l.lineId === lineId ? { ...l, quantity: q } : l))));
  }
  function reset() { setCart([]); setPlaced(null); setErr(null); setPayRef(""); setPayMethod("cash"); }

  async function place() {
    setBusy(true); setErr(null);
    try {
      const order = await pos.create({
        terminalCode: TERMINAL_CODE,
        source,
        taxRate,
        serviceChargeRate: scRate,
        items: cart.map((l) => ({
          menuItemId: l.menuItemId,
          variantId: l.variantId ?? null,
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          modifiers: l.modifiers,
          notes: l.notes ?? null,
        })),
      });
      setPlaced(order);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  const activeDef = tiles.find((t) => t.key === payMethod);
  const needRef = !!activeDef?.requiresRef || (payMethod === "card" && !!config?.paymentMethods?.requireRefForCard);
  const cashRound = config?.paymentMethods?.cashRoundToNearest ?? 0;
  const collectAmount = payMethod === "cash" ? roundCash(placed?.total_amount ?? 0, cashRound) : placed?.total_amount ?? 0;

  async function collect() {
    if (!placed) return;
    if (needRef && !payRef.trim()) { setErr("Reference required for this method."); return; }
    setBusy(true); setErr(null);
    try {
      await pos.pay(placed.id, payMethod, collectAmount, payRef.trim() || undefined);
      reset();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  return (
    <div class="neworder">
      <section class="menu">
        <div class="cat-tabs">
          {combos.length > 0 && (
            <button class={deals ? "on deals" : "deals"} onClick={() => setDeals(true)}>★ Deals</button>
          )}
          {menu?.categories.map((c) => (
            <button key={c.id} class={!deals && c.id === cat ? "on" : ""} onClick={() => { setDeals(false); setCat(c.id); }}>{c.name}</button>
          ))}
        </div>
        <div class="item-grid">
          {deals
            ? combos.map((cb) => (
                <button key={cb.id} class="item combo" onClick={() => setComboSheet(cb)}>
                  <span class="iname">{cb.name}</span>
                  <span class="iprice">{rs(cb.price)}</span>
                  <span class="ibadge">Deal</span>
                </button>
              ))
            : items.map((it) => (
                <button key={it.id} class="item" disabled={!it.available} onClick={() => onItemTap(it)}>
                  <span class="iname">{it.name}</span>
                  <span class="iprice">
                    {it.variants?.length ? "from " : ""}
                    {rs(it.variants?.length ? Math.min(...it.variants.map((v) => v.price)) : it.price)}
                  </span>
                  {(it.modifierGroups?.length ?? 0) > 0 && <span class="ibadge">options</span>}
                </button>
              ))}
          {menu && !deals && items.length === 0 && <p class="muted">No items in this category.</p>}
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
                <div class="line" key={l.lineId}>
                  <div class="lcol">
                    <span class="ln">{l.name}</span>
                    {l.modifiers.length > 0 && (
                      <span class="lmods">{l.modifiers.map((m) => m.name).join(", ")}</span>
                    )}
                  </div>
                  <span class="qty">
                    <button onClick={() => setQty(l.lineId, l.quantity - 1)}>−</button>
                    {l.quantity}
                    <button onClick={() => setQty(l.lineId, l.quantity + 1)}>+</button>
                  </span>
                  <span class="lt">{rs(lineTotal(l))}</span>
                </div>
              ))}
            </div>
            <div class="totals"><span>Subtotal</span><b>{rs(subtotal)}</b></div>
            {tax > 0 && <div class="totals sub"><span>Tax {taxRate}%</span><b>{rs(tax)}</b></div>}
            {sc > 0 && <div class="totals sub"><span>Service {scRate}%</span><b>{rs(sc)}</b></div>}
            {(tax > 0 || sc > 0) && <div class="totals big"><span>Total</span><b>{rs(total)}</b></div>}
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
              {tiles.map((m) => (
                <button key={m.key} class={m.key === payMethod ? "on" : ""} onClick={() => { setPayMethod(m.key); setPayRef(""); }}>
                  {m.shortLabel || m.label}
                  {m.requiresManagerPin && <span class="pindot" title="Manager approval">●</span>}
                </button>
              ))}
            </div>
            {needRef && (
              <input class="ref" placeholder="Reference / auth code" value={payRef} onInput={(e) => setPayRef((e.target as HTMLInputElement).value)} />
            )}
            {payMethod === "cash" && cashRound > 0 && collectAmount !== placed.total_amount && (
              <p class="muted">Cash rounded to {rs(collectAmount)} (nearest {cashRound}).</p>
            )}
            {err && <p class="err">{err}</p>}
            <button class="primary" disabled={busy} onClick={collect}>{busy ? "Collecting…" : `Collect ${rs(collectAmount)}`}</button>
            <button class="link" onClick={reset}>New order without payment</button>
          </div>
        )}
      </aside>

      {sheetItem && (
        <ItemSheet
          item={sheetItem}
          onClose={() => setSheetItem(null)}
          onAdd={(line) => { addLine(line); setSheetItem(null); }}
        />
      )}
      {comboSheet && (
        <ComboSheet
          combo={comboSheet}
          menu={menu}
          onClose={() => setComboSheet(null)}
          onAdd={(line) => { addLine(line); setComboSheet(null); }}
        />
      )}
    </div>
  );
}

// ── Item sheet: pick a size/variant + modifiers, enforce required/min/max ──
function ItemSheet({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (l: CartLine) => void }) {
  const sizes = (item.variants ?? []).slice().sort((a, b) => a.sizeSortOrder - b.sizeSortOrder);
  const [variant, setVariant] = useState<Variant | null>(sizes[0] ?? null);
  const [picked, setPicked] = useState<Record<string, string[]>>({}); // groupId → modifierIds

  const basePrice = variant ? variant.price : item.price;

  // Size-aware modifiers: show options scoped to the chosen size (or size-agnostic).
  const groups: ModifierGroup[] = (item.modifierGroups ?? []).map((g) => ({
    ...g,
    modifiers: g.modifiers.filter((m) => !m.portionSizeId || m.portionSizeId === (variant?.sizeId ?? null)),
  }));

  function toggle(g: ModifierGroup, modId: string) {
    setPicked((p) => {
      const cur = p[g.id] ?? [];
      if (g.multiSelect) {
        const next = cur.includes(modId) ? cur.filter((x) => x !== modId) : [...cur, modId];
        if (g.maxSelect && next.length > g.maxSelect) return p; // cap
        return { ...p, [g.id]: next };
      }
      return { ...p, [g.id]: cur.includes(modId) ? [] : [modId] };
    });
  }

  const chosenMods: CartModifier[] = groups.flatMap((g) =>
    (picked[g.id] ?? []).map((id) => {
      const m = g.modifiers.find((x) => x.id === id)!;
      return { id: m.id, name: m.name, priceAdjustment: m.priceAdjustment };
    })
  );
  const unmet = groups.find((g) => g.required && (picked[g.id]?.length ?? 0) < Math.max(1, g.minSelect));
  const lineName = variant?.sizeName ? `${item.name} (${variant.sizeName})` : item.name;
  const linePrice = basePrice + chosenMods.reduce((s, m) => s + m.priceAdjustment, 0);

  return (
    <div class="sheet-bg" onClick={onClose}>
      <div class="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{item.name}</h3>
        {sizes.length > 0 && (
          <div class="grp">
            <div class="grp-h">Size</div>
            <div class="opts">
              {sizes.map((v) => (
                <button key={v.id} class={v.id === variant?.id ? "opt on" : "opt"} disabled={!v.isAvailable} onClick={() => setVariant(v)}>
                  {v.sizeName ?? "Regular"} · {rs(v.price)}
                </button>
              ))}
            </div>
          </div>
        )}
        {groups.map((g) => (
          <div class="grp" key={g.id}>
            <div class="grp-h">
              {g.name} {g.required && <span class="req">required</span>}
              {g.multiSelect && g.maxSelect ? <span class="hint"> · up to {g.maxSelect}</span> : null}
            </div>
            <div class="opts">
              {g.modifiers.map((m) => (
                <button key={m.id} class={(picked[g.id] ?? []).includes(m.id) ? "opt on" : "opt"} onClick={() => toggle(g, m.id)}>
                  {m.name}{m.priceAdjustment ? ` +${rs(m.priceAdjustment)}` : ""}
                </button>
              ))}
              {g.modifiers.length === 0 && <span class="muted">No options for this size.</span>}
            </div>
          </div>
        ))}
        <div class="sheet-foot">
          <button class="link" onClick={onClose}>Cancel</button>
          <button class="primary" disabled={!!unmet} onClick={() => onAdd({
            lineId: uid(), menuItemId: item.id, variantId: variant?.id ?? null, name: lineName,
            unitPrice: basePrice, quantity: 1, modifiers: chosenMods,
          })}>
            {unmet ? `Choose ${unmet.name}` : `Add · ${rs(linePrice)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Combo builder: one pick per group (defaults preselected) ──
function ComboSheet({ combo, menu, onClose, onAdd }: { combo: Combo; menu: MenuPayload | null; onClose: () => void; onAdd: (l: CartLine) => void }) {
  const itemName = (id: string) => {
    for (const c of menu?.categories ?? []) { const it = c.items.find((x) => x.id === id); if (it) return it.name; }
    return "Item";
  };
  const [choice, setChoice] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of combo.groups) {
      const def = g.items.find((i) => i.isDefault) ?? g.items[0];
      if (def) init[g.id] = def.id;
    }
    return init;
  });

  const chosen = combo.groups.map((g) => g.items.find((i) => i.id === choice[g.id])).filter(Boolean) as Combo["groups"][number]["items"];
  const upcharge = chosen.reduce((s, i) => s + (i?.upcharge ?? 0), 0);
  const price = combo.price + upcharge;
  const allPicked = combo.groups.every((g) => choice[g.id]);

  return (
    <div class="sheet-bg" onClick={onClose}>
      <div class="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{combo.name} <span class="muted">· {rs(combo.price)}</span></h3>
        {combo.groups.map((g) => (
          <div class="grp" key={g.id}>
            <div class="grp-h">{g.label}</div>
            <div class="opts">
              {g.items.map((i) => (
                <button key={i.id} class={choice[g.id] === i.id ? "opt on" : "opt"} onClick={() => setChoice((c) => ({ ...c, [g.id]: i.id }))}>
                  {itemName(i.menuItemId)}{i.upcharge ? ` +${rs(i.upcharge)}` : ""}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div class="sheet-foot">
          <button class="link" onClick={onClose}>Cancel</button>
          <button class="primary" disabled={!allPicked} onClick={() => onAdd({
            lineId: uid(), menuItemId: combo.id, comboId: combo.id, name: combo.name,
            unitPrice: price, quantity: 1,
            modifiers: chosen.map((i) => ({ name: itemName(i.menuItemId), priceAdjustment: 0 })),
            notes: "COMBO:" + JSON.stringify(chosen.map((i) => ({ menuItemId: i.menuItemId, variantId: i.variantId }))),
          })}>
            Add deal · {rs(price)}
          </button>
        </div>
      </div>
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
    const next = STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1];
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
