import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { ExternalIcon } from './Icons.jsx';
import { useI18n } from '../i18n/index.jsx';
import { findCover, lubimyczytacUrl } from '../lib/bookSearch.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function FillCoversDialog({ books: initialBooks, onSaveMany, onEdit, onClose }) {
  const { t, errorText } = useI18n();
  // Lista zamrożona przy otwarciu – po zapisie okładek nie zmienia się w trakcie.
  const [books] = useState(initialBooks);
  const [phase, setPhase] = useState('intro'); // intro | running | saving | done
  const [done, setDone] = useState(0);
  const [found, setFound] = useState(0);
  const [notFound, setNotFound] = useState([]);
  const [error, setError] = useState('');
  const stopRef = useRef(false);

  const total = books.length;

  const start = async () => {
    stopRef.current = false;
    setPhase('running');
    const updated = [];
    const missing = [];
    for (let i = 0; i < books.length; i++) {
      if (stopRef.current) break;
      const url = await findCover(books[i]);
      if (url) updated.push({ ...books[i], okladka_url: url });
      else missing.push(books[i]);
      setDone(i + 1);
      setFound(updated.length);
      await sleep(250); // nie przeciążamy darmowego API
    }
    setNotFound(missing);
    if (updated.length) {
      setPhase('saving');
      try {
        await onSaveMany(updated);
      } catch (err) {
        setError(errorText(err));
      }
    }
    setPhase('done');
  };

  const running = phase === 'running' || phase === 'saving';

  return (
    <Modal
      title={t('fillCoversTitle')}
      onClose={() => {
        if (phase === 'saving') return;
        stopRef.current = true;
        onClose();
      }}
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
          {phase === 'done' && (
            <button type="button" className="btn btn-primary" onClick={onClose}>{t('close')}</button>
          )}
        </>
      }
    >
      {phase === 'intro' && <p>{t('fillCoversIntro', { n: total })}</p>}

      {running && (
        <>
          <progress max={total} value={done} className="progress" />
          <p>{phase === 'saving' ? t('fillSaving') : t('fillProgress', { done, total })}</p>
        </>
      )}

      {phase === 'done' && (
        <>
          <p className="msg msg-ok">{t('fillDone', { found, total })}</p>
          {error && <p className="msg msg-error">{error}</p>}
          {notFound.length > 0 && (
            <>
              <p>{t('fillNotFound')}</p>
              <ul className="notfound-list">
                {notFound.map((b) => (
                  <li key={b.id}>
                    <button type="button" className="link-btn" onClick={() => onEdit(b)}>
                      {b.tytul}
                    </button>
                    <a href={lubimyczytacUrl(b)} target="_blank" rel="noopener noreferrer" className="btn btn-small btn-lc">
                      Lubimyczytać <ExternalIcon />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
