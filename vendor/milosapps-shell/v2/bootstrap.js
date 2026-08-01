import { registerMilosAppShell } from "./milos-app-shell.js";

registerMilosAppShell({
  "appKey": "gravity-loop",
  "environment": "dev",
  "productionApproved": false,
  "description": {
    "de": "Kurze Gravitationsrunden mit Sonne, Mond und deinem eigenen Kometen – direkt, lokal und ohne Login.",
    "en": "Short gravity runs with the Sun, Moon and your own comet – direct, local and without login."
  },
  "theme": {
    "accent": "#8be7de",
    "accentContrast": "#082329",
    "surface": "#07111e",
    "text": "#f7fbfa",
    "muted": "#a9bdc2",
    "border": "#31505b",
    "focus": "#fff0a5"
  }
});
