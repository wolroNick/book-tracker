import { useState } from 'react';
import Modal from './Modal.jsx';
import BookCover from './BookCover.jsx';
import { useI18n } from '../i18n/index.jsx';
import { today } from '../lib/books.js';

// Menu szybkich akcji po przytrzymaniu okładki.
export default function QuickActions({ book, onSave, onEdit, onClose }) {
  const { t, errorText } = useI18n();
  const [step, setStep] = useState('menu'); // menu | rate
  const [current, setCurrent] = useState(book);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (patch) => {
    setBusy(true);
    setError('');
    try {
      const saved = await onSave({ ...current, ...patch });
      setCurrent(saved);
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startReading = async () => {
    if (await save({ status: 'czytam', data_rozpoczecia: current.data_rozpoczecia || today() })) onClose();
  };

  const finishToday = async () => {
    if (await save({ status: 'przeczytane', data_zakonczenia: today() })) setStep('rate');
  };

  const rate = async (n) => {
    if (await save({ ocena: n ? String(n) : current.ocena })) onClose();
  };

  return (
    <Modal title={current.tytul} onClose={onClose}>
      <div className="quick-head">
        <BookCover book={current} className="quick-cover" />
        <div>
          <strong>{current.tytul}</strong>
          <div className="muted">{current.autor}</div>
          <div className="muted">{t(`status.${current.status}`)}</div>
        </div>
      </div>

      {step === 'menu' && (
        <div className="quick-actions">
          {current.status === 'do przeczytania' && (
            <button type="button" className="btn quick-btn" onClick={startReading} disabled={busy}>
              ▶️ {t('quickStart')}
            </button>
          )}
          {current.status !== 'przeczytane' && (
            <button type="button" className="btn btn-primary quick-btn" onClick={finishToday} disabled={busy}>
              ✅ {t('quickFinish')}
            </button>
          )}
          {current.status === 'przeczytane' && (
            <button type="button" className="btn quick-btn" onClick={() => setStep('rate')} disabled={busy}>
              ★ {t('quickRate')}
            </button>
          )}
          <button type="button" className="btn btn-ghost quick-btn" onClick={() => onEdit(current)} disabled={busy}>
            ✏️ {t('editBook')}
          </button>
        </div>
      )}

      {step === 'rate' && (
        <div className="quick-actions">
          {current.status === 'przeczytane' && current.data_zakonczenia === today() && (
            <p className="msg msg-ok">{t('quickFinished')}</p>
          )}
          <p>{t('quickRatePrompt')}</p>
          <div className="rating-picker">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                className={String(n) === String(current.ocena) ? 'active' : ''}
                onClick={() => rate(n)}
                disabled={busy}
              >
                {n}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => rate(null)} disabled={busy}>
            {t('skip')}
          </button>
        </div>
      )}

      {busy && <p className="hint">{t('saving')}</p>}
      {error && <p className="msg msg-error">{error}</p>}
    </Modal>
  );
}
