# Gravity-Loop-Erkenntnisse

Pro Eintrag dokumentieren:

- Datum, Commit und Testumgebung;
- Beobachtung und messbare oder reproduzierbare Evidenz;
- Änderung und zugehöriger Regressionstest;
- mögliche Bedeutung für andere interaktive MilosApps.

Allgemeine Erkenntnisse zu Pointer Events, Canvas-Performance, Zuständen oder
Barrierefreiheit an Struktur- und Ideen-Task melden. Keine Zugangsdaten oder
Nutzerdaten eintragen.

## 2026-07-30 – Feste Schritte von Render- und Eingabetakt trennen

- Ausgangspunkt: Commit `3f8161d`; Windows, Node 24, Vitest.
- Beobachtung: Ein zu kleiner Gleitkomma-Toleranzwert verlor bei
  144-Hz-Rendering nach zwölf Sekunden einen von 1.440 erwarteten
  120-Hz-Simulationsschritten.
- Änderung: enger Akkumulator-Epsilon und Eingabewechsel auf festen
  Simulationszeitpunkten.
- Regression: `fixed-step.test.ts` prüft 30, 60, 90, 120 und 144 Hz;
  `game.test.ts` vergleicht vollständige Flugzustände bei 30/60/144 Hz.
- Allgemeine Bedeutung: Renderfrequenz, Eingabeereignis und Fachsimulation sind
  drei verschiedene Takte. Nur die Fachsimulation darf Spielregeln verändern.

## 2026-07-30 – Pointer Capture braucht einen globalen Release-Fallback

- Ausgangspunkt: Commit `4cfa453`; Chromium-, Firefox- und WebKit-E2E.
- Beobachtung: Pointer Capture ist der zuverlässigste Hauptpfad, kann aber in
  älteren WebViews abgelehnt oder bei Lifecycle-Wechseln verloren werden.
- Änderung: aktive Pointer werden als Menge geführt; Canvas-Capture wird durch
  idempotente Window-Listener für `pointerup` und `pointercancel`, Blur-Reset und
  Visibility-Pause ergänzt.
- Regression: zwei gleichzeitige Pointer, einzelner Cancel, Lost Capture, zwölf
  synthetische Wechsel sowie echter CDP-Touch mit Long Hold, `touchCancel` und
  zehn schnellen Wechseln.
- Allgemeine Bedeutung: Ein boolesches `isDragging` oder `isPressed` reicht für
  Touchoberflächen nicht. Pointer-IDs und alle Abbruchpfade müssen explizit
  modelliert sein.

## 2026-07-30 – Statische Canvas-Ebenen stabilisieren gedrosselte Geräte

- Ausgangspunkt: erster Browserlauf nach Commit `3f8161d`; Chromium mit
  vierfacher CPU-Drosselung.
- Beobachtung: Sternfeld, Arenafläche und Rand wurden unnötig pro Frame
  aufgebaut; der langsamste Lauf fiel auf 28,1 FPS.
- Änderung: DPR-korrekte statische Canvas-Ebene, Invalidierung nur bei Resize,
  Seed- oder Kontrastwechsel; dynamische Ebene bleibt auf spielrelevante
  Objekte begrenzt. DPR wird bei 2,5 gedeckelt.
- Regression: Performance-E2E mit Normal- und 4×-CPU-Profil sowie Viewports von
  DPR 1 bis 3.
- Evidenz: nach der Änderung 47,9 bis 55,0 FPS im Mittel unter
  4×-Drosselung, Input-p95 höchstens 33,3 ms in grünen Läufen, 0 ms verlorene
  Simulation.
- Allgemeine Bedeutung: Codebasierte Canvas-Grafik ist nicht automatisch
  günstig. Statische und dynamische Zeichenarbeit muss getrennt und bei
  mehreren Pixeldichten gemessen werden.

## 2026-07-30 – Readiness muss die App-Identität beweisen

- Ausgangspunkt: lokaler paralleler MilosApps-Betrieb; Playwright.
- Beobachtung: Port `4173` lieferte nach einem Prozesswechsel HTTP 200 und
  `/health.json`, gehörte aber zu einer anderen App.
