import { Fragment } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { pos } from "../agent";
import {
  DEFAULT_ENABLED_METHODS,
  orderKind,
  type CartLine,
  type Combo,
  type MenuItem,
  type MenuPayload,
  type Order,
  type OrderEvent,
  type OrderEventType,
  type PaymentConfig,
  type PaymentMethodDef,
  type TableRow,
} from "../types";
import { Ic } from "./icons";
import { ItemSheet } from "./ItemSheet";
import { ComboSheet } from "./ComboSheet";
import { rs, roundCash, STATUS_FLOW, typeIcon, typeLabel, lineTotal, toWireItem, uid } from "./shared";
import { ManagerPinModal, type ManagerPinResult } from "./ManagerPinModal";

type Filter = "all" | "open" | "unpaid" | "online";
type OTab = "overview" | "items" | "payment" | "activity" | "actions";

// Payment methods that are never offered offline — comp/discount/refund are
// cash-first-only, disabled entirely on this app (see CLAUDE.md policy B).
const EXCLUDED_METHOD_KEYS = new Set(["complimentary", "comp", "discount", "refund"]);
const EXCLUDED_CATEGORIES = new Set(["comp", "discount", "refund"]);

function payableTiles(config: PaymentConfig | null): PaymentMethodDef[] {
  const enabled = config?.paymentMethods?.enabledMethods ?? DEFAULT_ENABLED_METHODS;
  const defs = config?.methodDefs ?? [];
  if (!defs.length) {
    return enabled
      .filter((k) => !EXCLUDED_METHOD_KEYS.has(k))
      .map((k) => ({
        key: k, label: k, shortLabel: k, category: "primary",
        requiresManagerPin: false, requiresRef: false, requiresBankAccount: false,
        requiresStaffSelect: false, requiresWalletContact: false,
      }));
  }
  return defs.filter((d) => enabled.includes(d.key) && !EXCLUDED_METHOD_KEYS.has(d.key) && !EXCLUDED_CATEGORIES.has(d.category));
}

