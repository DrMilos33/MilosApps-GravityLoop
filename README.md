# Gravity Loop

Eigenständiges öffentliches MilosApps-Minispiel mit dem App-Key
`gravity-loop`.

Gedrückthalten krümmt die Flugbahn eines kleinen Kometen, Loslassen lässt ihn
weiterfliegen. Drei Schwierigkeitsgrade, Sonnen- und Mondgravitation sowie
mehrere Kometen-Skins verändern kurze, direkt neu startbare Runden. Drei
gesammelte Lichtsterne laden einen Schild gegen den nächsten Trabanten. Auf
Touchgeräten gilt die gesamte nicht-interaktive Spielfläche als Haltezone,
nicht nur das Canvas. Sonne, Mond, Komet und Effekte sind vollständig
codebasiert gezeichnet.

## Feste Grenzen

- kein Konto, keine Werbung und keine App-Datenbank;
- Bestwert, Serie und Einstellungen nur lokal;
- eigener DEV-Lifecycle, Production nicht freigegeben;
- keine fremden Spiele, Assets oder Designs kopieren;
- gemeinsame Public-App-Shell ausschließlich lokal vendort und auf den
  veröffentlichten Vertrag `public-app-shell/v2.0.3` fest gepinnt; kein CDN
  und kein Shared-Runtimeimport;
- gemeinsame Lade-, Datenschutz- und Teilen-Primitiven ausschließlich lokal
  vendort und auf `public-app-essentials/v1.1.3` aus Shared-Commit
  `babe74a0e62e1a7f9095648195e54b322a837726` fest gepinnt; kein CDN und kein
  Runtimeimport aus dem Shared-Repository;
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
  `f41963731f77ca324292e1cb3dd769afebfdba62`
- DEV-Artefakt: Branch `gh-pages`, Commit
  `321ef0dc7ba3b44d04d8b0ef5b2ba6b364b31c49`

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
pnpm verify:shell
pnpm verify:essentials
pnpm test
pnpm build
pnpm test:e2e

$env:GRAVITY_LOOP_DEV_URL = "https://drmilos33.github.io/MilosApps-GravityLoop/"
pnpm test:e2e:dev
```

Die Runtime besteht aus Vanilla TypeScript, CSS und Canvas. Vite dient nur dem
DEV-/Build-Lifecycle; Spielphysik, Zufall, Zustand und lokale Speicherung sind
in frameworkunabhängigen Modulen testbar. Die vollständige sichtbare
Fachoberfläche und die vendorte MilosApps-Shell lassen sich zwischen Deutsch
und Englisch umschalten; die Sprache bleibt lokal gespeichert und wird beim
vollständigen lokalen Datenreset sicher auf Deutsch zurückgesetzt.

Vor der Fachruntime erscheint ein kleiner, CSS-first Ladescreen und verschwindet
erst über den race-sicheren Ready-Endpunkt, wenn die Spieloberfläche wirklich
bedienbar ist. Da Gravity Loop weder Cookies
noch optionale Speicherung nutzt, erscheint kein Schein-Einwilligungsdialog.
Eine dauerhaft erreichbare Datenschutzinformation erklärt stattdessen die
beiden notwendigen lokalen Speicherzwecke für Spielfortschritt und Sprache.
Die Teilen-Aktion teilt ausschließlich den allgemeinen App-Link mit neutralem
DE-/EN-Text; lokale Bestwerte oder Serien werden nie ungefragt in den Payload
aufgenommen.
