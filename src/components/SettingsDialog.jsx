import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { useI18n } from '../i18n/index.jsx';
import { sheetApi } from '../lib/sheetApi.js';
import { REQUIRED_SCRIPT_VERSION } from '../lib/books.js';

const GUIDE_URL = 'https://github.com/wolroNick/book-tracker#readme';
const BACKUP_GUIDE_URL = 'https://github.com/wolroNick/book-tracker#kopie-zapasowe';

// Stan kopii zapasowych w arkuszu: data ostatniej kopii i przycisk „Zrób kopię teraz”.
function BackupSection({ settings }) {
  const { t, errorText } = useI18n();
  const [info, setInfo] = useState(null);
  const [state, setState] = useState('loading'); // loading | idle | running | error | outdated
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!settings.url || !settings.key) return;
    sheetApi
      .backupInfo(settings)
      .then((b) => { setInfo(b); setState('idle'); })
      .catch((err) => {
        const outdated = /Nieznana akcja/.test(err.message);
        setState(outdated ? 'outdated' : 'error');
        setMsg(outdated ? t('backupOutdated') : errorText(err));
      });
  }, [settings, t, errorText]);

  const runNow = async () => {
    setState('running');
    setMsg('');
    try {
      setInfo(await sheetApi.backupNow(settings));
      setState('idle');
      setMsg(t('backupDone'));
    } catch (err) {
      setState('error');
      setMsg(`${errorText(err)} ${t('backupAuthHint')}`);
    }
  };

  if (!settings.url || !settings.key) return null;

  return (
    <section className="settings-section">
      <h3>{t('backupTitle')}</h3>
      {state === 'loading' && <p className="hint">{t('testing')}</p>}
      {info && (
        <>
          <p>
            {info.enabled ? t('backupEnabled', { weeks: info.everyWeeks, keep: info.keep }) : t('backupDisabled')}
          </p>
          <p className="hint">{t('backupLast', { date: info.last || t('backupNever') })}</p>
          {!info.enabled && (
            <p className="hint">
              <a href={BACKUP_GUIDE_URL} target="_blank" rel="noopener noreferrer">{t('backupHowTo')} ↗</a>
            </p>
          )}
        </>
      )}
      {state !== 'outdated' && state !== 'loading' && (
        <div className="inline-form">
          <button type="button" className="btn" onClick={runNow} disabled={state === 'running'}>
            {state === 'running' ? t('backupRunning') : t('backupNow')}
          </button>
        </div>
      )}
      {msg && <p className={`msg ${state === 'error' ? 'msg-error' : state === 'outdated' ? 'msg-info' : 'msg-ok'}`}>{msg}</p>}
    </section>
  );
}

export default function SettingsDialog({ settings, onSave, onClose, welcome }) {
  const { t, lang, setLang, errorText } = useI18n();
  const [url, setUrl] = useState(settings.url || '');
  const [key, setKey] = useState(settings.key || '');
  const [test, setTest] = useState({ state: 'idle', msg: '' });

  const current = { url: url.trim(), key: key.trim() };

  const runTest = async () => {
    setTest({ state: 'loading', msg: '' });
    try {
      const res = await sheetApi.ping(current);
      const msg = res.version >= REQUIRED_SCRIPT_VERSION
        ? `${t('connectionOk')} ${t('scriptVersion', { v: res.version })}`
        : `${t('connectionOk')} ${t('scriptOld')}`;
      setTest({ state: res.version >= REQUIRED_SCRIPT_VERSION ? 'ok' : 'warn', msg });
    } catch (err) {
      setTest({ state: 'error', msg: errorText(err) });
    }
  };

  return (
    <Modal
      title={t('settings')}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onSave(current);
              onClose();
            }}
          >
            {t('save')}
          </button>
        </>
      }
    >
      {welcome && <p className="msg msg-info">{t('welcome')}</p>}
      <p>{t('settingsIntro')}</p>
      <p>
        <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">{t('setupGuide')} ↗</a>
      </p>

      <label className="field">
        <span>{t('scriptUrl')}</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/…/exec"
        />
      </label>
      <label className="field">
        <span>{t('apiKey')}</span>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
      </label>

      <div className="inline-form">
        <button type="button" className="btn" onClick={runTest} disabled={!current.url || !current.key || test.state === 'loading'}>
          {test.state === 'loading' ? t('testing') : t('testConnection')}
        </button>
      </div>
      {test.msg && <p className={`msg ${test.state === 'ok' ? 'msg-ok' : test.state === 'warn' ? 'msg-info' : 'msg-error'}`}>{test.msg}</p>}

      <BackupSection settings={settings} />

      <label className="field">
        <span>{t('language')}</span>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="pl">Polski</option>
          <option value="en">English</option>
        </select>
      </label>
    </Modal>
  );
}
