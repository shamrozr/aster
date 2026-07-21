import { useState } from "preact/hooks";
import { pos } from "../agent";
import { Ic } from "./icons";

// Reusable manager-PIN + reason gate for sensitive actions (void a fired
// item, force-unlock, reprint-after-first). Verifies the PIN against the
// agent (pos.verifyManagerPin) before resolving — the caller performs the
// actual sensitive action (voidItem / forceUnlock / reprint) afterward and
// is responsible for logging/erroring on that call.
export interface ManagerPinResult {
  managerName: string;
  reason: string;
  pin: string;
}

export type ReasonMode = "void" | "text" | "none";

export const VOID_REASONS = ["Wrong item", "Customer changed mind", "Kitchen error", "Rung in error", "Other"];

export function ManagerPinModal({
  title,
  subtitle,
  reasonMode,
  confirmLabel = "Confirm",
  onClose,
  onConfirm,
}: {
  title: string;
  subtitle?: string;
  reasonMode: ReasonMode;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (result: ManagerPinResult) => void;
}) {
  const [reasonPick, setReasonPick] = useState(VOID_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [freeReason, setFreeReason] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resolvedReason(): string {
    if (reasonMode === "none") return "";
    if (reasonMode === "void") return reasonPick === "Other" ? customReason.trim() : reasonPick;
    return freeReason.trim();
  }

  async function submit(e: Event) {
    e.preventDefault();
    setError(null);
    const reason = resolvedReason();
    if (reasonMode !== "none" && !reason) {
      setError("A reason is required.");
      return;
    }
    if (!pin.trim()) {
      setError("Enter the manager PIN.");
      return;
    }
    setBusy(true);
    try {
      const r = await pos.verifyManagerPin(pin.trim());
      setBusy(false);
      if (!r.ok) {
        setError("Manager PIN not recognized.");
        return;
      }
      onConfirm({ managerName: r.managerName ?? "Manager", reason, pin: pin.trim() });
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
    }
  }

  return (
    <div class="sheet-bg" onClick={onClose}>
      <form class="sheet pinsheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div class="pinsheet-head">
          <span class="pinsheet-icon">
            <Ic id="i-lock" size={18} />
          </span>
          <div>
            <h3 style={{ margin: 0 }}>{title}</h3>
            {subtitle && <p class="muted" style={{ margin: "3px 0 0" }}>{subtitle}</p>}
          </div>
        </div>

        {reasonMode === "void" && (
          <div class="grp">
            <div class="grp-h">Reason</div>
            <div class="opts">
              {VOID_REASONS.map((r) => (
                <button key={r} type="button" class={reasonPick === r ? "opt on" : "opt"} onClick={() => setReasonPick(r)}>
                  {r}
                </button>
              ))}
            </div>
            {reasonPick === "Other" && (
              <input
                class="payfield"
                style={{ marginTop: 10, width: "100%" }}
                placeholder="Describe the reason…"
                value={customReason}
                onInput={(e) => setCustomReason((e.target as HTMLInputElement).value)}
                autoFocus
              />
            )}
          </div>
        )}

        {reasonMode === "text" && (
          <div class="grp">
            <div class="grp-h">Reason</div>
            <input
              class="payfield"
              style={{ width: "100%" }}
              placeholder="Why is this needed?"
              value={freeReason}
              onInput={(e) => setFreeReason((e.target as HTMLInputElement).value)}
              autoFocus
            />
          </div>
        )}

        <div class="grp">
          <div class="grp-h">Manager PIN</div>
          <input
            class="payfield pinfield"
            style={{ width: "100%" }}
            type="password"
            inputMode="numeric"
            placeholder="••••"
            value={pin}
            onInput={(e) => setPin((e.target as HTMLInputElement).value)}
          />
        </div>

        {error && <p class="err" style={{ margin: "0 0 4px" }}>{error}</p>}

        <div class="sheet-foot">
          <button type="button" class="link" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" class="primary" disabled={busy}>
            {busy ? "Verifying…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
