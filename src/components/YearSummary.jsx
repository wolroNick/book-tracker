import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import BookCover from './BookCover.jsx';
import { QuoteIcon, SparkleIcon } from './Icons.jsx';
import { computeSummary } from '../lib/yearSummary.js';
import { renderShareImage } from '../lib/shareImage.js';

const BACKGROUNDS = {
  intro: 'linear-gradient(160deg, #2b2340 0%, #6a3b5c 55%, #c2683f 100%)',
  numbers: 'linear-gradient(160deg, #1f4d44 0%, #2f6f62 60%, #3f8a6f 100%)',
  top: 'linear-gradient(160deg, #3a1f3d 0%, #5e2f5a 60%, #8c4a62 100%)',
  records: 'linear-gradient(160deg, #2a2f4a 0%, #3c4a7a 60%, #5a6aa0 100%)',
  profile: 'linear-gradient(160deg, #4a2a1c 0%, #8a4a2a 55%, #c2683f 100%)',
  quote: 'linear-gradient(160deg, #1f1d1a 0%, #3a332c 60%, #5a4a3a 100%)',
  compare: 'linear-gradient(160deg, #1f4d44 0%, #2f6f62 60%, #5a8f6f 100%)',
  final: 'linear-gradient(160deg, #2b2340 0%, #4a2f50 60%, #6a3b5c 100%)',
};
const FORM_COLORS = { papier: '#ffd56b', audiobook: '#7fc8b4', 'e-book': '#f3a77c' };

