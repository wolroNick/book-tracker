/**
 * Book Tracker – API dla arkusza Google.
 *
 * Instalacja: zobacz README.md w repozytorium (sekcja „Podłączenie arkusza”).
 *
 * Właściwości skryptu (Ustawienia projektu → Właściwości skryptu):
 *   API_KEY    – tajny klucz, który wpisujesz też w ustawieniach aplikacji (wymagane)
 *   SHEET_NAME – nazwa zakładki z książkami (opcjonalne, domyślnie pierwsza zakładka)
 *
 * Kopie zapasowe: uruchom raz ręcznie funkcję wlaczKopieZapasowe (lista funkcji
 * na górnym pasku edytora → Uruchom). Od tej pory co 2 tygodnie powstaje kopia
 * arkusza w podfolderze „Kopie zapasowe – książki” obok oryginału.
 */

// Numer wersji skryptu – aplikacja pokazuje go po kliknięciu „Sprawdź połączenie”.
const SCRIPT_VERSION = 4;

const HEADERS = [
  'id', 'tytul', 'autor', 'isbn', 'gatunek', 'liczba_stron', 'status',
  'data_rozpoczecia', 'data_zakonczenia', 'ocena', 'notatki', 'okladka_url', 'forma',
];
// Kolumny dodawane automatycznie na końcu arkusza, jeśli ich brakuje.
const OPTIONAL_HEADERS = ['forma'];
const NUMBER_FIELDS = ['liczba_stron', 'ocena'];
const DATE_FIELDS = ['data_rozpoczecia', 'data_zakonczenia'];

