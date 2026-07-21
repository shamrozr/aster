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