- Änderung: reservierter Gravity-Loop-Port `4317`, `strictPort`, keine
  E2E-Serverwiederverwendung und Healthcheck-Assertion auf
  `app: gravity-loop`.
- Regression: erster Browsertest prüft Status, App-Key und Umgebung.
- Allgemeine Bedeutung: Ein erreichbarer Port ist kein Identitätsnachweis. Bei
  parallelen Apps müssen Start und Readiness fail-closed arbeiten.

## 2026-07-30 – Canvas-Spiel braucht zugängliche DOM-Leitplanken

- Ausgangspunkt: Commit `4cfa453`; Axe, 200-Prozent-Zoom, Tastatur und
  Reduced-Motion-Tests.
- Beobachtung: Geschicklichkeit bleibt visuell, aber Start, Zustand, Hilfe,
  Pause, Neustart und Einstellungen müssen unabhängig vom Canvas verständlich
  bleiben.
- Änderung: zugänglicher Canvas-Name, DOM-Score, Live-Regionen, sichtbare
  Zustandskarten, native Dialog-/Formelemente, mindestens 44-Pixel-Ziele und
  dekorative statt physikalische Bewegungsreduktion.
- Regression: Axe A/AA in Start und Dialog, Tastaturreihenfolge,
  200-Prozent-Reflow und Reduced Motion in drei Engines.
- Allgemeine Bedeutung: Reduced Motion darf Regeln und Timing nicht verändern;
  Screenreader brauchen stabile DOM-Zustände rund um die visuelle Spielfläche.

## 2026-07-30 – Textzoom deckt Min-Content-Überläufe auf

- Ausgangspunkt: Commit `d30f2f8`; Chromium, Firefox und WebKit bei
  `360×800` und 200 Prozent Root-Textgröße.
- Beobachtung: Dreispaltige Scores erweiterten die Seite auf 403 Pixel; nach
  deren Korrektur blieb im Einstellungsdialog ein interner Überlauf von
  477 Pixel.
- Änderung: Grid-/Flex-Kinder erhalten `min-width: 0`, lange Beschriftungen
  dürfen umbrechen, und Settings sowie Bestätigungsaktionen werden auf sehr
  schmalen Viewports einspaltig.
- Regression: Browserprüfung misst Seiten- und Dialog-`scrollWidth`, öffnet den
  Einstellungsdialog und zeigt die Reset-Bestätigung bei 200 Prozent.
- Allgemeine Bedeutung: Ein überlauffreier Seitenrahmen beweist noch keinen
  zugänglichen Reflow. Modale Inhalte und verschachtelte Flex-/Grid-Kinder
  benötigen eigene Messungen; Abschneiden oder kleinere Schrift sind keine
  zulässige Korrektur.

## 2026-07-30 – DEV-Unterpfade brauchen relative Build- und Testnavigation

- Ausgangspunkt: App-Commit `a713482`; GitHub Pages unter dem Projektpfad
  `/MilosApps-GravityLoop/`.
- Beobachtung: Absolute Asset- oder E2E-Pfade wie `/assets/...` und
  `page.goto("/")` verlassen bei Projekt-Hosting den App-Unterpfad.
- Änderung: Das unveränderte App-Artefakt wird mit `vite build --base ./`
  erzeugt. Browsertests verwenden relative Navigation und besitzen eine
  HTTPS-only-Konfiguration ohne lokalen `webServer`.
- Regression: 3-Engine-Live-Matrix gegen die absolute Pages-DEV-URL samt
  Readiness, Responsive/DPR, Touch, Lifecycle, Accessibility und Performance.
- Allgemeine Bedeutung: Quell-SHA und Deployment-Artefakt-SHA müssen getrennt
  dokumentiert sein. Ein Unterpfad-Host gilt erst als bereit, wenn App,
  Assets, Healthcheck und Browsernavigation alle innerhalb desselben
  App-Pfads verifiziert wurden.
