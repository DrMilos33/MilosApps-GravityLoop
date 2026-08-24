# Gravity Loop Legacyredirect

Dieses minimale Cloudflare-Pages-Artefakt ersetzt ausschließlich das
Production-Artefakt des bestehenden Projekts `milosapps-gravity-loop-production`.
Es leitet die historische Custom Domain und die Production-`pages.dev`-Adresse
permanent mit Status 308 auf `https://milos-apps.de/gravity-loop` weiter. Pfad
und Query bleiben erhalten.

Die eigentliche App bleibt unverändert im revisionsgebundenen Preview-Origin,
den das Portal unter `/gravity-loop` reverse-proxyt. DEV, App-Funktionen,
Ads/CMP, Shared-Verträge und Portalcode werden durch das Redirectartefakt nicht
verändert. Das Artefakt enthält weder Functions noch `_worker.js`.

## Veröffentlichung

Zuerst als Preview-Branch und erst nach exakter Redirectprüfung als Production:

```powershell
pnpm dlx wrangler pages deploy infra/legacy-redirect/site `
  --project-name milosapps-gravity-loop-production `
  --branch legacy-redirect-preflight

pnpm dlx wrangler pages deploy infra/legacy-redirect/site `
  --project-name milosapps-gravity-loop-production `
  --branch main
```

Vorher müssen `pnpm verify:legacy-redirect`, die SHA-genaue CI und der Preview-
Nachweis für Root, Pfad und Query mit `GET` und `HEAD` grün sein.

## Rollback

Cloudflare Pages wird auf das letzte gesunde Production-Deployment
`62e37b4e-7e69-4074-9a36-1a4c098a8380` zurückgerollt. Der Rollback gilt erst
als erfolgreich, wenn Root und `health.json` auf der alten Domain wieder 200
mit Source `09425e45ac0abe4b1a89124835b26ac317df90ce` liefern. Der Portal-Origin,
die kanonische Route und DEV bleiben dabei unangetastet.
