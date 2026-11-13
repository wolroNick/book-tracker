// Komunikacja ze skryptem Google Apps Script podłączonym do arkusza.
// Content-Type text/plain pozwala uniknąć zapytania CORS „preflight”,
// którego Apps Script nie obsługuje.
async function call(settings, action, payload = {}) {
  if (!settings?.url || !settings?.key) throw new Error('NOT_CONFIGURED');
  let res;
  try {
    res = await fetch(settings.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: settings.key, action, ...payload }),
      redirect: 'follow',
    });
  } catch {
    throw new Error('NETWORK');
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('BAD_RESPONSE');
  }
  if (!data.ok) throw new Error(data.error || 'UNKNOWN');
  return data;
}

export const sheetApi = {
  ping: (s) => call(s, 'ping'),
  list: async (s) => (await call(s, 'list')).books,
  save: async (s, book) => (await call(s, 'save', { book })).book,
  saveMany: async (s, books) => (await call(s, 'saveMany', { books })).books,
  remove: (s, id) => call(s, 'delete', { id }),
  backupInfo: async (s) => (await call(s, 'backupInfo')).backup,
  backupNow: async (s) => (await call(s, 'backupNow')).backup,
  getConfig: async (s) => (await call(s, 'getConfig')).config,
  setConfig: async (s, config) => (await call(s, 'setConfig', { config })).config,
};
