// Obsługa systemowego przycisku/gestu „Wstecz” (Android, przeglądarka).
// Każde otwarte okno (oraz zakładka inna niż „Książki”) dodaje wpis do historii
// przeglądarki. „Wstecz” zamyka wtedy najwyżej położone okno zamiast wychodzić z aplikacji.

const stack = []; // { id, handler }
let nextId = 1;
let ignorePops = 0; // ile zdarzeń popstate wywołaliśmy sami (history.go przy zamknięciu z UI)
let pendingBack = 0; // wpisy do cofnięcia – cofamy z opóźnieniem, bo zaraz może otworzyć się kolejne okno
let flushTimer = null;

function flush() {
  flushTimer = null;
  if (pendingBack > 0) {
    ignorePops += 1;
    history.go(-pendingBack);
    pendingBack = 0;
  }
}

function onPopState() {
  if (ignorePops > 0) {
    ignorePops -= 1;
    return;
  }
  const top = stack.pop();
  if (!top) return;
  // Handler może odmówić zamknięcia (np. niezapisane zmiany i „Anuluj”) – wtedy przywracamy wpis.
  const closed = top.handler() !== false;
  if (!closed) {
    stack.push(top);
    history.pushState({ bt: top.id }, '');
  }
}

let listening = false;
function ensureListener() {
  if (listening) return;
  window.addEventListener('popstate', onPopState);
  listening = true;
}

// Rejestruje wpis „Wstecz”; zwraca id do późniejszego usunięcia.
export function pushBack(handler) {
  ensureListener();
  const id = nextId++;
  stack.push({ id, handler });
  if (pendingBack > 0) {
    // Jedno okno zastąpiło drugie (np. „Edytuj” z szybkich akcji) – używamy jego wpisu w historii.
    pendingBack -= 1;
  } else {
    history.pushState({ bt: id }, '');
  }
  return id;
}

// Usuwa wpis, gdy okno zamknięto przyciskiem w aplikacji (a nie przez „Wstecz”).
export function removeBack(id) {
  const i = stack.findIndex((e) => e.id === id);
  if (i === -1) return; // już zamknięte przez „Wstecz”
  stack.splice(i, 1);
  if (i === stack.length) {
    // Był na wierzchu – cofamy też wpis w historii, żeby nie zostawał „pusty” krok wstecz.
    pendingBack += 1;
    if (!flushTimer) flushTimer = setTimeout(flush, 0);
  }
}
