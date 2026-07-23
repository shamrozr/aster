export interface Modifier {
  id: string;
  name: string;
  priceAdjustment: number;
  portionSizeId?: string | null;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

export interface Variant {
  id: string;
  price: number;
  comparePrice?: number | null;
  isAvailable: boolean;
  sizeId: string | null;
  sizeName: string | null;
  sizeSortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  stationId?: string | null;
  available: boolean;
  modifierGroups: ModifierGroup[];
  variants: Variant[];
  brandId?: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
  brandId?: string | null;
}

export interface Brand {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface MenuPayload {
  categories: MenuCategory[];
  brands?: Brand[];
}

export interface TableRow {
  id: string;
  name: string;
  capacity: number;
  status: string;
}

// ── Combos / deals ───────────────────────────────────────────
export interface ComboGroupItem {
  id: string;
  menuItemId: string;
  variantId: string | null;
  isDefault: boolean;
  upcharge: number;
}
export interface ComboGroup {
  id: string;
  label: string;
  items: ComboGroupItem[];
}
export interface Combo {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  brandId?: string | null;
  groups: ComboGroup[];
}

// ── Payment + order config (synced from the tenant) ──────────
export interface PaymentMethodDef {
  key: string;
  label: string;
  shortLabel: string;
  category: string;
  requiresManagerPin: boolean;
  requiresRef: boolean;
  requiresBankAccount: boolean;
  requiresStaffSelect: boolean;
  requiresWalletContact: boolean;
}
export interface PaymentConfig {
  paymentMethods: {
    enabledMethods: string[];
    cashRoundToNearest: number;
    requireRefForCard: boolean;
  } | null;
  methodDefs: PaymentMethodDef[] | null;
  orderConfig: { taxRate: number; serviceChargeRate: number; currency: string } | null;
  disabledTabs: string[] | null;
}

export interface CartModifier {
  id?: string;
  name: string;
  priceAdjustment: number;
}

// ── Structured combo payload (replaces the old `COMBO:` JSON-in-notes hack) ──
export interface ComboPick {
  groupId: string;
  menuItemId: string;
  variantId: string | null;
  upcharge: number;
  // Addons chosen for this component — these are the picked menu item's OWN
  // modifierGroups (e.g. the burger's "Extra Cheese"). Picked in the cart, not
  // in the combo builder. Flow to the agent inside `picks` so reconcile can
  // explode the combo WITH its addons and deplete their stock.
  modifiers?: CartModifier[];
}

export interface ComboSelection {
  comboId: string;
  comboName: string;
  comboPrice: number;
  picks: ComboPick[];
  quantity: number;
}

export interface CartLine {
  lineId: string; // unique — same item with different modifiers is a distinct line
  menuItemId: string;
  variantId?: string | null;
  name: string;
  unitPrice: number; // base (or variant) price; modifiers added on top
  quantity: number;
  modifiers: CartModifier[];
  comboId?: string | null;
  notes?: string | null;
  // Structured combo payload — source of truth for combo lines. `comboId`/`notes`
  // above are kept for backward compat but should not carry `COMBO:` JSON anymore.
  combo?: ComboSelection | null;
}

// ── Order kind: born-offline (OFF-...) vs continued/online (ORD-...) ────────
export type OrderKind = "offline" | "online";

export function orderKind(ref: string): OrderKind {
  return ref && ref.startsWith("OFF-") ? "offline" : "online";
}

// ── Append-only audit trail ──────────────────────────────────────────────
// Sensitive actions (void a fired item, force-unlock a locked order, reprint
// after the first) require a manager PIN + a reason, and are logged here.
// Comp, discount, and refund are disabled offline (cash-first) — no event
// types exist for them, and there is no "cancel" event: the safe way to kill
// an order is to void every item on it (logged, auditable), never delete it.
export type OrderEventType =
  | "created"
  | "item_added"
  | "item_fired"
  | "item_voided"
  | "payment_recorded"
  | "status_changed"
  | "reprinted"
  | "manager_unlock";

export interface OrderEvent {
  id: string;
  at: number;
  type: OrderEventType;
  actor: string;
  authorizedBy?: string | null; // manager who approved via PIN, when applicable
  reason?: string | null;
  summary: string;
  synced: boolean; // false until this event has reconciled up to the cloud
}

export interface Order {
  id: string;
  reference: string;
  status: string;
  source: string;
  table_id: string | null;
  guest_name: string | null;
  subtotal: number;
  tax_amount: number;
  service_charge_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_status: string;
  kitchen_status: string | null;
  created_at: number;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    kitchen_status?: string | null;
    fired?: boolean; // true = already sent to kitchen / locked from editing
    category?: string | null; // for the kitchen/category badge
    voided?: boolean; // struck-through, never removed from the order
    voidReason?: string | null;
  }>;
  payments?: Array<{ id: string; method: string; amount: number; is_refunded: number }>;
  events?: OrderEvent[];
}

// Fallback enabled set when config hasn't synced (mirrors Dine's defaultEnabled).
export const DEFAULT_ENABLED_METHODS = [
  "cash",
  "card",
  "jazzcash",
  "easypaisa",
  "bank_transfer",
  "staff_salary",
  "complimentary",
];

// The terminal's offline series code (set per install). Drives OFF-{code}-NNNNN.
export const TERMINAL_CODE = "T1";
