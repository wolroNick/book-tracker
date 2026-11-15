import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import BookCover from './BookCover.jsx';
import { QuoteIcon, SearchIcon } from './Icons.jsx';
import { oneLine } from '../lib/quotes.js';

// Porównanie bez wielkości liter, polskich znaków, interpunkcji i podziałów wersów.
const fold = (s) =>
  s.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Kompaktowy cytat na ekranie głównym (inny przy każdym otwarciu aplikacji).
export function QuoteTeaser({ quote, onOpen }) {
  const { t } = useI18n();
  if (!quote) return null;
  return (
    <button type="button" className="quote-teaser press appear" onClick={onOpen} aria-label={t('quotesOpen')}>
      <span className="quote-teaser-icon"><QuoteIcon size={18} /></span>
      <span className="quote-teaser-body">
        <span className="quote-teaser-text serif">{oneLine(quote.text)}</span>
        <span className="quote-teaser-source">
          — {quote.book.tytul}{quote.page ? `, s. ${quote.page}` : ''}
        </span>
      </span>
    </button>
  );
}

// Zakładka „Cytaty”: wyszukiwarka i lista wszystkich cytatów z notatek.
export default function QuotesView({ quotes, onOpenBook, focusId, onFocusDone }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [highlightId, setHighlightId] = useState(null);
  const itemRefs = useRef(new Map());

  // Przejście z ekranu głównego: przewiń do wskazanego cytatu i podświetl go na chwilę.
  const doneRef = useRef(onFocusDone);
  doneRef.current = onFocusDone;
  useEffect(() => {
    if (!focusId) return undefined;
    setQuery('');
    setHighlightId(focusId);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Dwie klatki: najpierw lista się wyrenderuje (po wyczyszczeniu wyszukiwania), potem przewijamy.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        itemRefs.current.get(focusId)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      });
    });
    const timer = setTimeout(() => {
      setHighlightId(null);
      doneRef.current?.();
    }, 2600);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      doneRef.current?.(); // np. przejście do innej zakładki przed końcem podświetlenia
    };
  }, [focusId]);
  const list = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return quotes;
    return quotes.filter((x) => fold(`${x.text} ${x.book.tytul} ${x.book.autor}`).includes(q));
  }, [quotes, query]);

  if (!quotes.length) {
    return (
      <div className="quotes-empty">
        <span className="quotes-empty-icon"><QuoteIcon size={40} /></span>
        <h2 className="serif">{t('quotesEmptyTitle')}</h2>
        <p>{t('quotesEmptyText')}</p>
      </div>
    );
  }

  return (
    <div className="quotes">
      <label className="search-box">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('quotesSearch')}
          aria-label={t('quotesSearch')}
        />
      </label>
      <div className="list-info">
        <span className="list-count">{t('quotesAll')}</span>
        <span className="muted">{t('nQuotes', { n: list.length })}</span>
      </div>
      {list.length === 0 ? (
        <p className="empty">{t('quotesNoResults')}</p>
      ) : (
        <ul className="quote-list">
          {list.map((q, i) => (
            <li
              key={q.id}
              className="appear"
              style={{ '--i': Math.min(i, 12) }}
              ref={(el) => (el ? itemRefs.current.set(q.id, el) : itemRefs.current.delete(q.id))}
            >
              <button
                type="button"
                className={`quote-card press ${highlightId === q.id ? 'quote-highlight' : ''}`}
                onClick={() => onOpenBook(q.book)}
              >
                <span className="quote-card-text serif">{q.text}</span>
                <span className="quote-card-source">
                  <BookCover book={q.book} className="quote-card-cover" />
                  <span className="quote-card-meta">
                    <strong>{q.book.tytul}</strong>
                    <span>{[q.book.autor, q.page && `s. ${q.page}`].filter(Boolean).join(' · ')}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint quotes-hint">{t('quotesHint')}</p>
    </div>
  );
}