// Sensitive-action gate state — which flow the ManagerPinModal is currently
// serving, so one modal instance can back void / void-all / unlock / reprint.
type PinFlow =
  | { kind: "void-item"; itemId: string; itemName: string }
  | { kind: "void-all" }
  | { kind: "unlock" }
  | { kind: "reprint"; printKind: "kot" | "receipt" };

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadList() {
    try {
      const list = await pos.orders();
      setOrders(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } catch (e) { setErr((e as Error).message); }
  }
  useEffect(() => {
    void loadList();
    pos.tables().then(setTables).catch(() => {});
    pos.menu().then(setMenu).catch(() => {});
    pos.combos().then(setCombos).catch(() => {});
    pos.config().then(setConfig).catch(() => {});
    const id = setInterval(loadList, 8000);
    return () => clearInterval(id);
  }, []);

  // The orders list already carries full items + payments (agent listOrders),
  // so the detail view reads straight from the loaded list — this agent exposes
  // no order-by-id route. Selecting an order just picks it out of `orders`.
  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId]);

  async function refresh() {
    await loadList();
  }

  const filtered = useMemo(() => {
    let list = orders;
    if (filter === "open") list = list.filter((o) => o.status === "open");
    if (filter === "unpaid") list = list.filter((o) => o.payment_status !== "paid");
    if (filter === "online") list = list.filter((o) => orderKind(o.reference) === "online");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.reference.toLowerCase().includes(q) ||
          (o.guest_name ?? "").toLowerCase().includes(q) ||
          (tables.find((t) => t.id === o.table_id)?.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filter, search, tables]);

  return (
    <div class="orders">
      <div class="ord-list">
        <div class="ord-list-head">
          <h2>
            Orders <span class="n">{orders.length} today</span>
          </h2>
          <div class="ord-search">
            <Ic id="i-search" size={15} />
            <input placeholder="Search ref, phone, table…" value={search} onInput={(e) => setSearch((e.target as HTMLInputElement).value)} />
          </div>
          <div class="ord-filters">
            {(["all", "open", "unpaid", "online"] as Filter[]).map((f) => (
              <button key={f} class={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "open" ? "Open" : f === "unpaid" ? "Unpaid" : "Was online"}
              </button>
            ))}
          </div>
        </div>
        <div class="ord-rows">
          {err && <p class="err">{err}</p>}
          {filtered.length === 0 && <p class="muted" style={{ padding: "16px" }}>No orders match.</p>}
          {filtered.map((o) => {
            const kind = orderKind(o.reference);
            const table = tables.find((t) => t.id === o.table_id);
            return (
              <button key={o.id} class={o.id === selectedId ? "olrow on" : "olrow"} onClick={() => setSelectedId(o.id)}>
                <div class="r1">
                  <span class={`kind ${kind === "online" ? "on" : "off"}`}>{kind}</span>
                  <span class="oref">{o.reference}</span>
                  <span class={`sbadge ${o.kitchen_status ?? o.status}`}>{o.kitchen_status ?? o.status}</span>
                </div>
                <div class="r2">
                  <span class="meta">
                    <Ic id={typeIcon(o.source)} size={13} /> {table ? `${table.name} · ${typeLabel(o.source)}` : typeLabel(o.source)}
                    {o.guest_name ? ` · ${o.guest_name}` : ""}
                  </span>
                  <span class="amt">{rs(o.total_amount)}</span>
                </div>
                <div class="r2">
                  <span class={`paid ${o.payment_status === "paid" ? "yes" : o.payment_status === "partial" ? "partial" : "no"}`}>
                    {o.payment_status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div class="ord-detail">
        {selected ? (
          <OrderDetail order={selected} tables={tables} menu={menu} combos={combos} config={config} onChanged={refresh} />
        ) : (
          <div class="ord-empty">Select an order to view details.</div>
        )}
      </div>
    </div>
  );
}

function OrderDetail({
  order,
  tables,
  menu,
  combos,
  config,
  onChanged,
}: {
  order: Order;
  tables: TableRow[];
  menu: MenuPayload | null;
  combos: Combo[];
  config: PaymentConfig | null;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<OTab>("overview");
  const [forceUnlocked, setForceUnlocked] = useState(false);
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({ payment: true, delivery: true });
  const [pending, setPending] = useState<CartLine[]>([]);
  const [addQuery, setAddQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);
  const [comboSheet, setComboSheet] = useState<Combo | null>(null);
  const [pinFlow, setPinFlow] = useState<PinFlow | null>(null);

  useEffect(() => { setPending([]); setTab("overview"); setForceUnlocked(false); setErr(null); setPinFlow(null); }, [order.id]);

  const kind = orderKind(order.reference);
  const locked = kind === "online" && !forceUnlocked;
  const paidLocked = order.payment_status === "paid";
  const table = tables.find((t) => t.id === order.table_id);
  const items = order.items ?? [];
  const firedItems = items.filter((it) => it.fired !== false);
  const localNewItems = items.filter((it) => it.fired === false);
  const kStatus = order.kitchen_status ?? "pending";
  const stepIdx = Math.max(0, STATUS_FLOW.indexOf(kStatus));
  const nextStatus = STATUS_FLOW[stepIdx + 1];
  const hasReprinted = (order.events ?? []).some((e) => e.type === "reprinted");

  async function advance() {
    if (!nextStatus) return;
    setBusy(true); setErr(null);
    try { await pos.setStatus(order.id, nextStatus); onChanged(); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  // ── Manager-PIN-gated actions ────────────────────────────────────────
  function requestVoid(itemId: string, itemName: string) {
    setPinFlow({ kind: "void-item", itemId, itemName });
  }
  function requestVoidAll() {
    setPinFlow({ kind: "void-all" });
  }
  function requestUnlock() {
    setPinFlow({ kind: "unlock" });
  }
  function requestReprint(printKind: "kot" | "receipt") {
    if (hasReprinted) setPinFlow({ kind: "reprint", printKind });
    else void doReprint(printKind);
  }

  async function onPinConfirmed(result: ManagerPinResult) {
    const flow = pinFlow;
    setPinFlow(null);
    if (!flow) return;
    setBusy(true); setErr(null);
    try {
      if (flow.kind === "void-item") {
        await pos.voidItem(order.id, flow.itemId, result.reason, result.pin);
        onChanged();
      } else if (flow.kind === "void-all") {
        const toVoid = items.filter((it) => !it.voided);
        for (const it of toVoid) {
          await pos.voidItem(order.id, it.id, result.reason, result.pin);
        }
        onChanged();
      } else if (flow.kind === "unlock") {
        await pos.forceUnlock(order.id, result.pin, result.reason);
        setForceUnlocked(true);
        onChanged();
      } else if (flow.kind === "reprint") {
        await pos.reprint(order.id, flow.printKind, result.pin);
        onChanged();
      }
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  const menuItems: MenuItem[] = useMemo(() => (menu?.categories ?? []).flatMap((c) => c.items), [menu]);
  const addResults = useMemo(() => {
    if (!addQuery.trim()) return { items: [] as MenuItem[], combos: [] as Combo[] };
    const q = addQuery.trim().toLowerCase();
    return {
      items: menuItems.filter((it) => it.name.toLowerCase().includes(q)).slice(0, 6),
      combos: combos.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 4),
    };
  }, [menuItems, combos, addQuery]);

  function addPending(line: CartLine) {
    setPending((p) => [...p, line]);
    setAddQuery("");
  }
  function removePending(lineId: string) {
    setPending((p) => p.filter((l) => l.lineId !== lineId));
  }
  function tapMenuItem(it: MenuItem) {
    if (!it.available) return;
    if ((it.variants?.length ?? 0) > 0 || (it.modifierGroups?.length ?? 0) > 0) {
      setSheetItem(it);
    } else {
      addPending({ lineId: uid(), menuItemId: it.id, name: it.name, unitPrice: it.price, quantity: 1, modifiers: [] });
    }
  }

  async function sendNew() {
    if (pending.length === 0) return;
    setBusy(true); setErr(null);
    try {
      await pos.addItems(order.id, pending.map(toWireItem));
      setPending([]);
      onChanged();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  async function doReprint(kind2: "kot" | "receipt") {
    setBusy(true); setErr(null);
    try { await pos.reprint(order.id, kind2); onChanged(); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  const pendingTotal = pending.reduce((s, l) => s + lineTotal(l), 0);

  // Payment tab — cash-first offline; comp/discount/refund are never offered.
  const tiles: PaymentMethodDef[] = useMemo(() => payableTiles(config), [config]);
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const activeDef = tiles.find((t) => t.key === payMethod);
  const needRef = !!activeDef?.requiresRef;
  const cashRound = config?.paymentMethods?.cashRoundToNearest ?? 0;
  const collectAmount = payMethod === "cash" ? roundCash(order.balance_due, cashRound) : order.balance_due;

  async function collectPayment() {
    if (needRef && !payRef.trim()) { setErr("Reference required for this method."); return; }
    setBusy(true); setErr(null);
    try { await pos.pay(order.id, payMethod, collectAmount, payRef.trim() || undefined); setPayRef(""); onChanged(); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  function toggleSec(k: string) { setOpenSec((s) => ({ ...s, [k]: !s[k] })); }

  const voidableCount = items.filter((it) => !it.voided).length;

  return (
    <div class="ord-wrap">
      <div class="ord-head">
        <div>
          <div class="oref">{order.reference}</div>
          <div class="odate">{new Date(order.created_at).toLocaleString()}</div>
        </div>
        <span class="statusdot">{kStatus}</span>
        <span class="typepill">
          <Ic id={typeIcon(order.source)} size={15} /> {typeLabel(order.source)}
        </span>
        <span class="lockpill">
          <Ic id={locked ? "i-lock" : "i-cloud"} size={13} /> {locked ? "Locked · was online" : kind === "online" ? "Unlocked" : "Offline · OFF series"}
        </span>
        <div class="rt">
          <button onClick={() => requestReprint("receipt")}>
            <Ic id="i-print" size={16} /> Receipt
          </button>
        </div>
      </div>

      {kind === "online" && (
        <div class="lockbanner">
          <Ic id="i-lock" />
          <span class="lt">
            {locked
              ? "This order started online. Fired items stay locked — add new items below and they sync up on reconnect. Owner/admin can unlock; the action is logged."
              : "Force-unlocked for this session. All actions are logged for reconciliation."}
          </span>
          {locked && (
            <button class="forceunlock" onClick={requestUnlock}>
              <Ic id="i-unlock" size={15} /> Force unlock
            </button>
          )}
        </div>
      )}
      {paidLocked && (
        <div class="paidhint" style={{ marginTop: 14 }}>
          <Ic id="i-check" /> Paid — locked
        </div>
      )}
      {err && <p class="err">{err}</p>}

      <div class="otabs">
        {(["overview", "items", "payment", "activity", "actions"] as OTab[]).map((t) => (
          <button key={t} class={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "items" ? `Items (${items.length + pending.length})` : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div class={`opanel ${tab === "overview" ? "on" : ""}`}>
        <div class="donow">
          <div class="dh">
            <span class="lbl">Do now</span>
            <span class="spill">{kStatus}</span>
          </div>
          <div class="stepper">
            {STATUS_FLOW.map((s, i) => (
              <Fragment key={s}>
                {i > 0 && <div class={`stepbar ${i <= stepIdx ? "done" : ""}`} />}
                <div class={`step ${i < stepIdx ? "done" : i === stepIdx ? "cur" : ""}`}>
                  <span class="dot">{i < stepIdx ? <Ic id="i-check" size={16} /> : i + 1}</span>
                  <span class="sl">{s[0].toUpperCase() + s.slice(1)}</span>
                </div>
              </Fragment>
            ))}
          </div>
          <button class="cta" disabled={!nextStatus || busy} onClick={advance}>
            <Ic id="i-arrowr" /> {nextStatus ? `Mark ${nextStatus}` : "Order complete"}
          </button>
        </div>

        <div class="metrics">
          <div class="metric"><div class="ml">Type</div><div class="mv">{typeLabel(order.source)}</div></div>
          <div class="metric"><div class="ml">Table</div><div class="mv">{table?.name ?? "—"}</div></div>
          <div class="metric"><div class="ml">Items</div><div class="mv">{items.length}</div></div>
          <div class="metric"><div class="ml">Total</div><div class="mv">{rs(order.total_amount)}</div></div>
          <div class="metric"><div class="ml">Balance</div><div class={`mv ${order.balance_due === 0 ? "ok" : ""}`}>{order.balance_due === 0 ? "Paid" : rs(order.balance_due)}</div></div>
        </div>

        <div class={`csec ${openSec.payment ? "open" : ""}`}>
          <button class="ch" onClick={() => toggleSec("payment")}>
            <Ic id="i-wallet" />
            <span class="ct">Payment</span>
            <span class={`cbadge ${order.payment_status === "paid" ? "paid" : ""}`}>{order.payment_status}</span>
            <span class="chev"><Ic id="i-chevdown" size={16} /></span>
          </button>
          <div class="cb">
            <div class="subfield">
              <div class="sfl">Method</div>
              <div class="sfv">
                <Ic id="i-wallet" /> {order.payments?.length ? order.payments.map((p) => p.method).join(", ") : "Not collected"} · balance {rs(order.balance_due)}
              </div>
            </div>
          </div>
        </div>

        {order.guest_name && (
          <div class={`csec ${openSec.customer ? "open" : ""}`}>
            <button class="ch" onClick={() => toggleSec("customer")}>
              <Ic id="i-user" />
              <span class="ct">Customer</span>
              <span class="cbadge cust">{order.guest_name}</span>
              <span class="chev"><Ic id="i-chevdown" size={16} /></span>
            </button>
            <div class="cb">
              <div class="subfield">
                <div class="sfl">Name</div>
                <div class="sfv"><Ic id="i-user" /> {order.guest_name}</div>
              </div>
            </div>
          </div>
        )}

        {order.source.includes("deliver") && (
          <div class={`csec ${openSec.delivery ? "open" : ""}`}>
            <button class="ch" onClick={() => toggleSec("delivery")}>
              <Ic id="i-bike" />
              <span class="ct">Delivery &amp; Rider</span>
              <span class="cbadge del">Delivery</span>
              <span class="chev"><Ic id="i-chevdown" size={16} /></span>
            </button>
            <div class="cb">
              <div class="subfield">
                <div class="sfl">Rider assignment</div>
                <button class="assignbtn"><Ic id="i-bike" size={16} /> Assign Rider</button>
              </div>
            </div>
          </div>
        )}

        <div class={`csec ${openSec.kitchen ? "open" : ""}`}>
          <button class="ch" onClick={() => toggleSec("kitchen")}>
            <Ic id="i-chef" />
            <span class="ct">Kitchen</span>
            <span class="chev" style={{ marginLeft: "auto" }}><Ic id="i-chevdown" size={16} /></span>
          </button>
          <div class="cb">
            <div class="subfield">
              <div class="sfl">Station</div>
              <div class="sfv"><Ic id="i-chef" /> Main kitchen · {kStatus}</div>
            </div>
          </div>
        </div>
      </div>

      <div class={`opanel ${tab === "items" ? "on" : ""}`}>
        {paidLocked && (
          <div class="paidhint">
            <Ic id="i-check" /> Paid — locked, items can't be added or voided
          </div>
        )}
        {firedItems.length > 0 && (
          <>
            <div class="itemshdr">Sent to kitchen · fired</div>
            {firedItems.map((it) => (
              <div class={it.voided ? "irow voided" : "irow"} key={it.id}>
                <span class="qn">{it.quantity} ×</span>
                <span style={{ fontWeight: 600 }}>{it.name}</span>
                {it.voided ? (
                  <span class="ibadge voided">Voided</span>
                ) : (
                  <span class="ibadge done">Done</span>
                )}
                {it.category && !it.voided && <span class="ibadge pizza">{it.category}</span>}
                {!it.voided && !locked && !paidLocked && (
                  <button class="voidbtn" onClick={() => requestVoid(it.id, it.name)} disabled={busy}>
                    <Ic id="i-x" size={14} /> void
                  </button>
                )}
                <span class="price"><Ic id="i-tag" size={15} /> {it.total_price.toLocaleString()}</span>
                {it.voided && (
                  <span class="voidmeta">
                    <Ic id="i-ban" size={13} /> {it.voidReason ?? "No reason recorded"}
                    {(() => {
                      const auth = voidAuthorizer(order, it.name);
                      return auth ? ` — authorized by ${auth}` : "";
                    })()}
                  </span>
                )}
              </div>
            ))}
          </>
        )}
        {localNewItems.map((it) => (
          <div class={it.voided ? "irow voided" : "irow"} key={it.id}>
            <span class="qn">{it.quantity} ×</span>
            <span style={{ fontWeight: 600 }}>{it.name}</span>
            <span class={it.voided ? "ibadge voided" : "ibadge new"}>{it.voided ? "Voided" : "New"}</span>
            {!it.voided && !paidLocked && (
              <button class="voidbtn" onClick={() => requestVoid(it.id, it.name)} disabled={busy}>
                <Ic id="i-x" size={14} /> void
              </button>
            )}
            <span class="price"><Ic id="i-tag" size={15} /> {it.total_price.toLocaleString()}</span>
            {it.voided && (
              <span class="voidmeta">
                <Ic id="i-ban" size={13} /> {it.voidReason ?? "No reason recorded"}
              </span>
            )}
          </div>
        ))}

        {!paidLocked && (
          <>
            <div class="newgrp">
              New — not sent yet <span class="wf">will fire</span>
            </div>
            <div class="additem-box">
              <div class="searchbar">
                <Ic id="i-search" />
                <input placeholder="Search menu or deals to add…" value={addQuery} onInput={(e) => setAddQuery((e.target as HTMLInputElement).value)} />
              </div>
              {(addResults.items.length > 0 || addResults.combos.length > 0) && (
                <div class="additem-list">
                  {addResults.combos.map((c) => (
                    <button key={c.id} onClick={() => { setComboSheet(c); setAddQuery(""); }}>
                      <span>{c.name} <span class="ibadge2 combo" style={{ marginLeft: 6 }}>Deal</span></span>
                      <span>{rs(c.price)}</span>
                    </button>
                  ))}
                  {addResults.items.map((it) => (
                    <button key={it.id} onClick={() => tapMenuItem(it)}>
                      <span>
                        {it.name}
                        {((it.variants?.length ?? 0) > 0 || (it.modifierGroups?.length ?? 0) > 0) && (
                          <span class="ibadge2" style={{ marginLeft: 6 }}>options</span>
                        )}
                      </span>
                      <span>{rs(it.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {pending.length === 0 ? (
              <p class="muted">No staged items yet — search above to add.</p>
            ) : (
              pending.map((l) => (
                <div class="irow" key={l.lineId}>
                  <span class="qn">{l.quantity} ×</span>
                  <span style={{ fontWeight: 600 }}>{l.name}</span>
                  <span class="ibadge new">New</span>
                  {l.modifiers.length > 0 && <span class="voidmeta" style={{ color: "var(--muted)" }}>{l.modifiers.map((m) => m.name).join(", ")}</span>}
                  <button class="voidbtn" onClick={() => removePending(l.lineId)}>
                    <Ic id="i-x" size={14} /> remove
                  </button>
                  <span class="price"><Ic id="i-tag" size={15} /> {lineTotal(l).toLocaleString()}</span>
                </div>
              ))
            )}

            <div style={{ height: 14 }} />
            <div class="itemsfoot">
              <div class="fr sub"><span>Staged subtotal</span><span>{rs(pendingTotal)}</span></div>
              <div class="fr tot"><span>Order total</span><span>{rs(order.total_amount + pendingTotal)}</span></div>
            </div>
            <div class="sendbar">
              <button class="primary" disabled={busy || pending.length === 0} onClick={sendNew}>
                <Ic id="i-send" size={17} /> Send new to kitchen
              </button>
              <button class="ghost" onClick={() => requestReprint("kot")}>
                <Ic id="i-print" size={16} /> Reprint
              </button>
            </div>
          </>
        )}
        {sheetItem && <ItemSheet item={sheetItem} onClose={() => setSheetItem(null)} onAdd={(line) => { addPending(line); setSheetItem(null); }} />}
        {comboSheet && <ComboSheet combo={comboSheet} menu={menu} onClose={() => setComboSheet(null)} onAdd={(line) => { addPending(line); setComboSheet(null); }} />}
      </div>

      <div class={`opanel ${tab === "payment" ? "on" : ""}`}>
        <div class="csec open">
          <div class="ch">
            <Ic id="i-wallet" />
            <span class="ct">Payment methods</span>
          </div>
          <div class="cb">
            {order.balance_due === 0 ? (
              <p class="muted">Fully paid. {order.payments?.length ?? 0} payment(s) on record.</p>
            ) : (
              <>
                <p class="muted">Balance due: {rs(order.balance_due)}</p>
                <div class="paytiles" style={{ marginTop: 10 }}>
                  {tiles.map((m) => (
                    <button key={m.key} class={m.key === payMethod ? "on" : ""} onClick={() => { setPayMethod(m.key); setPayRef(""); }}>
                      {m.shortLabel || m.label}
                    </button>
                  ))}
                </div>
                {needRef && (
                  <input class="payfield" style={{ marginTop: 10, width: "100%" }} placeholder="Reference / auth code" value={payRef} onInput={(e) => setPayRef((e.target as HTMLInputElement).value)} />
                )}
                <button class="paycollect" disabled={busy} onClick={collectPayment}>
                  <Ic id="i-wallet" size={17} /> {busy ? "Collecting…" : `Collect ${rs(collectAmount)}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div class={`opanel ${tab === "activity" ? "on" : ""}`}>
        <ActivityTimeline events={order.events ?? []} reference={order.reference} />
      </div>

      <div class={`opanel ${tab === "actions" ? "on" : ""}`}>
        <div class="sendbar" style={{ marginTop: 0 }}>
          <button class="ghost" onClick={() => requestReprint("kot")}>
            <Ic id="i-print" size={16} /> Reprint KOT
          </button>
          <button class="ghost" onClick={() => requestReprint("receipt")}>
            <Ic id="i-print" size={16} /> Reprint receipt
          </button>
        </div>
        {!paidLocked && (
          <>
            <button class="voidallbtn" style={{ marginTop: 12 }} disabled={busy || voidableCount === 0} onClick={requestVoidAll}>
              <Ic id="i-ban" size={16} /> Void all items ({voidableCount})
            </button>
            <p class="actionhint">
              There is no order cancel. To kill a mistaken order, void every item on it — one manager PIN + one reason
              covers all of them and the order stays as an auditable, zeroed record.
            </p>
          </>
        )}
      </div>

      {pinFlow && (
        <ManagerPinModal
          title={
            pinFlow.kind === "void-item"
              ? `Void "${pinFlow.itemName}"`
              : pinFlow.kind === "void-all"
              ? `Void all items on ${order.reference}`
              : pinFlow.kind === "unlock"
              ? "Force unlock order"
              : "Manager PIN required for reprint"
          }
          subtitle={
            pinFlow.kind === "void-all"
              ? "One PIN + reason will be logged against every remaining item."
              : pinFlow.kind === "reprint"
              ? "This order has already been reprinted once — further reprints need approval."
              : undefined
          }
          reasonMode={pinFlow.kind === "void-item" || pinFlow.kind === "void-all" ? "void" : pinFlow.kind === "unlock" ? "text" : "none"}
          confirmLabel={pinFlow.kind === "void-item" || pinFlow.kind === "void-all" ? "Void" : pinFlow.kind === "unlock" ? "Unlock" : "Reprint"}
          onClose={() => setPinFlow(null)}
          onConfirm={onPinConfirmed}
        />
      )}
    </div>
  );
}

// Best-effort lookup of who authorized a given item's void, from the events
// log (items themselves only carry the reason, not the approver).
function voidAuthorizer(order: Order, itemName: string): string | null | undefined {
  const evs = (order.events ?? []).filter((e) => e.type === "item_voided" && e.summary.includes(itemName));
  return evs.length ? evs[evs.length - 1].authorizedBy : null;
}

const EVENT_ICON: Record<OrderEventType, string> = {
  created: "i-cart",
  item_added: "i-plus",
  item_fired: "i-send",
  item_voided: "i-ban",
  payment_recorded: "i-wallet",
  status_changed: "i-arrowr",
  reprinted: "i-print",
  manager_unlock: "i-unlock",
};

function fmtTime(at: number): string {
  const d = new Date(at);
  const diffMin = Math.round((Date.now() - at) / 60000);
  const rel = diffMin < 1 ? "just now" : diffMin < 60 ? `${diffMin}m ago` : diffMin < 1440 ? `${Math.round(diffMin / 60)}h ago` : d.toLocaleDateString();
  return `${rel} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// Audit trail for a single order: every sensitive/notable action, oldest
// first, with actor, manager authorization (when applicable), and whether
// the event has reconciled up to the cloud yet.
function ActivityTimeline({ events, reference }: { events: OrderEvent[]; reference: string }) {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  if (sorted.length === 0) {
    return <p class="activity-empty">No activity recorded yet for {reference}.</p>;
  }
  return (
    <div class="activity-list">
      {sorted.map((ev) => (
        <div class={`aevent type-${ev.type}`} key={ev.id}>
          <span class="aicon">
            <Ic id={EVENT_ICON[ev.type] ?? "i-dots"} size={16} />
          </span>
          <div class="abody">
            <div class="arow1">
              <span class="asummary">{ev.summary}</span>
              <span class="atime">{fmtTime(ev.at)}</span>
            </div>
            <div class="aactor">By {ev.actor}</div>
            {(ev.reason || ev.authorizedBy) && (
              <div class="aauth">
                {ev.authorizedBy && <><b>Authorized by</b> {ev.authorizedBy}. </>}
                {ev.reason && <>Reason: {ev.reason}</>}
              </div>
            )}
            <span class={`async-chip ${ev.synced ? "synced" : "pending"}`}>{ev.synced ? "Synced" : "Pending sync"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
