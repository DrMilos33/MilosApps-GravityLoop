# Gravity Loop

Eigenständiges öffentliches MilosApps-Minispiel mit dem App-Key
`gravity-loop`.

Gedrückthalten krümmt die Flugbahn eines kleinen Kometen, Loslassen lässt ihn
weiterfliegen. Drei Schwierigkeitsgrade, Sonnen- und Mondgravitation sowie
mehrere Kometen-Skins verändern kurze, direkt neu startbare Runden. Sonne,
Mond, Komet und Effekte sind vollständig codebasiert gezeichnet.

## Feste Grenzen

- kein Konto, keine Werbung und keine App-Datenbank;
- Bestwert, Serie und Einstellungen nur lokal;
- eigener DEV-Lifecycle, Production nicht freigegeben;
- keine fremden Spiele, Assets oder Designs kopieren;
- keine Shared-Abhängigkeit ohne veröffentlichten Release;
- Portal-DEV bindet nur per dokumentierter URL und Metadaten an.

Siehe [Produktbrief](docs/PRODUCT_BRIEF.md), [QA-Plan](docs/QA_PLAN.md),
[QA-Ergebnisse](docs/QA_RESULTS.md), [DEV-/Portalübergabe](docs/DEV_HANDOFF.md)
und [DEV-Deployment](docs/DEV_DEPLOYMENT.md) sowie
[Erkenntnisse](docs/LEARNINGS.md).

## Öffentliches DEV

- App: <https://drmilos33.github.io/MilosApps-GravityLoop/>
- Readiness: <https://drmilos33.github.io/MilosApps-GravityLoop/health.json>
- GitHub: <https://github.com/DrMilos33/MilosApps-GravityLoop>
- deployter App-Quellstand:
  `69f4444748e4918987824a8940b354377ec636c7`
- DEV-Artefakt: Branch `gh-pages`, Commit
  `47c53cad1bacc0e1cbda02d9b15148846ff7d46b`

Die URL ist ein unabhängiger öffentlicher GitHub-Pages-DEV-Dienst ohne Login.
Production ist nicht freigegeben. Build, Validierung, Aktualisierung und
Rollback sind in [docs/DEV_DEPLOYMENT.md](docs/DEV_DEPLOYMENT.md) beschrieben.

## Lokaler DEV-Start

Voraussetzung ist Node.js 22 oder neuer mit pnpm.

```powershell
pnpm install
pnpm dev
```

Danach läuft die App unter `http://127.0.0.1:4317/`; der lokale
Readiness-Healthcheck liegt unter `http://127.0.0.1:4317/health.json`. Der feste
DEV-Port ist absichtlich app-spezifisch; Vite bricht bei einer Kollision ab,
statt versehentlich einen anderen lokalen Dienst zu akzeptieren.

```powershell
pnpm test
pnpm build
pnpm test:e2e

$env:GRAVITY_LOOP_DEV_URL = "https://drmilos33.github.io/MilosApps-GravityLoop/"
pnpm test:e2e:dev
```

Die Runtime besteht aus Vanilla TypeScript, CSS und Canvas. Vite dient nur dem
DEV-/Build-Lifecycle; Spielphysik, Zufall, Zustand und lokale Speicherung sind
in frameworkunabhängigen Modulen testbar.
