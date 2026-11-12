import { useI18n } from '../i18n/index.jsx';
import { FORMS, FORM_ICONS, STATUSES } from '../lib/books.js';
import { GridIcon, ListIcon, SortIcon } from './Icons.jsx';

export const SORT_FIELDS = ['added', 'tytul', 'autor', 'data_zakonczenia', 'data_rozpoczecia', 'ocena'];

export default function Toolbar({ filters, setFilters, genres, counts, view, setView }) {
  const { t } = useI18n();
  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="toolbar">
      <input
        type="search"
        className="search-input"
        placeholder={t('searchPlaceholder')}
        value={filters.query}
        onChange={(e) => update({ query: e.target.value })}
      />

      <div className="status-tabs" role="tablist">
        {['all', ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={filters.status === s}
            className={`tab ${filters.status === s ? 'active' : ''}`}
            onClick={() => update({ status: s })}
          >
            {t(`status.${s}`)} <span className="tab-count">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="filter-row">
        <select value={filters.genre} onChange={(e) => update({ genre: e.target.value })} aria-label={t('genre')}>
          <option value="">{t('allGenres')}</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select value={filters.forma} onChange={(e) => update({ forma: e.target.value })} aria-label={t('field.forma')}>
          <option value="">{t('allForms')}</option>
          {FORMS.map((f) => (
            <option key={f} value={f}>{FORM_ICONS[f]} {t(`form.${f}`)}</option>
          ))}
          <option value="none">{t('noForm')}</option>
        </select>

        <select
          value={filters.minRating}
          onChange={(e) => update({ minRating: Number(e.target.value) })}
          aria-label={t('minRating')}
        >
          <option value={0}>{t('anyRating')}</option>
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{t('minRating')} {t('ratingFrom', { n })}</option>
          ))}
        </select>

        <div className="sort-group">
          <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} aria-label={t('sortBy')}>
            {SORT_FIELDS.map((f) => (
              <option key={f} value={f}>{t(`sort.${f}`)}</option>
            ))}
          </select>
          <button
            type="button"
            className="icon-btn"
            onClick={() => update({ desc: !filters.desc })}
            title={filters.desc ? t('descending') : t('ascending')}
            aria-label={filters.desc ? t('descending') : t('ascending')}
          >
            <SortIcon desc={filters.desc} />
          </button>
        </div>

        <div className="view-toggle" role="group">
          <button
            type="button"
            className={`icon-btn ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
            title={t('viewGrid')}
            aria-label={t('viewGrid')}
            aria-pressed={view === 'grid'}
          >
            <GridIcon />
          </button>
          <button
            type="button"
            className={`icon-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
            title={t('viewList')}
            aria-label={t('viewList')}
            aria-pressed={view === 'list'}
          >
            <ListIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
