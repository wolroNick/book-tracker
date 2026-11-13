// Proste ikony SVG (bez dodatkowych bibliotek).
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const PlusIcon = () => (<svg {...base}><path d="M12 5v14M5 12h14" /></svg>);
export const GridIcon = () => (<svg {...base}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>);
export const ListIcon = () => (<svg {...base}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>);
export const RefreshIcon = ({ spinning }) => (<svg {...base} className={spinning ? 'spin' : undefined}><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>);
export const SettingsIcon = () => (<svg {...base}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>);
export const ImageIcon = () => (<svg {...base}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>);
export const SortIcon = ({ desc }) => (<svg {...base}>{desc ? <path d="M12 5v14M5 12l7 7 7-7" /> : <path d="M12 19V5M5 12l7-7 7 7" />}</svg>);
export const ExternalIcon = () => (<svg {...base} width={16} height={16}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>);
export const SearchIcon = () => (<svg {...base} width={18} height={18}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
export const FilterIcon = () => (<svg {...base} width={18} height={18}><path d="M4 6h16M7 12h10M10 18h4" /></svg>);
export const BooksIcon = () => (<svg {...base} width={22} height={22}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></svg>);
export const ChartIcon = () => (<svg {...base} width={22} height={22}><path d="M6 20V10M12 20V4M18 20v-7" /></svg>);

// Ikona formy książki (papier / e-book / audiobook).
export function FormIcon({ forma, size = 14 }) {
  const p = { ...base, width: size, height: size, strokeWidth: 2.2 };
  if (forma === 'papier') return <svg {...p}><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" /></svg>;
  if (forma === 'e-book') return <svg {...p}><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></svg>;
  if (forma === 'audiobook') return <svg {...p}><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" /></svg>;
  return null;
}

// Animowany znaczek ✓ (okrąg i haczyk rysują się po kolei).
export const CheckDraw = () => (
  <svg width="64" height="64" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="check-draw">
    <circle className="check-ring" cx="28" cy="28" r="25" stroke="currentColor" strokeWidth="3" />
    <path className="check-tick" d="M17 29l7 7 15-16" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
