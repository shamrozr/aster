export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  stationId?: string | null;
  available: boolean;
  modifierGroups: unknown[];
  variants: unknown[];
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

export interface CartLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
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

// The terminal's offline series code (set per install). Drives OFF-{code}-NNNNN.
export const TERMINAL_CODE = "T1";
