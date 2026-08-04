import { registerMilosAppShell } from "./milos-app-shell.js";

const appKey = "gravity-loop";
document.body?.setAttribute("data-milos-app-shell-page", "");
const themeUrl = new URL("./milos-app-shell-theme.css", import.meta.url).href;
let themeLink = document.querySelector(`link[data-milos-app-shell-theme="${appKey}"]`);
if (!themeLink) {
  themeLink = document.createElement("link");
  themeLink.rel = "stylesheet";
  themeLink.href = themeUrl;
  themeLink.dataset.milosAppShellTheme = appKey;
  await new Promise((resolve, reject) => {
    themeLink.addEventListener("load", resolve, { once: true });
    themeLink.addEventListener("error", () => reject(new Error("MilosApps shell theme stylesheet failed to load")), { once: true });
    document.head.append(themeLink);
  });
}
registerMilosAppShell({
  "appKey": "gravity-loop",
  "environment": "production",
  "productionApproved": true,
  "description": {
    "de": "Kurze Gravitationsrunden mit Sonne, Mond und deinem eigenen Kometen – direkt, lokal und ohne Login.",
    "en": "Short gravity runs with the Sun, Moon and your own comet – direct, local and without login."
  }
});
