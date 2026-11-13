import BookCover from './BookCover.jsx';
import { useI18n } from '../i18n/index.jsx';
import { FORM_ICONS } from '../lib/books.js';
import { useLongPress } from '../hooks/useLongPress.js';
import { FormIcon } from './Icons.jsx';

// Kolejne elementy pojawiają się z lekkim opóźnieniem (max ~0,6 s łącznie).
const stagger = (i) => ({ '--i': Math.min(i, 12) });

// Element listy/siatki: kliknięcie otwiera książkę, przytrzymanie – szybkie akcje.
export function Pressable({ book, onOpen, onQuick, className, style, children }) {
  const handlers = useLongPress(() => onQuick(book), () => onOpen(book));
  return (
    <button type="button" className={className} style={style} {...handlers}>
      {children}
    </button>
  );
}

function FormBadge({ forma }) {
  const { t } = useI18n();
  if (!FORM_ICONS[forma]) return null;
  return (
    <span className="form-badge" title={t(`form.${forma}`)} role="img" aria-label={t(`form.${forma}`)}>
      <FormIcon forma={forma} size={13} />
    </span>
  );
}

function Rating({ value }) {
  if (!value) return null;
  return <span className="rating-badge" title={`${value}/10`}>★ {value}</span>;
}

function StatusChip({ status }) {
  const { t } = useI18n();
  if (!status) return null;
  return <span className={`status-chip status-${status.replace(/\s/g, '-')}`}>{t(`status.${status}`)}</span>;
}

export function BookGrid({ books, onOpen, onQuick }) {
  const { t } = useI18n();
  return (
    <ul className="book-grid">
      {books.map((b, i) => (
        <li key={b.id} className="appear" style={stagger(i)}>
          <Pressable book={b} onOpen={onOpen} onQuick={onQuick} className="grid-card press">
            <div className="grid-cover-wrap">
              <BookCover book={b} />
              <FormBadge forma={b.forma} />
              {b.ponowne && <span className="reread-badge" title={t('reread')} aria-label={t('reread')}>🔁</span>}
              <Rating value={b.ocena} />
            </div>
            <span className="grid-title">{b.tytul}</span>
            <span className="grid-author">{b.autor}</span>
          </Pressable>
        </li>
      ))}
    </ul>
  );
}

export function BookList({ books, onOpen, onQuick }) {
  const { t } = useI18n();
  return (
    <ul className="book-list">
      {books.map((b, i) => (
        <li key={b.id} className="appear" style={stagger(i)}>
          <Pressable book={b} onOpen={onOpen} onQuick={onQuick} className="list-row press">
            <BookCover book={b} className="list-cover" />
            <div className="list-main">
              <span className="list-title">{b.tytul}</span>
              <span className="list-author">{b.autor}</span>
              <div className="list-meta">
                <StatusChip status={b.status} />
                {b.ponowne && <span className="status-chip status-reread">🔁 {t('reread')}</span>}
                {FORM_ICONS[b.forma] && <span className="meta-icon"><FormIcon forma={b.forma} /> {t(`form.${b.forma}`)}</span>}
                {b.gatunek && <span>{b.gatunek}</span>}
                {b.liczba_stron && <span>{b.liczba_stron} {t('pages')}</span>}
                {b.notatki && <span title={t('field.notatki')}>📝</span>}
                {(b.data_rozpoczecia || b.data_zakonczenia) && (
                  <span>
                    {b.data_rozpoczecia || '…'} → {b.data_zakonczenia || '…'}
                  </span>
                )}
              </div>
            </div>
            <div className="list-rating">{b.ocena ? <><strong>{b.ocena}</strong>/10</> : null}</div>
          </Pressable>
        </li>
      ))}
    </ul>
  );
}

// Szare migoczące zarysy kart podczas pierwszego wczytywania.
export function SkeletonGrid() {
  return (
    <ul className="book-grid" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <li key={i}>
          <div className="shimmer skeleton-cover" />
          <div className="shimmer skeleton-line" />
          <div className="shimmer skeleton-line short" />
        </li>
      ))}
    </ul>
  );
}
