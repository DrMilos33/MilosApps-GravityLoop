import type {
  CelestialMode,
  Difficulty,
  GameState,
  PauseReason,
} from "./core/game";
export type Language = "de" | "en";

interface Messages {
  locale: string;
  static: StaticMessages;
  difficulty: Record<Difficulty, string>;
  celestial: Record<CelestialMode, string>;
  pauseReason: Record<Exclude<PauseReason, null> | "default", string>;
  gameOverCopy: (state: GameState) => string;
  canvasLabel: (state: GameState) => string;
  pickupAnnouncement: (
    collected: string,
    score: string,
    shieldActive: boolean,
    shieldCharge: number,
  ) => string;
  shieldUsedAnnouncement: string;
  gameOverAnnouncement: (score: string, collected: string) => string;
  gameOverKicker: (score: string, collected: string) => string;
  settingsApplied: (celestial: string, difficulty: string) => string;
  orbitCaption: (
    celestial: string,
    difficulty: string,
    date: string,
    dateKey: string,
  ) => string;
}

type StaticMessages = {
  readonly [Key in keyof typeof deStatic]: string;
};

export type StaticTranslationKey = keyof StaticMessages;

const deStatic = {
  documentTitle: "Gravity Loop · MilosApps",
  metaDescription:
    "Gravity Loop – ein ruhiges, reaktionsschnelles Einfinger-Spiel von MilosApps.",
  skip: "Zum Spiel springen",
  shellNav: "App-Navigation",
  languageNav: "Sprache",
  allApps: "Alle Apps",
  appTitle: "Gravity Loop",
  headerHint: "Halten krümmt. Loslassen fliegt geradeaus.",
  scoreStrip: "Spielstand",
  points: "Punkte",
  sparks: "Sterne",
  shield: "Schild",
  shieldReady: "Bereit",
  best: "Bestwert",
  gameFieldTitle: "Gravity Loop Spielfeld",
  canvasFallback:
    "Gravity Loop benötigt einen Browser mit Canvas-Unterstützung. Mit der Leertaste hältst du die Gravitation, beim Loslassen fliegt der Komet geradeaus.",
  holdIndicator: "Gravitation",
  controls: "Spielsteuerung",
  pause: "Pause",
  resume: "Weiter",
  restart: "Neustart",
  settings: "Einstellungen",
  spaceKey: "Leertaste",
  holdKeyHelp: "halten",
  pauseKeyHelp: "Pause",
  restartKeyHelp: "Neustart",
  readySunTitle: "Halten zieht dich zur Sonne.",
  readySunCopy:
    "Sammle drei Lichtsterne für ein Schild gegen den nächsten Trabanten. Die Sonne bleibt tödlich.",
  readyMoonTitle: "Halten lenkt dich zum Mond.",
  readyMoonCopy:
    "Der Mond zieht sanfter. Drei Lichtsterne laden ein Schild gegen den nächsten Trabanten.",
  launch: "Losfliegen",
  pausedKicker: "Sicher pausiert",
  pausedTitle: "Deine Bahn wartet.",
  continue: "Weiterfliegen",
  newBest: "Neuer Bestwert!",
  almost: "Fast im Rhythmus.",
  again: "Nochmal",
  settingsEyebrow: "Dein Fluggefühl",
  settingsTitle: "Einstellungen",
  settingsIntro: "Richte Runde, Aussehen und Komfort in klaren Bereichen ein.",
  closeSettings: "Einstellungen schließen",
  settingsGame: "Spiel",
  settingsGameHelp: "Bestimme Tempo und Gravitationsmodell deiner nächsten Runde.",
  difficulty: "Schwierigkeit",
  difficultyHelp: "Tempo, Gefahren und Punkte.",
  difficultyEasy: "Leicht",
  difficultyEasyHelp: "Mehr Ruhe, weniger Trabanten.",
  difficultyNormal: "Normal",
  difficultyNormalHelp: "Ausgewogenes Tempo und Risiko.",
  difficultyHard: "Schwer",
  difficultyHardHelp: "Schneller, dichter, mehr Punkte.",
  celestialBody: "Zentralkörper",
  celestialBodyHelp: "Wähle die Art der Gravitation.",
  sun: "Sonne",
  sunHelp: "Stärker, je näher du kommst.",
  moon: "Mond",
  moonHelp: "Sanfter und gleichmäßiger.",
  roundResetTitle: "Fairer Neustart",
  roundResetCopy:
    "Schwierigkeit und Zentralkörper werden erst beim Übernehmen aktiv und starten die Runde neu.",
  settingsAppearance: "Aussehen",
  settingsAppearanceHelp: "Nur die Darstellung ändert sich.",
  celestialStyle: "Sonne und Mond",
  celestialStyleHelp:
    "Naturnah wird prozedural gezeichnet – ohne externe Bilder oder Tracking.",
  graphic: "Grafisch",
  natural: "Naturnah",
  cometSkin: "Kometen-Skin",
  cometSkinHelp:
    "Nur das Aussehen ändert sich; Hitbox und Physik bleiben gleich.",
  skinMint: "Mint",
  skinEmber: "Feuer",
  skinIce: "Eis",
  skinHat: "Komet mit Hut",
  settingsComfort: "Komfort",
  settingsComfortHelp: "Passe Rückmeldung und Lesbarkeit an.",
  sounds: "Klänge",
  soundsHelp: "Kurze, synthetische Signale. Standardmäßig stumm.",
  motion: "Bewegung",
  motionHelp: "Beeinflusst nur dekorative Effekte, nie die Physik.",
  motionSystem: "Systemeinstellung",
  motionReduce: "Reduziert",
  motionFull: "Lebendig",
  highContrast: "Hoher Kontrast",
  highContrastHelp: "Verstärkt Bahnen, Ziele und Bedienelemente.",
  localData: "Lokale Daten",
  localDataHelp:
    "Bestwert, Sternenserie, Sprache und Einstellungen auf diesem Gerät.",
  reset: "Zurücksetzen",
  resetGroup: "Lokale Daten zurücksetzen",
  resetQuestion:
    "Wirklich alles lokal zurücksetzen? Deine aktuelle Runde beginnt ebenfalls neu.",
  cancel: "Abbrechen",
  cancelChanges: "Verwerfen",
  confirmReset: "Jetzt zurücksetzen",
  applySettings: "Übernehmen",
  applyRestart: "Übernehmen & neu starten",
  resetDone: "Zurückgesetzt",
  footerText: "Kurze Gravitationsrunden – direkt, lokal und ohne Login.",
  footerNav: "Rechtliches",
  legal: "Impressum",
  privacy: "Datenschutz",
  restartedAnnouncement: "Runde neu gestartet.",
  startedAnnouncement: "Flug gestartet.",
  pausedAnnouncement: "Spiel pausiert.",
  resumedAnnouncement: "Flug fortgesetzt.",
  languageChanged: "Sprache auf Deutsch geändert.",
  resetAnnouncement:
    "Alle lokalen Gravity-Loop-Daten wurden zurückgesetzt.",
} as const;

