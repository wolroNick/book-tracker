import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import BookCover from './BookCover.jsx';
import { Pressable } from './BookViews.jsx';
import { readingDays } from '../lib/stats.js';
import { today } from '../lib/books.js';

function hueOf(title) {
  return [...(title || '?')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
}

// Tło bannera: rozmyta, powiększona okładka (albo kolor zastępczej okładki).
function Backdrop({ book }) {
  const [failed, setFailed] = useState(false);
  if (book.okladka_url && !failed) {
    return (
      <img
        className="now-backdrop"
        src={book.okladka_url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return <div className="now-backdrop" style={{ '--hue': hueOf(book.tytul) }} />;
}

// Banner „Teraz czytam” z książkami o statusie „czytam” (przewijany palcem, gdy jest ich kilka).
export default function NowReading({ books, onOpen, onQuick }) {
  const { t, lang } = useI18n();
  if (!books.length) return null;

  const sinceText = (b) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.data_rozpoczecia)) return '';
    const date = new Date(`${b.data_rozpoczecia}T12:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'long' });
    const day = readingDays({ data_rozpoczecia: b.data_rozpoczecia, data_zakonczenia: today() });
    return t('nowSince', { date, n: day ?? 1 });
  };

  return (
    <section className={`now-reading ${books.length > 1 ? 'multi' : ''}`} aria-label={t('nowReadingTitle')}>
      {books.map((b) => (
        <Pressable key={b.id} book={b} onOpen={onOpen} onQuick={onQuick} className="now-card press appear">
          <Backdrop book={b} />
          <span className="now-shade" />
          <span className="now-content">
            <BookCover book={b} className="now-cover" />
            <span className="now-text">
              <span className="now-label">{t('nowReadingTitle')}</span>
              <span className="now-title">{b.tytul}</span>
              {b.autor && <span className="now-author">{b.autor}</span>}
              <span className="now-since">{sinceText(b)}</span>
            </span>
          </span>
        </Pressable>
      ))}
    </section>
  );
}
