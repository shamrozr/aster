# Aster — Emergency Offline Execution Plan (thin POS UI)

> Master plan + shared contract live in
> `../Kliovo-Dine/docs/offline/EMERGENCY-OFFLINE-MASTER-PLAN.md`. Read it first.
> Aster is the **disguised, thin** emergency POS UI. It holds **no cloud keys and
> no DB** — it talks only to the Kliovo Agent on `127.0.0.1:6310`. Keep it dumb.

## Role (locked)
- UI only: login → menu/cart → pay → orders. All logic + data live in the Agent.
- Never touches printers, never talks to the cloud, never manages shifts.
- Preview cart totals client-side; the Agent's `order-core` is the source of truth.

## Current state (verified)
- `src/renderer/pos.tsx` — POS screens (menu/cart/pay/orders) + `ComboSheet`.
- `src/renderer/agent.ts` — `AGENT = http://127.0.0.1:6310`; `pos.create/pay/setStatus`.
- **Combo bug:** a combo is added as a **single cart line with `COMBO:` JSON in the
  notes field** (`pos.tsx` ~line 371), not as structured data. Must change.
- **No cancel/void buttons** (Agent has the endpoints; UI doesn't use them).
- **No reprint buttons.** **No table occupy/free.** No shift UI (correct — none needed).

## P0 tasks

### 1. Structured combo payload (fix the bug)
File: `src/renderer/pos.tsx`, `src/renderer/agent.ts`, `src/renderer/types.ts`.
- When a combo is added, put it in the order payload as **structured data** per the
  contract: `{ comboId, comboName, comboPrice, picks: [{ groupId, menuItemId, variantId, upcharge }], quantity }`.
- Stop stuffing `COMBO:` JSON into `notes`. The Agent renders the KOT from this and
  the server explodes it on reconcile.

### 2. Fire on send
File: `src/renderer/pos.tsx`, `src/renderer/agent.ts`.
- "Send to kitchen" / "Place order" calls the Agent's fire endpoint so the KOT +
  receipt print automatically (Agent side). Adding items to a running order fires
  **only the new items**.

### 2b. Continue a running (online) tab — NEW, P0b
The customer's tab may have been opened ONLINE before the outage. Aster must let
staff pick it up and pay it, not just ring new orders.
- Show **open tabs** (loaded from the Agent's mirror — open `ORD-xxxx` orders that
  came down in the snapshot), e.g. by table.
- Opening one loads its existing items. Adding items / taking payment / closing it
  edits **that existing order by its id** (the Agent logs the ops against
  `ORD-xxxx`, not a new `OFF-`). Aster does not need to know create-vs-merge — it
  just edits the loaded order; the Agent + server handle born-offline vs continued.
- Fire incremental KOTs for added items; print the receipt on payment (Agent side).

## P1 tasks

### 3. Cancel / void UI
File: `src/renderer/pos.tsx`, `src/renderer/agent.ts`.
- Add cancel-order and void-item buttons wired to the Agent's existing
  `/local/pos/order/void-item` (+ a new cancel-order op).

### 4. Table functions
File: `src/renderer/pos.tsx`.
- Assign an order to a table; mark tables occupied/free. State flows to the Agent
  (and syncs up with the order).

### 5. Reprint buttons
- Reprint receipt / reprint KOT → call the Agent's `/local/print/reprint`.

## Keep it lean (hard rules from Aster's CLAUDE.md)
- No "Kliovo"/"offline"/"POS" in any shipped artifact (disguise).
- No cloud credentials, ever. Only `http://127.0.0.1:6310`.
- No business-logic duplication — totals preview only; Agent is authoritative.
- Plain CSS, Preact, no heavy frameworks.

## Testing
- Run the Agent locally (pointed at a local Dine). `ASTER_DEV_URL` dev flow.
- Ring a combo + a normal item, add an item to the running order, pay → confirm the
  Agent prints a routed KOT (combo components visible) + receipt, and the pushed
  payload carries **structured combo data** (no `COMBO:` notes). Cancel/void +
  reprint behave. Confirm Aster still holds no keys.
