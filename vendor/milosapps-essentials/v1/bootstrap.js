import { initMilosAppEssentials } from "./milos-app-essentials.js";

document.body?.setAttribute("data-milos-essentials-app", "gravity-loop");
export const milosAppEssentials = initMilosAppEssentials({
  "appKey": "gravity-loop",
  "environment": "dev",
  "productionApproved": false,
  "loading": {
    "appName": "Gravity Loop",
    "iconPath": "gravity-loop-mark.svg",
    "message": {
      "de": "Gravity Loop wird geöffnet …",
      "en": "Opening Gravity Loop …"
    }
  },
  "privacy": {
    "mode": "no-cookies",
    "usesLocalStorage": true,
    "optionalTracking": false,
    "privacyUrl": "https://dev.milos-apps.de/datenschutz"
  },
  "features": {
    "startup": true,
    "privacyNotice": true,
    "share": true,
    "datePicker": false,
    "placeSearch": false
  }
});
globalThis.milosAppEssentials = milosAppEssentials;
