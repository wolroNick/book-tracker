import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from './i18n/index.jsx';
import { useBooks } from './hooks/useBooks.js';
import { useGoals } from './hooks/useGoals.js';
import { useBackHandler } from './hooks/useBackHandler.js';
import { load, save } from './lib/storage.js';
import { STATUSES, compareReading, sortByReading } from './lib/books.js';
import Toolbar, { FiltersSheet, activeFilterCount } from './components/Toolbar.jsx';
import { BookGrid, BookList, SkeletonGrid } from './components/BookViews.jsx';
import NowReading from './components/NowReading.jsx';
import BookForm from './components/BookForm.jsx';
import SettingsDialog from './components/SettingsDialog.jsx';
import FillCoversDialog from './components/FillCoversDialog.jsx';
import StatsView from './components/StatsView.jsx';
import QuickActions from './components/QuickActions.jsx';
import BookCard from './components/BookCard.jsx';
import GenresDialog from './components/GenresDialog.jsx';
import Toast, { useToast } from './components/Toast.jsx';
import QuotesView, { QuoteTeaser } from './components/Quotes.jsx';
import { extractQuotes } from './lib/quotes.js';
import { BooksIcon, ChartIcon, GearIcon, GridIcon, ImageIcon, ListIcon, PlusIcon, QuoteIcon, RefreshIcon, SettingsIcon } from './components/Icons.jsx';

const DEFAULT_FILTERS = { query: '', status: 'all', genre: '', forma: '', minRating: 0, sort: 'reading', desc: true };

