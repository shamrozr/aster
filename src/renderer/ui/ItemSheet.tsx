import { useState } from "preact/hooks";
import type { CartLine, CartModifier, MenuItem, ModifierGroup, Variant } from "../types";

const rs = (n: number) => "Rs " + Math.round(n).toLocaleString();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Size + modifier picker. Enforces required groups and min/max select counts.
export function ItemSheet({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdd: (l: CartLine) => void;
}) {
  const sizes = (item.variants ?? []).slice().sort((a, b) => a.sizeSortOrder - b.sizeSortOrder);
  const [variant, setVariant] = useState<Variant | null>(sizes[0] ?? null);
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const basePrice = variant ? variant.price : item.price;

  const groups: ModifierGroup[] = (item.modifierGroups ?? []).map((g) => ({
    ...g,
    modifiers: g.modifiers.filter((m) => !m.portionSizeId || m.portionSizeId === (variant?.sizeId ?? null)),
  }));

  function toggle(g: ModifierGroup, modId: string) {
    setPicked((p) => {
      const cur = p[g.id] ?? [];
      if (g.multiSelect) {
        const next = cur.includes(modId) ? cur.filter((x) => x !== modId) : [...cur, modId];
        if (g.maxSelect && next.length > g.maxSelect) return p;
        return { ...p, [g.id]: next };
      }
      return { ...p, [g.id]: cur.includes(modId) ? [] : [modId] };
    });
  }

  const chosenMods: CartModifier[] = groups.flatMap((g) =>
    (picked[g.id] ?? []).map((id) => {
      const m = g.modifiers.find((x) => x.id === id)!;
      return { id: m.id, name: m.name, priceAdjustment: m.priceAdjustment };
    })
  );
  const unmet = groups.find((g) => g.required && (picked[g.id]?.length ?? 0) < Math.max(1, g.minSelect));
  const lineName = variant?.sizeName ? `${item.name} (${variant.sizeName})` : item.name;
  const linePrice = basePrice + chosenMods.reduce((s, m) => s + m.priceAdjustment, 0);

  return (
    <div class="sheet-bg" onClick={onClose}>
      <div class="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{item.name}</h3>
        {sizes.length > 0 && (
          <div class="grp">
            <div class="grp-h">Size</div>
            <div class="opts">
              {sizes.map((v) => (
                <button key={v.id} class={v.id === variant?.id ? "opt on" : "opt"} disabled={!v.isAvailable} onClick={() => setVariant(v)}>
                  {v.sizeName ?? "Regular"} · {rs(v.price)}
                </button>
              ))}
            </div>
          </div>
        )}
        {groups.map((g) => (
          <div class="grp" key={g.id}>
            <div class="grp-h">
              {g.name} {g.required && <span class="req">required</span>}
              {g.multiSelect && g.maxSelect ? <span class="hint"> · up to {g.maxSelect}</span> : null}
            </div>
            <div class="opts">
              {g.modifiers.map((m) => (
                <button key={m.id} class={(picked[g.id] ?? []).includes(m.id) ? "opt on" : "opt"} onClick={() => toggle(g, m.id)}>
                  {m.name}
                  {m.priceAdjustment ? ` +${rs(m.priceAdjustment)}` : ""}
                </button>
              ))}
              {g.modifiers.length === 0 && <span class="muted">No options for this size.</span>}
            </div>
          </div>
        ))}
        <div class="sheet-foot">
          <button class="link" onClick={onClose}>
            Cancel
          </button>
          <button
            class="primary"
            disabled={!!unmet}
            onClick={() =>
              onAdd({
                lineId: uid(),
                menuItemId: item.id,
                variantId: variant?.id ?? null,
                name: lineName,
                unitPrice: basePrice,
                quantity: 1,
                modifiers: chosenMods,
              })
            }
          >
            {unmet ? `Choose ${unmet.name}` : `Add · ${rs(linePrice)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
