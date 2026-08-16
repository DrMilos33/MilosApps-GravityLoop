# Gravity Loop: Same-host-Production-Kandidat

Stand: 2026-08-17

App-Key: `gravity-loop`

## Freigegebene Grenze

Der Nutzer hat die Vorbereitung der Same-host-Migration freigegeben. Dieser
Branch erzeugt einen release-verifizierten Owner-Kandidaten, veröffentlicht ihn
aber noch nicht. DEV, `main`, `gh-pages`, Portalcode, Portalrouting, Shared-Pins
und das aktive Cloudflare-Deployment bleiben bis zur bestätigten Originroute
unverändert.

| Feld | Vertrag |
|---|---|
| Candidate-Branch | `codex/gravity-loop-production-refresh` |
| Provider | Cloudflare Pages |
| Projektname | `milosapps-gravity-loop-production` |
| Buildbefehl | `pnpm install --frozen-lockfile && pnpm build:production` |
| Origin-Output | `dist/` am Root, keine Functions |
| Ziel-Canonical | `https://milos-apps.de/gravity-loop` |
| Browser-Prefix | `/gravity-loop/` |
| Ziel-Health | `https://milos-apps.de/gravity-loop/health.json` |
| Origin-Health | `/health.json` |
| Shared Shell | `public-app-shell/v2.0.3` @ `ed898412306e22c6ae1b10ee8953df29f8acd627` |
| Shared Essentials | `public-app-essentials/v1.1.5` @ `2942132ad3bf6cf39edc9f52ed918de6a230be23` |

## Origin- und Prefixvertrag

- Das Portal muss `/gravity-loop` und `/gravity-loop/{pfad}` auf `/` und
  `/{pfad}` des unveränderten statischen Cloudflare-Artefakts abbilden. Der
  Prefix wird am Origin entfernt.
- Das gebaute HTML referenziert sämtliche Browserressourcen unter
  `/gravity-loop/`; der physische Artefaktbaum bleibt in `dist/` ungeprefixt.
  Ein lokaler Reverse-Proxy-Fixture prüft genau diese Trennung in drei Engines.
- Canonical und `og:url` sind exakt `https://milos-apps.de/gravity-loop`.
  `robots.txt` verweist auf die app-eigene Prefix-Sitemap; diese enthält nur
  dieselbe Canonical.
- Manifest-ID ist `/gravity-loop`, `start_url` und `scope` sind
  `/gravity-loop/`. Das Icon wird als Same-Origin-Ressource aus diesem Prefix
  geladen.
- `health.json` bindet Status, App-Key, Production-Freigabe, Ads-Grenze,
  Canonical, Prefix und vollständigen Quell-SHA. Eine beliebige 200-Antwort ist
  keine Readiness.
- Es gibt absichtlich keinen Service Worker. Build und Browsergate weisen
  `serviceWorker=false` nach und lehnen Service-Worker-Artefakte oder
  Registrierungen ab; damit kann kein alter Host- oder Root-Scope die Migration
  überleben.
- `adsEnabled=false`, `clientTracking=false`, keine CMP und keine App-Telemetrie
  bleiben fail-closed. Eine spätere first-party Zugriffszählung liegt allein im
  Portalserver und fügt der App kein Script hinzu.
- Die vorhandene Self-only-CSP, externe Shell-/Essentials-CSS, korrekte MIME-
  Typen, `404.html`, fehlende Source Maps und das Functions-Verbot bleiben
  unverändert erzwungen.

## Legacy und Veröffentlichungs-Hold

Die bisherige Domain `https://gravity-loop.milos-apps.de/` und
`/apps/gravity-loop` werden erst nach bestätigtem Same-host-Cutover durch den
jeweiligen Hosting-/Portal-Eigentümer permanent weitergeleitet. Das App-Artefakt
enthält keine hostunabhängige `_redirects`-Regel, weil sie auch den internen
Cloudflare-Origin treffen und den Reverse-Proxy-Vertrag brechen würde.

Kein Cloudflare-Upload und kein Portalwrite ist Bestandteil dieses Kandidaten.
Der verbleibende externe Blocker ist die bestätigte Portal-Originroute samt
Strip-Prefix-, Header- und Legacy-Redirect-Vertrag.

## Reproduzierbarer Kandidat

```powershell
pnpm install --frozen-lockfile
pnpm verify:shell
pnpm verify:essentials
pnpm test
pnpm build:production
pnpm test:e2e
pnpm qa:perf
```

Bei Änderungen an Manifest, Vendorbootstrap oder Lock folgt zusätzlich ein
echter Windows-Recheckout mit `core.autocrlf=true` und erneutem Shell-/
Essentials-Verifier sowie Production-Build. Der Build priorisiert für die
SHA-Bindung `GRAVITY_LOOP_SOURCE_SHA`, danach Cloudflares
`CF_PAGES_COMMIT_SHA`, GitHubs `GITHUB_SHA` und zuletzt den ausgecheckten
Git-Commit. CI lädt den geprüften `dist/`-Ordner nur als SHA-genaues Artefakt
hoch; es deployt ihn nicht.

## Aktiver Rollback

Bis zum Same-host-Deploy bleibt Cloudflare-Deployment
`62e37b4e-7e69-4074-9a36-1a4c098a8380` mit Source
`09425e45ac0abe4b1a89124835b26ac317df90ce` der aktive gesunde Stand auf
`https://gravity-loop.milos-apps.de/`. Ein späterer Rollback nutzt genau diese
Cloudflare-Revision; DEV und `gh-pages` werden dafür nie verändert.