const enStatic = {
  documentTitle: "Gravity Loop · MilosApps",
  metaDescription:
    "Gravity Loop – a calm, responsive one-finger game by MilosApps.",
  skip: "Skip to the game",
  shellNav: "App navigation",
  languageNav: "Language",
  allApps: "All apps",
  appTitle: "Gravity Loop",
  headerHint: "Hold to curve. Release to fly straight.",
  scoreStrip: "Game score",
  points: "Points",
  sparks: "Stars",
  shield: "Shield",
  shieldReady: "Ready",
  best: "Best",
  gameFieldTitle: "Gravity Loop game field",
  canvasFallback:
    "Gravity Loop needs a browser with Canvas support. Hold Space to apply gravity; release it to fly straight.",
  holdIndicator: "Gravity",
  controls: "Game controls",
  pause: "Pause",
  resume: "Resume",
  restart: "Restart",
  settings: "Settings",
  spaceKey: "Space",
  holdKeyHelp: "hold",
  pauseKeyHelp: "Pause",
  restartKeyHelp: "Restart",
  readySunTitle: "Hold to pull toward the Sun.",
  readySunCopy:
    "Collect three light stars for a shield against the next satellite. The Sun stays lethal.",
  readyMoonTitle: "Hold to steer toward the Moon.",
  readyMoonCopy:
    "The Moon pulls more gently. Three light stars charge a shield against the next satellite.",
  launch: "Launch",
  pausedKicker: "Safely paused",
  pausedTitle: "Your orbit is waiting.",
  continue: "Keep flying",
  newBest: "New best!",
  almost: "Almost in rhythm.",
  again: "Again",
  settingsEyebrow: "Your flight feel",
  settingsTitle: "Settings",
  settingsIntro: "Set up your run, appearance and comfort in clear sections.",
  closeSettings: "Close settings",
  settingsGame: "Game",
  settingsGameHelp: "Choose the pace and gravity model for your next run.",
  difficulty: "Difficulty",
  difficultyHelp: "Speed, hazards and points.",
  difficultyEasy: "Easy",
  difficultyEasyHelp: "More breathing room, fewer satellites.",
  difficultyNormal: "Normal",
  difficultyNormalHelp: "Balanced pace and risk.",
  difficultyHard: "Hard",
  difficultyHardHelp: "Faster, denser, more points.",
  celestialBody: "Central body",
  celestialBodyHelp: "Choose how gravity behaves.",
  sun: "Sun",
  sunHelp: "Pulls harder as you get closer.",
  moon: "Moon",
  moonHelp: "Gentler and more even.",
  roundResetTitle: "Fair restart",
  roundResetCopy:
    "Difficulty and central body take effect only when applied and restart the run.",
  settingsAppearance: "Appearance",
  settingsAppearanceHelp: "Only the presentation changes.",
  celestialStyle: "Sun and Moon",
  celestialStyleHelp:
    "Natural mode is drawn procedurally – without external images or tracking.",
  graphic: "Graphic",
  natural: "Natural",
  cometSkin: "Comet skin",
  cometSkinHelp:
    "Only the look changes; hitbox and physics stay identical.",
  skinMint: "Mint",
  skinEmber: "Fire",
  skinIce: "Ice",
  skinHat: "Comet with a hat",
  settingsComfort: "Comfort",
  settingsComfortHelp: "Adjust feedback and readability.",
  sounds: "Sounds",
  soundsHelp: "Short synthetic cues. Muted by default.",
  motion: "Motion",
  motionHelp: "Changes decorative effects only, never physics.",
  motionSystem: "System setting",
  motionReduce: "Reduced",
  motionFull: "Lively",
  highContrast: "High contrast",
  highContrastHelp: "Strengthens paths, targets and controls.",
  localData: "Local data",
  localDataHelp:
    "Best score, star streak, language and settings on this device.",
  reset: "Reset",
  resetGroup: "Reset local data",
  resetQuestion:
    "Reset all local data? Your current run will start over as well.",
  cancel: "Cancel",
  cancelChanges: "Discard",
  confirmReset: "Reset now",
  applySettings: "Apply",
  applyRestart: "Apply & restart",
  resetDone: "Reset",
  footerText: "Short gravity runs – direct, local and login-free.",
  footerNav: "Legal",
  legal: "Legal notice",
  privacy: "Privacy",
  restartedAnnouncement: "Run restarted.",
  startedAnnouncement: "Flight started.",
  pausedAnnouncement: "Game paused.",
  resumedAnnouncement: "Flight resumed.",
  languageChanged: "Language changed to English.",
  resetAnnouncement: "All local Gravity Loop data was reset.",
} satisfies StaticMessages;

