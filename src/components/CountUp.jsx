import { useEffect, useState } from 'react';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Liczba „doliczająca się” od zera do wartości (ok. 0,9 s).
export default function CountUp({ value, format, duration = 900 }) {
  const [shown, setShown] = useState(reducedMotion() ? value : 0);

  useEffect(() => {
    if (value === null || reducedMotion()) {
      setShown(value);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{value === null ? '–' : format(shown, value)}</>;
}