// Zapamiętane filtry; jednorazowo przestawiamy dawne domyślne sortowanie na „kolejność czytania”.
function loadFilters() {
  const stored = load('bt.filters', {});
  if (!stored.readingSortDefault) {
    stored.sort = 'reading';
    stored.desc = true;
    stored.readingSortDefault = true;
  }
  return { ...DEFAULT_FILTERS, ...stored, query: '' };
}

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
  const toast = useToast();

  // „Cofnij” w komunikacie: wykonuje akcję przywracającą i informuje o wyniku.
  const runUndo = async () => {
    const undo = toast.toast?.undo;
    toast.hide();
    if (!undo) return;
    try {
      await undo();
      toast.show(t('toastUndone'));
    } catch (err) {
      toast.show(errorText(err), { error: true });
    }
  };

  // Opis zmiany jednej książki (do komunikatu po zapisie).
  const describeSave = (prev, next) => {
    const title = next.tytul;
    if (!prev) return next.ponowne && next.status === 'czytam' ? t('toastReread', { title }) : t('toastAdded', { title });
    if (prev.status !== next.status) return t(`toastStatus.${next.status}`, { title });
    const onlyRating = Object.keys(next).every((k) => k === 'ocena' || String(prev[k] ?? '') === String(next[k] ?? ''));
    if (onlyRating) return next.ocena ? t('toastRating', { title, n: next.ocena }) : t('toastRatingRemoved', { title });
    return t('toastSaved', { title });
  };

  // Zapis z komunikatem i możliwością cofnięcia (poprzednia wersja albo usunięcie nowej książki).
  const saveWithUndo = async (book) => {
    const prev = book.id ? books.find((b) => b.id === book.id) : null;
    const saved = await saveBook(book);
    toast.show(describeSave(prev, saved), {
      undo: prev ? () => saveBook(prev) : () => deleteBook(saved.id),
    });
    return saved;
  };

  // Usunięcie z możliwością przywrócenia (książka wraca na koniec arkusza).
  const deleteWithUndo = async (id) => {
    const prev = books.find((b) => b.id === id);
    await deleteBook(id);
    if (prev) toast.show(t('toastDeleted', { title: prev.tytul }), { undo: () => saveBook(prev) });
  };

  // Zmiana gatunku w wielu książkach naraz (okno „Gatunki”).
  const saveGenreChange = async (list) => {
    const prevs = list.map((b) => books.find((x) => x.id === b.id)).filter(Boolean);
    await saveMany(list);
    const from = prevs[0]?.gatunek;
    const to = list[0]?.gatunek;
    toast.show(t('toastGenre', { from, to, n: list.length }), {
      undo: async () => {
        await saveMany(prevs);
        setFilters((f) => (f.genre === to ? { ...f, genre: from } : f));
      },
    });
  };
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState(null); // { ok: bool, text }

  const { goals, setGoal, syncedWithSheet } = useGoals(settings);
  const [tab, setTabState] = useState(() => load('bt.tab', 'books'));
  const setTab = (v) => {
    setTabState(v);
    save('bt.tab', v);
    window.scrollTo(0, 0);
  };
  // „Wstecz” na zakładce Cytaty/Statystyki wraca do Książek.
  useBackHandler(tab !== 'books', () => setTab('books'));
  const [view, setViewState] = useState(() => load('bt.view', 'grid'));
  const [filters, setFiltersState] = useState(loadFilters);
  const [editing, setEditing] = useState(null); // null | {} (nowa) | książka
  const [editWithQuote, setEditWithQuote] = useState(false); // formularz otwarty od razu z polem cytatu
  // Karta książki – trzymamy id, żeby zawsze pokazywać aktualne dane po zapisie.
  const [viewingId, setViewingId] = useState(null);
  const openBook = useCallback((b) => setViewingId(b.id), []);
  const editBook = (b, withQuote = false) => {
    setEditWithQuote(withQuote);
    setEditing(b);
  };
  const [showSettings, setShowSettings] = useState(!configured);
  const [showFill, setShowFill] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showGenres, setShowGenres] = useState(false);
  const [quick, setQuick] = useState(null);
  const [quickTipSeen, setQuickTipSeen] = useState(() => load('bt.quickTip', false));
  const openQuick = (b) => {
    setQuick(b);
    if (!quickTipSeen) {
      setQuickTipSeen(true);
      save('bt.quickTip', true);
    }
  };

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
      save('bt.filters', { ...persist, readingSortDefault: true });
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
    c.reread = books.filter((b) => b.ponowne).length;
    return c;
  }, [books]);

  const missingCovers = useMemo(() => books.filter((b) => !b.okladka_url), [books]);
  const missingForm = useMemo(() => books.filter((b) => !b.forma), [books]);
  const readingNow = useMemo(() => books.filter((b) => b.status === 'czytam'), [books]);
  // Cytaty w kolejności czytania książek (od ostatnio czytanej).
  const quotes = useMemo(() => extractQuotes(sortByReading(books)), [books]);

  // Cytat na ekranie głównym: losowany raz przy otwarciu aplikacji,
  // inny niż przy poprzednim otwarciu (o ile jest więcej niż jeden).
  const [sessionQuoteId, setSessionQuoteId] = useState(null);
  useEffect(() => {
    if (!quotes.length || quotes.some((q) => q.id === sessionQuoteId)) return;
    const last = load('bt.lastQuote', null);
    const pool = quotes.length > 1 ? quotes.filter((q) => q.id !== last) : quotes;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setSessionQuoteId(picked.id);
    save('bt.lastQuote', picked.id);
  }, [quotes, sessionQuoteId]);
  const sessionQuote = quotes.find((q) => q.id === sessionQuoteId) || null;
  const viewingBook = viewingId ? books.find((b) => b.id === viewingId) || null : null;
  const closeCard = useCallback(() => setViewingId(null), []);
  // Cytat, do którego przewinąć zakładkę „Cytaty” (po dotknięciu cytatu na ekranie głównym).
  const [focusQuoteId, setFocusQuoteId] = useState(null);
  const clearFocusQuote = useCallback(() => setFocusQuoteId(null), []);
  // Banner „Teraz czytam” tylko w widoku bez filtrów i wyszukiwania.
  const showNowReading = filters.status === 'all' && !filters.query.trim() && !activeFilterCount(filters);
  // Zmiana filtrów lub widoku odtwarza animację pojawiania się kart.
  const listKey = `${view}|${filters.status}|${filters.genre}|${filters.forma}|${filters.minRating}|${filters.sort}|${filters.desc}`;

  // Jednorazowe ustawienie formy „papier” dla wszystkich książek bez formy.
  const setPaperForAll = async () => {
    const n = missingForm.length;
    if (!window.confirm(t('setPaperConfirm', { n }))) return;
    setBulkBusy(true);
    setBulkMsg(null);
    try {
      const prevs = missingForm;
      await saveMany(missingForm.map((b) => ({ ...b, forma: 'papier' })));
      toast.show(t('setPaperDone', { n }), { undo: () => saveMany(prevs) });
    } catch (err) {
      setBulkMsg({ ok: false, text: errorText(err) });
    } finally {
      setBulkBusy(false);
    }
  };

  const visible = useMemo(() => {
    const q = fold(filters.query.trim());
    // Zapamiętany filtr „ponowne” bez żadnych ponownych czytań = wszystkie.
    const status = filters.status === 'reread' && !books.some((b) => b.ponowne) ? 'all' : filters.status;
    const list = books
      .map((b, index) => ({ b, index }))
      .filter(({ b }) => {
        if (status === 'reread' ? !b.ponowne : status !== 'all' && b.status !== status) return false;
        if (filters.genre && b.gatunek !== filters.genre) return false;
        if (filters.forma === 'none' ? b.forma : filters.forma && b.forma !== filters.forma) return false;
        if (filters.minRating && !(Number(b.ocena) >= filters.minRating)) return false;
        if (q && !fold(`${b.tytul} ${b.autor} ${b.isbn} ${b.gatunek} ${b.notatki}`).includes(q)) return false;
        return true;
      });

    const dir = filters.desc ? -1 : 1;
    list.sort((x, y) => {
      if (filters.sort === 'added') return (x.index - y.index) * dir;
      if (filters.sort === 'reading') return compareReading(x.b, y.b, x.index, y.index) * -dir;
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
        <h1 className="serif">{t('appName')}</h1>
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
            className="icon-btn desktop-only"
            onClick={() => setShowSettings(true)}
            title={t('settings')}
            aria-label={t('settings')}
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      <nav className="main-tabs desktop-only" role="tablist">
        {['books', 'quotes', 'stats'].map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            className={tab === v ? 'active' : ''}
            onClick={() => setTab(v)}
          >
            {t(`tab.${v}`)}
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

        {tab === 'quotes' ? (
          <QuotesView quotes={quotes} onOpenBook={openBook} focusId={focusQuoteId} onFocusDone={clearFocusQuote} />
        ) : tab === 'stats' ? (
          <StatsView
            books={books}
            goals={goals}
            setGoal={setGoal}
            goalsSynced={syncedWithSheet}
            onOpen={openBook}
          />
        ) : (
        <>
        <Toolbar
          filters={filters}
          setFilters={setFilters}
          counts={counts}
          onOpenFilters={() => setShowFilters(true)}
        />

        {showNowReading && <NowReading books={readingNow} onOpen={openBook} onQuick={openQuick} />}
        {showNowReading && <QuoteTeaser
            quote={sessionQuote}
            onOpen={() => {
              setFocusQuoteId(sessionQuote.id);
              setTab('quotes');
            }}
          />}

        <div className="list-info">
          <span className="list-count">{t('bookCount', { n: visible.length })}</span>
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
        <div className="list-actions">
          {configured && missingCovers.length > 0 && (
            <button type="button" className="btn btn-small" onClick={() => setShowFill(true)}>
              <ImageIcon /> {t('fillCovers', { n: missingCovers.length })}
            </button>
          )}
          {configured && !scriptOutdated && missingForm.length > 0 && (
            <button type="button" className="btn btn-small" onClick={setPaperForAll} disabled={bulkBusy}>
              {bulkBusy ? t('saving') : t('setPaper', { n: missingForm.length })}
            </button>
          )}
        </div>

        {!quickTipSeen && books.length > 0 && <p className="hint quick-tip">💡 {t('quickTip')}</p>}

        {books.length === 0 && syncing ? (
          <SkeletonGrid />
        ) : books.length === 0 ? (
          <p className="empty">{t('emptyLibrary')}</p>
        ) : visible.length === 0 ? (
          <p className="empty">{t('noResults')}</p>
        ) : view === 'grid' ? (
          <BookGrid key={listKey} books={visible} onOpen={openBook} onQuick={openQuick} />
        ) : (
          <BookList key={listKey} books={visible} onOpen={openBook} onQuick={openQuick} />
        )}
        </>
        )}
      </main>

      <nav className="bottom-nav mobile-only" aria-label={t('appName')}>
        <button type="button" className={tab === 'books' ? 'active' : ''} onClick={() => setTab('books')} aria-current={tab === 'books' ? 'page' : undefined}>
          <BooksIcon /> {t('tabBooks')}
        </button>
        <button type="button" className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')} aria-current={tab === 'quotes' ? 'page' : undefined}>
          <QuoteIcon size={22} /> {t('tab.quotes')}
        </button>
        <button
          type="button"
          className="nav-add press"
          onClick={() => (configured ? editBook({}) : setShowSettings(true))}
          aria-label={t('add')}
        >
          <PlusIcon />
        </button>
        <button type="button" className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')} aria-current={tab === 'stats' ? 'page' : undefined}>
          <ChartIcon /> {t('tabStats')}
        </button>
        <button type="button" onClick={() => setShowSettings(true)}>
          <GearIcon /> {t('settings')}
        </button>
      </nav>

      {tab === 'books' && (
      <button
        type="button"
        className="fab desktop-only"
        onClick={() => (configured ? editBook({}) : setShowSettings(true))}
        aria-label={t('add')}
        title={t('add')}
      >
        <PlusIcon /> <span className="fab-label">{t('add')}</span>
      </button>
      )}

      {viewingBook ? (
        <BookCard
          key={`card-${viewingBook.id}`}
          book={viewingBook}
          onSave={saveWithUndo}
          canReread={!scriptOutdated}
          onEdit={() => editBook(viewingBook)}
          onAddQuote={() => editBook(viewingBook, true)}
          onClose={closeCard}
        />
      ) : null}

      {editing && (
        <BookForm
          key={`form-${editing.id || 'new'}`}
          book={editing}
          genres={genres}
          startWithQuote={editWithQuote}
          onSave={saveWithUndo}
          onDelete={deleteWithUndo}
          onClose={() => setEditing(null)}
        />
      )}

      {quick && (
        <QuickActions
          key={`quick-${quick.id}`}
          book={quick}
          onSave={saveWithUndo}
          canReread={!scriptOutdated}
          onEdit={(b) => {
            setQuick(null);
            editBook(b);
          }}
          onClose={() => setQuick(null)}
        />
      )}

      {showFilters && (
        <FiltersSheet
          filters={filters}
          setFilters={setFilters}
          genres={genres}
          resultCount={visible.length}
          onClose={() => setShowFilters(false)}
          onManageGenres={configured ? () => { setShowFilters(false); setShowGenres(true); } : null}
        />
      )}

      {showGenres && (
        <GenresDialog
          books={books}
          onSaveMany={saveGenreChange}
          onRenamed={(from, to) => filters.genre === from && setFilters((f) => ({ ...f, genre: to }))}
          onClose={() => setShowGenres(false)}
        />
      )}

      <Toast toast={toast.toast} onUndo={runUndo} onClose={toast.hide} />

      {showSettings && (
        <SettingsDialog
          settings={settings}
          welcome={!configured}
          onSave={setSettings}
          onOpenGenres={configured ? () => { setShowSettings(false); setShowGenres(true); } : null}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showFill && (
        <FillCoversDialog
          books={missingCovers}
          onSaveMany={saveMany}
          onEdit={(b) => {
            setShowFill(false);
            editBook(b);
          }}
          onClose={() => setShowFill(false)}
        />
      )}
    </div>
  );
}
