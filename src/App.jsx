import { useMemo, useState } from 'react';
import { useI18n } from './i18n/index.jsx';
import { useBooks } from './hooks/useBooks.js';
import { useGoals } from './hooks/useGoals.js';
import { load, save } from './lib/storage.js';
import { STATUSES } from './lib/books.js';
import Toolbar from './components/Toolbar.jsx';
import { BookGrid, BookList } from './components/BookViews.jsx';
import BookForm from './components/BookForm.jsx';
import SettingsDialog from './components/SettingsDialog.jsx';
import FillCoversDialog from './components/FillCoversDialog.jsx';
import StatsView from './components/StatsView.jsx';
import { ImageIcon, PlusIcon, RefreshIcon, SettingsIcon } from './components/Icons.jsx';

const DEFAULT_FILTERS = { query: '', status: 'all', genre: '', forma: '', minRating: 0, sort: 'added', desc: true };

// Porównanie bez wielkości liter i polskich znaków diakrytycznych.
const fold = (s) => s.toLocaleLowerCase('pl').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

function compareBooks(a, b, field) {
  if (field === 'ocena') return Number(a.ocena) - Number(b.ocena);
  if (field.startsWith('data_')) return a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
  return a[field].localeCompare(b[field], 'pl', { sensitivity: 'base' });
}

