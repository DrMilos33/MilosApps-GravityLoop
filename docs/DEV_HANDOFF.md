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
| Shared-Abhängigkeiten | `public-app-shell/v2.0.3` aus Shared-Commit `ed898412306e22c6ae1b10ee8953df29f8acd627` sowie `public-app-essentials/v1.1.2` aus Shared-Commit `b14aac6107b75f03ff49e74160af7e7e30c29e59`; beide app-eigen vendort, Essentials per sechsteiligem Verbraucher-Lock samt Schema verifiziert, kein Runtimeimport |
| Gemeinsame UX | kleiner readiness-gebundener Ladescreen, wahrheitsgemäßer No-Cookies-/Local-Storage-Hinweis und bewusst bestwertfreie Teilen-Aktion; Datum und Ort deaktiviert |

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
  `1bdecf63d9963ab8c580735397a60603e979925c`;
- daraus gebauter DEV-Artefakt-Commit:
  `8d99c8495f20976536e76fb5ce731308a73d6e24`;
- erfolgreiche Pages-Deployment-Ausführung:
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30785700551`;
- erfolgreiche vollständige App-CI auf `main` und Feature:
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30785423293`
  sowie
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30785423278`;
- Production: `false`, nicht freigegeben.

Direktaufruf, Health-Identität, Loginfreiheit, Chromium, Firefox und WebKit
wurden gegen die öffentliche URL geprüft. Der Browser benötigt weder
Portal-Cookies noch Milos-Login; die App lädt keine Portal- oder
Shared-Abhängigkeit. Details, Rollback und letzte gesunde Revision stehen in
`docs/DEV_DEPLOYMENT.md`.

Der aktuelle externe Abschlusslauf bestand 88 anwendbare Tests in Chromium,
Firefox und WebKit ohne Fehler oder Retry; 29 nicht anwendbare
Engine-/CDP-Kombinationen wurden bewusst übersprungen. Dabei wurden die echte
HTTPS-Ausgabe unter strikter Self-only-CSP, getrennte Shell- und
Essentials-Stylesheet-Origins, DE/EN samt Reload-Persistenz, Loader,
permanente Datenschutzinformation, Teilen, mobile Touchsteuerung außerhalb des Canvas,
Sternenschild und 360×800 bei 200 Prozent geprüft. Die Chromium-Referenz lag
bei 59,17 FPS und 11,00 ms Input-p95 normal, 56,30 FPS und 29,30 ms Input-p95
mit naturnaher Grafik plus Hut sowie 55,30 FPS und 14,80 ms Input-p95 bei
vierfacher CPU-Drosselung; verlorene Simulationszeit blieb in allen Profilen
0 ms. Der ausgelieferte Icon-SHA-256 ist bytegleich zur Source; sichtbare
390-/360-Pixel- und Desktop-QA ergab keinen horizontalen Überlauf und keine
Browserwarnung. Rollback bleibt Source `62624263f9a3154f4cddeeaf2344f6bd758a5f6a`
mit Pages `a7e52aa062f217f1ecd15d763c75d926640ce0cf`. Verbleibende Grenzen sind reale
Android-/iOS-Hardware, Android WebView sowie manuelle Tests mit TalkBack,
VoiceOver oder NVDA.
