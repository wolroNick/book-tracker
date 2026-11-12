import { useCallback, useEffect, useState } from 'react';
import { sheetApi } from '../lib/sheetApi.js';
import { load, save } from '../lib/storage.js';

const KEY = 'bt.goals';

// Cele roczne ({ "2026": 30 }). Zapisywane w skrypcie arkusza, żeby były wspólne
// dla wszystkich urządzeń. Jeśli skrypt jest w starej wersji (bez tej funkcji),
// cel zapisuje się tylko na tym urządzeniu.
export function useGoals(settings) {
  const [goals, setGoalsState] = useState(() => load(KEY, {}));
  const [syncedWithSheet, setSynced] = useState(true);

  const setGoals = (next) => {
    setGoalsState(next);
    save(KEY, next);
  };

  useEffect(() => {
    if (!settings?.url || !settings?.key) return;
    let cancelled = false;
    sheetApi
      .getConfig(settings)
      .then((config) => {
        if (cancelled) return;
        setSynced(true);
        if (config?.goals) setGoals(config.goals);
      })
      .catch(() => !cancelled && setSynced(false));
    return () => {
      cancelled = true;
    };
  }, [settings]);

  const setGoal = useCallback(
    async (year, value) => {
      const next = { ...load(KEY, {}) };
      if (value > 0) next[year] = value;
      else delete next[year];
      setGoals(next);
      try {
        await sheetApi.setConfig(settings, { goals: next });
        setSynced(true);
      } catch {
        setSynced(false);
      }
    },
    [settings],
  );

  return { goals, setGoal, syncedWithSheet };
}
