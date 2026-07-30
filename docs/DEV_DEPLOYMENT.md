# Gravity Loop: unabhängiges DEV-Deployment

Stand: 2026-07-30

App-Key: `gravity-loop`

Production: `false`, nicht freigegeben

## Aktiver Dienst

| Feld | Wert |
|---|---|
| Repository | `https://github.com/DrMilos33/MilosApps-GravityLoop` |
| Öffentliche DEV-URL | `https://drmilos33.github.io/MilosApps-GravityLoop/` |
| Readiness | `https://drmilos33.github.io/MilosApps-GravityLoop/health.json` |
| Hosting | GitHub Pages, unabhängig vom Portal |
| Source-Branch | `main` |
| deployter App-Commit | `69f4444748e4918987824a8940b354377ec636c7` |
| Deployment-Branch | `gh-pages` |
| Artefakt-Commit | `47c53cad1bacc0e1cbda02d9b15148846ff7d46b` |
| Pages-Run | `30546553237`, erfolgreich |
| App-CI | `30546531157`, erfolgreich |
| Login | keiner |
| Shared-/Portal-Abhängigkeiten | keine |

Der Branch `main` hält den vollständig verifizierten App-Quellstand
`69f4444`. Der Branch `gh-pages` enthält ausschließlich das daraus erzeugte
statische Artefakt. Änderungen an Dokumentation oder Test-Lifecycle werden
nicht automatisch veröffentlicht.

## Readiness-Vertrag

Readiness verlangt HTTP 200, JSON und exakt diese Identität:

```json
{
  "status": "ok",
  "app": "gravity-loop",
  "environment": "dev"
}
```

Ein beliebiger erfolgreicher HTTP-Status oder eine fremde `health.json` reicht
nicht.

## Release-Lifecycle

1. Gewünschten App-Commit auschecken und sauberen Arbeitsbaum sowie vollständige
   SHA prüfen.
2. `pnpm install --frozen-lockfile`, Unit-Tests und lokalen E2E-/Build-Gate
   ausführen.
3. Das statische Artefakt mit relativem Pages-Basispfad bauen:

   ```powershell
   pnpm exec tsc -b
   pnpm exec vite build --base ./
   ```

4. Nur den Inhalt von `dist/` in einem neuen Commit auf `gh-pages` ablegen.
   Die Commit-Nachricht nennt den vollständigen App-Quell-SHA.
5. `gh-pages` pushen und den GitHub-Workflow `pages-build-deployment` bis zum
   erfolgreichen Abschluss beobachten.
6. Die absolute Readiness-URL samt App-Key/DEV-Umgebung prüfen und danach die
   externe Matrix ausführen:

   ```powershell
   $env:GRAVITY_LOOP_DEV_URL = "https://drmilos33.github.io/MilosApps-GravityLoop/"
   pnpm test:e2e:dev
   ```

7. Erst nach grünem Direktaufruf, Browsermatrix und Health-Vertrag die URL an
   Portal & Identity übergeben. Das Portal-Repository bleibt dabei
   unangetastet.

## Rollback

Die aktive gesunde DEV-Revision ist:

- App-Quellstand:
  `69f4444748e4918987824a8940b354377ec636c7`;
- Pages-Artefakt:
  `47c53cad1bacc0e1cbda02d9b15148846ff7d46b`.

Der vorherige gesunde Rollbackstand ist:

- App-Quellstand:
  `a713482c1db746f72aeb4c2665d20e8856c84ca9`;
- Pages-Artefakt:
  `28dbdd173b98dc61cc2611286f1e52b99acea587`.

Bei einem späteren fehlerhaften DEV-Release wird ausschließlich `gh-pages` auf
den letzten gesunden Artefakt-Commit zurückgesetzt und mit
`--force-with-lease` gepusht. Danach müssen Pages-Run, Health-Identität und
externe Smoke-Matrix erneut grün sein. `main`, Portal und Production werden für
den Rollback nicht verändert.

Der aktuelle Artefakt-Commit kann jederzeit reproduzierbar aus dem oben
genannten aktiven App-Commit neu gebaut werden. Ein Rollback verändert nur
`gh-pages`; Portal und Production bleiben unberührt.

## Grenzen

- Keine Production-URL und keine Änderung an `milos-apps.de`; Production bleibt
  gesperrt.
- Reale Android-/iOS-Hardware, Android WebView sowie TalkBack, VoiceOver und
  NVDA waren in dieser Umgebung nicht verfügbar.
- Headless WebKit kann unter Video-/Trace-Aufzeichnung einzelne Eingabeframes
  stark drosseln. Der funktionale Eingabe-Smoke und der isolierte Retry
  bestanden; die harte Performance-Referenz bleibt Chromium.
