# Gravity Loop: DEV- und Portalübergabe

Stand: 2026-08-03
App-Key: `gravity-loop`  
Production: nicht freigegeben

## Stabile Metadaten

| Feld | Wert |
|---|---|
| Titel | Gravity Loop |
| Kurzbeschreibung | Halten krümmt die Flugbahn eines kleinen Kometen. Meistere Sonnen- oder Mondgravitation, lade mit drei Lichtsternen einen Schild und wähle deinen Kometen-Skin. |
| Sprache | Deutsch und Englisch (`de`, `en`), vollständig umschaltbar und lokal persistent |
| Klasse | öffentlich, ohne Anmeldung |
| Status | öffentlicher unabhängiger DEV-Stand, extern verifiziert |
| Plattformen | Web, mobil und Desktop |
| Eingaben | Touch/Stift auf der nicht-interaktiven App-Fläche, Maus im Canvas, Leertaste oder Pfeil hoch; `P` Pause, `R` Neustart |
| Daten | Bestwert, Sternenserie, Einstellungen und Sprache ausschließlich in notwendigem lokalem Browser-Speicher; keine Cookies, kein Dismiss-State, kein Konto, keine Datenbank |
| Vorschaubildrechte | Darstellung und Icon vollständig im Repository codebasiert erstellt; keine externen oder kopierten Assets |
| Shared-Abhängigkeiten | `public-app-shell/v2.0.3` aus Shared-Commit `ed898412306e22c6ae1b10ee8953df29f8acd627` sowie `public-app-essentials/v1.1.3` aus Shared-Commit `babe74a0e62e1a7f9095648195e54b322a837726`; beide app-eigen vendort, Essentials per sechsteiligem Verbraucher-Lock samt Schema verifiziert, kein Runtimeimport |
| Gemeinsame UX | readiness-gebundener Ladescreen mit exakt 32×32 Pixel großem App-Symbol, wahrheitsgemäßer No-Cookies-/Local-Storage-Hinweis und bewusst bestwertfreie Teilen-Aktion; Datum und Ort deaktiviert |

## Routen und Readiness

- reservierte Portalroute: `/apps/gravity-loop`;
- Ziel der Portalroute: Redirect auf die bestehende unabhängige HTTPS-DEV-URL;
- lokale DEV-URL: `http://127.0.0.1:4317/`;
- lokaler Healthcheck: `http://127.0.0.1:4317/health.json`;
- öffentliche DEV-URL:
  `https://drmilos33.github.io/MilosApps-GravityLoop/`;
- externer Healthcheck:
  `https://drmilos33.github.io/MilosApps-GravityLoop/health.json`;
- erwarteter Readiness-Body:

```json
{
  "status": "ok",
  "app": "gravity-loop",
  "environment": "dev"
}
```

Readiness gilt nur, wenn HTTP-Status und `app: gravity-loop` übereinstimmen.
Ein beliebiger HTTP-200-Response oder eine fremde `/health.json` reichen nicht.
Der lokale Dienst startet mit `strictPort` und bricht bei einer Kollision ab.

## Portalvertrag

- Baseline bleibt ohne Portal-Login vollständig nutzbar.
- Direkter App-Aufruf darf nicht von Portal-Verfügbarkeit, Portal-Cookies oder
  Milos-Identity abhängen.
- Das Portal importiert keinen Gravity-Loop-Quellcode und speichert keine
  Gravity-Loop-Fachdaten.
- Mobil-/Desktopprüfung, Direktaufruf und Portal-Ausfallgrenze liegen beim
  Portal-Task; App-Physik und App-E2E bleiben in diesem Repository.

## Externer DEV-Status

Der unabhängige öffentliche DEV-Dienst ist aktiv:

- GitHub-Repository:
  `https://github.com/DrMilos33/MilosApps-GravityLoop`;
- Hosting: GitHub Pages aus dem app-eigenen Branch `gh-pages`;
- deployter vollständiger App-Commit:
  `f41963731f77ca324292e1cb3dd769afebfdba62`;
- daraus gebauter DEV-Artefakt-Commit:
  `321ef0dc7ba3b44d04d8b0ef5b2ba6b364b31c49`;
- erfolgreiche Pages-Deployment-Ausführung:
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30802288647`;
- erfolgreiche vollständige App-CI auf `main` und Feature:
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30801758952`
  sowie
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30801758378`;
- Production: `false`, nicht freigegeben.

Direktaufruf, Health-Identität, Loginfreiheit, Chromium, Firefox und WebKit
wurden gegen die öffentliche URL geprüft. Der Browser benötigt weder
Portal-Cookies noch Milos-Login; die App lädt keine Portal- oder
Shared-Abhängigkeit. Details, Rollback und letzte gesunde Revision stehen in
`docs/DEV_DEPLOYMENT.md`.

Der aktuelle externe Funktionslauf bestand 85 anwendbare Tests in Chromium,
Firefox und WebKit ohne Fehler oder Retry; 23 nicht anwendbare
Engine-/CDP-Kombinationen wurden bewusst übersprungen. Dabei wurden die echte
HTTPS-Ausgabe unter strikter Self-only-CSP, getrennte Shell- und
Essentials-Stylesheet-Origins, DE/EN samt Reload-Persistenz, der exakt
32×32 Pixel große Loader, permanente Datenschutzinformation, Teilen, mobile
Touchsteuerung außerhalb des Canvas, Sternenschild und 360×800 bei 200 Prozent
geprüft. Das isolierte Chromium-Performancegate desselben Quellstands bestand
mit 49,92 / 47,70 / 43,01 FPS, Input-p95 36,0 / 30,2 / 32,1 ms und jeweils
0 ms verlorener Simulation; kein Budget wurde geändert. Der ausgelieferte
Icon-SHA-256 `ce6d0540c08726e702dec86d5e2cf7b85c4fabf8f7ae07a0fc93a4faed08001c`
ist bytegleich zur Source. Sichtbare 390-/360-Pixel- und Desktop-QA ergab
keinen horizontalen Überlauf und keine Browserwarnung. Rollback bleibt Source
`1bdecf63d9963ab8c580735397a60603e979925c` mit Pages
`8d99c8495f20976536e76fb5ce731308a73d6e24`. Verbleibende Grenzen sind reale
Android-/iOS-Hardware, Android WebView sowie manuelle Tests mit TalkBack,
VoiceOver oder NVDA.
