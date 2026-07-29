# QA-Plan: Gravity Loop

Der erste spielbare Stand ist ausdrücklich nicht fertig. Vor einer
Abschlussmeldung sind mindestens drei dokumentierte Verbesserungsrunden nötig.

## Automatisierbare Logik

- feste Simulationsschritte bei verschiedenen Renderfrequenzen;
- Gravitation, Kurskrümmung, Kollisionsgrenzen und Punktezählung;
- reproduzierbare Level- und Tageschallenge-Seeds;
- Pause, Neustart, Game-over und schneller Mehrfachstart;
- lokale Bestwerte, Serien, Reset und Speicherformatmigration;
- Layoutgrenzen nach Resize und Orientierungswechsel.

## Simulierte Nutzung

- kurzes Tippen, langes Halten, schneller Wechsel und gleichzeitige Eingaben;
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
