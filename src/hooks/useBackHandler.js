import { useEffect, useRef } from 'react';
import { pushBack, removeBack } from '../lib/backStack.js';

// Dopóki `active` jest true, systemowe „Wstecz” wywołuje `handler` zamiast opuszczać aplikację.
// Handler może zwrócić false, aby nie zamykać (np. użytkownik anulował porzucenie zmian).
export function useBackHandler(active, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return undefined;
    const id = pushBack(() => ref.current());
    return () => removeBack(id);
  }, [active]);
}
