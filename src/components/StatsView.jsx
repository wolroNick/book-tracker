import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { availableYears, computeStats, goalProgress } from '../lib/stats.js';
import { ColumnChart, BarList } from './Charts.jsx';
import BookCover from './BookCover.jsx';
import { FORMS, FORM_ICONS } from '../lib/books.js';

function StatTile({ label, value, sub }) {
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

function GoalCard({ year, goal, count, onSave, synced }) {
  const { t, lang } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal || '');
  const progress = goalProgress(goal, count, year);

  const submit = (e) => {
    e.preventDefault();
    onSave(year, Number(value) || 0);
    setEditing(false);
  };

  if (!goal || editing) {
    return (
      <section className="card">
        <h3>{t('goalTitle', { year })}</h3>
        <form className="inline-form" onSubmit={submit}>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('goalPlaceholder')}
            aria-label={t('goalTitle', { year })}
          />
          <button type="submit" className="btn btn-primary">{t('save')}</button>
          {editing && (
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>{t('cancel')}</button>
          )}
        </form>
        {!synced && <p className="hint">{t('goalLocalOnly')}</p>}
      </section>
    );
  }

  const pct = Math.round(progress.pct);
  let pace = null;
  if (progress.diff !== null) {
    const n = Math.abs(progress.diff);
    pace = progress.diff > 0 ? t('goalAhead', { n }) : progress.diff < 0 ? t('goalBehind', { n }) : t('goalOnTrack');
  }
  if (count >= goal) pace = t('goalDone');

  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('goalTitle', { year })}</h3>
        <button type="button" className="link-btn" onClick={() => { setValue(goal); setEditing(true); }}>{t('edit')}</button>
      </div>
      <p className="goal-numbers">
        <strong>{count}</strong> {t('goalOf', { goal })} <span className="muted">({pct}%)</span>
      </p>
      <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={count}>
        <span className="meter-fill" style={{ width: `${progress.pct}%` }} />
        {progress.expectedPct !== undefined && count < goal && (
          <span className="meter-marker" style={{ left: `${progress.expectedPct}%` }} title={t('goalExpected')} />
        )}
      </div>
      {pace && <p className="goal-pace">{pace}</p>}
      {!synced && <p className="hint">{t('goalLocalOnly')}</p>}
    </section>
  );
}

function Highlight({ label, book, detail, onOpen }) {
  if (!book) return null;
  return (
    <button type="button" className="highlight" onClick={() => onOpen(book)}>
      <BookCover book={book} className="highlight-cover" />
      <span className="highlight-text">
        <span className="stat-label">{label}</span>
        <strong>{book.tytul}</strong>
        <span className="muted">{book.autor}</span>
        <span>{detail}</span>
      </span>
    </button>
  );
}

