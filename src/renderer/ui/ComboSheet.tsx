import { useState } from "preact/hooks";
import type { CartLine, CartModifier, Combo, ComboPick, MenuPayload } from "../types";

const rs = (n: number) => "Rs " + Math.round(n).toLocaleString();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Combo builder: one pick per group (defaults preselected). Emits a structured
// `combo` payload (ComboSelection) on the cart line — never `COMBO:` JSON in notes.
export function ComboSheet({
  combo,
  menu,
  onClose,
  onAdd,
}: {
  combo: Combo;
  menu: MenuPayload | null;
  onClose: () => void;
  onAdd: (l: CartLine) => void;
}) {
  const itemName = (id: string) => {
    for (const c of menu?.categories ?? []) {
      const it = c.items.find((x) => x.id === id);
      if (it) return it.name;
    }
    return "Item";
  };
  const [choice, setChoice] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of combo.groups) {
      const def = g.items.find((i) => i.isDefault) ?? g.items[0];
      if (def) init[g.id] = def.id;
    }
    return init;
  });

  const allPicked = combo.groups.every((g) => choice[g.id]);
  const picks: ComboPick[] = combo.groups
    .map((g): ComboPick | null => {
      const picked = g.items.find((i) => i.id === choice[g.id]);
      if (!picked) return null;
      return { groupId: g.id, menuItemId: picked.menuItemId, variantId: picked.variantId, upcharge: picked.upcharge, modifiers: [] as CartModifier[] };
    })
    .filter((p): p is ComboPick => p !== null);
  const upcharge = picks.reduce((s, p) => s + p.upcharge, 0);
  const price = combo.price + upcharge;

  return (
    <div class="sheet-bg" onClick={onClose}>
      <div class="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>
          {combo.name} <span class="muted">· {rs(combo.price)}</span>
        </h3>
        {combo.groups.map((g) => (
          <div class="grp" key={g.id}>
            <div class="grp-h">{g.label}</div>
            <div class="opts">
              {g.items.map((i) => (
                <button key={i.id} class={choice[g.id] === i.id ? "opt on" : "opt"} onClick={() => setChoice((c) => ({ ...c, [g.id]: i.id }))}>
                  {itemName(i.menuItemId)}
                  {i.upcharge ? ` +${rs(i.upcharge)}` : ""}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div class="sheet-foot">
          <button class="link" onClick={onClose}>
            Cancel
          </button>
          <button
            class="primary"
            disabled={!allPicked}
            onClick={() =>
              onAdd({
                lineId: uid(),
                menuItemId: "",
                comboId: combo.id,
                name: combo.name,
                unitPrice: price,
                quantity: 1,
                modifiers: [],
                combo: { comboId: combo.id, comboName: combo.name, comboPrice: combo.price, picks, quantity: 1 },
              })
            }
          >
            Add deal · {rs(price)}
          </button>
        </div>
      </div>
    </div>
  );
}
