# Gravity Loop: Production-Kandidat

Stand: 2026-08-04

Kampagne: `public-app-production-launch-2026-08`

App-Key: `gravity-loop`

## Freigegebene Grenze

Der Nutzer hat Gravity Loop für einen getrennten Production-Lifecycle auf
Cloudflare Pages freigegeben. Dieser Branch bereitet nur den statischen
Release-Kandidaten vor. Er verändert weder `main`, `gh-pages`, die bestehende
GitHub-Pages-DEV-URL, Portaldateien noch eine Cloudflare-Umgebung.

| Feld | Vertrag |
|---|---|
| Runtime-Basis | `15b090d494d491ae8b977d2dc0035f7844847bb0` |
| Candidate-Branch | `codex/gravity-loop-production` |
| Provider | Cloudflare Pages |
| vorgesehener Projektname | `milosapps-gravity-loop-production` |
| Buildbefehl | `pnpm install --frozen-lockfile && pnpm build:production` |
| Output | `dist/` |
| Functions | keine; `_worker.js` und `_routes.json` sind im Gate verboten |
| Production-URL | blockiert bis zur bestätigten Project-ID/HTTPS-URL |
| Shared Shell | `public-app-shell/v2.0.3` @ `ed898412306e22c6ae1b10ee8953df29f8acd627` |
| Shared Essentials | `public-app-essentials/v1.1.5` @ `2942132ad3bf6cf39edc9f52ed918de6a230be23` |

## Production-Vertrag

- Beide App-Manifeste und ihre neu erzeugten Bootstraps deklarieren
  `environment=production` sowie `productionApproved=true`.
- Der Build stempelt `health.json` mit Status, App-Key, Umgebung,
  Production-Freigabe und dem vollständigen Quell-SHA. Eine beliebige 200-Antwort
  ist keine Readiness.
- `production-artifact.json` bindet App, Source-SHA, Provider, Projektname,
  Output und die Functions-Grenze maschinenlesbar.
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

Nach einem späteren Deployment muss die externe HTTPS-Prüfung mit
`GRAVITY_LOOP_PRODUCTION_URL` über `pnpm test:e2e:production` erfolgen. Erst
danach darf eine Production-Evidenz als `production-verified` gelten.

## Noch fehlendes Ziel und Rollback

Blocker: Struktur & Architektur muss die autoritative Cloudflare-Pages-
Project-ID sowie die endgültige HTTPS-Production-URL und Health-URL übergeben.
Bis dahin gibt es ausdrücklich keinen Cloudflare-Upload.

Da dies der erste Production-Launch ist, besteht der sichere Rollback darin,
das Production-Ziel nicht zu aktivieren beziehungsweise einen fehlerhaften
ersten Zielstand zu deaktivieren; die Portal-Productionroute bleibt dabei 404.
Nach dem ersten gesunden Release wird ein Rollback ausschließlich als normaler
Forward-Deploy aus dem letzten gesunden Production-Quellstand ausgeführt. DEV
und `gh-pages` werden dafür nie verändert.
