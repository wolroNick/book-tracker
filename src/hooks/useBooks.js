import { useCallback, useEffect, useRef, useState } from 'react';
import { sheetApi } from '../lib/sheetApi.js';
import { normalizeBook, newId } from '../lib/books.js';
import { load, save } from '../lib/storage.js';

const CACHE_KEY = 'bt.books';

// Przechowuje listę książek: pokazuje od razu kopię z urządzenia,
// a w tle pobiera aktualne dane z arkusza.
export function useBooks(settings) {
  const [books, setBooksState] = useState(() => load(CACHE_KEY, []).map(normalizeBook));
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  // Stara wersja skryptu nie zna kolumny „forma” – trzeba go zaktualizować.
  const [scriptOutdated, setScriptOutdated] = useState(false);
  const booksRef = useRef(books);

  const setBooks = useCallback((next) => {
    booksRef.current = next;
    setBooksState(next);
    save(CACHE_KEY, next);
  }, []);

  const configured = Boolean(settings?.url && settings?.key);

  const refresh = useCallback(async () => {
    if (!configured) return;
    setSyncing(true);
    setError(null);
    try {
      const list = await sheetApi.list(settings);
      setScriptOutdated(list.length > 0 && !('ponowne' in list[0]));
      setBooks(list.map(normalizeBook));
    } catch (err) {
      setError(err);
    } finally {
      setSyncing(false);
    }
  }, [configured, settings, setBooks]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Zapis jednej książki (nowej lub edytowanej). Rzuca błąd, jeśli się nie uda.
  const saveBook = useCallback(
    async (book) => {
      const toSave = normalizeBook(book);
      if (!toSave.id) toSave.id = newId();
      const saved = normalizeBook(await sheetApi.save(settings, toSave));
      const current = booksRef.current;
      const exists = current.some((b) => b.id === saved.id);
      setBooks(exists ? current.map((b) => (b.id === saved.id ? saved : b)) : [...current, saved]);
      return saved;
    },
    [settings, setBooks],
  );

  const deleteBook = useCallback(
    async (id) => {
      await sheetApi.remove(settings, id);
      setBooks(booksRef.current.filter((b) => b.id !== id));
    },
    [settings, setBooks],
  );

  const saveMany = useCallback(
    async (list) => {
      if (!list.length) return;
      const saved = (await sheetApi.saveMany(settings, list.map(normalizeBook))).map(normalizeBook);
      const byId = new Map(saved.map((b) => [b.id, b]));
      setBooks(booksRef.current.map((b) => byId.get(b.id) || b));
    },
    [settings, setBooks],
  );

  return { books, syncing, error, setError, refresh, saveBook, deleteBook, saveMany, configured, scriptOutdated };
}
