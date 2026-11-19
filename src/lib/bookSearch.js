import { cleanIsbn, isIsbn } from './books.js';

// Wyszukiwanie książek: Google Books (lepsze pokrycie polskich wydań)
// oraz Open Library jako zapas. Oba API są darmowe i nie wymagają klucza.

function googleCover(volume) {
  const links = volume.imageLinks;
  const url = links?.thumbnail || links?.smallThumbnail;
  if (!url) return '';
  return url.replace(/^http:/, 'https:').replace('&edge=curl', '');
}

function mapGoogle(item) {
  const v = item.volumeInfo || {};
  const ids = v.industryIdentifiers || [];
  const isbn13 = ids.find((i) => i.type === 'ISBN_13')?.identifier;
  const isbn10 = ids.find((i) => i.type === 'ISBN_10')?.identifier;
  return {
    source: 'Google Books',
    tytul: v.title || '',
    autor: (v.authors || []).join(', '),
    isbn: isbn13 || isbn10 || '',
    liczba_stron: v.pageCount ? String(v.pageCount) : '',
    rok: (v.publishedDate || '').slice(0, 4),
    okladka_url: googleCover(v),
    jezyk: v.language || '',
  };
}

function mapOpenLibrary(doc) {
  const isbns = doc.isbn || [];
  return {
    source: 'Open Library',
    tytul: doc.title || '',
    autor: (doc.author_name || []).join(', '),
    isbn: isbns.find((i) => i.length === 13) || isbns[0] || '',
    liczba_stron: doc.number_of_pages_median ? String(doc.number_of_pages_median) : '',
    rok: doc.first_publish_year ? String(doc.first_publish_year) : '',
    okladka_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '',
  };
}

async function searchGoogle(q, max = 12) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${max}&printType=books`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Google Books ' + res.status);
  const data = await res.json();
  return (data.items || []).map(mapGoogle);
}

async function searchOpenLibrary(query, max = 12) {
  const param = isIsbn(query) ? `isbn=${cleanIsbn(query)}` : `q=${encodeURIComponent(query)}`;
  const url = `https://openlibrary.org/search.json?${param}&limit=${max}&fields=title,author_name,isbn,number_of_pages_median,cover_i,first_publish_year`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open Library ' + res.status);
  const data = await res.json();
  return (data.docs || []).map(mapOpenLibrary);
}

export async function searchBooks(query) {
  const q = query.trim();
  if (!q) return [];
  const googleQuery = isIsbn(q) ? `isbn:${cleanIsbn(q)}` : q;
  const [google, openLibrary] = await Promise.allSettled([
    searchGoogle(googleQuery),
    searchOpenLibrary(q, 8),
  ]);
  const results = [
    ...(google.status === 'fulfilled' ? google.value : []),
    ...(openLibrary.status === 'fulfilled' ? openLibrary.value : []),
  ];
  if (!results.length && google.status === 'rejected' && openLibrary.status === 'rejected') {
    throw new Error('SEARCH_FAILED');
  }
  return results;
}

// Sprawdza, czy obrazek istnieje i nie jest pustym zastępnikiem (1x1 px).
function imageExists(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 10);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// Szuka okładki dla istniejącej książki: najpierw po ISBN, potem po tytule i autorze.
export async function findCover(book) {
  const isbn = cleanIsbn(book.isbn);
  if (isIsbn(isbn)) {
    try {
      const found = (await searchGoogle(`isbn:${isbn}`, 3)).find((r) => r.okladka_url);
      if (found) return found.okladka_url;
    } catch { /* spróbuj dalej */ }
    const olUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
    if (await imageExists(olUrl)) return olUrl;
  }
  if (book.tytul) {
    const parts = [`intitle:${book.tytul}`];
    if (book.autor) parts.push(`inauthor:${book.autor.split(',')[0]}`);
    try {
      const found = (await searchGoogle(parts.join(' '), 5)).find((r) => r.okladka_url);
      if (found) return found.okladka_url;
    } catch { /* brak wyniku */ }
  }
  return '';
}

export function lubimyczytacUrl(book) {
  const phrase = [book.tytul, book.autor].filter(Boolean).join(' ');
  return `https://lubimyczytac.pl/szukaj/ksiazki?phrase=${encodeURIComponent(phrase)}`;
}

// Szuka liczby stron (i ISBN, jeśli brakuje) dla istniejącej książki.
// Kolejność: Google Books po ISBN, Google Books po tytule i autorze (wydania polskie najpierw),
// Open Library po tytule i autorze. Zwraca { pages, isbn, source } albo null.
export async function findPages(book) {
  const isbn = cleanIsbn(book.isbn);
  const pick = (list) => {
    const withPages = list.filter((r) => Number(r.liczba_stron) > 0);
    return withPages.find((r) => r.jezyk === 'pl') || withPages[0] || null;
  };
  if (isIsbn(isbn)) {
    try {
      const r = pick(await searchGoogle(`isbn:${isbn}`, 5));
      if (r) return { pages: r.liczba_stron, isbn: '', source: 'Google Books' };
    } catch { /* dalej */ }
  }
  if (book.tytul) {
    const parts = [`intitle:${book.tytul}`];
    if (book.autor) parts.push(`inauthor:${book.autor.split(',')[0]}`);
    try {
      const r = pick(await searchGoogle(parts.join(' '), 10));
      if (r) return { pages: r.liczba_stron, isbn: isIsbn(isbn) ? '' : r.isbn, source: 'Google Books' };
    } catch { /* dalej */ }
    try {
      const q = `title=${encodeURIComponent(book.tytul)}${book.autor ? `&author=${encodeURIComponent(book.autor.split(',')[0])}` : ''}`;
      const res = await fetch(`https://openlibrary.org/search.json?${q}&limit=5&fields=number_of_pages_median,isbn`);
      if (res.ok) {
        const doc = ((await res.json()).docs || []).find((d) => d.number_of_pages_median > 0);
        if (doc) {
          const isbns = doc.isbn || [];
          return {
            pages: String(doc.number_of_pages_median),
            isbn: isIsbn(isbn) ? '' : isbns.find((i) => i.length === 13) || '',
            source: 'Open Library',
          };
        }
      }
    } catch { /* brak wyniku */ }
  }
  return null;
}
