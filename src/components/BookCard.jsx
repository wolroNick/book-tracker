import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useBackHandler } from '../hooks/useBackHandler.js';
import BookCover from './BookCover.jsx';
import { Backdrop } from './NowReading.jsx';
import { CheckDraw, FormIcon, QuoteIcon } from './Icons.jsx';
import { FORM_ICONS, today } from '../lib/books.js';
import { readingDays } from '../lib/stats.js';
import { renderNotes } from '../lib/notes.js';
import { extractQuotes } from '../lib/quotes.js';

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
const RereadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
);

// Notatki bez linii cytatów („>”) – cytaty karta pokazuje osobno.
const notesWithoutQuotes = (text) =>
  String(text || '').split('\n').filter((l) => !/^\s*>/.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();

// Karta książki: podgląd wszystkich informacji, ocena gwiazdkami i najczęstsze akcje.
export default function BookCard({ book, onClose, onEdit, onAddQuote, onSave, canReread }) {
  const { t, lang, errorText } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justFinished, setJustFinished] = useState(false);

  useBackHandler(true, onClose);
  useEffect(() => {
    // Esc zamyka kartę tylko wtedy, gdy nad nią nie ma innego okna (np. formularza edycji).
    const onKey = (e) => e.key === 'Escape' && !document.querySelector('.modal-backdrop') && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  const quotes = useMemo(() => extractQuotes([book]), [book]);
  const notesHtml = useMemo(() => {
    const rest = notesWithoutQuotes(book.notatki);
    return rest ? renderNotes(rest) : '';
  }, [book.notatki]);

  const dateText = (d) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const days = readingDays(book);
  const readingSince = book.status === 'czytam' ? readingDays({ data_rozpoczecia: book.data_rozpoczecia, data_zakonczenia: today() }) : null;

  const tiles = [
    book.data_rozpoczecia && { label: t('field.data_rozpoczecia'), value: dateText(book.data_rozpoczecia) },
    book.data_zakonczenia && { label: t('field.data_zakonczenia'), value: dateText(book.data_zakonczenia) },
    days && book.status === 'przeczytane' && { label: t('cardReadingTime'), value: t('nDays', { n: days }) },
    readingSince && { label: t('cardReadingSince'), value: t('nDays', { n: readingSince }) },
    book.liczba_stron && { label: t('field.liczba_stron'), value: book.liczba_stron },
    book.status === 'czytam' && !book.ocena && { label: t('field.ocena'), value: t('cardRateLater'), muted: true },
  ].filter(Boolean);

  const save = async (patch) => {
    setBusy(true);
    setError('');
    try {
      await onSave({ ...book, ...patch });
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const rate = (n) => !busy && save({ ocena: String(n) === String(book.ocena) ? '' : String(n) });
  const finishToday = async () => {
    if (await save({ status: 'przeczytane', data_zakonczenia: today() })) setJustFinished(true);
  };
  const startReading = () => save({ status: 'czytam', data_rozpoczecia: book.data_rozpoczecia || today() });
  const reread = async () => {
    if (!window.confirm(`${t('rereadConfirm', { title: book.tytul })}\n\n${t('rereadHint')}`)) return;
    if (await save({ id: '', status: 'czytam', data_rozpoczecia: today(), data_zakonczenia: '', ocena: '', notatki: '', ponowne: book.ponowne || book.id })) onClose();
  };

  const showStars = book.status === 'przeczytane';
  const rating = Number(book.ocena) || 0;

  return (
    <div className="card-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="book-card" role="dialog" aria-modal="true" aria-label={book.tytul}>
        <div className="book-card-scroll">
          <header className="card-hero">
            <Backdrop book={book} />
            <span className="card-hero-shade" />
            <div className="card-hero-bar">
              <button type="button" className="card-round-btn" onClick={onClose} aria-label={t('close')}>✕</button>
              <button type="button" className="card-edit-btn" onClick={onEdit}>
                <PencilIcon /> {t('cardEdit')}
              </button>
            </div>
            <div className="card-hero-main">
              <BookCover book={book} className="card-cover" />
              <div className="card-hero-text">
                {book.status === 'czytam' && <span className="now-label">{t('nowReadingTitle')}</span>}
                <h2 className="serif card-title">{book.tytul}</h2>
                {book.autor && <span className="card-author">{book.autor}</span>}
              </div>
            </div>
          </header>

          <div className="card-body">
            <div className="card-chips">
              <span className={`status-chip status-${book.status.replace(/\s/g, '-')}`}>{t(`status.${book.status}`)}</span>
              {FORM_ICONS[book.forma] && (
                <span className="card-chip"><FormIcon forma={book.forma} size={13} /> {t(`form.${book.forma}`)}</span>
              )}
              {book.gatunek && <span className="card-chip">{book.gatunek}</span>}
              {book.ponowne && <span className="status-chip status-reread">🔁 {t('reread')}</span>}
            </div>

            {justFinished && (
              <div className="finished card-finished">
                <CheckDraw />
                <p className="serif finished-text">{t('cardFinished')}</p>
              </div>
            )}

            {showStars && (
              <section className="card-rating">
                <div className="card-rating-head">
                  <span className="card-label">{t('cardYourRating')}</span>
                  <span className="serif card-rating-value">
                    {rating ? <>{rating}<small>/10</small></> : <small>{t('noRating')}</small>}
                  </span>
                </div>
                <div className="card-stars" role="radiogroup" aria-label={t('field.ocena')}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={n === rating}
                      aria-label={`${t('field.ocena')} ${n}`}
                      className={`card-star ${n <= rating ? 'on' : ''} ${n === rating ? 'current' : ''}`}
                      onClick={() => rate(n)}
                      disabled={busy}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span className="hint">{t('cardRateHint')}</span>
              </section>
            )}

            {tiles.length > 0 && (
              <div className="card-tiles">
                {tiles.map((x) => (
                  <div key={x.label} className="card-tile">
                    <span className="card-label">{x.label}</span>
                    <span className={`card-tile-value ${x.muted ? 'muted' : ''}`}>{x.value}</span>
                  </div>
                ))}
              </div>
            )}

            {notesHtml || quotes.length ? (
              <>
                {notesHtml && (
                  <section>
                    <h3 className="serif card-section-title">{t('field.notatki')}</h3>
                    <div className="notes-preview card-notes" dangerouslySetInnerHTML={{ __html: notesHtml }} />
                  </section>
                )}
                {quotes.length > 0 && (
                  <section>
                    <div className="card-section-head">
                      <h3 className="serif card-section-title">{t('tab.quotes')}</h3>
                      <span className="muted">{t('nQuotes', { n: quotes.length })}</span>
                    </div>
                    <ul className="card-quotes">
                      {quotes.map((q) => (
                        <li key={q.id} className="card-quote">
                          <QuoteIcon size={20} />
                          <span className="serif card-quote-text">{q.text}</span>
                          {q.page && <span className="quote-page">s. {q.page}</span>}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            ) : (
              <section>
                <h3 className="serif card-section-title">{t('cardNotesAndQuotes')}</h3>
                <button type="button" className="card-empty-notes" onClick={onAddQuote}>
                  <QuoteIcon size={20} /> {t('cardNoNotes')}
                </button>
              </section>
            )}

            {error && <p className="msg msg-error">{error}</p>}
          </div>
        </div>

        <footer className="card-actions">
          {book.status === 'przeczytane' && canReread && (
            <button type="button" className="btn card-action" onClick={reread} disabled={busy}>
              <RereadIcon /> {t('quickReread')}
            </button>
          )}
          <button type="button" className={`btn card-action ${book.status === 'przeczytane' ? 'btn-primary' : ''}`} onClick={onAddQuote} disabled={busy}>
            <QuoteIcon /> {t('quoteAdd')}
          </button>
          {book.status === 'czytam' && (
            <button type="button" className="btn btn-primary card-action card-action-main" onClick={finishToday} disabled={busy}>
              <CheckIcon /> {t('quickFinish')}
            </button>
          )}
          {book.status === 'do przeczytania' && (
            <button type="button" className="btn btn-primary card-action card-action-main" onClick={startReading} disabled={busy}>
              ▶ {t('cardStartReading')}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