export default function StatsView({ books, goals, setGoal, goalsSynced, onOpen }) {
  const { t, lang } = useI18n();
  const years = useMemo(() => availableYears(books), [books]);
  const [year, setYear] = useState(years[0]);
  const [metric, setMetric] = useState('books');
  const [forma, setForma] = useState('');
  const stats = useMemo(() => computeStats(books, year, forma), [books, year, forma]);
  const formTotal = stats.forms.reduce((a, f) => a + f.value, 0);

  const nf = (v, digits = 0) => (v === null ? '–' : v.toLocaleString(lang, { maximumFractionDigits: digits }));
  const monthName = (m, style) => new Date(2000, m, 1).toLocaleString(lang, { month: style });

  const chartData = stats.buckets.map((b) => ({
    key: b.key,
    label: year === 'all' ? String(b.key) : monthName(b.key, 'short').replace('.', ''),
    fullLabel: year === 'all' ? String(b.key) : `${monthName(b.key, 'long')} ${year}`,
    value: metric === 'books' ? b.books : b.pages,
  }));
  const formatMetric = (v) => (metric === 'books' ? t('nBooks', { n: nf(v) }) : t('nPages', { n: nf(v) }));

  return (
    <div className="stats">
      <div className="status-tabs" role="tablist" aria-label={t('year')}>
        {[...years, 'all'].map((y) => (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={year === y}
            className={`tab ${year === y ? 'active' : ''}`}
            onClick={() => setYear(y)}
          >
            {y === 'all' ? t('allYears') : y}
          </button>
        ))}
      </div>

      <div className="status-tabs" role="tablist" aria-label={t('field.forma')}>
        {['', ...FORMS].map((f) => (
          <button
            key={f || 'all'}
            type="button"
            role="tab"
            aria-selected={forma === f}
            className={`tab tab-small ${forma === f ? 'active' : ''}`}
            onClick={() => setForma(f)}
          >
            {f ? `${FORM_ICONS[f]} ${t(`form.${f}`)}` : t('allForms')}
          </button>
        ))}
      </div>

      {year !== 'all' && !forma && (
        <GoalCard
          key={year}
          year={year}
          goal={goals[year]}
          count={stats.count}
          onSave={setGoal}
          synced={goalsSynced}
        />
      )}

      <div className="stat-grid">
        <StatTile label={t('statBooks')} value={nf(stats.count)} sub={stats.rereads ? t('statRereads', { n: stats.rereads }) : null} />
        <StatTile label={t('statPages')} value={nf(stats.pages)} sub={stats.avgPages ? t('statAvgPages', { n: nf(stats.avgPages) }) : null} />
        <StatTile label={t('statAvgRating')} value={stats.avgRating === null ? '–' : `${nf(stats.avgRating, 1)}/10`} />
        <StatTile label={t('statAvgDays')} value={stats.avgDays === null ? '–' : t('nDays', { n: nf(stats.avgDays) })} />
      </div>

      <section className="card">
        <div className="card-head">
          <h3>{year === 'all' ? t('chartByYear') : t('chartByMonth')}</h3>
          <div className="segmented segmented-small">
            <button type="button" className={metric === 'books' ? 'active' : ''} onClick={() => setMetric('books')}>{t('metricBooks')}</button>
            <button type="button" className={metric === 'pages' ? 'active' : ''} onClick={() => setMetric('pages')}>{t('metricPages')}</button>
          </div>
        </div>
        <ColumnChart key={`${year}-${metric}`} data={chartData} format={formatMetric} />
      </section>

      <section className="card">
        <h3>{t('chartRatings')}</h3>
        <ColumnChart
          key={`r-${year}`}
          data={stats.ratingDist.map((r) => ({ key: r.key, label: String(r.key), fullLabel: `${t('field.ocena')} ${r.key}`, value: r.value }))}
          format={(v) => t('nBooks', { n: nf(v) })}
        />
      </section>

      {!forma && formTotal > 0 && (
        <section className="card">
          <h3>{t('chartForms')}</h3>
          <BarList
            data={stats.forms.map((f) => ({
              label: f.key ? `${FORM_ICONS[f.key]} ${t(`form.${f.key}`)}` : t('noForm'),
              value: f.value,
              note: `${Math.round((f.value / formTotal) * 100)}%`,
            }))}
          />
        </section>
      )}

      <div className="card-row">
        <section className="card">
          <h3>{t('topGenres')}</h3>
          <BarList data={stats.genres} />
        </section>
        <section className="card">
          <h3>{t('topAuthors')}</h3>
          <BarList data={stats.authors} />
        </section>
      </div>

      {(stats.best || stats.longest || stats.fastest) && (
        <section className="card">
          <h3>{t('highlights')}</h3>
          <div className="highlights">
            <Highlight label={t('bestRated')} book={stats.best} detail={stats.best && `${stats.best.ocena}/10`} onOpen={onOpen} />
            <Highlight label={t('longest')} book={stats.longest} detail={stats.longest && t('nPages', { n: nf(Number(stats.longest.liczba_stron)) })} onOpen={onOpen} />
            <Highlight label={t('fastest')} book={stats.fastest?.book} detail={stats.fastest && t('nDays', { n: stats.fastest.days })} onOpen={onOpen} />
          </div>
        </section>
      )}

      <p className="muted stats-footer">
        {t('nowReading', { n: stats.reading })} · {t('toReadCount', { n: stats.toRead })}
        {stats.undated > 0 && <><br />{t('undatedNote', { n: stats.undated })}</>}
      </p>
    </div>
  );
}
