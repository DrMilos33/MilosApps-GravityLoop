# Gravity Loop: DEV- und Portalübergabe

Stand: 2026-07-30  
App-Key: `gravity-loop`  
Production: nicht freigegeben

## Stabile Metadaten

| Feld | Wert |
|---|---|
| Titel | Gravity Loop |
| Kurzbeschreibung | Halten krümmt die Flugbahn eines kleinen Kometen. Loslassen nimmt den Schwung mit – sammle Lichtfunken und finde deinen Rhythmus zwischen Kern und Rand. |
| Sprache | Deutsch (`de`) |
| Klasse | öffentlich, ohne Anmeldung |
| Status | hochwertiger lokaler DEV-Stand; externe DEV-Bereitstellung blockiert |
| Plattformen | Web, mobil und Desktop |
| Eingaben | Touch, Pointer/Stift, Maus, Leertaste oder Pfeil hoch; `P` Pause, `R` Neustart |
| Daten | Bestwert, Funkenserie und Einstellungen ausschließlich in lokalem Browser-Speicher; keine Cookies, kein Konto, keine Datenbank |
| Vorschaubildrechte | Darstellung und Icon vollständig im Repository codebasiert erstellt; keine externen oder kopierten Assets |
| Shared-Abhängigkeiten | keine |

## Routen und Readiness

- reservierte Portalroute: `/apps/gravity-loop`;
- Ziel der Portalroute: Redirect auf die spätere unabhängige HTTPS-DEV-URL;
- lokale DEV-URL: `http://127.0.0.1:4317/`;
- lokaler Healthcheck: `http://127.0.0.1:4317/health.json`;
- externer Healthcheck: spätere `HTTPS-DEV-URL + /health.json`;
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

Eine stabile externe HTTPS-DEV-URL existiert noch nicht und wird nicht
erfunden. Der Blocker ist extern:

1. Im App-Register ist kein GitHub-Repository eingetragen.
2. Es gibt kein freigegebenes DEV-Hostingziel und keine DEV-Zugangsdaten.
3. Sites-Deployments wären Production-Deployments und sind ausdrücklich nicht
   freigegeben.

Bis ein eigenes DEV-Ziel bereitsteht, ist `http://127.0.0.1:4317/` der
vollständig getestete lokale DEV-Dienst. Nach Bereitstellung werden nur die
HTTPS-DEV-URL und der daraus abgeleitete Healthcheck ergänzt; Route, Metadaten
und Loginfreiheit bleiben rückwärtskompatibel.
