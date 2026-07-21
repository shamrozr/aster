import { Ic } from "./icons";
import type { Source } from "./shared";

const TYPES: Array<{ source: Source; cls: string; icon: string; label: string }> = [
  { source: "dine_in", cls: "dine", icon: "i-coffee", label: "Dine In" },
  { source: "takeaway", cls: "take", icon: "i-walk", label: "Take Away" },
  { source: "delivery", cls: "del", icon: "i-bike", label: "Delivery" },
  { source: "phone", cls: "phone", icon: "i-phone", label: "Phone Order" },
];

// Order-type launcher — the POS landing screen before a draft order is open.
export function PosHome({ onOpen }: { onOpen: (source: Source) => void }) {
  return (
    <div class="poshome">
      <div class="hicon">
        <Ic id="i-pos" />
      </div>
      <h1>Point of Sale</h1>
      <div class="hsub">Select order type to begin</div>
      <div class="otgrid">
        {TYPES.map((t, idx) => (
          <button key={t.source} class={`ot ${t.cls}`} onClick={() => onOpen(t.source)}>
            <span class="num">{idx + 1}</span>
            <span class="oi">
              <Ic id={t.icon} />
            </span>
            <span class="olb">{t.label}</span>
          </button>
        ))}
      </div>
      <button class="tablesbtn" onClick={() => onOpen("dine_in")}>
        <Ic id="i-grid" /> Open Tables View
      </button>
    </div>
  );
}
