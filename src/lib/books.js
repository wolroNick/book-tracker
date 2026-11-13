// Model książki – nazwy pól odpowiadają nagłówkom kolumn w arkuszu.
export const FIELDS = [
  'id', 'tytul', 'autor', 'isbn', 'gatunek', 'liczba_stron', 'status',
  'data_rozpoczecia', 'data_zakonczenia', 'ocena', 'notatki', 'okladka_url', 'forma', 'ponowne',
];

// Najnowsza wersja skryptu arkusza wymagana przez aplikację.
export const REQUIRED_SCRIPT_VERSION = 5;

// Wartości statusu dokładnie tak, jak są zapisane w arkuszu.
export const STATUSES = ['przeczytane', 'czytam', 'do przeczytania'];

// Forma, w jakiej książka została przeczytana/wysłuchana (wartości jak w arkuszu).
export const FORMS = ['papier', 'e-book', 'audiobook'];
export const FORM_ICONS = { papier: '📖', 'e-book': '📱', audiobook: '🎧' };

export function emptyBook() {
  const book = Object.fromEntries(FIELDS.map((f) => [f, '']));
  book.status = 'do przeczytania';
  return book;
}

export const DATE_FIELDS = ['data_rozpoczecia', 'data_zakonczenia'];

const pad = (n) => String(n).padStart(2, '0');
const isoFromParts = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// Zamienia datę w dowolnym typowym formacie na RRRR-MM-DD.
// Obsługuje m.in. 2026-03-03, 3.03.2026, 03/03/2026, 2026/3/3,
// pełny zapis daty z Google („Tue Mar 03 2026 00:00:00 GMT+0100”)
// oraz numer seryjny daty z arkusza (np. 46084).
export function normalizeDate(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return isoFromParts(m[1], m[2], m[3]);
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) return isoFromParts(m[3], m[2], m[1]); // format polski: dzień.miesiąc.rok
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    // Numer seryjny arkusza: liczba dni od 30.12.1899.
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
    return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const parsed = new Date(s);
  if (!isNaN(parsed)) return isoFromParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  return s;
}

export function normalizeBook(raw) {
  const book = emptyBook();
  for (const f of FIELDS) {
    const v = raw?.[f];
    book[f] = v === null || v === undefined ? '' : String(v).trim();
  }
  for (const f of DATE_FIELDS) book[f] = normalizeDate(book[f]);
  return book;
}

export function newId() {
  return 'b' + Date.now() + Math.floor(Math.random() * 1000);
}

export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function cleanIsbn(value) {
  return String(value || '').replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function isIsbn(value) {
  const s = cleanIsbn(value);
  return /^(\d{9}[\dX]|\d{13})$/.test(s);
}
