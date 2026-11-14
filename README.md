# 📚 Moje książki (Book Tracker)

Aplikacja do prowadzenia listy książek: przeczytanych, czytanych i do przeczytania.
Dane są przechowywane w Twoim arkuszu Google, a aplikację można zainstalować na telefonie.

**Adres aplikacji:** https://wolronick.github.io/book-tracker/

## Funkcje

- dodawanie, edycja i usuwanie książek – zmiany zapisują się w arkuszu Google,
- wyszukiwanie książki po tytule, autorze lub ISBN (Google Books i Open Library) z automatycznym uzupełnieniem danych i okładki,
- przycisk **„Poszukaj na Lubimyczytać”**, gdy okładki brak,
- **„Uzupełnij brakujące okładki”** dla wszystkich książek naraz,
- ocena 1–10, data rozpoczęcia i zakończenia, gatunek, liczba stron, notatki,
- **szybkie akcje**: przytrzymaj okładkę (na komputerze prawy przycisk myszy), aby oznaczyć książkę jako zaczętą lub przeczytaną dziś i od razu ją ocenić,
- **ponowne czytanie** 🔁: przy przeczytanej książce szybka akcja „Czytam ponownie” tworzy nowy wpis z własnymi datami, oceną i formą (liczony osobno w statystykach),
- **notatki z formatowaniem**: pogrubienie, kursywa, nagłówki, listy i cytaty, z podglądem,
- **automatyczna kopia zapasowa** arkusza co 2 tygodnie,
- **zarządzanie gatunkami** (Ustawienia lub panel Filtry → Zarządzaj gatunkami): zmiana nazwy i łączenie gatunków we wszystkich książkach naraz, z podpowiedzią podobnych nazw,
- **forma**: papier 📖, e-book 📱 lub audiobook 🎧 – z ikonką na okładce, filtrem i statystykami,
- filtrowanie (status, gatunek, ocena), sortowanie i wyszukiwarka,
- widok siatki lub listy, interfejs po polsku lub angielsku,
- **statystyki**: przeczytane książki i strony w roku, średnia ocena i czas czytania, cel roczny z tempem, wykresy miesięczne i roczne, rozkład ocen, ulubione gatunki i autorzy, wyróżnienia,
- działa offline (pokazuje ostatnio pobrane dane).

---

## Podłączenie arkusza (jednorazowo)

### 1. Przygotuj arkusz

Pracuj na **kopii** swojego arkusza (Plik → Utwórz kopię).
Pierwszy wiersz musi zawierać dokładnie te nagłówki (kolejność dowolna, dodatkowe kolumny są dozwolone i aplikacja ich nie zmienia):

```
id  tytul  autor  isbn  gatunek  liczba_stron  status  data_rozpoczecia  data_zakonczenia  ocena  notatki  okladka_url  forma  ponowne
```

Kolumny `forma` (wartości `papier`, `e-book`, `audiobook`) i `ponowne` (przy ponownym czytaniu: id pierwszego wpisu tej książki) skrypt doda sam na końcu arkusza, jeśli ich nie ma.

- `status`: `przeczytane`, `czytam` lub `do przeczytania`
- `ocena`: liczba 1–10
- daty: `RRRR-MM-DD`
- puste `id` aplikacja uzupełni sama przy pierwszym połączeniu

Książki powinny być na **pierwszej zakładce** arkusza (albo ustaw właściwość `SHEET_NAME`, patrz niżej).

### 2. Dodaj skrypt

1. W arkuszu kliknij **Rozszerzenia → Apps Script**.
2. Usuń zawartość pliku `Kod.gs` i wklej całą zawartość pliku [`apps-script/Code.gs`](apps-script/Code.gs) z tego repozytorium.
3. Kliknij ikonę dyskietki (**Zapisz**).

### 3. Ustaw tajny klucz

1. W edytorze Apps Script kliknij ikonę koła zębatego po lewej (**Ustawienia projektu**).
2. Przewiń do **Właściwości skryptu** → **Dodaj właściwość skryptu**.
3. Właściwość: `API_KEY`, wartość: dowolne długie hasło, np. `ksiazki-7Hq2xP9mLw4zR` (wymyśl własne).
4. *(Opcjonalnie)* jeśli książki nie są na pierwszej zakładce, dodaj właściwość `SHEET_NAME` z nazwą zakładki.
5. Kliknij **Zapisz właściwości skryptu**.

### 4. Opublikuj skrypt

