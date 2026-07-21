import type { AsterUser } from "../agent";
import { Ic } from "./icons";
import type { Theme } from "./theme";

export type MainTab = "pos" | "orders";

export function Sidebar({
  tab,
  onTab,
  ordersCount,
  user,
  theme,
  onToggleTheme,
  onLogout,
}: {
  tab: MainTab;
  onTab: (t: MainTab) => void;
  ordersCount: number;
  user: AsterUser;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside class="side">
      <div class="logo">
        <span class="m">
          <Ic id="i-pos" size={15} />
        </span>
        Aster
      </div>
      <nav class="side-nav">
        <a class={tab === "pos" ? "on" : ""} onClick={() => onTab("pos")}>
          <Ic id="i-pos" /> POS
        </a>
        <a class={tab === "orders" ? "on" : ""} onClick={() => onTab("orders")}>
          <Ic id="i-bag" /> Orders
          {ordersCount > 0 && <span class="cnt">{ordersCount}</span>}
        </a>
      </nav>
      <div class="side-foot">
        <span class="av">{initials}</span>
        <div>
          <div class="nm">{user.name}</div>
          <div class="rl">{user.role}</div>
        </div>
        <button class="out" aria-label="Sign out" title="Sign out" onClick={onLogout}>
          <Ic id="i-arrowl" size={15} />
        </button>
        <button class="tgl" aria-label="Toggle theme" onClick={onToggleTheme}>
          <Ic id={theme === "dark" ? "i-sun" : "i-moon"} size={16} />
        </button>
      </div>
    </aside>
  );
}
