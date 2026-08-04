import { initMilosAppEssentials } from "./milos-app-essentials.js";

document.body?.setAttribute("data-milos-essentials-app", "gravity-loop");
export const milosAppEssentials = initMilosAppEssentials({
  "appKey": "gravity-loop",
  "environment": "production",
  "productionApproved": true,
  "loading": {
    "appName": "Gravity Loop",
    "iconPath": "public/gravity-loop-mark.svg",
    "iconRuntimePath": "./gravity-loop-mark.svg",
    "message": {
      "de": "Gravity Loop wird geöffnet …",
      "en": "Opening Gravity Loop …"
    }
  },
  "privacy": {
    "mode": "no-cookies",
    "usesLocalStorage": true,
    "storagePurposes": [
      {
        "key": "milosapps.gravity-loop.progress",
        "purpose": "Bestwert, Sternenserie und ausdrücklich gewählte Spiel-, Darstellungs- und Komforteinstellungen lokal erhalten",
        "lifetime": "until-user-clears",
        "strictlyNecessary": true
      },
      {
        "key": "milosapps.gravity-loop.language",
        "purpose": "Vom Nutzer gewählte Sprache nach einem Reload lokal beibehalten",
        "lifetime": "until-user-clears",
        "strictlyNecessary": true
      }
    ],
    "optionalTracking": false,
    "privacyUrl": "https://milos-apps.de/datenschutz"
  },
  "features": {
    "startup": true,
    "privacyNotice": false,
    "share": true,
    "datePicker": false,
    "placeSearch": false,
    "placeSuggestions": {
      "enabled": false,
      "minChars": 3,
      "debounceMs": 350,
      "providerCapability": "submit-only",
      "evidenceFile": null
    }
  }
});
globalThis.milosAppEssentials = milosAppEssentials;
