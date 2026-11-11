import { createContext, useCallback, useContext, useState } from 'react';
import pl from './pl.js';
import en from './en.js';
import { load, save } from '../lib/storage.js';

const dictionaries = { pl, en };
const I18nContext = createContext(null);

function detectLang() {
  const stored = load('bt.lang', null);
  if (stored && dictionaries[stored]) return stored;
  return navigator.language?.startsWith('pl') ? 'pl' : 'en';
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  const setLang = useCallback((l) => {
    setLangState(l);
    save('bt.lang', l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key, vars) => {
      let text = dictionaries[lang][key] ?? dictionaries.pl[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
      return text;
    },
    [lang],
  );

  // Komunikat błędu: znane kody tłumaczymy, inne pokazujemy tak, jak przyszły ze skryptu.
  const errorText = useCallback(
    (err) => {
      const code = err?.message || String(err);
      const key = `error.${code}`;
      return dictionaries[lang][key] || t('errorPrefix', { msg: code });
    },
    [lang, t],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, errorText }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