// Pełnoekranowe „Podsumowanie roku” – ekrany przewijane dotknięciem jak relacje.
export default function YearSummary({ books, year, goal, quotes, onClose }) {
  const { t, lang } = useI18n();
  // Liczone raz przy otwarciu (losowy cytat roku nie zmienia się w trakcie oglądania).
  const s = useMemo(() => computeSummary(books, year, { goal, quotes }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [image, setImage] = useState(null); // { blob, url }
  const [busy, setBusy] = useState(false);

  const nf = (v, d = 0) => v.toLocaleString(lang, { maximumFractionDigits: d, minimumFractionDigits: d });
  const word = (key, n) => t(key, { n }).replace(/^\S+\s/, ''); // sama odmiana słowa, bez liczby
  const monthName = (m, style = 'long') => new Date(2000, m, 1).toLocaleString(lang, { month: style });
  const dateText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'long' });

  const slides = useMemo(() => {
    const list = ['intro', 'numbers'];
    if (s.top3.length) list.push('top');
    if (s.records.longest || s.records.fastest) list.push('records');
    list.push('profile');
    if (s.quote) list.push('quote');
    if (s.prev) list.push('compare');
    list.push('final');
    return list;
  }, [s]);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const go = (d) => setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + d)));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Grafika do udostępnienia – przygotowywana na ostatnim ekranie.
  useEffect(() => {
    if (slide !== 'final' || image) return undefined;
    let cancelled = false;
    const chips = [];
    if (s.genre) chips.push({ text: t('ysChipGenre', { genre: s.genre.label }) });
    if (s.forms.length) {
      const f = [...s.forms].sort((a, b) => b.count - a.count)[0];
      chips.push({ text: t(`ysFormPct.${f.key}`, { pct: f.pct }) });
    }
    if (s.goalReached) chips.push({ text: t('ysChipGoal', { count: s.count, goal: s.goal }), gold: true });
    const stats = [
      { value: nf(s.count), label: word('nBooks', s.count) },
      { value: nf(s.pages), label: word('nPages', s.pages) },
    ];
    if (s.avgRating !== null) stats.push({ value: nf(s.avgRating, 1), label: t('ysAvgRating') });
    renderShareImage(s, { heading: t('ysHeading'), top3: t('ysTop3Short'), stats, chips, footer: t('appName') })
      .then((blob) => !cancelled && setImage({ blob, url: URL.createObjectURL(blob) }))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slide]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => image && URL.revokeObjectURL(image.url), [image]);

  const fileName = `moj-${year}-w-ksiazkach.png`;
  const saveImage = () => {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image.url;
    a.download = fileName;
    a.click();
  };
  const shareImage = async () => {
    if (!image) return;
    const file = new File([image.blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      setBusy(true);
      try {
        await navigator.share({ files: [file], title: t('ysCardTitle', { year }) });
      } catch { /* anulowano */ }
      setBusy(false);
    } else {
      saveImage(); // przeglądarka nie umie udostępniać plików – zapisujemy obrazek
    }
  };

  const maxMonth = Math.max(...s.months, 1);
  const diff = s.prev ? s.count - s.prev.count : 0;

  return (
    <div className="ys" style={{ background: BACKGROUNDS[slide] }} role="dialog" aria-modal="true" aria-label={t('ysCardTitle', { year })}>
      <div className="ys-bars">
        {slides.map((k, i) => (
          <span key={k} className="ys-bar"><span style={{ width: i <= index ? '100%' : '0%' }} /></span>
        ))}
      </div>
      <button type="button" className="ys-close" onClick={onClose} aria-label={t('close')}>✕</button>
      <button type="button" className="ys-tap ys-tap-prev" onClick={() => go(-1)} aria-label={t('ysPrev')} />
      <button type="button" className="ys-tap ys-tap-next" onClick={() => go(1)} aria-label={t('ysNext')} />

      <div className={`ys-slide ${slide === 'intro' || slide === 'final' ? 'ys-center' : ''}`} key={slide}>
        {slide === 'intro' && (
          <>
            <span className="ys-in ys-gold"><SparkleIcon /></span>
            <div className="ys-in d1 serif ys-year">{year}</div>
            <div className="ys-in d2 serif ys-sub">{t('ysTitle')}</div>
            <div className="ys-in d4 ys-hint">{t('ysStart')}</div>
          </>
        )}

        {slide === 'numbers' && (
          <>
            <div className="ys-in ys-lead">{t('ysYouRead')}</div>
            <div className="ys-in d1 serif ys-huge">{nf(s.count)}</div>
            <div className="ys-in d1 serif ys-word">{word('nBooks', s.count)}</div>
            <div className="ys-in d2 ys-line"><strong className="serif">{nf(s.pages)}</strong> {word('nPages', s.pages)}</div>
            <div className="ys-in d3 ys-muted">{t('ysPerMonth', { n: nf(s.perMonth, s.perMonth < 10 ? 1 : 0) })}</div>
            {s.goal && (
              <div className={`ys-in d4 ys-pill ${s.goalReached ? 'gold' : ''}`}>
                {s.goalReached ? `✓ ${t('ysGoalReached', { goal: s.goal })}` : t('ysGoalMissed', { count: s.count, goal: s.goal })}
              </div>
            )}
          </>
        )}

        {slide === 'top' && (
          <>
            <div className="ys-in serif ys-title">{t('ysTop3')}</div>
            <div className="ys-in d1 ys-muted">{t('ysTop3Sub')}</div>
            <div className="ys-podium">
              {[s.top3[1], s.top3[0], s.top3[2]].map((b, i) => {
                if (!b) return <span key={i} />;
                const place = i === 1 ? 1 : i === 0 ? 2 : 3;
                return (
                  <div key={b.id} className={`ys-in d${place + 1} ys-place place-${place}`}>
                    <BookCover book={b} className="ys-cover" />
                    <span className="serif ys-place-no">{place}</span>
                    <span className="ys-place-title">{b.tytul}</span>
                    <span className="ys-gold">★ {b.ocena}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {slide === 'records' && (
          <>
            <div className="ys-in serif ys-title">{t('ysRecords')}</div>
            {s.records.longest && (
              <div className="ys-in d1 ys-card">
                <span className="ys-label">{t('ysLongest')}</span>
                <span className="serif ys-card-title">{s.records.longest.tytul}</span>
                <span>{[s.records.longest.autor, t('nPages', { n: nf(Number(s.records.longest.liczba_stron)) })].filter(Boolean).join(' · ')}</span>
              </div>
            )}
            {s.records.fastest && (
              <div className="ys-in d2 ys-card">
                <span className="ys-label">{t('ysFastest')}</span>
                <span className="serif ys-card-title">{s.records.fastest.book.tytul}</span>
                <span>{[s.records.fastest.book.autor, t('ysInDays', { n: s.records.fastest.days })].filter(Boolean).join(' · ')}</span>
              </div>
            )}
            {s.records.slowest && (
              <div className="ys-in d3 ys-card">
                <span className="ys-label">{t('ysSlowest')}</span>
                <span className="serif ys-card-title">{s.records.slowest.book.tytul}</span>
                <span>{t('ysDaysRange', { n: s.records.slowest.days, from: dateText(s.records.slowest.book.data_rozpoczecia), to: dateText(s.records.slowest.book.data_zakonczenia) })}</span>
              </div>
            )}
          </>
        )}

        {slide === 'profile' && (
          <>
            <div className="ys-in serif ys-title">{t('ysProfile')}</div>
            {s.genre && (
              <div className="ys-in d1 ys-fact">
                <span className="ys-label">{t('ysGenre')}</span>
                <span className="serif ys-fact-value">{s.genre.label} <small>· {t('nBooks', { n: s.genre.count })}</small></span>
              </div>
            )}
            {s.author && (
              <div className="ys-in d2 ys-fact">
                <span className="ys-label">{t('ysAuthor')}</span>
                <span className="serif ys-fact-value">{s.author.label} <small>· {t('nBooks', { n: s.author.count })}</small></span>
              </div>
            )}
            {s.forms.length > 0 && (
              <div className="ys-in d3 ys-fact">
                <span className="ys-label">{t('ysForms')}</span>
                <div className="ys-split">
                  {s.forms.map((f) => <span key={f.key} style={{ flex: f.count, background: FORM_COLORS[f.key] }} />)}
                </div>
                <div className="ys-legend">
                  {s.forms.map((f) => (
                    <span key={f.key}><i style={{ background: FORM_COLORS[f.key] }} /> {t(`form.${f.key}`)} {f.pct}%</span>
                  ))}
                </div>
              </div>
            )}
            {s.bestMonth !== null && (
              <div className="ys-in d4 ys-fact">
                <span className="ys-label">{t('ysBestMonth')} <strong>{monthName(s.bestMonth)}</strong></span>
                <div className="ys-months">
                  {s.months.map((v, i) => (
                    <span
                      key={i}
                      className={`ys-grow ${i === s.bestMonth ? 'best' : ''}`}
                      style={{ height: `${Math.max(v ? 6 : 2, (v / maxMonth) * 100)}%`, animationDelay: `${0.9 + i * 0.05}s` }}
                      title={`${monthName(i)}: ${v}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {slide === 'quote' && (
          <>
            <div className="ys-in ys-label">{t('ysQuote')}</div>
            <span className="ys-in d1 ys-gold ys-quote-icon"><QuoteIcon size={44} /></span>
            <div className="ys-in d2 serif ys-quote">{s.quote.text}</div>
            <div className="ys-in d3 ys-muted">
              — {[s.quote.book.tytul, s.quote.book.autor].filter(Boolean).join(', ')}{s.quote.page ? ` · s. ${s.quote.page}` : ''}
            </div>
            <div className="ys-in d4 ys-note">{t('ysQuoteNote', { year })}</div>
          </>
        )}

        {slide === 'compare' && (
          <>
            <div className="ys-in serif ys-title">{t('ysCompare', { prev: year - 1 })}</div>
            <div className="ys-compare">
              {[{ y: year - 1, v: s.prev.count }, { y: year, v: s.count }].map((c, i) => (
                <div key={c.y} className="ys-compare-col">
                  <span className={`ys-in d${i + 2} ${i ? 'serif ys-gold ys-compare-now' : ''}`}>{c.v}</span>
                  <span
                    className={`ys-grow ${i ? 'now' : ''}`}
                    style={{ height: `${(c.v / Math.max(s.count, s.prev.count)) * 170}px`, animationDelay: `${0.2 + i * 0.2}s` }}
                  />
                  <span className={i ? 'ys-strong' : 'ys-muted'}>{c.y}</span>
                </div>
              ))}
            </div>
            <div className="ys-in d4 serif ys-big-line">
              {diff > 0 ? t('ysMore', { n: diff }) : diff < 0 ? t('ysLess', { n: -diff }) : t('ysSame')}
            </div>
            {s.avgRating !== null && s.prev.avgRating !== null && (
              <div className="ys-in d5 ys-muted">{t('ysRatingChange', { a: nf(s.prev.avgRating, 1), b: nf(s.avgRating, 1) })}</div>
            )}
          </>
        )}

        {slide === 'final' && (
          <>
            <div className="ys-in ys-preview">
              {image ? <img src={image.url} alt={t('ysCardTitle', { year })} /> : <span className="ys-muted">{t('ysPreparing')}</span>}
            </div>
            <div className="ys-in d2 serif ys-sub">{t('ysFinal')}</div>
          </>
        )}
      </div>

      {isLast && (
        <div className="ys-actions">
          <button type="button" className="ys-btn" onClick={saveImage} disabled={!image}>{t('ysSave')}</button>
          <button type="button" className="ys-btn primary" onClick={shareImage} disabled={!image || busy}>{t('ysShare')}</button>
        </div>
      )}
    </div>
  );
}

// Karta otwierająca podsumowanie (zakładka Statystyki).
export function YearSummaryCard({ year, onOpen }) {
  const { t } = useI18n();
  return (
    <button type="button" className="ys-entry press appear" onClick={onOpen}>
      <span className="ys-entry-icon"><SparkleIcon /></span>
      <span className="ys-entry-text">
        <span className="ys-entry-label">{t('ysCardLabel')}</span>
        <span className="serif ys-entry-title">{t('ysCardTitle', { year })}</span>
        <span className="ys-entry-sub">{t('ysCardSub')}</span>
      </span>
      <span aria-hidden="true" className="ys-entry-arrow">›</span>
    </button>
  );
}
