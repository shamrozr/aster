# Aster — CLAUDE.md

> **Aster is the disguised offline POS desktop app for the Kliovo Dine ecosystem.**
> It is intentionally **not branded "Kliovo"** anywhere a customer or attacker can
> see it (product name, installer, app id, window title, install path, process).
> The disguise is a security measure: this app is the one that talks to the
> encrypted local database + staff credentials, so it must not advertise what it is.

---

## What Aster is

A tiny **Preact + Vite** SPA packaged in **Electron**. When a restaurant's internet
drops, staff open Aster and keep taking orders. It is a **thin client**: it holds
**no cloud keys and no database key**. All data and order logic live in the
**Kliovo Print Agent** (a separate app already installed for printing), which owns
the encrypted local SQLite store on `127.0.0.1`.

```
Aster (this app)  ──HTTP, localhost only──►  Kliovo Print Agent (127.0.0.1:6310)
   thin Preact UI                               owns encrypted SQLite (SQLCipher)
   no keys, no DB                               runs order logic (order-core)
                                                exposes /local/* API
                                                the web mirrors warm data into it
```

- Aster never talks to the cloud. The **web (Kliovo Dine)** is the only thing that
  syncs local↔cloud, driven manually by the user (reconciliation screen).
- Aster authenticates by **offline login**: it POSTs email/password to the agent's
  `/local/auth`, which verifies against the mirrored users table and returns a
  local session token. (Not the web's pairing secret — that's web→agent only.)

## Hard rules

1. **No "Kliovo" / "offline" / "POS" in any shipped artifact** — `productName`,
   `appId` (`io.aster.station`), installer name (`Aster-Setup-*.exe`), window
   title, NSIS shortcut. Keep the disguise.
2. **No cloud credentials, ever** — no `DATABASE_URL`, no API keys, no prod secrets.
   Aster only reaches `http://127.0.0.1:6310` (the local agent).
3. **No business logic duplication** — order math is `order-core`, which lives in
   the agent. Aster may preview cart totals client-side, but the agent is the
   source of truth on write.
4. Keep it lean — plain CSS, Preact, no heavy frameworks.

## Layout

```
aster/
  index.html
  vite.config.ts            renderer build (Preact), base "./"
  tsconfig.json             renderer (jsx: preact)
  tsconfig.main.json        electron main (commonjs)
  electron-builder.yml      disguised packaging (productName Aster, io.aster.station)
  postcss.config.cjs        empty — isolates from any parent Tailwind/PostCSS
  src/
    main/main.ts            Electron main (window; loads dist/renderer or ASTER_DEV_URL)
    main/preload.ts         tiny contextBridge (no privileged Node)
    renderer/agent.ts       client for the local agent (ping, login, ...)
    renderer/app.tsx        the SPA
    renderer/main.tsx       entry
    renderer/styles.css
  .github/workflows/build.yml   CI → Windows installer artifact / release
```

## Build & run

```bash
npm install
npm run build            # renderer (vite) + main (tsc)
# dev: run the renderer dev server then Electron pointed at it
npm run dev:renderer     # http://localhost:5273
ASTER_DEV_URL=http://localhost:5273 npx electron dist/main/main.js
# package a Windows installer locally
npm run dist:win         # output in release/
```

CI (`.github/workflows/build.yml`) builds the installer on push to `main` and on
`v*` tags (attaches to a GitHub Release on tags). Installer is distributed
**manually to paying customers** — there is no in-app license (a license check
that could fail mid-outage would defeat the purpose). The real gate is
server-side: the web only warms the agent's DB for offline-entitled tenants, so a
copied installer is inert without warm data.

> TODO before GA: code-sign the Windows build (unsigned → SmartScreen warning).

## Agent API Aster consumes (on `127.0.0.1:6310`)

- `GET /ping` — detect the agent (no auth).
- `POST /local/auth` — offline login (email/password → session token). **(next)**
- order ops (create/add-item/void/pay/refund/status), menu/tables reads, shift
  ops — all running `order-core` against the agent's encrypted DB and writing to
  its `change_log` outbox. Offline order numbers are `OFF-{terminal code}-…`,
  set per terminal at creation. **(next)**

## Current status

- ✅ App shell: Electron + Preact SPA, agent-detect (`/ping`), offline-login UI,
  disguised packaging, CI workflow. Builds clean (renderer ~16 KB).
- 🔲 Next: agent `/local/auth` + order endpoints, then the POS screens
  (menu/cart/payment/orders/status), stock depletion, offline shift close.

## Related repos

- **Kliovo Print Agent** (`../kliovo-print-agent`) — owns the encrypted store +
  `/local/*` API + printing. Aster depends on it at runtime.
- **Kliovo Dine** (`../Kliovo-Dine`) — the cloud web app; hosts the offline
  entitlement toggle, the web→agent mirror, and the reconciliation UI.
- Architecture/plans: `../Kliovo-Dine/docs/offline/PLAN-A-KLIOVO-AGENT.md`,
  `PLAN-B-OFFLINE-POS.md`.
