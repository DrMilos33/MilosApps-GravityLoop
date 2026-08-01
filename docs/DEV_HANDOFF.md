# Gravity Loop: DEV- und Portalübergabe

Stand: 2026-08-01
App-Key: `gravity-loop`  
Production: nicht freigegeben

## Stabile Metadaten

| Feld | Wert |
|---|---|
| Titel | Gravity Loop |
| Kurzbeschreibung | Halten krümmt die Flugbahn eines kleinen Kometen. Meistere Sonnen- oder Mondgravitation in drei Schwierigkeitsgraden, sammle Lichtfunken und wähle deinen Kometen-Skin. |
| Sprache | Deutsch und Englisch (`de`, `en`), vollständig umschaltbar und lokal persistent |
| Klasse | öffentlich, ohne Anmeldung |
| Status | öffentlicher unabhängiger DEV-Stand, extern verifiziert |
| Plattformen | Web, mobil und Desktop |
| Eingaben | Touch, Pointer/Stift, Maus, Leertaste oder Pfeil hoch; `P` Pause, `R` Neustart |
| Daten | Bestwert, Funkenserie, Einstellungen und Sprache ausschließlich in lokalem Browser-Speicher; keine Cookies, kein Konto, keine Datenbank |
| Vorschaubildrechte | Darstellung und Icon vollständig im Repository codebasiert erstellt; keine externen oder kopierten Assets |
| Shared-Abhängigkeiten | `public-app-shell/v2.0.3` aus Shared-Commit `ed898412306e22c6ae1b10ee8953df29f8acd627`, app-eigen vendort und per 5er-Lock verifiziert; kein Runtimeimport |

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
  `bfa148ba68dcec9dfedbb3e3804102a923111695`;
- daraus gebauter DEV-Artefakt-Commit:
  `e5bf3855d12a919b11b8c95628c2e5d01b83ea04`;
- erfolgreiche Pages-Deployment-Ausführung:
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30703430131`;
- erfolgreiche vollständige App-CI:
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30703160956`;
- Production: `false`, nicht freigegeben.

Direktaufruf, Health-Identität, Loginfreiheit, Chromium, Firefox und WebKit
wurden gegen die öffentliche URL geprüft. Der Browser benötigt weder
Portal-Cookies noch Milos-Login; die App lädt keine Portal- oder
Shared-Abhängigkeit. Details, Rollback und letzte gesunde Revision stehen in
`docs/DEV_DEPLOYMENT.md`.

Der aktuelle externe Abschlusslauf bestand 64 anwendbare Tests in Chromium,
Firefox und WebKit ohne Fehler oder Retry; 23 nicht anwendbare
Engine-/CDP-Kombinationen wurden bewusst übersprungen. Dabei wurden die echte
HTTPS-Ausgabe unter strikter Self-only-CSP, beide Shell-Stylesheet-Origins,
DE/EN samt Reload-Persistenz und 360×800 bei 200 Prozent geprüft. Die
Chromium-Referenz lag bei 58,14 FPS und 14,60 ms Input-p95 normal, 57,30 FPS
und 10,80 ms Input-p95 mit naturnaher Grafik plus Hut sowie 55,19 FPS und
13,20 ms Input-p95 bei vierfacher CPU-Drosselung; verlorene Simulationszeit
blieb in allen Profilen 0 ms. Verbleibende Grenzen sind reale
Android-/iOS-Hardware, Android WebView sowie manuelle Tests mit TalkBack,
VoiceOver oder NVDA.
