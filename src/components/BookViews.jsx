import BookCover from './BookCover.jsx';
import { useI18n } from '../i18n/index.jsx';
import { FORM_ICONS } from '../lib/books.js';
import { useLongPress } from '../hooks/useLongPress.js';

// Element listy/siatki: kliknięcie otwiera książkę, przytrzymanie – szybkie akcje.
function Pressable({ book, onOpen, onQuick, className, children }) {
  const handlers = useLongPress(() => onQuick(book), () => onOpen(book));
  return (
    <button type="button" className={className} {...handlers}>
      {children}
    </button>
  );
}

function FormBadge({ forma }) {
  const { t } = useI18n();
  if (!FORM_ICONS[forma]) return null;
  return (
    <span className="form-badge" title={t(`form.${forma}`)} aria-label={t(`form.${forma}`)}>
      {FORM_ICONS[forma]}
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
  return (
    <ul className="book-grid">
      {books.map((b) => (
        <li key={b.id}>
          <Pressable book={b} onOpen={onOpen} onQuick={onQuick} className="grid-card">
            <div className="grid-cover-wrap">
              <BookCover book={b} />
              <FormBadge forma={b.forma} />
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
      {books.map((b) => (
        <li key={b.id}>
          <Pressable book={b} onOpen={onOpen} onQuick={onQuick} className="list-row">
            <BookCover book={b} className="list-cover" />
            <div className="list-main">
              <span className="list-title">{b.tytul}</span>
              <span className="list-author">{b.autor}</span>
              <div className="list-meta">
                <StatusChip status={b.status} />
                {FORM_ICONS[b.forma] && <span>{FORM_ICONS[b.forma]} {t(`form.${b.forma}`)}</span>}
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
