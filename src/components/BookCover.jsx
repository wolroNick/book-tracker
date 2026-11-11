import { useEffect, useState } from 'react';

// Okładka z zastępnikiem, gdy brak linku lub obrazek się nie wczyta.
export default function BookCover({ book, className = '', onStatus }) {
  const [failed, setFailed] = useState(false);
  const url = book.okladka_url;

  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    const hue = [...(book.tytul || '?')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
    return (
      <div className={`cover cover-placeholder ${className}`} style={{ '--hue': hue }} aria-hidden="true">
        <span className="cover-placeholder-title">{book.tytul || '?'}</span>
        {book.autor && <span className="cover-placeholder-author">{book.autor}</span>}
      </div>
    );
  }

  return (
    <img
      className={`cover ${className}`}
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onLoad={() => onStatus?.('ok')}
      onError={() => {
        setFailed(true);
        onStatus?.('error');
      }}
    />
  );
}
