// Cytaty są zapisane w notatkach książek jako linie zaczynające się od „>”.
// Kolejne takie linie tworzą jeden cytat; numer strony w nawiasie na końcu: (s. 12) lub (str. 12).

const PAGE_RE = /\s*\((?:s|str)\.\s*(\d+[a-z]?)\)\s*$/i;

// Rozdziela tekst cytatu i numer strony.
export function splitPage(text) {
  const m = text.match(PAGE_RE);
  return m ? { text: text.slice(0, m.index).trim(), page: m[1] } : { text: text.trim(), page: '' };
}

// Wszystkie cytaty ze wszystkich książek (w kolejności książek i notatek).
export function extractQuotes(books) {
  const quotes = [];
  for (const book of books) {
    if (!book.notatki || !book.notatki.includes('>')) continue;
    let lines = null;
    let n = 0;
    const flush = () => {
      if (!lines) return;
      const { text, page } = splitPage(lines.join('\n'));
      if (text) quotes.push({ id: `${book.id}#${n++}`, book, text, page });
      lines = null;
    };
    for (const raw of book.notatki.replace(/\r\n/g, '\n').split('\n')) {
      const m = raw.match(/^\s*>\s?(.*)$/);
      if (m) (lines = lines || []).push(m[1]);
      else flush();
    }
    flush();
  }
  return quotes;
}

// Tekst cytatu w jednej linii (podziały wersów zamienione na „ / ”).
export const oneLine = (text) => text.replace(/\s*\n\s*/g, ' / ');

// Linie notatek dla nowego cytatu.
export function quoteToNotes(text, page) {
  const lines = text.trim().split('\n').map((l) => `> ${l.trim()}`);
  if (page) lines[lines.length - 1] += ` (s. ${String(page).trim()})`;
  return lines.join('\n');
}
