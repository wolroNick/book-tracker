import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

// Krótki komunikat na dole ekranu, opcjonalnie z przyciskiem „Cofnij”.
export function useToast() {
  const [toast, setToast] = useState(null); // { id, text, undo?, error? }
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((text, { undo, error } = {}) => {
    clearTimeout(timer.current);
    const id = Date.now() + Math.random();
    setToast({ id, text, undo, error });
    // Z „Cofnij” komunikat zostaje dłużej, żeby zdążyć zareagować.
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), undo ? 6500 : 3000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, show, hide };
}

export default function Toast({ toast, onUndo, onClose }) {
  const { t } = useI18n();
  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`toast ${toast.error ? 'toast-error' : ''}`} role="status">
          <span className="toast-text">{toast.text}</span>
          {toast.undo && (
            <button type="button" className="toast-undo" onClick={onUndo}>{t('undo')}</button>
          )}
          <button type="button" className="toast-close" onClick={onClose} aria-label={t('close')}>✕</button>
        </div>
      )}
    </div>
  );
}
