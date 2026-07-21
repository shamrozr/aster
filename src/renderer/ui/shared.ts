// Small helpers shared across the POS + Orders screens.
import type { CartLine } from "../types";

export const rs = (n: number) => "Rs " + Math.round(n).toLocaleString();
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const SOURCES = ["dine_in", "takeaway", "delivery", "phone"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABEL: Record<Source, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
  phone: "Phone",
};

export const STATUS_FLOW = ["pending", "preparing", "ready", "served"];

export function lineTotal(l: CartLine): number {
  const mods = l.modifiers.reduce((s, m) => s + m.priceAdjustment, 0);
  return (l.unitPrice + mods) * l.quantity;
}

// Maps a cart line to the on-the-wire item shape the local agent expects on
// /local/pos/order/create and /local/pos/order/add-item. Combo lines flatten
// their ComboSelection into the FLAT combo_* fields the agent reads
// (comboId / comboName / comboPrice / picks — see pos-repo.ts CreateOrderInput
// and addItem). The agent persists these and, on reconnect, pushes the
// structured combo up so the Dine server explodes it + depletes stock; the KOT
// shows the combo name + component picks for the kitchen. Plain lines leave the
// combo fields null → the agent treats them as a normal item (unchanged).
export function toWireItem(l: CartLine) {
  const combo = l.combo ?? null;
  return {
    menuItemId: l.menuItemId || null, // combo lines carry no menu_item_id
    variantId: l.variantId ?? null,
    name: l.name,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    modifiers: l.modifiers,
    notes: l.notes ?? null,
    comboId: combo?.comboId ?? null,
    comboName: combo?.comboName ?? null,
    comboPrice: combo?.comboPrice ?? null,
    picks: combo?.picks ?? null,
  };
}

export function roundCash(n: number, nearest: number): number {
  if (!nearest || nearest <= 0) return n;
  return Math.round(n / nearest) * nearest;
}

export function typeIcon(source: string): string {
  if (source.includes("deliver")) return "i-bike";
  if (source.includes("dine")) return "i-table";
  if (source.includes("phone")) return "i-phone";
  return "i-bag";
}

export function typeLabel(source: string): string {
  if (source.includes("deliver")) return "Delivery";
  if (source.includes("dine")) return "Dine-in";
  if (source.includes("phone")) return "Phone";
  return "Takeaway";
}
