import BookCover from './BookCover.jsx';
import { useI18n } from '../i18n/index.jsx';
import { FORM_ICONS } from '../lib/books.js';

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

export function BookGrid({ books, onOpen }) {
  return (
    <ul className="book-grid">
      {books.map((b) => (
        <li key={b.id}>
          <button type="button" className="grid-card" onClick={() => onOpen(b)}>
            <div className="grid-cover-wrap">
              <BookCover book={b} />
              <FormBadge forma={b.forma} />
              <Rating value={b.ocena} />
            </div>
            <span className="grid-title">{b.tytul}</span>
            <span className="grid-author">{b.autor}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function BookList({ books, onOpen }) {
  const { t } = useI18n();
  return (
    <ul className="book-list">
      {books.map((b) => (
        <li key={b.id}>
          <button type="button" className="list-row" onClick={() => onOpen(b)}>
            <BookCover book={b} className="list-cover" />
            <div className="list-main">
              <span className="list-title">{b.tytul}</span>
              <span className="list-author">{b.autor}</span>
              <div className="list-meta">
                <StatusChip status={b.status} />
                {FORM_ICONS[b.forma] && <span>{FORM_ICONS[b.forma]} {t(`form.${b.forma}`)}</span>}
                {b.gatunek && <span>{b.gatunek}</span>}
                {b.liczba_stron && <span>{b.liczba_stron} {t('pages')}</span>}
                {(b.data_rozpoczecia || b.data_zakonczenia) && (
                  <span>
                    {b.data_rozpoczecia || '…'} → {b.data_zakonczenia || '…'}
                  </span>
                )}
              </div>
            </div>
            <div className="list-rating">{b.ocena ? <><strong>{b.ocena}</strong>/10</> : null}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}
