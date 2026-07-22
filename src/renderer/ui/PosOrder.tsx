import { useEffect, useMemo, useState } from "preact/hooks";
import { pos } from "../agent";
import {
  TERMINAL_CODE,
  type CartLine,
  type Combo,
  type MenuItem,
  type MenuPayload,
  type PaymentConfig,
  type TableRow,
} from "../types";
import { Ic } from "./icons";
import { ItemSheet } from "./ItemSheet";
import { ComboSheet } from "./ComboSheet";
import { lineTotal, rs, SOURCE_LABEL, SOURCES, toWireItem, uid, type Source } from "./shared";
import type { AsterUser } from "../agent";

export function PosOrder({
  user,
  initialSource,
  onClose,
  onOrderPlaced,
}: {
  user: AsterUser;
  initialSource: Source;
  onClose: () => void;
  onOrderPlaced: () => void;
}) {
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);

  const [source, setSource] = useState<Source>(initialSource);
  const [tablesMode, setTablesMode] = useState(false);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [tableId, setTableId] = useState<string | null>(null);
  const [tablePicker, setTablePicker] = useState(false);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestEditing, setGuestEditing] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  // Placing fires the order WITHOUT taking payment — we just show a short
  // confirmation (the reference) and reset for the next order. Payment is
  // collected later from the Orders detail screen, never here.
  const [justPlaced, setJustPlaced] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);
  const [comboSheet, setComboSheet] = useState<Combo | null>(null);

  useEffect(() => {
    pos.menu().then(setMenu).catch((e) => setErr(e.message));
    pos.combos().then(setCombos).catch(() => {});
    pos.config().then(setConfig).catch(() => {});
    pos.tables().then(setTables).catch(() => {});
  }, []);

  const brands = menu?.brands ?? [];
  const categories = useMemo(
    () => (menu?.categories ?? []).filter((c) => brandFilter === "all" || c.brandId === brandFilter),
    [menu, brandFilter]
  );
  const items: MenuItem[] = useMemo(() => {
    if (catFilter === "deals") return [];
    const pool = catFilter === "all" ? categories.flatMap((c) => c.items) : categories.find((c) => c.id === catFilter)?.items ?? [];
    if (!search.trim()) return pool;
    const q = search.trim().toLowerCase();
    return pool.filter((it) => it.name.toLowerCase().includes(q));
  }, [categories, catFilter, search]);
  // Deals respect the brand filter too (a combo carries its own brand).
  const visibleCombos = useMemo(
    () => combos.filter((c) => brandFilter === "all" || c.brandId === brandFilter),
    [combos, brandFilter]
  );

  const tableName = tables.find((t) => t.id === tableId)?.name ?? null;
  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0);
  const taxRate = config?.orderConfig?.taxRate ?? 0;
  const scRate = config?.orderConfig?.serviceChargeRate ?? 0;
  const tax = Math.round((subtotal * taxRate) / 100);
  const sc = Math.round((subtotal * scRate) / 100);
  const total = subtotal + tax + sc;

  function addLine(line: CartLine) {
    setCart((c) => {
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
    if (!it.available) return;
    if ((it.variants?.length ?? 0) > 0 || (it.modifierGroups?.length ?? 0) > 0) {
      setSheetItem(it);
    } else {
      addLine({ lineId: uid(), menuItemId: it.id, name: it.name, unitPrice: it.price, quantity: 1, modifiers: [] });
    }
  }
  function setQty(lineId: string, q: number) {
    setCart((c) => (q <= 0 ? c.filter((l) => l.lineId !== lineId) : c.map((l) => (l.lineId === lineId ? { ...l, quantity: q } : l))));
  }
  function resetDraft() {
    setCart([]); setErr(null); setJustPlaced(null);
  }

  async function place() {
    setBusy(true); setErr(null);
    try {
      const order = await pos.create({
        terminalCode: TERMINAL_CODE,
        source,
        tableId,
        guestName: guestQuery.trim() || null,
        taxRate,
        serviceChargeRate: scRate,
        items: cart.map(toWireItem),
      });
      setJustPlaced(order.reference);
      setCart([]);
      onOrderPlaced();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  return (
    <div class="posorder">
      <div class="pos-top">
        <div class="segbox">
          <button class={!tablesMode ? "on" : ""} onClick={() => setTablesMode(false)}>
            <Ic id="i-cart" size={15} /> Order
          </button>
          <button class={tablesMode ? "on" : ""} onClick={() => setTablesMode(true)}>
            <Ic id="i-table" size={15} /> Tables
          </button>
        </div>
        <div class="srcbox">
          {SOURCES.map((s) => (
            <button key={s} class={s === source ? "on" : ""} onClick={() => setSource(s)}>
              {SOURCE_LABEL[s]}
            </button>
          ))}
        </div>
        <div class="draftchip">
          <div class="dt">
            <b>Draft 1</b>
            <span>{cart.length} item{cart.length === 1 ? "" : "s"}</span>
          </div>
          <button class="dx" aria-label="Close draft" onClick={onClose}>
            <Ic id="i-x" size={15} />
          </button>
        </div>
        <button class="draftadd" aria-label="New draft" onClick={resetDraft}>
          <Ic id="i-plus" size={16} />
        </button>
        <div style={{ position: "relative" }}>
          <button class="pilltop" onClick={() => setTablePicker((v) => !v)}>
            <Ic id="i-table" /> {tableName ?? "Select Table"} <Ic id="i-chevdown" size={14} />
          </button>
          {tablePicker && (
            <div class="sheet-bg" onClick={() => setTablePicker(false)}>
              <div class="sheet" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
                <h3>Select table</h3>
                <div class="opts">
                  <button class={!tableId ? "opt on" : "opt"} onClick={() => { setTableId(null); setTablePicker(false); }}>
                    No table
                  </button>
                  {tables.map((t) => (
                    <button key={t.id} class={t.id === tableId ? "opt on" : "opt"} onClick={() => { setTableId(t.id); setTablePicker(false); }}>
                      {t.name} ({t.status})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {guestEditing ? (
          <div class="pilltop wide">
            <Ic id="i-user" />
            <input
              autoFocus
              placeholder="Guest name / phone"
              value={guestQuery}
              onInput={(e) => setGuestQuery((e.target as HTMLInputElement).value)}
              onBlur={() => setGuestEditing(false)}
            />
          </div>
        ) : (
          <button class="pilltop wide" onClick={() => setGuestEditing(true)}>
            <Ic id="i-user" /> {guestQuery || "Guest name / phone"}
          </button>
        )}
        <button class={searchOpen ? "icobtn on" : "icobtn"} aria-label="Search" onClick={() => setSearchOpen((v) => !v)}>
          <Ic id="i-search" size={17} />
        </button>
        <button class="icobtn" aria-label="More">
          <Ic id="i-dots" size={17} />
        </button>
      </div>

      {searchOpen && (
        <div class="searchbar" style={{ margin: "10px 16px 0" }}>
          <Ic id="i-search" />
          <input autoFocus placeholder="Search items…" value={search} onInput={(e) => setSearch((e.target as HTMLInputElement).value)} />
        </div>
      )}

      <div class="pos-body">
        <div class="pos-left">
          {tablesMode ? (
            <div class="itemgrid">
              {tables.map((t) => (
                <button
                  key={t.id}
                  class="itile"
                  onClick={() => { setTableId(t.id); setSource("dine_in"); setTablesMode(false); }}
                >
                  <span class="iname">{t.name}</span>
                  <span class="iprice">{t.capacity} seats · {t.status}</span>
                </button>
              ))}
              {tables.length === 0 && <p class="empty-note">No tables synced.</p>}
            </div>
          ) : (
            <>
              <div class="brandtabs">
                <span class="bl">Brand</span>
                <button class={brandFilter === "all" ? "on" : ""} onClick={() => setBrandFilter("all")}>
                  All brands
                </button>
                {brands.map((b) => (
                  <button key={b.id} class={brandFilter === b.id ? "on" : ""} onClick={() => setBrandFilter(b.id)}>
                    <span class="swatch" style={{ background: b.color }} /> {b.name}
                  </button>
                ))}
              </div>
              <div class="cattabs">
                <button class={catFilter === "all" ? "on" : ""} onClick={() => setCatFilter("all")}>
                  All Items
                </button>
                {categories.map((c) => (
                  <button key={c.id} class={catFilter === c.id ? "on" : ""} onClick={() => setCatFilter(c.id)}>
                    {c.name} · {c.items.length}
                  </button>
                ))}
                {visibleCombos.length > 0 && (
                  <button class={catFilter === "deals" ? "deals on" : "deals"} onClick={() => setCatFilter("deals")}>
                    <Ic id="i-tag" size={13} /> Deals · {visibleCombos.length}
                  </button>
                )}
              </div>

              <div class="itemgrid">
                {catFilter === "deals"
                  ? visibleCombos.map((cb) => (
                      <button key={cb.id} class="itile combo" onClick={() => setComboSheet(cb)}>
                        <span class="iname">{cb.name}</span>
                        <span class="iprice">{rs(cb.price)}</span>
                        <span class="ibadges">
                          <span class="ibadge2 combo">Deal</span>
                        </span>
                      </button>
                    ))
                  : items.map((it) => (
                      <button key={it.id} class="itile" disabled={!it.available} onClick={() => onItemTap(it)}>
                        <span class="iname">{it.name}</span>
                        <span class="iprice">
                          {it.variants?.length ? "from " : ""}
                          {rs(it.variants?.length ? Math.min(...it.variants.map((v) => v.price)) : it.price)}
                        </span>
                        <span class="ibadges">
                          {(it.modifierGroups?.length ?? 0) > 0 && <span class="ibadge2">options</span>}
                          {!it.available && <span class="ibadge2 off">86'd</span>}
                        </span>
                      </button>
                    ))}
                {menu && catFilter !== "deals" && items.length === 0 && <p class="empty-note">No items match.</p>}
              </div>
            </>
          )}
        </div>

        <aside class="pos-right">
          {justPlaced && (
            <div
              class="placed-banner"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", margin: "0 0 10px", background: "rgba(34,197,94,.12)", color: "#16a34a", borderRadius: 10, fontSize: 13, fontWeight: 600 }}
            >
              <Ic id="i-check" size={16} />
              <span style={{ flex: 1 }}>
                Order <b>{justPlaced}</b> sent to kitchen. Collect payment from <b>Orders</b> when the guest pays.
              </span>
              <button class="link" onClick={() => setJustPlaced(null)}>
                Dismiss
              </button>
            </div>
          )}
              <div class="shiftbanner">
                <div class="sr">
                  <Ic id="i-clock" />
                  <span>
                    Cash sales tracked on <b>{user.name}</b>'s terminal
                  </span>
                </div>
                <div class="ring">
                  <span class="rl">
                    Ring
                    <br />
                    into
                  </span>
                  <select>
                    <option>{user.name} · Counter — here</option>
                  </select>
                </div>
              </div>
              <div class="curorder">
                <h3>Current Order</h3>
                <span class="dinebadge">{SOURCE_LABEL[source]}</span>
              </div>
              <div class="phonesearch">
                <Ic id="i-phone" />
                <input placeholder="Search by phone or name…" value={guestQuery} onInput={(e) => setGuestQuery((e.target as HTMLInputElement).value)} />
              </div>
              {cart.length === 0 ? (
                <div class="cart-empty">
                  <div class="ce">
                    <Ic id="i-cart" />
                  </div>
                  <p>Add items from the menu</p>
                </div>
              ) : (
                <>
                  <div class="cartlines">
                    {cart.map((l) => (
                      <div class="cartline" key={l.lineId}>
                        <div class="cl-top">
                          <span class="cl-name">{l.name}</span>
                          <span class="cl-total">{rs(lineTotal(l))}</span>
                        </div>
                        {l.modifiers.length > 0 && <div class="cl-mods">{l.modifiers.map((m) => m.name).join(", ")}</div>}
                        <div class="cl-bottom">
                          <span class="qtystep">
                            <button onClick={() => setQty(l.lineId, l.quantity - 1)}>−</button>
                            <span>{l.quantity}</span>
                            <button onClick={() => setQty(l.lineId, l.quantity + 1)}>+</button>
                          </span>
                          <button class="cl-remove" onClick={() => setQty(l.lineId, 0)}>
                            remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div class="carttotals">
                    <div class="tr">
                      <span>Subtotal</span>
                      <span>{rs(subtotal)}</span>
                    </div>
                    {tax > 0 && (
                      <div class="tr">
                        <span>Tax {taxRate}%</span>
                        <span>{rs(tax)}</span>
                      </div>
                    )}
                    {sc > 0 && (
                      <div class="tr">
                        <span>Service {scRate}%</span>
                        <span>{rs(sc)}</span>
                      </div>
                    )}
                    <div class="tr big">
                      <span>Total</span>
                      <span>{rs(total)}</span>
                    </div>
                  </div>
                  <div class="cartfoot">
                    {err && <p class="cart-err">{err}</p>}
                    <button class="primary" disabled={busy || cart.length === 0} onClick={place}>
                      {busy ? "Placing…" : "Place order"}
                    </button>
                  </div>
                </>
              )}
        </aside>
      </div>

      {sheetItem && <ItemSheet item={sheetItem} onClose={() => setSheetItem(null)} onAdd={(line) => { addLine(line); setSheetItem(null); }} />}
      {comboSheet && <ComboSheet combo={comboSheet} menu={menu} onClose={() => setComboSheet(null)} onAdd={(line) => { addLine(line); setComboSheet(null); }} />}
    </div>
  );
}