function doGet() {
  return json_({ ok: true, version: SCRIPT_VERSION, message: 'Book Tracker API działa. Połącz się z aplikacji.' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Nieprawidłowe zapytanie (JSON).' });
  }
  return handle_(req);
}

function handle_(req) {
  try {
    const key = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (!key) return json_({ ok: false, error: 'Brak właściwości API_KEY w ustawieniach skryptu.' });
    if (req.key !== key) return json_({ ok: false, error: 'Nieprawidłowy klucz API.' });

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      switch (req.action) {
        case 'ping':
          readTable_(); // sprawdza też nagłówki
          return json_({ ok: true, version: SCRIPT_VERSION });
        case 'list':
          return json_({ ok: true, books: listBooks_() });
        case 'save':
          return json_({ ok: true, book: saveBooks_([req.book])[0] });
        case 'saveMany':
          return json_({ ok: true, books: saveBooks_(req.books || []) });
        case 'delete':
          deleteBook_(req.id);
          return json_({ ok: true });
        case 'getConfig':
          return json_({ ok: true, config: getConfig_() });
        case 'backupInfo':
          return json_({ ok: true, backup: backupInfo_() });
        case 'backupNow':
          zrobKopieZapasowa();
          return json_({ ok: true, backup: backupInfo_() });
        case 'setConfig':
          return json_({ ok: true, config: setConfig_(req.config || {}) });
        default:
          return json_({ ok: false, error: 'Nieznana akcja: ' + req.action });
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

// ---------------------------------------------------------------------------

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = PropertiesService.getScriptProperties().getProperty('SHEET_NAME');
  const sheet = name ? ss.getSheetByName(name) : ss.getSheets()[0];
  if (!sheet) throw new Error('Nie znaleziono zakładki: ' + name);
  return sheet;
}

function readTable_() {
  const sheet = getSheet_();
  let values = sheet.getDataRange().getValues();
  let headers = (values[0] || []).map(function (h) { return String(h).trim(); });
  const missingOptional = OPTIONAL_HEADERS.filter(function (h) { return headers.indexOf(h) === -1; });
  if (missingOptional.length && headers.length) {
    sheet.getRange(1, headers.length + 1, 1, missingOptional.length).setValues([missingOptional]);
    values = sheet.getDataRange().getValues();
    headers = values[0].map(function (h) { return String(h).trim(); });
  }
  const missing = HEADERS.filter(function (h) { return headers.indexOf(h) === -1; });
  if (missing.length) {
    throw new Error('W pierwszym wierszu arkusza brakuje kolumn: ' + missing.join(', '));
  }
  return { sheet: sheet, headers: headers, rows: values.slice(1) };
}

function isDate_(value) {
  return Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime());
}

function cellToString_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (isDate_(value)) {
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  }
  return String(value).trim();
}

// Daty zapisane w arkuszu jako tekst (np. 3.03.2026) zamieniamy na RRRR-MM-DD.
function dateToIso_(value) {
  const s = cellToString_(value);
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function isEmptyRow_(row) {
  return row.every(function (v) { return v === '' || v === null; });
}

function newId_() {
  return 'b' + Date.now() + Math.floor(Math.random() * 1000);
}

function listBooks_() {
  const t = readTable_();
  const idCol = t.headers.indexOf('id');
  const books = [];
  t.rows.forEach(function (row, i) {
    if (isEmptyRow_(row)) return;
    const book = {};
    HEADERS.forEach(function (h) {
      const cell = row[t.headers.indexOf(h)];
      book[h] = DATE_FIELDS.indexOf(h) !== -1 ? dateToIso_(cell) : cellToString_(cell);
    });
    if (!book.id) {
      // Uzupełnij brakujące id bezpośrednio w arkuszu.
      book.id = newId_();
      Utilities.sleep(2);
      t.sheet.getRange(i + 2, idCol + 1).setValue(book.id);
    }
    books.push(book);
  });
  return books;
}

function toCellValue_(field, value) {
  if (value === null || value === undefined) return '';
  if (NUMBER_FIELDS.indexOf(field) !== -1) {
    const n = Number(value);
    return value === '' || isNaN(n) ? '' : n;
  }
  return String(value);
}

function saveBooks_(books) {
  const t = readTable_();
  const idCol = t.headers.indexOf('id');
  const isbnCol = t.headers.indexOf('isbn');
  const rowById = {};
  t.rows.forEach(function (row, i) {
    const id = cellToString_(row[idCol]);
    if (id) rowById[id] = i;
  });

  let nextRow = t.sheet.getLastRow() + 1;
  return books.map(function (book) {
    if (!book.id) {
      book.id = newId_();
      Utilities.sleep(2);
    }
    const existingIndex = rowById[book.id];
    const existing = existingIndex !== undefined ? t.rows[existingIndex] : null;

    // Kolumny spoza listy HEADERS (np. Twoje własne) zostają nietknięte.
    const rowValues = t.headers.map(function (h, col) {
      if (HEADERS.indexOf(h) !== -1) return toCellValue_(h, book[h]);
      return existing ? existing[col] : '';
    });

    const rowNumber = existing ? existingIndex + 2 : nextRow++;
    // ISBN jako tekst, żeby nie zgubić zer na początku ani znaku X.
    t.sheet.getRange(rowNumber, isbnCol + 1).setNumberFormat('@');
    t.sheet.getRange(rowNumber, 1, 1, rowValues.length).setValues([rowValues]);

    const saved = {};
    HEADERS.forEach(function (h) { saved[h] = book[h] === undefined || book[h] === null ? '' : String(book[h]); });
    return saved;
  });
}

function deleteBook_(id) {
  if (!id) throw new Error('Brak id książki.');
  const t = readTable_();
  const idCol = t.headers.indexOf('id');
  for (let i = 0; i < t.rows.length; i++) {
    if (cellToString_(t.rows[i][idCol]) === id) {
      t.sheet.deleteRow(i + 2);
      return;
    }
  }
  throw new Error('Nie znaleziono książki o id ' + id);
}

// Ustawienia aplikacji (np. cele roczne) – zapisywane we właściwościach skryptu,
// dzięki czemu są wspólne dla telefonu i komputera.
function getConfig_() {
  const raw = PropertiesService.getScriptProperties().getProperty('APP_CONFIG');
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function setConfig_(patch) {
  const config = getConfig_();
  Object.keys(patch).forEach(function (k) { config[k] = patch[k]; });
  PropertiesService.getScriptProperties().setProperty('APP_CONFIG', JSON.stringify(config));
  return config;
}

// ---------------------------------------------------------------------------
// Kopie zapasowe

const BACKUP_FOLDER = 'Kopie zapasowe – książki';
const BACKUP_KEEP = 4; // ile ostatnich kopii przechowywać
const BACKUP_EVERY_WEEKS = 2;

/** Uruchom raz ręcznie w edytorze: włącza automatyczne kopie co 2 tygodnie i robi pierwszą kopię. */
function wlaczKopieZapasowe() {
  wylaczKopieZapasowe();
  ScriptApp.newTrigger('zrobKopieZapasowa')
    .timeBased()
    .everyWeeks(BACKUP_EVERY_WEEKS)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(3)
    .create();
  zrobKopieZapasowa();
}

/** Wyłącza automatyczne kopie (istniejące kopie zostają). */
function wylaczKopieZapasowe() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'zrobKopieZapasowa') ScriptApp.deleteTrigger(t);
  });
}

function backupFolder_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const parents = DriveApp.getFileById(ss.getId()).getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const existing = parent.getFoldersByName(BACKUP_FOLDER);
  return existing.hasNext() ? existing.next() : parent.createFolder(BACKUP_FOLDER);
}

/** Tworzy kopię wszystkich zakładek (same dane i formatowanie, bez skryptu) i usuwa najstarsze kopie. */
function zrobKopieZapasowa() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  const stamp = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
  const copy = SpreadsheetApp.create(ss.getName() + ' – kopia ' + stamp);

  const blank = copy.getSheets()[0];
  ss.getSheets().forEach(function (sheet) {
    const copied = sheet.copyTo(copy);
    copied.setName(sheet.getName());
  });
  copy.deleteSheet(blank);

  const folder = backupFolder_();
  DriveApp.getFileById(copy.getId()).moveTo(folder);

  // Zostaw tylko BACKUP_KEEP najnowszych kopii; starsze trafiają do kosza (30 dni na odzyskanie).
  const files = [];
  const it = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(BACKUP_KEEP).forEach(function (f) { f.setTrashed(true); });

  PropertiesService.getScriptProperties().setProperty('LAST_BACKUP', stamp);
}

function backupInfo_() {
  const enabled = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'zrobKopieZapasowa';
  });
  return {
    enabled: enabled,
    last: PropertiesService.getScriptProperties().getProperty('LAST_BACKUP') || '',
    everyWeeks: BACKUP_EVERY_WEEKS,
    keep: BACKUP_KEEP,
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
