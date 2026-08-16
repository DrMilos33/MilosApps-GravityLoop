# Gravity Loop: Production-Kandidat

Stand: 2026-08-16

Kampagne: `public-app-production-launch-2026-08`

App-Key: `gravity-loop`

## Freigegebene Grenze

Der Nutzer hat den Refresh der bereits laufenden Gravity-Loop-Production vom
neuesten gesunden DEV-Stand freigegeben. Der Kandidat entsteht aus dem exakten
DEV-Evidenzstand `8c8f3aee64aeed20f6a8f54c3bdc0de3179eea8c`; dessen einziger
Unterschied zur zuvor veröffentlichten Runtime-Basis `15b090d...` ist
Dokumentation. DEV, `main`, `gh-pages`, Portalroute und Shared-Pins bleiben
unverändert.

| Feld | Vertrag |
|---|---|
| DEV-Evidenzbasis | `8c8f3aee64aeed20f6a8f54c3bdc0de3179eea8c` |
| Runtime-Basis | `15b090d494d491ae8b977d2dc0035f7844847bb0` |
| Candidate-Branch | `codex/gravity-loop-production-refresh` |
| Provider | Cloudflare Pages |
| Projektname | `milosapps-gravity-loop-production` |
| Buildbefehl | `pnpm install --frozen-lockfile && pnpm build:production` |
| Output | `dist/` |
| Functions | keine; `_worker.js` und `_routes.json` sind im Gate verboten |
| Production-URL | `https://gravity-loop.milos-apps.de/` |
| Production-Health | `https://gravity-loop.milos-apps.de/health.json` |
| Shared Shell | `public-app-shell/v2.0.3` @ `ed898412306e22c6ae1b10ee8953df29f8acd627` |
| Shared Essentials | `public-app-essentials/v1.1.5` @ `2942132ad3bf6cf39edc9f52ed918de6a230be23` |

## Production-Vertrag

- Beide App-Manifeste und ihre neu erzeugten Bootstraps deklarieren
  `environment=production` sowie `productionApproved=true`.
- Der Build stempelt `health.json` mit Status, App-Key, Umgebung,
  Production-Freigabe und dem vollständigen Quell-SHA. Eine beliebige 200-Antwort
  ist keine Readiness.
- `production-artifact.json` bindet App, Source-SHA, Provider, Projektname,
  Output, `adsEnabled=false` und die Functions-Grenze maschinenlesbar.
- `health.json` bestätigt zusätzlich `adsEnabled=false`; Build und Browsergate
  lehnen bekannte AdSense-/Werbemarker bis zu einer getrennten Freigabe ab.
- Ein sichtbarer, im initialen HTML crawlbarer DE-/EN-Spielguide beschreibt
  Steuerung, Sternschild, Sonnen-/Mondgravitation und lokale Daten. Er ist
  Originaltext der App und verändert weder Physik noch Werbe-/Trackinggrenze.
- Das Dokument deklariert genau die Production-Canonical
  `https://gravity-loop.milos-apps.de/`; `sitemap.xml` enthält ausschließlich
  diese URL und `robots.txt` verweist genau auf diese Sitemap. Artefakt- und
  Browsergate lehnen fehlende, zusätzliche oder abweichende Ziele ab.
- `public/_headers` wird als echte Cloudflare-Pages-Headerdatei nach `dist/`
  übernommen. Die CSP erlaubt Skripte, Styles, Bilder, Manifest und Verbindungen
  nur vom eigenen Ursprung; Inline-Styles, `unsafe-inline`, `unsafe-eval`,
  `data:`-Ausnahmen und Fremdursprünge sind nicht freigegeben.
- `404.html` hält unbekannte Pfade statisch fail-closed. Es gibt keinen
  SPA-/Functions-Fallback.
- Produktionsbuilds enthalten keine Source Maps. Shell- und Essentials-CSS
  bleiben externe Same-Origin-Dateien mit korrektem MIME-Vertrag.
- Datenschutz- und Shelllinks zeigen in Production absolut auf
  `https://milos-apps.de`; der bestehende DEV-Vertrag bleibt unverändert im
  Manifest dokumentiert.

## Reproduzierbarer Kandidat

```powershell
pnpm install --frozen-lockfile
pnpm verify:shell
pnpm verify:essentials
pnpm test
pnpm build:production
pnpm test:e2e
```

Der Build priorisiert für die SHA-Bindung `GRAVITY_LOOP_SOURCE_SHA`, danach
Cloudflares `CF_PAGES_COMMIT_SHA`, GitHubs `GITHUB_SHA` und zuletzt den
ausgecheckten Git-Commit. Der Artefaktprüfer hasht anschließend den vollständigen
sortierten `dist/`-Dateibaum. CI lädt genau diesen Ordner als
`gravity-loop-production-<SHA>` hoch, ohne ihn zu deployen.

Nach jedem Deployment muss die externe HTTPS-Prüfung mit
`GRAVITY_LOOP_PRODUCTION_URL` über `pnpm test:e2e:production` erfolgen. Erst
danach darf eine Production-Evidenz als `production-verified` gelten.

## Aktiver Rollback

Vor dem Refresh ist Cloudflare-Deployment
`68057ca9-9e51-48f7-aa64-a75de1eaddfb` der aktive gesunde Stand. Es bindet
Source `da913fe314c66425206102991db95d628bcae69c` und bleibt nach dem neuen
Upload als erfolgreicher Production-Rollback verfügbar. Ein Rollback nutzt die
Cloudflare-Pages-Rollbackfunktion auf genau diese Revision; DEV und `gh-pages`
werden dafür nie verändert.
