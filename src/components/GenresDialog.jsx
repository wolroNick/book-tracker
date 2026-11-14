import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useI18n } from '../i18n/index.jsx';

// Klucz do wykrywania podobnych nazw: bez wielkości liter, polskich znaków, spacji i myślników.
const similarKey = (s) =>
  s.toLocaleLowerCase('pl').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[\s\-_.]+/g, '');

// Zarządzanie gatunkami: zmiana nazwy i łączenie (zapis od razu w arkuszu).
export default function GenresDialog({ books, onSaveMany, onRenamed, onClose }) {
  const { t, errorText } = useI18n();
  const [editing, setEditing] = useState(null); // { genre, mode: 'rename' | 'merge', value }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const genres = useMemo(() => {
    const counts = new Map();
    for (const b of books) if (b.gatunek) counts.set(b.gatunek, (counts.get(b.gatunek) || 0) + 1);
    const list = [...counts.entries()]
      .map(([name, count]) => ({ name, count, key: similarKey(name) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    // Podpowiedź: gatunki różniące się tylko pisownią (np. „non fiction” i „Non-fiction”).
    return list.map((g) => ({ ...g, similar: list.filter((o) => o.name !== g.name && o.key === g.key).map((o) => o.name) }));
  }, [books]);
  const noGenre = books.filter((b) => !b.gatunek).length;

  // Przenosi wszystkie książki z gatunku `from` do gatunku `to`.
  const apply = async (from, to) => {
    const target = to.trim();
    if (!target || target === from) {
      setEditing(null);
      return;
    }
    const existing = genres.find((g) => g.name !== from && g.name.toLocaleLowerCase('pl') === target.toLocaleLowerCase('pl'));
    const finalName = existing ? existing.name : target;
    const affected = books.filter((b) => b.gatunek === from);
    const question = existing
      ? t('genreMergeConfirm', { from, to: finalName, n: affected.length })
      : t('genreRenameConfirm', { from, to: finalName, n: affected.length });
    if (!window.confirm(question)) return;

    setBusy(true);
    setMsg(null);
    try {
      await onSaveMany(affected.map((b) => ({ ...b, gatunek: finalName })));
      onRenamed(from, finalName);
      setMsg({ ok: true, text: t('genreDone', { from, to: finalName, n: affected.length }) });
      setEditing(null);
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('genresTitle')} onClose={() => !busy && onClose()}>
      <p className="hint">{t('genresIntro')}</p>
      {msg && <p className={`msg ${msg.ok ? 'msg-ok' : 'msg-error'}`}>{msg.text}</p>}
      {busy && <p className="msg">{t('saving')}</p>}

      {genres.length === 0 ? (
        <p className="hint">{t('genresEmpty')}</p>
      ) : (
        <ul className="genre-list">
          {genres.map((g) => {
            const open = editing?.genre === g.name;
            return (
              <li key={g.name} className="genre-row">
                <div className="genre-main">
                  <span className="genre-name">{g.name}</span>
                  <span className="genre-count">{t('nBooks', { n: g.count })}</span>
                  {!open && (
                    <span className="genre-actions">
                      <button type="button" className="btn btn-small" disabled={busy} onClick={() => setEditing({ genre: g.name, mode: 'rename', value: g.name })}>
                        {t('genreRename')}
                      </button>
                      {genres.length > 1 && (
                        <button type="button" className="btn btn-small" disabled={busy} onClick={() => setEditing({ genre: g.name, mode: 'merge', value: '' })}>
                          {t('genreMerge')}
                        </button>
                      )}
                    </span>
                  )}
                </div>

                {g.similar.length > 0 && !open && (
                  <p className="genre-similar">
                    {t('genreSimilar')}{' '}
                    {g.similar.map((s) => (
                      <button key={s} type="button" className="link-btn" disabled={busy} onClick={() => apply(g.name, s)}>
                        {t('genreMergeInto', { to: s })}
                      </button>
                    ))}
                  </p>
                )}

                {open && editing.mode === 'rename' && (
                  <form className="inline-form genre-edit" onSubmit={(e) => { e.preventDefault(); apply(g.name, editing.value); }}>
                    <input
                      autoFocus
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      aria-label={t('genreNewName')}
                      placeholder={t('genreNewName')}
                    />
                    <button type="submit" className="btn btn-primary" disabled={busy || !editing.value.trim()}>{t('save')}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={busy}>{t('cancel')}</button>
                  </form>
                )}

                {open && editing.mode === 'merge' && (
                  <form className="inline-form genre-edit" onSubmit={(e) => { e.preventDefault(); apply(g.name, editing.value); }}>
                    <select
                      autoFocus
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      aria-label={t('genreMergeTarget')}
                    >
                      <option value="">{t('genreMergeTarget')}</option>
                      {genres.filter((o) => o.name !== g.name).map((o) => (
                        <option key={o.name} value={o.name}>{o.name} ({o.count})</option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-primary" disabled={busy || !editing.value}>{t('genreMerge')}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={busy}>{t('cancel')}</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {noGenre > 0 && <p className="hint">{t('genresNone', { n: noGenre })}</p>}
    </Modal>
  );
}
