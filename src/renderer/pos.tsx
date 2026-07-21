import { useState } from "preact/hooks";
import { logout, pos, type AsterUser } from "./agent";
import { useEffect } from "preact/hooks";
import { IconSprite } from "./ui/icons";
import { Sidebar, type MainTab } from "./ui/Sidebar";
import { useTheme } from "./ui/theme";
import { PosHome } from "./ui/PosHome";
import { PosOrder } from "./ui/PosOrder";
import { Orders } from "./ui/Orders";
import type { Source } from "./ui/shared";

// Workspace shell: sidebar (POS / Orders tabs) + the active screen. Rendered
// by App after a successful offline login.
export function Pos({ user, onLogout }: { user: AsterUser; onLogout: () => void }) {
  const [theme, toggleTheme] = useTheme();
  const [tab, setTab] = useState<MainTab>("pos");
  const [orderOpen, setOrderOpen] = useState<Source | null>(null);
  const [ordersCount, setOrdersCount] = useState(0);

  async function refreshCount() {
    try {
      const list = await pos.orders();
      setOrdersCount(list.filter((o) => o.status === "open").length);
    } catch {
      /* ignore — best-effort badge */
    }
  }
  useEffect(() => {
    void refreshCount();
    const id = setInterval(refreshCount, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div class="app">
      <IconSprite />
      <Sidebar
        tab={tab}
        onTab={setTab}
        ordersCount={ordersCount}
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={() => { logout(); onLogout(); }}
      />
      <div class="main">
        <section class={`screen ${tab === "pos" ? "on" : ""}`}>
          {orderOpen ? (
            <PosOrder
              user={user}
              initialSource={orderOpen}
              onClose={() => setOrderOpen(null)}
              onOrderPlaced={refreshCount}
            />
          ) : (
            <PosHome onOpen={setOrderOpen} />
          )}
        </section>
        <section class={`screen ${tab === "orders" ? "on" : ""}`}>
          <Orders />
        </section>
      </div>
    </div>
  );
}
