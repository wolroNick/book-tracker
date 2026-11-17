import { useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { renderNotes } from '../lib/notes.js';
import { quoteToNotes } from '../lib/quotes.js';
import { QuoteIcon } from './Icons.jsx';

// Edytor notatek z paskiem formatowania i podglądem.
export default function NotesEditor({ value, onChange, startWithQuote = false }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const [mode, setMode] = useState(value ? 'preview' : 'edit');
  const [quoteForm, setQuoteForm] = useState(startWithQuote ? { text: '', page: '' } : null); // null | { text, page }

  // Dopisuje cytat na końcu notatek jako linie „> …” z numerem strony.
  const addQuote = () => {
    if (!quoteForm?.text.trim()) return;
    const block = quoteToNotes(quoteForm.text, quoteForm.page);
    onChange(value.trim() ? `${value.replace(/\s+$/, '')}\n\n${block}` : block);
    setQuoteForm(null);
    setMode('preview');
  };

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
        <button type="button" className="btn btn-small btn-quote" onClick={() => setQuoteForm(quoteForm ? null : { text: '', page: '' })}>
          <QuoteIcon /> {t('quoteAdd')}
        </button>
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
      {quoteForm && (
        <div className="quote-form appear">
          <label className="field">
            <span>{t('quoteText')}</span>
            <textarea
              rows={3}
              autoFocus
              value={quoteForm.text}
              onChange={(e) => setQuoteForm({ ...quoteForm, text: e.target.value })}
              placeholder={t('quoteTextPlaceholder')}
            />
          </label>
          <div className="quote-form-row">
            <label className="field quote-page-field">
              <span>{t('quotePage')}</span>
              <input
                type="text"
                inputMode="numeric"
                value={quoteForm.page}
                onChange={(e) => setQuoteForm({ ...quoteForm, page: e.target.value.replace(/[^\d]/g, '') })}
              />
            </label>
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={() => setQuoteForm(null)}>{t('cancel')}</button>
            <button type="button" className="btn btn-primary" onClick={addQuote} disabled={!quoteForm.text.trim()}>{t('quoteAddShort')}</button>
          </div>
        </div>
      )}
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
