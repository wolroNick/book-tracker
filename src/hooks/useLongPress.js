import { useRef } from 'react';

// Rozpoznaje przytrzymanie (telefon) i prawy przycisk myszy (komputer).
// Zwraca propsy do podpięcia pod element; zwykłe kliknięcie działa dalej (onClick).
export function useLongPress(onLongPress, onClick, delay = 500) {
  const timer = useRef(null);
  const fired = useRef(false);
  const start = useRef(null);
  const firedAt = useRef(0); // kiedy menu otworzyło przytrzymanie (żeby nie otworzyć go drugi raz)

  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
  };

  return {
    onPointerDown: (e) => {
      fired.current = false;
      if (e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY };
      cancel();
      timer.current = setTimeout(() => {
        fired.current = true;
        firedAt.current = Date.now();
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
      cancel();
      // Na telefonie przytrzymanie wywołuje też contextmenu – menu jest już otwarte.
      if (Date.now() - firedAt.current < 1000) return;
      fired.current = true;
      onLongPress();
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
