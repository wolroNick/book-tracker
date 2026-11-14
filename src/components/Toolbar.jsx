import Modal from './Modal.jsx';
import { useI18n } from '../i18n/index.jsx';
import { FORMS, STATUSES } from '../lib/books.js';
import { FilterIcon, FormIcon, SearchIcon, SortIcon } from './Icons.jsx';

export const SORT_FIELDS = ['added', 'tytul', 'autor', 'data_zakonczenia', 'data_rozpoczecia', 'ocena'];
const RATING_STEPS = [0, 6, 7, 8, 9, 10];

// Liczba aktywnych filtrów (bez wyszukiwania i sortowania) – pokazywana przy przycisku „Filtry”.
export function activeFilterCount(filters) {
  return (filters.genre ? 1 : 0) + (filters.forma ? 1 : 0) + (filters.minRating ? 1 : 0);
}

// Wyszukiwarka, przycisk „Filtry” i zakładki statusów.
export default function Toolbar({ filters, setFilters, counts, onOpenFilters }) {
  const { t } = useI18n();
  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const active = activeFilterCount(filters);

  return (
    <div className="toolbar">
      <div className="search-row">
        <label className="search-box">
          <SearchIcon />
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            aria-label={t('searchPlaceholder')}
          />
        </label>
        <button type="button" className="filters-btn press" onClick={onOpenFilters}>
          <FilterIcon /> {t('filters')}
          {active > 0 && <span className="filters-count">{active}</span>}
        </button>
      </div>

      <div className="status-tabs" role="tablist">
        {['all', ...STATUSES, ...(counts.reread ? ['reread'] : [])].map((s) => (
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
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" className={`chip ${active ? 'active' : ''}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

// Panel filtrów wysuwany od dołu (na komputerze okno na środku).
export function FiltersSheet({ filters, setFilters, genres, resultCount, onClose, onManageGenres }) {
  const { t } = useI18n();
  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const toggle = (key, value) => update({ [key]: filters[key] === value ? '' : value });

  return (
    <Modal
      title={t('filters')}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => update({ genre: '', forma: '', minRating: 0 })}
            disabled={!activeFilterCount(filters)}
          >
            {t('clearFilters')}
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {t('showResults', { n: resultCount })}
          </button>
        </>
      }
    >
      <section className="filter-group">
        <h3>{t('field.forma')}</h3>
        <div className="chips">
          {FORMS.map((f) => (
            <Chip key={f} active={filters.forma === f} onClick={() => toggle('forma', f)}>
              <FormIcon forma={f} /> {t(`form.${f}`)}
            </Chip>
          ))}
          <Chip active={filters.forma === 'none'} onClick={() => toggle('forma', 'none')}>{t('noForm')}</Chip>
        </div>
      </section>

      {genres.length > 0 && (
        <section className="filter-group">
          <div className="filter-head">
            <h3>{t('genre')}</h3>
            {onManageGenres && (
              <button type="button" className="link-btn sort-dir" onClick={onManageGenres}>{t('genresManage')}</button>
            )}
          </div>
          <div className="chips">
            {genres.map((g) => (
              <Chip key={g} active={filters.genre === g} onClick={() => toggle('genre', g)}>{g}</Chip>
            ))}
          </div>
        </section>
      )}

      <section className="filter-group">
        <h3>{t('minRating')}</h3>
        <div className="chips">
          {RATING_STEPS.map((n) => (
            <Chip key={n} active={filters.minRating === n} onClick={() => update({ minRating: n })}>
              {n === 0 ? t('anyRating') : n === 10 ? '★ 10' : `★ ${n}+`}
            </Chip>
          ))}
        </div>
      </section>

      <section className="filter-group">
        <div className="filter-head">
          <h3>{t('sortBy')}</h3>
          <button type="button" className="link-btn sort-dir" onClick={() => update({ desc: !filters.desc })}>
            <SortIcon desc={filters.desc} /> {filters.desc ? t('descending') : t('ascending')}
          </button>
        </div>
        <div className="chips">
          {SORT_FIELDS.map((f) => (
            <Chip key={f} active={filters.sort === f} onClick={() => update({ sort: f })}>{t(`sort.${f}`)}</Chip>
          ))}
        </div>
      </section>
    </Modal>
  );
}
