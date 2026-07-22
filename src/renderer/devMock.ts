// Self-contained in-memory mock of the local agent's POS surface, used only
// in dev (`npm run dev:renderer`) so the whole UI renders with no agent
// running. Never wired into a production build (MOCK is false there).
import type {
  Brand,
  Combo,
  MenuPayload,
  Order,
  OrderEvent,
  OrderEventType,
  PaymentConfig,
  TableRow,
} from "./types";
import type { AsterUser, PingResult } from "./agent";

export const MOCK: boolean = Boolean((import.meta as any).env?.DEV);

// Demo signed-in cashier — every mock mutation is attributed to this actor.
const DEMO_ACTOR = "Ali Hassan";

// Obviously-fake demo manager PINs → { ok, managerName }.
const MOCK_MANAGER_PINS: Record<string, string> = {
  "4321": "Rehan Malik",
  "1197": "Nida Farooq",
  "7788": "Owais Sheikh",
};

let nextEventSeq = 1000;

function mkEvent(
  type: OrderEventType,
  summary: string,
  opts?: { authorizedBy?: string | null; reason?: string | null; synced?: boolean; actor?: string; at?: number }
): OrderEvent {
  return {
    id: `evt-mock-${nextEventSeq++}`,
    at: opts?.at ?? Date.now(),
    type,
    actor: opts?.actor ?? DEMO_ACTOR,
    authorizedBy: opts?.authorizedBy ?? null,
    reason: opts?.reason ?? null,
    summary,
    synced: opts?.synced ?? false,
  };
}

// ── Brands ────────────────────────────────────────────────────────────────
const brands: Brand[] = [
  { id: "b1", name: "Grill Burgers", color: "#e0672a", sortOrder: 1 },
  { id: "b2", name: "Mumtaz Market", color: "#2f7fd6", sortOrder: 2 },
  { id: "b3", name: "Pizza Co", color: "#7c5cf0", sortOrder: 3 },
];