1. Kliknij **Wdróż → Nowe wdrożenie**.
2. Przy „Wybierz typ” kliknij koło zębate → **Aplikacja internetowa**.
3. Ustaw:
   - **Wykonaj jako:** Ja (Twój adres e-mail)
   - **Kto ma dostęp:** Każdy
4. Kliknij **Wdróż** i zezwól na dostęp do arkusza (Google pokaże ostrzeżenie „Aplikacja nie została zweryfikowana” – kliknij **Zaawansowane → Przejdź do projektu (niebezpieczne)**; to Twój własny skrypt).
5. Skopiuj **URL aplikacji internetowej** (kończy się na `/exec`).

> „Każdy” oznacza, że skrypt przyjmuje zapytania z aplikacji bez logowania. Chroni go klucz `API_KEY` – bez niego skrypt nic nie zwróci ani nie zapisze.

### 5. Połącz aplikację

1. Otwórz aplikację, kliknij ⚙️ **Ustawienia**.
2. Wklej URL skryptu i klucz `API_KEY`, kliknij **Sprawdź połączenie**, potem **Zapisz**.

Adres i klucz są zapisywane tylko na danym urządzeniu – na telefonie i komputerze trzeba je wpisać osobno.

### Kopie zapasowe

Skrypt może co 2 tygodnie robić kopię arkusza (same dane, bez skryptu) w podfolderze
**„Kopie zapasowe – książki”** obok oryginału. Przechowywane są 4 ostatnie kopie, starsze trafiają do kosza Dysku Google (30 dni na odzyskanie).

Włączenie (jednorazowo, po aktualizacji skryptu):

1. W edytorze Apps Script, na górnym pasku, rozwiń listę funkcji (obok przycisków „Uruchom” i „Debuguj”) i wybierz **`wlaczKopieZapasowe`**.
2. Kliknij **Uruchom**.
3. Google poprosi o nowe uprawnienia (dostęp do Dysku i uruchamianie skryptu według harmonogramu): wybierz swoje konto → **Zaawansowane → Przejdź do projektu (niebezpieczne) → Zezwól**.
4. Gotowe – w folderze z arkuszem pojawi się podfolder z pierwszą kopią.

Stan kopii i przycisk **„Zrób kopię teraz”** znajdziesz w ustawieniach aplikacji (⚙️).
Aby wyłączyć automatyczne kopie, uruchom w ten sam sposób funkcję `wylaczKopieZapasowe`.

**Przywracanie:** otwórz wybraną kopię, zaznacz dane na zakładce z książkami i skopiuj je do oryginalnego arkusza (albo poproś o pomoc).

### Cel roczny

Cel roczny (zakładka **Statystyki**) zapisuje się w skrypcie arkusza (właściwość `APP_CONFIG`), więc jest wspólny dla telefonu i komputera.
Jeśli masz starszą wersję skryptu, cel zapisze się tylko na urządzeniu – wtedy zaktualizuj skrypt jak niżej.

### Aktualizacja skryptu

Gdy zmienisz kod w Apps Script: **Wdróż → Zarządzaj wdrożeniami → ✏️ (edytuj) → Wersja: Nowa wersja → Wdróż**. Adres URL pozostaje ten sam.

---

## Instalacja na telefonie (Android)

1. Otwórz adres aplikacji w **Chrome**.
2. Menu ⋮ → **Zainstaluj aplikację** (lub **Dodaj do ekranu głównego**).

## Okładki z Lubimyczytać

Gdy okładki nie da się znaleźć automatycznie, kliknij **„Poszukaj na Lubimyczytać”**, przytrzymaj palec na okładce,
wybierz **„Kopiuj adres obrazu”** i wklej link w polu „Link do okładki”.

---

## Dla programisty

```bash
npm install
npm run dev      # serwer deweloperski
npm run build    # wersja produkcyjna w katalogu dist/
```

Struktura:

- `src/App.jsx` – główny widok, filtrowanie i sortowanie
- `src/components/` – formularz książki, widoki siatki/listy, ustawienia, uzupełnianie okładek
- `src/lib/sheetApi.js` – komunikacja ze skryptem arkusza
- `src/lib/stats.js`, `src/components/StatsView.jsx`, `src/components/Charts.jsx` – statystyki i wykresy
- `src/lib/bookSearch.js` – wyszukiwanie w Google Books / Open Library, linki do Lubimyczytać
- `src/i18n/pl.js`, `src/i18n/en.js` – teksty interfejsu
- `apps-script/Code.gs` – skrypt do wklejenia w arkuszu Google
- `.github/workflows/deploy.yml` – automatyczna publikacja na GitHub Pages po każdym pushu do `main`
