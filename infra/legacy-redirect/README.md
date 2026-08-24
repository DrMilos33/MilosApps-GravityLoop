# Gravity Loop Legacyredirect

Dieser Cloudflare Worker besitzt ausschließlich die historische Productiondomain
`gravity-loop.milos-apps.de`. Er leitet `GET` und `HEAD` permanent mit Status
308 auf `https://milos-apps.de/gravity-loop` weiter. Pfad und Query bleiben
erhalten; andere Hosts liefern 404 und andere Methoden 405.

Der Worker liegt als Cloudflare-Route vor der weiterhin vorhandenen
Pages-Custom-Domain. Das statische App-Artefakt, der revisionsgebundene
Portal-Origin, DEV, Ads/CMP und die Portalimplementierung werden dadurch nicht
verändert.

## Veröffentlichung

Vom Repository-Root:

```powershell
pnpm dlx wrangler deploy --config infra/legacy-redirect/wrangler.toml
```

Vorher müssen `pnpm test`, `pnpm build:production` und der Wrangler-Dry-Run
grün sein. Nachher werden Root, Pfad und Query mit `GET` und `HEAD` geprüft.

## Rollback

```powershell
pnpm dlx wrangler delete --name milosapps-gravity-loop-legacy-redirect --force
```

Danach fällt die unverändert gebundene Custom Domain wieder auf das zuvor
gesunde Cloudflare-Pages-Deployment zurück. Der Rollback wird erst als
erfolgreich gewertet, wenn Root und `health.json` wieder 200 mit der vorherigen
Pages-Source liefern. Das Portal und DEV bleiben dabei unangetastet.
