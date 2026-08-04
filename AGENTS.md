# Gravity Loop Repository-Regeln

## Zuständigkeit

Dieses Repository enthält ausschließlich `Gravity Loop` mit dem App-Key
`gravity-loop`. Fachlogik anderer MilosApps gehört nicht hierher.

## Portfolio-Verträge

- App-Klasse: `öffentlich`
- Plattformen: `Web, mobil und Desktop`
- Datenhaltung: `Bestwert, Serie und Einstellungen lokal; keine App-Datenbank`
- Deployment: `eigener DEV-Dienst; getrennte Cloudflare-Pages-Production ist
  für die Kampagne public-app-production-launch-2026-08 freigegeben`
- Gemeinsame Abhängigkeiten: `keine`

Wenn der lokale MilosApps Workspace verfügbar ist, vor appübergreifenden
Änderungen die Register-, Portfolio-, Identity- und
`docs/PORTFOLIO_LEARNINGS.md`-Dokumente dort lesen.

## Arbeitsgrenzen

- Nur Dateien dieses Repositorys ändern.
- Keine fremden App-Quellen, Assets, Spielmechaniken, Namen oder Designs kopieren.
- Keine Datenbank, Cookies, Secrets oder Quellcode mit anderen Apps teilen.
- Gemeinsame Assets erst über eine feste veröffentlichte Version beziehen.
- DEV und Production strikt trennen. Die Production-Freigabe umfasst nur den
  kampagnengebundenen Gravity-Loop-Kandidaten und dessen später bestätigtes
  Cloudflare-Pages-Ziel; DEV, Portal und fremde Apps bleiben getrennt.

## Besondere Qualitätsanforderung

Gravity Loop erhält bewusst mehr Zeit für Spielgefühl, Physik,
Eingabelatenz, Lesbarkeit und Wiederspielreiz. Die erste spielbare Runde ist
keine Fertigmeldung. Physik und Tageschallenge müssen deterministisch testbar
sein; Touch-, Maus- und Tastatursteuerung müssen gleichwertig zuverlässig sein.

## Qualität

- feste oder stabilisierte Simulationsschritte und reproduzierbare Seeds nutzen;
- automatisierte Physik-, Kollisions-, Zustands- und End-to-End-Tests aufbauen;
- nach dem ersten spielbaren Stand mindestens drei QA-/Verbesserungsrunden
  durchführen;
- Pointer-Abbruch, schnelle Wiederholung, Rotation, Tabwechsel, Pause und
  Neustart simulieren;
- Smartphone, Tablet, Desktop, reduzierte Bewegung, hohen Zoom, Tastatur und
  Screenreader-Semantik prüfen;
- Performance messen und Ruckeln nicht nur subjektiv bewerten;
- Erkenntnisse in `docs/LEARNINGS.md` dokumentieren und zurückmelden.