export default function App() {
  const { t, errorText } = useI18n();
  const [settings, setSettingsState] = useState(() => load('bt.settings', { url: '', key: '' }));
  const { books, syncing, error, refresh, saveBook, deleteBook, saveMany, configured, scriptOutdated } = useBooks(settings);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState(null); // { ok: bool, text }

  const { goals, setGoal, syncedWithSheet } = useGoals(settings);
  const [tab, setTabState] = useState(() => load('bt.tab', 'books'));
  const setTab = (v) => {
    setTabState(v);
    save('bt.tab', v);
    window.scrollTo(0, 0);
  };
  const [view, setViewState] = useState(() => load('bt.view', 'grid'));
  const [filters, setFiltersState] = useState(() => ({ ...DEFAULT_FILTERS, ...load('bt.filters', {}), query: '' }));
  const [editing, setEditing] = useState(null); // null | {} (nowa) | książka
  const [showSettings, setShowSettings] = useState(!configured);
  const [showFill, setShowFill] = useState(false);

  const setSettings = (s) => {
    setSettingsState(s);
    save('bt.settings', s);
  };
  const setView = (v) => {
    setViewState(v);
    save('bt.view', v);
  };
  const setFilters = (updater) => {
    setFiltersState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const { query, ...persist } = next;
      save('bt.filters', persist);
      return next;
    });
  };

  const genres = useMemo(
    () => [...new Set(books.map((b) => b.gatunek).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl')),
    [books],
  );

  const counts = useMemo(() => {
    const c = { all: books.length };
    for (const s of STATUSES) c[s] = books.filter((b) => b.status === s).length;
    return c;
  }, [books]);

  const missingCovers = useMemo(() => books.filter((b) => !b.okladka_url), [books]);
  const missingForm = useMemo(() => books.filter((b) => !b.forma), [books]);

  // Jednorazowe ustawienie formy „papier” dla wszystkich książek bez formy.
  const setPaperForAll = async () => {
    const n = missingForm.length;
    if (!window.confirm(t('setPaperConfirm', { n }))) return;
    setBulkBusy(true);
    setBulkMsg(null);
    try {
      await saveMany(missingForm.map((b) => ({ ...b, forma: 'papier' })));
      setBulkMsg({ ok: true, text: t('setPaperDone', { n }) });
    } catch (err) {
      setBulkMsg({ ok: false, text: errorText(err) });
    } finally {
      setBulkBusy(false);
    }
  };

  const visible = useMemo(() => {
    const q = fold(filters.query.trim());
    const list = books
      .map((b, index) => ({ b, index }))
      .filter(({ b }) => {
        if (filters.status !== 'all' && b.status !== filters.status) return false;
        if (filters.genre && b.gatunek !== filters.genre) return false;
        if (filters.forma === 'none' ? b.forma : filters.forma && b.forma !== filters.forma) return false;
        if (filters.minRating && !(Number(b.ocena) >= filters.minRating)) return false;
        if (q && !fold(`${b.tytul} ${b.autor} ${b.isbn} ${b.gatunek}`).includes(q)) return false;
        return true;
      });

    const dir = filters.desc ? -1 : 1;
    list.sort((x, y) => {
      if (filters.sort === 'added') return (x.index - y.index) * dir;
      const f = filters.sort;
      // Puste wartości zawsze na końcu.
      const ex = !x.b[f], ey = !y.b[f];
      if (ex || ey) return ex === ey ? x.index - y.index : ex ? 1 : -1;
      return compareBooks(x.b, y.b, f) * dir || x.index - y.index;
    });
    return list.map(({ b }) => b);
  }, [books, filters]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>📚 {t('appName')}</h1>
        <div className="header-actions">
          {configured && (
            <button
              type="button"
              className="icon-btn"
              onClick={refresh}
              disabled={syncing}
              title={syncing ? t('syncing') : t('refresh')}
              aria-label={t('refresh')}
            >
              <RefreshIcon spinning={syncing} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            title={t('settings')}
            aria-label={t('settings')}
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      <nav className="main-tabs" role="tablist">
        {['books', 'stats'].map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            className={tab === v ? 'active' : ''}
            onClick={() => setTab(v)}
          >
            {v === 'books' ? t('tabBooks') : t('tabStats')}
          </button>
        ))}
      </nav>

      <main className="content">
        {error && (
          <div className="msg msg-error banner">
            {errorText(error)} {books.length > 0 && t('offlineData')}
          </div>
        )}
        {scriptOutdated && <div className="msg msg-info banner">{t('scriptOutdated')}</div>}
        {bulkMsg && <div className={`msg banner ${bulkMsg.ok ? 'msg-ok' : 'msg-error'}`}>{bulkMsg.text}</div>}

        {tab === 'stats' ? (
          <StatsView
            books={books}
            goals={goals}
            setGoal={setGoal}
            goalsSynced={syncedWithSheet}
            onOpen={setEditing}
          />
        ) : (
        <>
        <Toolbar
          filters={filters}
          setFilters={setFilters}
          genres={genres}
          counts={counts}
          view={view}
          setView={setView}
        />

        <div className="list-info">
          <span>{t('bookCount', { n: visible.length })}</span>
          {configured && missingCovers.length > 0 && (
            <button type="button" className="btn btn-small" onClick={() => setShowFill(true)}>
              <ImageIcon /> {t('fillCovers', { n: missingCovers.length })}
            </button>
          )}
          {configured && !scriptOutdated && missingForm.length > 0 && (
            <button type="button" className="btn btn-small" onClick={setPaperForAll} disabled={bulkBusy}>
              {bulkBusy ? t('saving') : <>📖 {t('setPaper', { n: missingForm.length })}</>}
            </button>
          )}
        </div>

        {books.length === 0 && !syncing ? (
          <p className="empty">{t('emptyLibrary')}</p>
        ) : visible.length === 0 ? (
          <p className="empty">{t('noResults')}</p>
        ) : view === 'grid' ? (
          <BookGrid books={visible} onOpen={setEditing} />
        ) : (
          <BookList books={visible} onOpen={setEditing} />
        )}
        </>
        )}
      </main>

      {tab === 'books' && (
      <button
        type="button"
        className="fab"
        onClick={() => (configured ? setEditing({}) : setShowSettings(true))}
        aria-label={t('add')}
        title={t('add')}
      >
        <PlusIcon /> <span className="fab-label">{t('add')}</span>
      </button>
      )}

      {editing && (
        <BookForm
          key={editing.id || 'new'}
          book={editing}
          genres={genres}
          onSave={saveBook}
          onDelete={deleteBook}
          onClose={() => setEditing(null)}
        />
      )}

      {showSettings && (
        <SettingsDialog
          settings={settings}
          welcome={!configured}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showFill && (
        <FillCoversDialog
          books={missingCovers}
          onSaveMany={saveMany}
          onEdit={(b) => {
            setShowFill(false);
            setEditing(b);
          }}
          onClose={() => setShowFill(false)}
        />
      )}
    </div>
  );
}
