import { useState } from 'react';
import Modal from './Modal.jsx';
import { useI18n } from '../i18n/index.jsx';
import { sheetApi } from '../lib/sheetApi.js';

const GUIDE_URL = 'https://github.com/wolroNick/book-tracker#readme';

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
      const msg = res.version >= 3
        ? `${t('connectionOk')} ${t('scriptVersion', { v: res.version })}`
        : `${t('connectionOk')} ${t('scriptOld')}`;
      setTest({ state: res.version >= 3 ? 'ok' : 'warn', msg });
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
