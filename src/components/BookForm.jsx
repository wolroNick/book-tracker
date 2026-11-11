import { useState } from 'react';
import Modal from './Modal.jsx';
import BookCover from './BookCover.jsx';
import { ExternalIcon } from './Icons.jsx';
import { useI18n } from '../i18n/index.jsx';
import { STATUSES, emptyBook, today } from '../lib/books.js';
import { findCover, lubimyczytacUrl, searchBooks } from '../lib/bookSearch.js';

function BookSearch({ initialQuery, onPick }) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | error

  const run = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setState('loading');
    try {
      setResults(await searchBooks(query));
      setState('idle');
    } catch {
      setResults(null);
      setState('error');
    }
  };

  return (
    <section className="book-search">
      <form onSubmit={run} className="inline-form">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('findBookHint')}
          aria-label={t('findBook')}
        />
        <button type="submit" className="btn" disabled={state === 'loading'}>
          {state === 'loading' ? t('searching') : t('search')}
        </button>
      </form>
      {state === 'error' && <p className="msg msg-error">{t('searchError')}</p>}
      {results && results.length === 0 && <p className="msg">{t('noSearchResults')}</p>}
      {results && results.length > 0 && (
        <ul className="search-results">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="search-result"
                onClick={() => {
                  onPick(r);
                  setResults(null);
                }}
              >
                <BookCover book={r} className="result-cover" />
                <span className="result-text">
                  <strong>{r.tytul}</strong>
                  <span>{r.autor}</span>
                  <small>
                    {[r.rok, r.liczba_stron && `${r.liczba_stron} ${t('pages')}`, r.isbn, r.source]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function BookForm({ book, genres, onSave, onDelete, onClose }) {
  const { t, errorText } = useI18n();
  const isNew = !book?.id;
  const [form, setForm] = useState(() => ({ ...emptyBook(), ...book }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [coverState, setCoverState] = useState('idle'); // idle | searching | notfound | error
  const [showSearch, setShowSearch] = useState(isNew);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const setStatus = (status) => {
    setForm((f) => {
      const next = { ...f, status };
      // Wygodne domyślne daty przy zmianie statusu.
      if (status === 'czytam' && !f.data_rozpoczecia) next.data_rozpoczecia = today();
      if (status === 'przeczytane' && !f.data_zakonczenia) next.data_zakonczenia = today();
      return next;
    });
  };

  const pickResult = (r) => {
    setForm((f) => ({
      ...f,
      tytul: r.tytul || f.tytul,
      autor: r.autor || f.autor,
      isbn: r.isbn || f.isbn,
      liczba_stron: r.liczba_stron || f.liczba_stron,
      okladka_url: r.okladka_url || f.okladka_url,
    }));
    setCoverState('idle');
    setShowSearch(false);
  };

  const autoFindCover = async () => {
    setCoverState('searching');
    const url = await findCover(form);
    if (url) {
      set('okladka_url', url);
      setCoverState('idle');
    } else {
      setCoverState('notfound');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.tytul.trim()) {
      setError(t('titleRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('confirmDelete', { title: form.tytul }))) return;
    setBusy(true);
    setError('');
    try {
      await onDelete(form.id);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const noCover = !form.okladka_url || coverState === 'error';

  return (
    <Modal
      title={isNew ? t('newBook') : t('editBook')}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
              {t('delete')}
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </button>
          <button type="submit" form="book-form" className="btn btn-primary" disabled={busy}>
            {busy ? t('saving') : t('save')}
          </button>
        </>
      }
    >
      {showSearch ? (
        <BookSearch initialQuery={isNew ? '' : form.isbn || form.tytul} onPick={pickResult} />
      ) : (
        <button type="button" className="link-btn" onClick={() => setShowSearch(true)}>
          🔍 {t('findBook')}
        </button>
      )}

      <form id="book-form" className="book-form" onSubmit={submit}>
        <div className="form-cover">
          <BookCover
            key={form.okladka_url}
            book={form}
            className="form-cover-img"
            onStatus={(s) => setCoverState(s === 'error' ? 'error' : 'idle')}
          />
          <label className="field">
            <span>{t('field.okladka_url')}</span>
            <input
              type="url"
              value={form.okladka_url}
              onChange={(e) => {
                set('okladka_url', e.target.value.trim());
                setCoverState('idle');
              }}
              placeholder="https://…"
            />
          </label>
          {noCover && (
            <div className="cover-actions">
              <button
                type="button"
                className="btn btn-small"
                onClick={autoFindCover}
                disabled={coverState === 'searching' || !form.tytul}
              >
                {coverState === 'searching' ? t('searching') : t('findCover')}
              </button>
              {coverState === 'notfound' && <p className="msg">{t('coverNotFound')}</p>}
              <a
                className="btn btn-small btn-lc"
                href={lubimyczytacUrl(form)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('searchLubimyczytac')} <ExternalIcon />
              </a>
              <p className="hint">{t('coverHint')}</p>
            </div>
          )}
        </div>

        <div className="form-fields">
          <label className="field field-full">
            <span>{t('field.tytul')} *</span>
            <input value={form.tytul} onChange={(e) => set('tytul', e.target.value)} required />
          </label>
          <label className="field field-full">
            <span>{t('field.autor')}</span>
            <input value={form.autor} onChange={(e) => set('autor', e.target.value)} />
          </label>

          <div className="field field-full">
            <span>{t('field.status')}</span>
            <div className="segmented">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={form.status === s ? 'active' : ''}
                  onClick={() => setStatus(s)}
                >
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="field field-full">
            <span>{t('field.ocena')}</span>
            <div className="rating-picker">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={String(n) === String(form.ocena) ? 'active' : ''}
                  onClick={() => set('ocena', String(n) === String(form.ocena) ? '' : String(n))}
                  aria-pressed={String(n) === String(form.ocena)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>{t('field.data_rozpoczecia')}</span>
            <input type="date" value={form.data_rozpoczecia} onChange={(e) => set('data_rozpoczecia', e.target.value)} />
          </label>
          <label className="field">
            <span>{t('field.data_zakonczenia')}</span>
            <input type="date" value={form.data_zakonczenia} onChange={(e) => set('data_zakonczenia', e.target.value)} />
          </label>

          <label className="field">
            <span>{t('field.gatunek')}</span>
            <input list="genre-list" value={form.gatunek} onChange={(e) => set('gatunek', e.target.value)} />
            <datalist id="genre-list">
              {genres.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>{t('field.liczba_stron')}</span>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={form.liczba_stron}
              onChange={(e) => set('liczba_stron', e.target.value)}
            />
          </label>
          <label className="field field-full">
            <span>{t('field.isbn')}</span>
            <input value={form.isbn} inputMode="numeric" onChange={(e) => set('isbn', e.target.value.trim())} />
          </label>
          <label className="field field-full">
            <span>{t('field.notatki')}</span>
            <textarea rows={4} value={form.notatki} onChange={(e) => set('notatki', e.target.value)} />
          </label>
        </div>
      </form>

      {error && <p className="msg msg-error">{error}</p>}
    </Modal>
  );
}
