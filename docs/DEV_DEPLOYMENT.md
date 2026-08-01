# Gravity Loop: unabhängiges DEV-Deployment

Stand: 2026-08-01

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
| deployter App-Commit | `b3b18c900c87d6e48c50e09404c00527ba821d6a` |
| Deployment-Branch | `gh-pages` |
| Artefakt-Commit | `fd7823e6fdc9113ca65052f7b5804b26c40987e5` |
| Pages-Run | `30706693209`, erfolgreich |
| App-CI | `30706511129`, erfolgreich |
| Login | keiner |
| Shared-/Portal-Abhängigkeiten | `public-app-shell/v2.0.3` fest vendort; keine Runtime- oder Portalabhängigkeit |

Der Branch `main` hält den vollständig verifizierten App-Quellstand
`b3b18c9`. Der Branch `gh-pages` enthält ausschließlich das daraus erzeugte
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
  `b3b18c900c87d6e48c50e09404c00527ba821d6a`;
- Pages-Artefakt:
  `fd7823e6fdc9113ca65052f7b5804b26c40987e5`.

Der vorherige gesunde Rollbackstand ist:

- App-Quellstand:
  `bfa148ba68dcec9dfedbb3e3804102a923111695`;
- Pages-Artefakt:
  `e5bf3855d12a919b11b8c95628c2e5d01b83ea04`.

Bei einem späteren fehlerhaften DEV-Release wird aus dem letzten gesunden
Quellstand erneut gebaut und dessen Dateibaum als normaler Nachfolger auf
`gh-pages` veröffentlicht. Die Branch-Historie wird nicht umgeschrieben.
Danach müssen Pages-Run, Health-Identität und externe Smoke-Matrix erneut grün
sein. `main`, Portal und Production werden für den Rollback nicht verändert.

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
