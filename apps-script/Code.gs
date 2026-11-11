/**
 * Book Tracker – API dla arkusza Google.
 *
 * Instalacja: zobacz README.md w repozytorium (sekcja „Podłączenie arkusza”).
 *
 * Właściwości skryptu (Ustawienia projektu → Właściwości skryptu):
 *   API_KEY    – tajny klucz, który wpisujesz też w ustawieniach aplikacji (wymagane)
 *   SHEET_NAME – nazwa zakładki z książkami (opcjonalne, domyślnie pierwsza zakładka)
 */

const HEADERS = [
  'id', 'tytul', 'autor', 'isbn', 'gatunek', 'liczba_stron', 'status',
  'data_rozpoczecia', 'data_zakonczenia', 'ocena', 'notatki', 'okladka_url',
];
const NUMBER_FIELDS = ['liczba_stron', 'ocena'];

function doGet() {
  return json_({ ok: true, message: 'Book Tracker API działa. Połącz się z aplikacji.' });
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
          return json_({ ok: true });
        case 'list':
          return json_({ ok: true, books: listBooks_() });
        case 'save':
          return json_({ ok: true, book: saveBooks_([req.book])[0] });
        case 'saveMany':
          return json_({ ok: true, books: saveBooks_(req.books || []) });
        case 'delete':
          deleteBook_(req.id);
          return json_({ ok: true });
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
  const values = sheet.getDataRange().getValues();
  const headers = (values[0] || []).map(function (h) { return String(h).trim(); });
  const missing = HEADERS.filter(function (h) { return headers.indexOf(h) === -1; });
  if (missing.length) {
    throw new Error('W pierwszym wierszu arkusza brakuje kolumn: ' + missing.join(', '));
  }
  return { sheet: sheet, headers: headers, rows: values.slice(1) };
}

function cellToString_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).trim();
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
    HEADERS.forEach(function (h) { book[h] = cellToString_(row[t.headers.indexOf(h)]); });
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

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
