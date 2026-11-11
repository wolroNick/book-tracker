// Model książki – nazwy pól odpowiadają nagłówkom kolumn w arkuszu.
export const FIELDS = [
  'id', 'tytul', 'autor', 'isbn', 'gatunek', 'liczba_stron', 'status',
  'data_rozpoczecia', 'data_zakonczenia', 'ocena', 'notatki', 'okladka_url',
];

// Wartości statusu dokładnie tak, jak są zapisane w arkuszu.
export const STATUSES = ['przeczytane', 'czytam', 'do przeczytania'];

export function emptyBook() {
  const book = Object.fromEntries(FIELDS.map((f) => [f, '']));
  book.status = 'do przeczytania';
  return book;
}

export function normalizeBook(raw) {
  const book = emptyBook();
  for (const f of FIELDS) {
    const v = raw?.[f];
    book[f] = v === null || v === undefined ? '' : String(v).trim();
  }
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
