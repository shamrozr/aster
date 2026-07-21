// Inline SVG icon sprite (CSP blocks icon webfonts, so icons are inline <symbol>s
// referenced via <use>). IconSprite is rendered once by the Workspace shell.
export function IconSprite() {
  return (
    <svg class="sprite" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <symbol id="i-pos" viewBox="0 0 24 24"><rect x="3" y="4" width="14" height="11" rx="1.5" /><path d="M3 19h11" /><rect x="17" y="9" width="4" height="11" rx="1" /></symbol>
        <symbol id="i-bag" viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></symbol>
        <symbol id="i-grid" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></symbol>
        <symbol id="i-coffee" viewBox="0 0 24 24"><path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" /><path d="M16 9h2a2 2 0 0 1 0 4h-2" /><path d="M8 3v2M11 3v2" /></symbol>
        <symbol id="i-walk" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6" /><path d="M9 21l2-5 1-3 2 2 2 2M12 13l-1-4 3 1 2-1" /></symbol>
        <symbol id="i-bike" viewBox="0 0 24 24"><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 17l4-8h4l2 8M9 9h5" /></symbol>
        <symbol id="i-phone" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></symbol>
        <symbol id="i-table" viewBox="0 0 24 24"><path d="M4 9h16M6 9v11M18 9v11M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v0H3z" /></symbol>
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></symbol>
        <symbol id="i-dots" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
        <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
        <symbol id="i-chevdown" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></symbol>
        <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></symbol>
        <symbol id="i-unlock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 7-1" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></symbol>
        <symbol id="i-arrowr" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></symbol>
        <symbol id="i-arrowl" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" /></symbol>
        <symbol id="i-save" viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></symbol>
        <symbol id="i-wallet" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12h3M3 9h13a2 2 0 0 1 0 4" /></symbol>
        <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></symbol>
        <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></symbol>
        <symbol id="i-chef" viewBox="0 0 24 24"><path d="M7 14a4 4 0 1 1 1-7.9 4 4 0 0 1 8 0A4 4 0 1 1 17 14z" /><path d="M7 14v5h10v-5" /></symbol>
        <symbol id="i-tag" viewBox="0 0 24 24"><path d="M4 4h7l9 9-7 7-9-9V4z" /><circle cx="8.5" cy="8.5" r="1.3" /></symbol>
        <symbol id="i-print" viewBox="0 0 24 24"><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="7" rx="1.5" /><path d="M7 14h10v6H7z" /></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></symbol>
        <symbol id="i-cart" viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M3 4h2l2.5 12h11L21 8H6" /></symbol>
        <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z" /></symbol>
        <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></symbol>
        <symbol id="i-cloud" viewBox="0 0 24 24"><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4 4 0 0 1 17 18H7z" /></symbol>
        <symbol id="i-ban" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M6 6l12 12" /></symbol>
        <symbol id="i-send" viewBox="0 0 24 24"><path d="M4 12l16-7-7 16-2-6-7-3z" /></symbol>
      </defs>
    </svg>
  );
}

export function Ic({ id, size }: { id: string; size?: number }) {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;
  return (
    <svg class="i" style={style}>
      <use href={`#${id}`} />
    </svg>
  );
}