// ── Menu ─────────────────────────────────────────────────────────────────
const menu: MenuPayload = {
  brands,
  categories: [
    {
      id: "c-pizza",
      name: "Pizza",
      brandId: "b3",
      items: [
        {
          id: "i-pz-1",
          name: "Chicken Tikka Pizza",
          price: 1090,
          available: true,
          modifierGroups: [],
          variants: [
            { id: "v-pz1-s", price: 890, comparePrice: null, isAvailable: true, sizeId: "s", sizeName: "Small", sizeSortOrder: 1 },
            { id: "v-pz1-m", price: 1090, comparePrice: null, isAvailable: true, sizeId: "m", sizeName: "Medium", sizeSortOrder: 2 },
            { id: "v-pz1-l", price: 1490, comparePrice: null, isAvailable: true, sizeId: "l", sizeName: "Large", sizeSortOrder: 3 },
          ],
        },
        {
          id: "i-pz-2",
          name: "Fajita Pizza",
          price: 1150,
          available: true,
          modifierGroups: [],
          variants: [
            { id: "v-pz2-s", price: 950, comparePrice: null, isAvailable: true, sizeId: "s", sizeName: "Small", sizeSortOrder: 1 },
            { id: "v-pz2-m", price: 1150, comparePrice: null, isAvailable: true, sizeId: "m", sizeName: "Medium", sizeSortOrder: 2 },
            { id: "v-pz2-l", price: 1550, comparePrice: null, isAvailable: true, sizeId: "l", sizeName: "Large", sizeSortOrder: 3 },
          ],
        },
        {
          id: "i-pz-3",
          name: "Veggie Supreme Pizza",
          price: 990,
          available: true,
          modifierGroups: [],
          variants: [
            { id: "v-pz3-m", price: 990, comparePrice: null, isAvailable: true, sizeId: "m", sizeName: "Medium", sizeSortOrder: 2 },
            { id: "v-pz3-l", price: 1390, comparePrice: null, isAvailable: true, sizeId: "l", sizeName: "Large", sizeSortOrder: 3 },
          ],
        },
        {
          id: "i-pz-4",
          name: "Pepperoni Pizza",
          price: 1250,
          available: false,
          modifierGroups: [],
          variants: [],
        },
      ],
    },
    {
      id: "c-starters",
      name: "Starters",
      brandId: "b3",
      items: [
        { id: "i-st-1", name: "Garlic Bread", price: 390, available: true, modifierGroups: [], variants: [] },
        { id: "i-st-2", name: "Cheese Sticks", price: 450, available: true, modifierGroups: [], variants: [] },
        { id: "i-st-3", name: "Wedges", price: 350, available: true, modifierGroups: [], variants: [] },
      ],
    },
    {
      id: "c-burgers",
      name: "Burgers",
      brandId: "b1",
      items: [
        {
          id: "i-bg-1",
          name: "Zinger Burger",
          price: 590,
          available: true,
          variants: [],
          modifierGroups: [
            {
              id: "mg-bg1-extra",
              name: "Extras",
              required: false,
              multiSelect: true,
              minSelect: 0,
              maxSelect: 3,
              modifiers: [
                { id: "m-cheese", name: "Extra Cheese", priceAdjustment: 60 },
                { id: "m-mayo", name: "Extra Mayo", priceAdjustment: 30 },
                { id: "m-jalapeno", name: "Jalapenos", priceAdjustment: 40 },
              ],
            },
          ],
        },
        { id: "i-bg-2", name: "Beef Burger", price: 650, available: true, modifierGroups: [], variants: [] },
        { id: "i-bg-3", name: "Crispy Chicken Burger", price: 560, available: true, modifierGroups: [], variants: [] },
        { id: "i-bg-4", name: "Double Patty Burger", price: 850, available: true, modifierGroups: [], variants: [] },
      ],
    },
    {
      id: "c-grillburgers",
      name: "Grill Burgers",
      brandId: "b1",
      items: [
        { id: "i-gb-1", name: "Flame Grilled Beef Burger", price: 780, available: true, modifierGroups: [], variants: [] },
        { id: "i-gb-2", name: "Smoky BBQ Chicken Burger", price: 720, available: true, modifierGroups: [], variants: [] },
        { id: "i-gb-3", name: "Peri Peri Grill Burger", price: 750, available: true, modifierGroups: [], variants: [] },
      ],
    },
    {
      id: "c-sides",
      name: "Sides",
      brandId: "b1",
      items: [
        { id: "i-sd-1", name: "Fries (Regular)", price: 220, available: true, modifierGroups: [], variants: [] },
        { id: "i-sd-2", name: "Fries (Large)", price: 320, available: true, modifierGroups: [], variants: [] },
        { id: "i-sd-3", name: "Onion Rings", price: 280, available: true, modifierGroups: [], variants: [] },
        { id: "i-sd-4", name: "Coleslaw", price: 180, available: true, modifierGroups: [], variants: [] },
      ],
    },
    {
      id: "c-value",
      name: "Value Items",
      brandId: "b2",
      items: [
        { id: "i-vl-1", name: "Chicken Roll", price: 150, available: true, modifierGroups: [], variants: [] },
        { id: "i-vl-2", name: "Samosa (2 pcs)", price: 100, available: true, modifierGroups: [], variants: [] },
        { id: "i-vl-3", name: "Patty", price: 120, available: true, modifierGroups: [], variants: [] },
        { id: "i-vl-4", name: "Mini Pizza Slice", price: 180, available: false, modifierGroups: [], variants: [] },
      ],
    },
    {
      id: "c-drinks",
      name: "Drinks",
      brandId: "b2",
      items: [
        { id: "i-dr-1", name: "Coke (Regular)", price: 120, available: true, modifierGroups: [], variants: [] },
        { id: "i-dr-2", name: "Coke (1.5L)", price: 250, available: true, modifierGroups: [], variants: [] },
        { id: "i-dr-3", name: "Sprite (Regular)", price: 120, available: true, modifierGroups: [], variants: [] },
        { id: "i-dr-4", name: "Mineral Water", price: 80, available: true, modifierGroups: [], variants: [] },
        { id: "i-dr-5", name: "Fresh Lime", price: 150, available: true, modifierGroups: [], variants: [] },
      ],
    },
    {
      id: "c-addons",
      name: "Add-ons",
      brandId: "b2",
      items: [
        { id: "i-ad-1", name: "Extra Dip Sauce", price: 60, available: true, modifierGroups: [], variants: [] },
        { id: "i-ad-2", name: "Extra Cheese Slice", price: 70, available: true, modifierGroups: [], variants: [] },
        { id: "i-ad-3", name: "Garlic Mayo", price: 50, available: true, modifierGroups: [], variants: [] },
      ],
    },
  ],
};

