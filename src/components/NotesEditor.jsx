import { useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { renderNotes } from '../lib/notes.js';

// Edytor notatek z paskiem formatowania i podglądem.
export default function NotesEditor({ value, onChange }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const [mode, setMode] = useState(value ? 'preview' : 'edit');

  // Owija zaznaczenie znacznikami (np. **…**).
  const wrap = (mark) => {
    const el = ref.current;
    let { selectionStart: a, selectionEnd: b } = el;
    // Spacje na brzegach zaznaczenia zostają poza znacznikami.
    while (a < b && /\s/.test(value[a])) a++;
    while (b > a && /\s/.test(value[b - 1])) b--;
    const selected = value.slice(a, b) || t('notesSample');
    const next = value.slice(0, a) + mark + selected + mark + value.slice(b);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + mark.length, a + mark.length + selected.length);
    });
  };

  // Dodaje prefiks na początku każdej zaznaczonej linii (lista, nagłówek, cytat).
  const prefixLines = (makePrefix) => {
    const el = ref.current;
    const a = value.lastIndexOf('\n', el.selectionStart - 1) + 1;
    let b = value.indexOf('\n', el.selectionEnd);
    if (b === -1) b = value.length;
    const block = value.slice(a, b).split('\n').map((l, i) => makePrefix(i) + l).join('\n');
    onChange(value.slice(0, a) + block + value.slice(b));
    requestAnimationFrame(() => el.focus());
  };

  const tools = [
    { label: 'B', title: t('fmtBold'), cls: 'fmt-bold', run: () => wrap('**') },
    { label: 'I', title: t('fmtItalic'), cls: 'fmt-italic', run: () => wrap('*') },
    { label: 'H', title: t('fmtHeading'), run: () => prefixLines(() => '# ') },
    { label: '•', title: t('fmtList'), run: () => prefixLines(() => '- ') },
    { label: '1.', title: t('fmtNumbered'), run: () => prefixLines((i) => `${i + 1}. `) },
    { label: '❝', title: t('fmtQuote'), run: () => prefixLines(() => '> ') },
  ];

  return (
    <div className="notes-editor">
      <div className="notes-bar">
        <div className="segmented segmented-small">
          <button type="button" className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>{t('notesEdit')}</button>
          <button type="button" className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>{t('notesPreview')}</button>
        </div>
        {mode === 'edit' && (
          <div className="fmt-tools">
            {tools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                className={`fmt-btn ${tool.cls || ''}`}
                title={tool.title}
                aria-label={tool.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={tool.run}
              >
                {tool.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {mode === 'edit' ? (
        <textarea
          ref={ref}
          rows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('notesPlaceholder')}
        />
      ) : value.trim() ? (
        <div
          className="notes-preview"
          onClick={() => setMode('edit')}
          // Bezpieczne: renderNotes zabezpiecza cały tekst przed wstawieniem znaczników.
          dangerouslySetInnerHTML={{ __html: renderNotes(value) }}
        />
      ) : (
        <button type="button" className="notes-empty" onClick={() => setMode('edit')}>{t('notesEmpty')}</button>
      )}
    </div>
  );
}
