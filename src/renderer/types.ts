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
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface MenuPayload {
  categories: MenuCategory[];
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
  items?: Array<{ id: string; name: string; quantity: number; unit_price: number; total_price: number }>;
  payments?: Array<{ id: string; method: string; amount: number; is_refunded: number }>;
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