const messages: Record<Language, Messages> = {
  de: {
    locale: "de-DE",
    static: deStatic,
    difficulty: { easy: "Leicht", normal: "Normal", hard: "Schwer" },
    celestial: { sun: "Sonnenorbit", moon: "Mondorbit" },
    pauseReason: {
      hidden: "Das Spiel pausiert, sobald der Tab nicht sichtbar ist.",
      rotation:
        "Die Ausrichtung hat sich geändert. Deine Runde ist sicher pausiert.",
      focus:
        "Ein anderes Fenster war im Vordergrund. Deine Runde ist sicher pausiert.",
      settings: "Deine Runde wartet, während du Einstellungen änderst.",
      manual: "Atme kurz durch. Deine Position bleibt erhalten.",
      default: "Atme kurz durch. Deine Position bleibt erhalten.",
    },
    gameOverCopy: (state) => {
      if (state.gameOverReason === "core") {
        return state.options.celestialMode === "sun"
          ? "In die Sonne gezogen. Lass früher los – ihre Kraft steigt in der Nähe deutlich an."
          : "Auf dem Mond eingeschlagen. Lass früher los und nimm den sanften Schwung mit.";
      }
      if (state.gameOverReason === "hazard") {
        return "Ein Trabant kreuzte deine Bahn. Sein Ring zeigt dir den nächsten Weg.";
      }
      return "Über den sicheren Rand hinaus. Halte etwas länger, um enger einzudrehen.";
    },
    canvasLabel: (state) => {
      const isMoon = state.options.celestialMode === "moon";
      return (
        `Gravity Loop Spielfeld im ${isMoon ? "Mondmodus" : "Sonnenmodus"}. ` +
        `Schwierigkeit ${messages.de.difficulty[state.options.difficulty]}. ` +
        `Halte mit Finger oder Maus oder halte die Leertaste, um den Kometen ` +
        `${isMoon ? "zum Mond" : "zur Sonne"} zu lenken. Loslassen lässt ihn geradeaus fliegen. ` +
        `Eine Berührung mit ${isMoon ? "dem Mond" : "der Sonne"} beendet die Runde.`
      );
    },
    pickupAnnouncement: (collected, score, shieldActive, shieldCharge) =>
      shieldActive
        ? `Lichtstern ${collected} gesammelt. Sternschild bereit. ${score} Punkte.`
        : `Lichtstern ${collected} gesammelt. Schildladung ${shieldCharge} von 3. ${score} Punkte.`,
    shieldUsedAnnouncement:
      "Das Sternschild hat einen Trabanten abgewehrt und ist wieder leer.",
    gameOverAnnouncement: (score, collected) =>
      `Runde beendet. ${score} Punkte, ${collected} Lichtsterne.`,
    gameOverKicker: (score, collected) =>
      `${score} Punkte · ${collected} Sterne`,
    settingsApplied: (celestial, difficulty) =>
      `${celestial}, Schwierigkeit ${difficulty}. Die Runde wurde neu vorbereitet.`,
    orbitCaption: (celestial, difficulty, date, dateKey) =>
      `${celestial} · ${difficulty} · ${date} · ${dateKey}`,
  },
  en: {
    locale: "en-GB",
    static: enStatic,
    difficulty: { easy: "Easy", normal: "Normal", hard: "Hard" },
    celestial: { sun: "Sun orbit", moon: "Moon orbit" },
    pauseReason: {
      hidden: "The game pauses whenever the tab is not visible.",
      rotation: "The orientation changed. Your run is safely paused.",
      focus: "Another window was in front. Your run is safely paused.",
      settings: "Your run waits while you change settings.",
      manual: "Take a breath. Your position is preserved.",
      default: "Take a breath. Your position is preserved.",
    },
    gameOverCopy: (state) => {
      if (state.gameOverReason === "core") {
        return state.options.celestialMode === "sun"
          ? "Pulled into the Sun. Release earlier – its force rises sharply up close."
          : "You hit the Moon. Release earlier and carry the gentle momentum.";
      }
      if (state.gameOverReason === "hazard") {
        return "A satellite crossed your path. Its ring shows the next route.";
      }
      return "You crossed the safe edge. Hold a little longer to turn inward.";
    },
    canvasLabel: (state) => {
      const isMoon = state.options.celestialMode === "moon";
      return (
        `Gravity Loop game field in ${isMoon ? "Moon mode" : "Sun mode"}. ` +
        `Difficulty ${messages.en.difficulty[state.options.difficulty]}. ` +
        `Hold with a finger or mouse, or hold Space, to steer the comet ` +
        `toward the ${isMoon ? "Moon" : "Sun"}. Release to fly straight. ` +
        `Touching the ${isMoon ? "Moon" : "Sun"} ends the run.`
      );
    },
    pickupAnnouncement: (collected, score, shieldActive, shieldCharge) =>
      shieldActive
        ? `Light star ${collected} collected. Star shield ready. ${score} points.`
        : `Light star ${collected} collected. Shield charge ${shieldCharge} of 3. ${score} points.`,
    shieldUsedAnnouncement:
      "The star shield deflected a satellite and is empty again.",
    gameOverAnnouncement: (score, collected) =>
      `Run over. ${score} points, ${collected} light stars.`,
    gameOverKicker: (score, collected) =>
      `${score} points · ${collected} stars`,
    settingsApplied: (celestial, difficulty) =>
      `${celestial}, ${difficulty} difficulty. A new run is ready.`,
    orbitCaption: (celestial, difficulty, date, dateKey) =>
      `${celestial} · ${difficulty} · ${date} · ${dateKey}`,
  },
};

export function getMessages(language: Language): Messages {
  return messages[language];
}

export function formatNumber(value: number, language: Language): string {
  return value.toLocaleString(messages[language].locale);
}

export function formatDate(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(messages[language].locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function staticTranslationKeys(language: Language): string[] {
  return Object.keys(messages[language].static).sort();
}
