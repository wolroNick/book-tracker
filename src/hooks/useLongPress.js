import { useRef } from 'react';

// Rozpoznaje przytrzymanie (telefon) i prawy przycisk myszy (komputer).
// Zwraca propsy do podpięcia pod element; zwykłe kliknięcie działa dalej (onClick).
export function useLongPress(onLongPress, onClick, delay = 500) {
  const timer = useRef(null);
  const fired = useRef(false);
  const start = useRef(null);

  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
  };

  return {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      cancel();
      timer.current = setTimeout(() => {
        fired.current = true;
        if (navigator.vibrate) navigator.vibrate(15);
        onLongPress();
      }, delay);
    },
    onPointerMove: (e) => {
      // Przewijanie listy nie powinno uruchamiać menu.
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e) => {
      e.preventDefault();
      if (!fired.current) {
        cancel();
        fired.current = true;
        onLongPress();
      }
    },
    onClick: (e) => {
      if (fired.current) {
        e.preventDefault();
        fired.current = false;
        return;
      }
      onClick();
    },
  };
}
