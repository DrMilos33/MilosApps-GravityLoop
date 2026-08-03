# QA-Plan: Gravity Loop

Der erste spielbare Stand ist ausdrücklich nicht fertig. Vor einer
Abschlussmeldung sind mindestens drei dokumentierte Verbesserungsrunden nötig.

## Automatisierbare Logik

- feste Simulationsschritte bei verschiedenen Renderfrequenzen;
- Gravitation, Kurskrümmung, Kollisionsgrenzen, Sternenschild und
  Punktezählung;
- reproduzierbare Level- und Tageschallenge-Seeds;
- Pause, Neustart, Game-over und schneller Mehrfachstart;
- lokale Bestwerte, Serien, Reset und Speicherformatmigration;
- Layoutgrenzen nach Resize und Orientierungswechsel.

## Simulierte Nutzung

- kurzes Tippen, langes Halten, schneller Wechsel und gleichzeitige Eingaben;
- Touch innerhalb und außerhalb des Canvas, während interaktive Ziele nie als
  Gravitationsfläche behandelt werden;
- Pointer-Cancel, verlorener Fokus, Tabwechsel, Systemdialog und App-Rückkehr;
- Touch, Maus, Tastatur, Trackpad und hohe Eingabelatenz;
- kleine und große Viewports, Hoch-/Querformat, hoher Gerätepixelfaktor;
- reduzierte Bewegung, 200 Prozent Zoom, Farbsehschwächen und stummer Betrieb;
- 30-, 60- und höhere Renderfrequenzen sowie CPU-Drosselung.

## Runden

1. Physik, Kollisionsregeln, vollständiger Spielfluss und reproduzierbare Tests.
2. Spielgefühl, Schwierigkeit, Eingabefehler, schnelle Wiederholung und mobile
   Ergonomie; Probleme beheben und Regressionstests ergänzen.
3. Performance, Barrierefreiheit, visuelle Lesbarkeit, Zustandswiederherstellung
   und längere Spielsitzung; erneut verbessern und volle Matrix wiederholen.

## Abschlussnachweis

Framerate-/Frame-Time-Messung, getestete Geräteemulationen, Eingabemethoden,
automatisierte Tests, bekannte Grenzen und nicht testbare Hardware werden
konkret dokumentiert.

## Public-App-Essentials-Gate

- fester Shared-Commit, Manifest, sechsteiliger Lock einschließlich Schema und
  portabler Validator;
- Ladescreen vor Fachruntime, App-Icon im HTML-Fallback und nach CSS exakt
  32 × 32 CSS-Pixel auf Desktop, mobil und bei 200 Prozent, Reduced Motion
  und genau eine Dokument-H1;
- zweckweises Endgerätezugriffs-Inventar; bei ausschließlich notwendigen
  lokalen Speicherzwecken kein Schein-Einwilligungsdialog, sondern eine
  dauerhaft erreichbare DE-/EN-Datenschutzinformation mit absolutem Link und
  44-Pixel-Ziel;
- vollständiger lokaler Datenreset entfernt aktive und migrierte Altschlüssel;
- Teilen über native API, bewussten Abbruch und Clipboard-Fallback; kein
  Bestwert, keine Serie und keine Query-/Hash-Daten im Payload;
- beide Essentials-CSS-Dateien und der Bootstrap bleiben im gebauten
  Pages-Artefakt externe relative Same-Origin-Dateien; sechs Verbraucherartefakte,
  MIME und strikte Self-only-CSP werden fail-closed geprüft;
- 1440×900, 390×844 und 360×800 bei 200 Prozent ohne horizontalen Überlauf.
