import { useState } from "preact/hooks";
import type { CartLine, MenuItem, Modifier, ModifierGroup } from "../types";
import { Ic } from "./icons";

const rs = (n: number) => "Rs " + Math.round(n).toLocaleString();

// Renders a combo line's components (picks) as sub-rows in the cart. Each pick
// whose underlying menu item carries modifierGroups gets an expand arrow that
// opens that item's OWN addons (e.g. the burger's "Extra Cheese"). Selecting an
// addon calls onToggleAddon — the parent owns the cart state and applies the
// change via shared.applyPickAddon. Used by both the main POS cart (PosOrder)
// and the running-order staging cart (OrderDetail).
export function ComboPicks({
  line,
  itemById,
  onToggleAddon,
}: {
  line: CartLine;
  itemById: Map<string, MenuItem>;
  onToggleAddon: (pickIdx: number, group: ModifierGroup, mod: Modifier) => void;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  if (!line.combo) return null;
  return (
    <div class="cl-picks">
      {line.combo.picks.map((p, pi) => {
        const it = itemById.get(p.menuItemId);
        const groups = it?.modifierGroups ?? [];
        const hasAddons = groups.length > 0;
        return (
          <div class="cl-pick" key={pi}>
            <button class="cl-pick-h" disabled={!hasAddons} onClick={() => setOpen((s) => ({ ...s, [pi]: !s[pi] }))}>
              <span class="cl-pick-name">{it?.name ?? "Item"}</span>
              {(p.modifiers?.length ?? 0) > 0 && <span class="cl-pick-add">+ {p.modifiers!.map((m) => m.name).join(", ")}</span>}
              {hasAddons && <Ic id={open[pi] ? "i-chevdown" : "i-chevright"} size={13} />}
            </button>
            {open[pi] && hasAddons && (
              <div class="cl-addons">
                {groups.map((g) => (
                  <div class="cl-addon-grp" key={g.id}>
                    <div class="cl-addon-h">{g.name}</div>
                    <div class="opts">
                      {g.modifiers.map((m) => {
                        const on = (p.modifiers ?? []).some((x) => x.id === m.id);
                        return (
                          <button key={m.id} class={on ? "opt on" : "opt"} onClick={() => onToggleAddon(pi, g, m)}>
                            {m.name}
                            {m.priceAdjustment ? ` +${rs(m.priceAdjustment)}` : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
