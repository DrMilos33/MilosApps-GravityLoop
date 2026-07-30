# Gravity Loop: DEV- und Portalübergabe

Stand: 2026-07-30  
App-Key: `gravity-loop`  
Production: nicht freigegeben

## Stabile Metadaten

| Feld | Wert |
|---|---|
| Titel | Gravity Loop |
| Kurzbeschreibung | Halten krümmt die Flugbahn eines kleinen Kometen. Meistere Sonnen- oder Mondgravitation in drei Schwierigkeitsgraden, sammle Lichtfunken und wähle deinen Kometen-Skin. |
| Sprache | Deutsch (`de`) |
| Klasse | öffentlich, ohne Anmeldung |
| Status | öffentlicher unabhängiger DEV-Stand, extern verifiziert |
| Plattformen | Web, mobil und Desktop |
| Eingaben | Touch, Pointer/Stift, Maus, Leertaste oder Pfeil hoch; `P` Pause, `R` Neustart |
| Daten | Bestwert, Funkenserie und Einstellungen ausschließlich in lokalem Browser-Speicher; keine Cookies, kein Konto, keine Datenbank |
| Vorschaubildrechte | Darstellung und Icon vollständig im Repository codebasiert erstellt; keine externen oder kopierten Assets |
| Shared-Abhängigkeiten | keine |

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
  `69f4444748e4918987824a8940b354377ec636c7`;
- daraus gebauter DEV-Artefakt-Commit:
  `47c53cad1bacc0e1cbda02d9b15148846ff7d46b`;
- erfolgreiche Pages-Deployment-Ausführung:
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30546553237`;
- erfolgreiche vollständige App-CI:
  `https://github.com/DrMilos33/MilosApps-GravityLoop/actions/runs/30546531157`;
- Production: `false`, nicht freigegeben.

Direktaufruf, Health-Identität, Loginfreiheit, Chromium, Firefox und WebKit
wurden gegen die öffentliche URL geprüft. Der Browser benötigt weder
Portal-Cookies noch Milos-Login; die App lädt keine Portal- oder
Shared-Abhängigkeit. Details, Rollback und letzte gesunde Revision stehen in
`docs/DEV_DEPLOYMENT.md`.

Der aktuelle externe Abschlusslauf bestand 54 anwendbare Tests in Chromium,
Firefox und WebKit ohne Fehler oder Retry; 21 nicht anwendbare
Engine-/CDP-Kombinationen wurden bewusst übersprungen. Die Chromium-Referenz
lag bei 58,94 FPS und 19,40 ms Input-p95 normal, 57,26 FPS und 11,70 ms
Input-p95 mit naturnahem Mond plus Hut sowie 53,71 FPS und 11,90 ms Input-p95
bei vierfacher CPU-Drosselung. Verbleibende Grenzen sind reale
Android-/iOS-Hardware, Android WebView sowie manuelle Tests mit TalkBack,
VoiceOver oder NVDA.
