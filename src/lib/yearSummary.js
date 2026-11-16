// Dane do „Podsumowania roku”. Każda część może być pusta – ekran jest wtedy pomijany.
import { readingDays, yearOf } from './stats.js';

const num = (v) => {
  const n = Number(v);
  return v !== '' && v !== null && v !== undefined && Number.isFinite(n) ? n : null;
};

function top(values) {
  const counts = new Map();
  for (const v of values) if (v) counts.set(v, (counts.get(v) || 0) + 1);
  let best = null;
  for (const [label, count] of counts) if (!best || count > best.count) best = { label, count };
  return best;
}

function finishedIn(books, year) {
  return books.filter((b) => b.status === 'przeczytane' && yearOf(b.data_zakonczenia) === year);
}

const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

export function hasSummary(books, year) {
  return finishedIn(books, year).length > 0;
}

export function computeSummary(books, year, { goal, quotes = [] } = {}) {
  const read = finishedIn(books, year);
  const pages = read.reduce((sum, b) => sum + (num(b.liczba_stron) || 0), 0);
  const ratings = read.map((b) => num(b.ocena)).filter((n) => n !== null);

  // Top 3 według oceny (przy remisie – wcześniej skończona wyżej).
  const top3 = read
    .filter((b) => num(b.ocena) !== null)
    .sort((a, b) => num(b.ocena) - num(a.ocena) || a.data_zakonczenia.localeCompare(b.data_zakonczenia))
    .slice(0, 3);

  const withPages = read.filter((b) => num(b.liczba_stron) !== null).sort((a, b) => num(b.liczba_stron) - num(a.liczba_stron));
  const withDays = read.map((b) => ({ book: b, days: readingDays(b) })).filter((x) => x.days !== null);
  const fastest = [...withDays].sort((a, b) => a.days - b.days)[0] || null;
  const slowest = [...withDays].sort((a, b) => b.days - a.days)[0] || null;

  const months = Array.from({ length: 12 }, () => 0);
  for (const b of read) months[Number(b.data_zakonczenia.slice(5, 7)) - 1] += 1;
  const bestMonthCount = Math.max(...months);
  const bestMonth = months.indexOf(bestMonthCount);

  const formCounts = ['papier', 'audiobook', 'e-book']
    .map((f) => ({ key: f, count: read.filter((b) => b.forma === f).length }))
    .filter((f) => f.count > 0);
  const formTotal = formCounts.reduce((s, f) => s + f.count, 0);

  const prevRead = finishedIn(books, year - 1);
  const prevRatings = prevRead.map((b) => num(b.ocena)).filter((n) => n !== null);

  const readIds = new Set(read.map((b) => b.id));
  const yearQuotes = quotes.filter((q) => readIds.has(q.book.id));

  return {
    year,
    count: read.length,
    pages,
    perMonth: read.length / 12,
    goal: goal || null,
    goalReached: goal ? read.length >= goal : null,
    avgRating: avg(ratings),
    top3,
    records: {
      longest: withPages[0] || null,
      fastest,
      // „Czytana najdłużej” tylko gdy to inna książka niż najszybsza.
      slowest: slowest && slowest.book !== fastest?.book ? slowest : null,
    },
    genre: top(read.map((b) => b.gatunek)),
    // Autor tylko, gdy przeczytano co najmniej 2 jego książki (inaczej to żadna ciekawostka).
    author: ((a) => (a && a.count >= 2 ? a : null))(top(read.flatMap((b) => b.autor.split(',').map((x) => x.trim())))),
    forms: formCounts.map((f) => ({ ...f, pct: Math.round((f.count / formTotal) * 100) })),
    months,
    bestMonth: bestMonthCount > 0 ? bestMonth : null,
    quote: yearQuotes.length ? yearQuotes[Math.floor(Math.random() * yearQuotes.length)] : null,
    prev: prevRead.length ? { count: prevRead.length, avgRating: avg(prevRatings) } : null,
  };
}