// ── Combos ───────────────────────────────────────────────────────────────
const combos: Combo[] = [
  {
    id: "combo-1",
    name: "Zinger Deal",
    price: 850,
    groups: [
      { id: "g1", label: "Burger", items: [{ id: "gi1", menuItemId: "i-bg-1", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g2", label: "Side", items: [{ id: "gi2", menuItemId: "i-sd-1", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g3", label: "Drink", items: [{ id: "gi3", menuItemId: "i-dr-1", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
  {
    id: "combo-2",
    name: "Family Pizza Deal",
    price: 2490,
    groups: [
      { id: "g4", label: "Pizza", items: [{ id: "gi4", menuItemId: "i-pz-1", variantId: "v-pz1-l", isDefault: true, upcharge: 0 }] },
      { id: "g5", label: "Starter", items: [{ id: "gi5", menuItemId: "i-st-1", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g6", label: "Drink", items: [{ id: "gi6", menuItemId: "i-dr-2", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
  {
    id: "combo-3",
    name: "Double Burger Combo",
    price: 1050,
    groups: [
      { id: "g7", label: "Burger", items: [{ id: "gi7", menuItemId: "i-bg-4", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g8", label: "Side", items: [{ id: "gi8", menuItemId: "i-sd-2", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g9", label: "Drink", items: [{ id: "gi9", menuItemId: "i-dr-3", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
  {
    id: "combo-4",
    name: "Grill Burger Feast",
    price: 980,
    groups: [
      { id: "g10", label: "Burger", items: [{ id: "gi10", menuItemId: "i-gb-1", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g11", label: "Side", items: [{ id: "gi11", menuItemId: "i-sd-3", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
  {
    id: "combo-5",
    name: "Snack Attack",
    price: 550,
    groups: [
      { id: "g12", label: "Starter", items: [{ id: "gi12", menuItemId: "i-st-2", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g13", label: "Drink", items: [{ id: "gi13", menuItemId: "i-dr-4", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
  {
    id: "combo-6",
    name: "Personal Pizza Deal",
    price: 1090,
    groups: [
      { id: "g14", label: "Pizza", items: [{ id: "gi14", menuItemId: "i-pz-2", variantId: "v-pz2-s", isDefault: true, upcharge: 0 }, { id: "gi14b", menuItemId: "i-pz-2", variantId: "v-pz2-m", isDefault: false, upcharge: 200 }] },
      { id: "g15", label: "Drink", items: [{ id: "gi15", menuItemId: "i-dr-1", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
  {
    id: "combo-7",
    name: "Value Meal",
    price: 400,
    groups: [
      { id: "g16", label: "Item", items: [{ id: "gi16", menuItemId: "i-vl-1", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g17", label: "Drink", items: [{ id: "gi17", menuItemId: "i-dr-4", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
  {
    id: "combo-8",
    name: "Chicken Burger Combo",
    price: 890,
    groups: [
      { id: "g18", label: "Burger", items: [{ id: "gi18", menuItemId: "i-bg-3", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g19", label: "Side", items: [{ id: "gi19", menuItemId: "i-sd-1", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g20", label: "Drink", items: [{ id: "gi20", menuItemId: "i-dr-3", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
  {
    id: "combo-9",
    name: "Peri Peri Special",
    price: 1020,
    groups: [
      { id: "g21", label: "Burger", items: [{ id: "gi21", menuItemId: "i-gb-3", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g22", label: "Side", items: [{ id: "gi22", menuItemId: "i-sd-4", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g23", label: "Drink", items: [{ id: "gi23", menuItemId: "i-dr-5", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
  {
    id: "combo-10",
    name: "Big Beef Deal",
    price: 1190,
    groups: [
      { id: "g24", label: "Burger", items: [{ id: "gi24", menuItemId: "i-bg-2", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g25", label: "Side", items: [{ id: "gi25", menuItemId: "i-sd-2", variantId: null, isDefault: true, upcharge: 0 }] },
      { id: "g26", label: "Drink", items: [{ id: "gi26", menuItemId: "i-dr-2", variantId: null, isDefault: true, upcharge: 0 }] },
    ],
  },
];

// ── Tables ───────────────────────────────────────────────────────────────
const tables: TableRow[] = [
  { id: "t1", name: "T1", capacity: 2, status: "occupied" },
  { id: "t2", name: "T2", capacity: 4, status: "free" },
  { id: "t3", name: "T3", capacity: 4, status: "free" },
  { id: "t4", name: "T4", capacity: 6, status: "occupied" },
  { id: "t5", name: "T5", capacity: 2, status: "free" },
  { id: "t6", name: "T6", capacity: 8, status: "reserved" },
];

// ── Payment / order config ───────────────────────────────────────────────
const config: PaymentConfig = {
  paymentMethods: {
    enabledMethods: ["cash", "card", "jazzcash", "easypaisa", "bank_transfer", "complimentary"],
    cashRoundToNearest: 5,
    requireRefForCard: true,
  },
  methodDefs: [
    {
      key: "cash",
      label: "Cash",
      shortLabel: "Cash",
      category: "cash",
      requiresManagerPin: false,
      requiresRef: false,
      requiresBankAccount: false,
      requiresStaffSelect: false,
      requiresWalletContact: false,
    },
    {
      key: "card",
      label: "Card",
      shortLabel: "Card",
      category: "card",
      requiresManagerPin: false,
      requiresRef: true,
      requiresBankAccount: false,
      requiresStaffSelect: false,
      requiresWalletContact: false,
    },
    {
      key: "jazzcash",
      label: "JazzCash",
      shortLabel: "JazzCash",
      category: "wallet",
      requiresManagerPin: false,
      requiresRef: true,
      requiresBankAccount: false,
      requiresStaffSelect: false,
      requiresWalletContact: true,
    },
    {
      key: "easypaisa",
      label: "Easypaisa",
      shortLabel: "Easypaisa",
      category: "wallet",
      requiresManagerPin: false,
      requiresRef: true,
      requiresBankAccount: false,
      requiresStaffSelect: false,
      requiresWalletContact: true,
    },
    {
      key: "bank_transfer",
      label: "Bank Transfer",
      shortLabel: "Bank",
      category: "bank",
      requiresManagerPin: false,
      requiresRef: true,
      requiresBankAccount: true,
      requiresStaffSelect: false,
      requiresWalletContact: false,
    },
    {
      key: "complimentary",
      label: "Complimentary",
      shortLabel: "Comp",
      category: "comp",
      requiresManagerPin: true,
      requiresRef: false,
      requiresBankAccount: false,
      requiresStaffSelect: false,
      requiresWalletContact: false,
    },
  ],
  orderConfig: { taxRate: 16, serviceChargeRate: 5, currency: "PKR" },
  disabledTabs: [],
};

// ── Orders (mutable in-memory dataset) ──────────────────────────────────
const now = Date.now();
const hoursAgo = (h: number) => now - h * 60 * 60 * 1000;

let orders: Order[] = [
  {
    id: "ord-1",
    reference: "ORD-02131",
    status: "open",
    source: "dine_in",
    table_id: "t1",
    guest_name: "Bilal Ahmed",
    subtotal: 1500,
    tax_amount: 240,
    service_charge_amount: 75,
    discount_amount: 0,
    total_amount: 1815,
    paid_amount: 0,
    balance_due: 1815,
    payment_status: "unpaid",
    kitchen_status: "preparing",
    created_at: hoursAgo(1.5),
    items: [
      { id: "it-1", name: "Zinger Burger", quantity: 2, unit_price: 590, total_price: 1180, kitchen_status: "preparing", fired: true, category: "Burgers" },
      { id: "it-2", name: "Fries (Regular)", quantity: 1, unit_price: 220, total_price: 220, kitchen_status: "preparing", fired: true, category: "Sides" },
      { id: "it-3", name: "Coke (Regular)", quantity: 1, unit_price: 120, total_price: 120, kitchen_status: "ready", fired: true, category: "Drinks" },
    ],
    payments: [],
    events: [
      mkEvent("created", "Order opened for Table T1 (Bilal Ahmed)", { at: hoursAgo(1.5), synced: true }),
      mkEvent("item_added", "Added 2x Zinger Burger, 1x Fries (Regular), 1x Coke (Regular)", { at: hoursAgo(1.48), synced: true }),
      mkEvent("item_fired", "Sent 3 line(s) to kitchen", { at: hoursAgo(1.47), synced: true }),
    ],
  },
  {
    id: "ord-2",
    reference: "OFF-T1-010",
    status: "open",
    source: "takeaway",
    table_id: null,
    guest_name: "Sana Malik",
    subtotal: 890,
    tax_amount: 142,
    service_charge_amount: 0,
    discount_amount: 0,
    total_amount: 1032,
    paid_amount: 0,
    balance_due: 1032,
    payment_status: "unpaid",
    kitchen_status: "pending",
    created_at: hoursAgo(0.3),
    items: [
      { id: "it-4", name: "Fajita Pizza (Small)", quantity: 1, unit_price: 950, total_price: 950, kitchen_status: "pending", fired: true, category: "Pizza" },
    ],
    payments: [],
    events: [
      mkEvent("created", "Offline order opened (takeaway, Sana Malik)", { at: hoursAgo(0.3), synced: false }),
      mkEvent("item_added", "Added 1x Fajita Pizza (Small)", { at: hoursAgo(0.29), synced: false }),
      mkEvent("item_fired", "Sent 1 line(s) to kitchen", { at: hoursAgo(0.28), synced: false }),
    ],
  },
  {
    id: "ord-3",
    reference: "ORD-02128",
    status: "closed",
    source: "dine_in",
    table_id: "t4",
    guest_name: "Usman Tariq",
    subtotal: 2490,
    tax_amount: 398,
    service_charge_amount: 125,
    discount_amount: 0,
    total_amount: 3013,
    paid_amount: 3013,
    balance_due: 0,
    payment_status: "paid",
    kitchen_status: "served",
    created_at: hoursAgo(3),
    items: [
      { id: "it-5", name: "Chicken Tikka Pizza (Large)", quantity: 1, unit_price: 1490, total_price: 1490, kitchen_status: "served", fired: true, category: "Pizza" },
      { id: "it-6", name: "Garlic Bread", quantity: 1, unit_price: 390, total_price: 390, kitchen_status: "served", fired: true, category: "Starters" },
      { id: "it-7", name: "Coke (1.5L)", quantity: 1, unit_price: 250, total_price: 250, kitchen_status: "served", fired: true, category: "Drinks" },
      { id: "it-8", name: "Onion Rings", quantity: 1, unit_price: 280, total_price: 280, kitchen_status: "served", fired: true, category: "Sides" },
    ],
    payments: [{ id: "pay-1", method: "card", amount: 3013, is_refunded: 0 }],
    events: [
      mkEvent("created", "Order opened for Table T4 (Usman Tariq)", { at: hoursAgo(3), synced: true }),
      mkEvent("item_added", "Added 4 line(s): pizza, starter, drink, side", { at: hoursAgo(2.95), synced: true }),
      mkEvent("item_fired", "Sent 4 line(s) to kitchen", { at: hoursAgo(2.9), synced: true }),
      mkEvent("payment_recorded", "Card payment recorded: Rs. 3013", { at: hoursAgo(2.2), synced: true }),
      mkEvent("status_changed", "Order closed — served & paid", { at: hoursAgo(2.2), synced: true }),
    ],
  },
  {
    id: "ord-4",
    reference: "OFF-T1-009",
    status: "closed",
    source: "phone",
    table_id: null,
    guest_name: "Ayesha Noor",
    subtotal: 780,
    tax_amount: 125,
    service_charge_amount: 0,
    discount_amount: 0,
    total_amount: 905,
    paid_amount: 905,
    balance_due: 0,
    payment_status: "paid",
    kitchen_status: "served",
    created_at: hoursAgo(4),
    items: [
      { id: "it-9", name: "Flame Grilled Beef Burger", quantity: 1, unit_price: 780, total_price: 780, kitchen_status: "served", fired: true, category: "Grill Burgers" },
    ],
    payments: [{ id: "pay-2", method: "cash", amount: 905, is_refunded: 0 }],
    events: [
      mkEvent("created", "Offline order opened (phone, Ayesha Noor)", { at: hoursAgo(4), synced: false }),
      mkEvent("item_added", "Added 1x Flame Grilled Beef Burger", { at: hoursAgo(3.98), synced: false }),
      mkEvent("item_fired", "Sent 1 line(s) to kitchen", { at: hoursAgo(3.97), synced: false }),
      mkEvent("payment_recorded", "Cash payment recorded: Rs. 905", { at: hoursAgo(3.5), synced: false }),
      mkEvent("status_changed", "Order closed — served & paid", { at: hoursAgo(3.5), synced: false }),
    ],
  },
  {
    id: "ord-5",
    reference: "ORD-02135",
    status: "open",
    source: "delivery",
    table_id: null,
    guest_name: "Hamza Sheikh",
    subtotal: 1340,
    tax_amount: 214,
    service_charge_amount: 0,
    discount_amount: 0,
    total_amount: 1554,
    paid_amount: 0,
    balance_due: 1554,
    payment_status: "unpaid",
    kitchen_status: "pending",
    created_at: hoursAgo(0.1),
    items: [
      { id: "it-10", name: "Double Patty Burger", quantity: 1, unit_price: 850, total_price: 850, kitchen_status: "pending", fired: true, category: "Burgers" },
      { id: "it-11", name: "Fries (Large)", quantity: 1, unit_price: 320, total_price: 320, kitchen_status: "pending", fired: true, category: "Sides" },
      { id: "it-12", name: "Mineral Water", quantity: 2, unit_price: 80, total_price: 160, kitchen_status: "pending", fired: true, category: "Drinks" },
    ],
    payments: [],
    events: [
      mkEvent("created", "Order opened (delivery, Hamza Sheikh)", { at: hoursAgo(0.1), synced: true }),
      mkEvent("item_added", "Added 3 line(s): burger, side, drinks", { at: hoursAgo(0.09), synced: true }),
      mkEvent("item_fired", "Sent 3 line(s) to kitchen", { at: hoursAgo(0.08), synced: true }),
    ],
  },
  {
    // Cancel no longer exists — the safe way to kill an order is to void
    // every item on it (logged, auditable via a manager_unlock + item_voided
    // trail), never delete it. Balance stays 0; nothing was ever collected.
    id: "ord-6",
    reference: "OFF-T1-011",
    status: "voided",
    source: "dine_in",
    table_id: "t2",
    guest_name: "Fatima Riaz",
    subtotal: 0,
    tax_amount: 0,
    service_charge_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    paid_amount: 0,
    balance_due: 0,
    payment_status: "unpaid",
    kitchen_status: "cancelled",
    created_at: hoursAgo(2),
    items: [
      { id: "it-13", name: "Wedges", quantity: 1, unit_price: 350, total_price: 350, kitchen_status: "cancelled", fired: true, category: "Starters", voided: true, voidReason: "Guest left before order was fired to kitchen — table walked" },
      { id: "it-14", name: "Mineral Water", quantity: 1, unit_price: 80, total_price: 80, kitchen_status: "cancelled", fired: true, category: "Drinks", voided: true, voidReason: "Guest left before order was fired to kitchen — table walked" },
    ],
    payments: [],
    events: [
      mkEvent("created", "Order opened for Table T2 (Fatima Riaz)", { at: hoursAgo(2), synced: false }),
      mkEvent("item_added", "Added 1x Wedges, 1x Mineral Water", { at: hoursAgo(1.98), synced: false }),
      mkEvent("item_fired", "Sent 2 line(s) to kitchen", { at: hoursAgo(1.97), synced: false }),
      mkEvent("manager_unlock", "Order unlocked for correction — guest walked before order was served", {
        at: hoursAgo(1.9),
        authorizedBy: "Rehan Malik",
        reason: "Guest left before order was fired to kitchen — table walked",
        synced: false,
      }),
      mkEvent("item_voided", "Voided 1x Wedges", {
        at: hoursAgo(1.89),
        authorizedBy: "Rehan Malik",
        reason: "Guest left before order was fired to kitchen — table walked",
        synced: false,
      }),
      mkEvent("item_voided", "Voided 1x Mineral Water", {
        at: hoursAgo(1.88),
        authorizedBy: "Rehan Malik",
        reason: "Guest left before order was fired to kitchen — table walked",
        synced: false,
      }),
      mkEvent("status_changed", "Order closed — all items voided, no payment collected", { at: hoursAgo(1.87), synced: false }),
    ],
  },
];

let nextItemSeq = 100;
let nextOffSeq = 12;

function recompute(o: Order) {
  const items = o.items ?? [];
  const subtotal = items.reduce((s, it) => s + it.total_price, 0);
  const taxRate = config.orderConfig?.taxRate ?? 0;
  const svcRate = config.orderConfig?.serviceChargeRate ?? 0;
  o.subtotal = subtotal;
  o.tax_amount = Math.round((subtotal * taxRate) / 100);
  o.service_charge_amount = o.table_id ? Math.round((subtotal * svcRate) / 100) : 0;
  o.total_amount = subtotal + o.tax_amount + o.service_charge_amount - o.discount_amount;
  o.balance_due = Math.max(0, o.total_amount - o.paid_amount);
  o.payment_status = o.balance_due === 0 && o.total_amount > 0 ? "paid" : o.paid_amount > 0 ? "partial" : "unpaid";
}

// ── Mock async surface ──────────────────────────────────────────────────
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export async function mockPing(): Promise<PingResult> {
  await delay(60);
  return { ok: true, version: "mock" };
}

export async function mockLogin(
  _email: string,
  _password: string
): Promise<{ ok: boolean; token?: string; user?: AsterUser; error?: string }> {
  await delay(150);
  return {
    ok: true,
    token: "mock-token",
    user: { userId: "u1", name: DEMO_ACTOR, role: "cashier", allowedRoutes: [] },
  };
}

export const mockPos = {
  menu: async (): Promise<MenuPayload> => {
    await delay();
    return menu;
  },
  brands: async (): Promise<Brand[]> => {
    await delay();
    return brands;
  },
  tables: async (): Promise<TableRow[]> => {
    await delay();
    return tables;
  },
  combos: async (): Promise<Combo[]> => {
    await delay();
    return combos;
  },
  config: async (): Promise<PaymentConfig> => {
    await delay();
    return config;
  },
  orders: async (): Promise<Order[]> => {
    await delay();
    return orders;
  },
  openOrders: async (): Promise<Order[]> => {
    await delay();
    return orders.filter((o) => o.status === "open");
  },
  order: async (orderId: string): Promise<Order> => {
    await delay();
    const found = orders.find((o) => o.id === orderId);
    if (!found) throw new Error("Order not found");
    return found;
  },
  create: async (payload: any): Promise<Order> => {
    await delay(200);
    const items = (payload?.items ?? []).map((it: any, idx: number) => ({
      id: `it-mock-${nextItemSeq++}`,
      name: it.name ?? it.comboName ?? "Item",
      quantity: it.quantity ?? 1,
      unit_price: it.unitPrice ?? it.comboPrice ?? 0,
      total_price: (it.unitPrice ?? it.comboPrice ?? 0) * (it.quantity ?? 1),
      kitchen_status: "pending",
      fired: true,
      category: it.category ?? null,
    }));
    const ref = `OFF-T1-${String(nextOffSeq++).padStart(3, "0")}`;
    const o: Order = {
      id: `ord-mock-${ref}`,
      reference: ref,
      status: "open",
      source: payload?.source ?? "dine_in",
      table_id: payload?.tableId ?? null,
      guest_name: payload?.guestName ?? null,
      subtotal: 0,
      tax_amount: 0,
      service_charge_amount: 0,
      discount_amount: 0,
      total_amount: 0,
      paid_amount: 0,
      balance_due: 0,
      payment_status: "unpaid",
      kitchen_status: "pending",
      created_at: Date.now(),
      items,
      payments: [],
    };
    recompute(o);
    o.events = [mkEvent("created", `Offline order opened (${o.source}${o.guest_name ? ", " + o.guest_name : ""})`)];
    if (items.length) {
      o.events.push(mkEvent("item_added", `Added ${items.length} line(s)`));
      o.events.push(mkEvent("item_fired", `Sent ${items.length} line(s) to kitchen`));
    }
    orders = [o, ...orders];
    return o;
  },
  addItems: async (orderId: string, items: any[]): Promise<Order> => {
    await delay(200);
    const o = orders.find((x) => x.id === orderId);
    if (!o) throw new Error("Order not found");
    const newItems = (items ?? []).map((it: any) => ({
      id: `it-mock-${nextItemSeq++}`,
      name: it.name ?? it.comboName ?? "Item",
      quantity: it.quantity ?? 1,
      unit_price: it.unitPrice ?? it.comboPrice ?? 0,
      total_price: (it.unitPrice ?? it.comboPrice ?? 0) * (it.quantity ?? 1),
      kitchen_status: "pending",
      fired: true,
      category: it.category ?? null,
    }));
    o.items = [...(o.items ?? []), ...newItems];
    recompute(o);
    o.events = [...(o.events ?? []), mkEvent("item_added", `Added ${newItems.length} line(s)`)];
    o.events.push(mkEvent("item_fired", `Sent ${newItems.length} line(s) to kitchen`));
    return o;
  },
  pay: async (orderId: string, method: string, amount: number, note?: string): Promise<Order> => {
    await delay(200);
    const o = orders.find((x) => x.id === orderId);
    if (!o) throw new Error("Order not found");
    o.paid_amount += amount;
    o.payments = [...(o.payments ?? []), { id: `pay-mock-${Date.now()}`, method, amount, is_refunded: 0 }];
    recompute(o);
    o.events = [
      ...(o.events ?? []),
      mkEvent("payment_recorded", `${method} payment recorded: Rs. ${amount}${note ? ` (${note})` : ""}`),
    ];
    if (o.balance_due === 0) {
      o.status = "closed";
      o.kitchen_status = o.kitchen_status === "cancelled" ? o.kitchen_status : "served";
      o.events.push(mkEvent("status_changed", "Order closed — fully paid"));
    }
    return o;
  },
  setStatus: async (orderId: string, status: string): Promise<Order> => {
    await delay(120);
    const o = orders.find((x) => x.id === orderId);
    if (!o) throw new Error("Order not found");
    o.kitchen_status = status;
    o.events = [...(o.events ?? []), mkEvent("status_changed", `Kitchen status changed to "${status}"`)];
    return o;
  },
  // First reprint of an order is free; a subsequent reprint requires a valid
  // manager PIN. Every reprint appends a `reprinted` event.
  reprint: async (orderId: string, kind: "kot" | "receipt", managerPin?: string): Promise<{ ok: true }> => {
    await delay(150);
    const o = orders.find((x) => x.id === orderId);
    if (!o) throw new Error("Order not found");
    const alreadyReprinted = (o.events ?? []).some((e) => e.type === "reprinted");
    let manager: string | undefined;
    if (alreadyReprinted) {
      manager = managerPin ? MOCK_MANAGER_PINS[managerPin] : undefined;
      if (!manager) throw new Error("Manager PIN required for subsequent reprints");
    }
    o.events = [
      ...(o.events ?? []),
      mkEvent("reprinted", `Reprinted ${kind.toUpperCase()}`, { authorizedBy: manager ?? null }),
    ];
    return { ok: true };
  },
};
