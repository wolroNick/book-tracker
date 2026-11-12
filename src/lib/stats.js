// Obliczenia statystyk na podstawie listy książek.

const DAY = 86400000;

export function yearOf(date) {
  return /^\d{4}-/.test(date || '') ? Number(date.slice(0, 4)) : null;
}

function monthOf(date) {
  return /^\d{4}-\d{2}/.test(date || '') ? Number(date.slice(5, 7)) - 1 : null;
}

function toTime(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Liczba dni czytania (od rozpoczęcia do zakończenia włącznie).
export function readingDays(book) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(book.data_rozpoczecia) || !/^\d{4}-\d{2}-\d{2}$/.test(book.data_zakonczenia)) return null;
  const days = Math.round((toTime(book.data_zakonczenia) - toTime(book.data_rozpoczecia)) / DAY) + 1;
  return days > 0 ? days : null;
}

const num = (v) => {
  const n = Number(v);
  return v !== '' && Number.isFinite(n) ? n : null;
};

const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

// Lata, w których coś przeczytano, plus bieżący rok – od najnowszego.
export function availableYears(books) {
  const years = new Set([new Date().getFullYear()]);
  for (const b of books) {
    if (b.status === 'przeczytane') {
      const y = yearOf(b.data_zakonczenia);
      if (y) years.add(y);
    }
  }
  return [...years].sort((a, b) => b - a);
}

function topCounts(values, limit) {
  const counts = new Map();
  for (const v of values) if (v) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl'))
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

// year: konkretny rok (liczba) albo 'all'.
export function computeStats(books, year) {
  const read = books.filter((b) => b.status === 'przeczytane');
  const inScope = year === 'all' ? read : read.filter((b) => yearOf(b.data_zakonczenia) === year);

  const pages = inScope.map((b) => num(b.liczba_stron)).filter((n) => n !== null);
  const ratings = inScope.map((b) => num(b.ocena)).filter((n) => n !== null);
  const withDays = inScope.map((b) => ({ b, days: readingDays(b) })).filter((x) => x.days !== null);

  // Słupki: miesiące wybranego roku albo kolejne lata.
  let buckets;
  if (year === 'all') {
    const years = read.map((b) => yearOf(b.data_zakonczenia)).filter(Boolean);
    const min = years.length ? Math.min(...years) : new Date().getFullYear();
    const max = years.length ? Math.max(...years) : min;
    buckets = [];
    for (let y = min; y <= max; y++) buckets.push({ key: y, books: 0, pages: 0 });
    for (const b of read) {
      const bucket = buckets.find((x) => x.key === yearOf(b.data_zakonczenia));
      if (bucket) {
        bucket.books += 1;
        bucket.pages += num(b.liczba_stron) || 0;
      }
    }
  } else {
    buckets = Array.from({ length: 12 }, (_, m) => ({ key: m, books: 0, pages: 0 }));
    for (const b of inScope) {
      const m = monthOf(b.data_zakonczenia);
      if (m !== null) {
        buckets[m].books += 1;
        buckets[m].pages += num(b.liczba_stron) || 0;
      }
    }
  }

  const ratingDist = Array.from({ length: 10 }, (_, i) => ({
    key: i + 1,
    value: ratings.filter((r) => r === i + 1).length,
  }));

  const byRating = inScope.filter((b) => num(b.ocena) !== null).sort((a, b) => num(b.ocena) - num(a.ocena));
  const byPages = inScope.filter((b) => num(b.liczba_stron) !== null).sort((a, b) => num(b.liczba_stron) - num(a.liczba_stron));
  const fastest = [...withDays].sort((a, b) => a.days - b.days)[0];
  const undated = year === 'all' ? read.filter((b) => !yearOf(b.data_zakonczenia)).length : 0;

  return {
    count: inScope.length,
    pages: pages.reduce((a, b) => a + b, 0),
    avgRating: avg(ratings),
    avgDays: avg(withDays.map((x) => x.days)),
    avgPages: avg(pages),
    buckets,
    ratingDist,
    genres: topCounts(inScope.map((b) => b.gatunek), 8),
    authors: topCounts(inScope.flatMap((b) => b.autor.split(',').map((a) => a.trim())), 5),
    best: byRating[0] || null,
    longest: byPages[0] || null,
    fastest: fastest ? { book: fastest.b, days: fastest.days } : null,
    undated,
    reading: books.filter((b) => b.status === 'czytam').length,
    toRead: books.filter((b) => b.status === 'do przeczytania').length,
  };
}

// Postęp celu rocznego. Dla bieżącego roku liczy też, czy jesteś przed czy za planem.
export function goalProgress(goal, count, year) {
  if (!goal) return null;
  const now = new Date();
  const result = { goal, count, pct: Math.min(100, (count / goal) * 100), diff: null };
  if (year === now.getFullYear()) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const expected = (goal * (now - start)) / (end - start);
    result.diff = Math.round(count - expected);
    result.expectedPct = Math.min(100, (expected / goal) * 100);
  }
  return result;
}
