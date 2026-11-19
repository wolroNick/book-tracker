import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { ExternalIcon } from './Icons.jsx';
import { useI18n } from '../i18n/index.jsx';
import { findPages, lubimyczytacUrl } from '../lib/bookSearch.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Uzupełnianie liczby stron: wyszukiwanie, przegląd i poprawki, zapis zatwierdzonych.
export default function FillPagesDialog({ books: initialBooks, onSaveMany, onClose }) {
  const { t, errorText } = useI18n();
  const [books] = useState(initialBooks); // lista zamrożona przy otwarciu
  const [phase, setPhase] = useState('intro'); // intro | running | review | saving
  const [done, setDone] = useState(0);
  const [rows, setRows] = useState([]); // { book, pages, isbn, source, checked }
  const [error, setError] = useState('');
  const stopRef = useRef(false);

  const start = async () => {
    stopRef.current = false;
    setPhase('running');
    const result = [];
    for (let i = 0; i < books.length; i++) {
      if (stopRef.current) break;
      const found = await findPages(books[i]);
      result.push({
        book: books[i],
        pages: found?.pages || '',
        isbn: found?.isbn || '',
        source: found?.source || '',
        checked: Boolean(found),
      });
      setDone(i + 1);
      await sleep(250); // nie przeciążamy darmowych API
    }
    setRows(result);
    setPhase('review');
  };

  const update = (i, patch) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const toSave = rows.filter((r) => r.checked && Number(r.pages) > 0);
  const foundCount = rows.filter((r) => r.source).length;

  const save = async () => {
    setPhase('saving');
    setError('');
    try {
      await onSaveMany(
        toSave.map((r) => ({ ...r.book, liczba_stron: String(Number(r.pages)), isbn: r.book.isbn || r.isbn })),
      );
      onClose();
    } catch (err) {
      setError(errorText(err));
      setPhase('review');
    }
  };

  return (
    <Modal
      title={t('fillPagesTitle')}
      onClose={() => {
        if (phase === 'saving') return false;
        stopRef.current = true;
        onClose();
        return true;
      }}
      wide
      footer={
        <>
          <span className="spacer" />
          {phase === 'intro' && (
            <>
              <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
              <button type="button" className="btn btn-primary" onClick={start}>{t('start')}</button>
            </>
          )}
          {phase === 'running' && (
            <button type="button" className="btn" onClick={() => (stopRef.current = true)}>{t('stop')}</button>
          )}
          {(phase === 'review' || phase === 'saving') && (
            <>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={phase === 'saving'}>{t('cancel')}</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={!toSave.length || phase === 'saving'}>
                {phase === 'saving' ? t('saving') : t('fillPagesSave', { n: toSave.length })}
              </button>
            </>
          )}
        </>
      }
    >
      {phase === 'intro' && <p>{t('fillPagesIntro', { n: books.length })}</p>}

      {phase === 'running' && (
        <>
          <progress max={books.length} value={done} className="progress" />
          <p>{t('fillProgress', { done, total: books.length })}</p>
        </>
      )}

      {(phase === 'review' || phase === 'saving') && (
        <>
          <p className="msg msg-ok">{t('fillPagesFound', { found: foundCount, total: rows.length })}</p>
          <p className="hint">{t('fillPagesReviewHint')}</p>
          {error && <p className="msg msg-error">{error}</p>}
          <ul className="pages-list">
            {rows.map((r, i) => (
              <li key={r.book.id} className={`pages-row ${r.source ? '' : 'missing'}`}>
                <input
                  type="checkbox"
                  checked={r.checked}
                  onChange={(e) => update(i, { checked: e.target.checked })}
                  aria-label={t('fillPagesInclude', { title: r.book.tytul })}
                />
                <span className="pages-book">
                  <strong>{r.book.tytul}</strong>
                  <span className="muted">
                    {[r.book.autor, r.source ? t('fillPagesFrom', { source: r.source }) : t('fillPagesNotFound')].filter(Boolean).join(' · ')}
                  </span>
                  {!r.source && (
                    <a className="pages-lc" href={lubimyczytacUrl(r.book)} target="_blank" rel="noopener noreferrer">
                      {t('searchLubimyczytac')} <ExternalIcon />
                    </a>
                  )}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="pages-input"
                  value={r.pages}
                  placeholder="—"
                  onChange={(e) => {
                    const pages = e.target.value.replace(/[^\d]/g, '');
                    update(i, { pages, checked: Number(pages) > 0 });
                  }}
                  aria-label={t('field.liczba_stron')}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
