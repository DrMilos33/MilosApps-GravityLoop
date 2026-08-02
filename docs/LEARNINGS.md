# Gravity-Loop-Erkenntnisse

Pro Eintrag dokumentieren:

- Datum, Commit und Testumgebung;
- Beobachtung und messbare oder reproduzierbare Evidenz;
- Änderung und zugehöriger Regressionstest;
- mögliche Bedeutung für andere interaktive MilosApps.

Allgemeine Erkenntnisse zu Pointer Events, Canvas-Performance, Zuständen oder
Barrierefreiheit an Struktur- und Ideen-Task melden. Keine Zugangsdaten oder
Nutzerdaten eintragen.

## 2026-07-30 – Feste Schritte von Render- und Eingabetakt trennen

- Ausgangspunkt: Commit `3f8161d`; Windows, Node 24, Vitest.
- Beobachtung: Ein zu kleiner Gleitkomma-Toleranzwert verlor bei
  144-Hz-Rendering nach zwölf Sekunden einen von 1.440 erwarteten
  120-Hz-Simulationsschritten.
- Änderung: enger Akkumulator-Epsilon und Eingabewechsel auf festen
  Simulationszeitpunkten.
- Regression: `fixed-step.test.ts` prüft 30, 60, 90, 120 und 144 Hz;
  `game.test.ts` vergleicht vollständige Flugzustände bei 30/60/144 Hz.
- Allgemeine Bedeutung: Renderfrequenz, Eingabeereignis und Fachsimulation sind
  drei verschiedene Takte. Nur die Fachsimulation darf Spielregeln verändern.

## 2026-07-30 – Pointer Capture braucht einen globalen Release-Fallback

- Ausgangspunkt: Commit `4cfa453`; Chromium-, Firefox- und WebKit-E2E.
- Beobachtung: Pointer Capture ist der zuverlässigste Hauptpfad, kann aber in
  älteren WebViews abgelehnt oder bei Lifecycle-Wechseln verloren werden.
- Änderung: aktive Pointer werden als Menge geführt; Canvas-Capture wird durch
  idempotente Window-Listener für `pointerup` und `pointercancel`, Blur-Reset und
  Visibility-Pause ergänzt.
- Regression: zwei gleichzeitige Pointer, einzelner Cancel, Lost Capture, zwölf
  synthetische Wechsel sowie echter CDP-Touch mit Long Hold, `touchCancel` und
  zehn schnellen Wechseln.
- Allgemeine Bedeutung: Ein boolesches `isDragging` oder `isPressed` reicht für
  Touchoberflächen nicht. Pointer-IDs und alle Abbruchpfade müssen explizit
  modelliert sein.

## 2026-07-30 – Statische Canvas-Ebenen stabilisieren gedrosselte Geräte

- Ausgangspunkt: erster Browserlauf nach Commit `3f8161d`; Chromium mit
  vierfacher CPU-Drosselung.
- Beobachtung: Sternfeld, Arenafläche und Rand wurden unnötig pro Frame
  aufgebaut; der langsamste Lauf fiel auf 28,1 FPS.
- Änderung: DPR-korrekte statische Canvas-Ebene, Invalidierung nur bei Resize,
  Seed- oder Kontrastwechsel; dynamische Ebene bleibt auf spielrelevante
  Objekte begrenzt. DPR wird bei 2,5 gedeckelt.
- Regression: Performance-E2E mit Normal- und 4×-CPU-Profil sowie Viewports von
  DPR 1 bis 3.
- Evidenz: nach der Änderung 47,9 bis 55,0 FPS im Mittel unter
  4×-Drosselung, Input-p95 höchstens 33,3 ms in grünen Läufen, 0 ms verlorene
  Simulation.
- Allgemeine Bedeutung: Codebasierte Canvas-Grafik ist nicht automatisch
  günstig. Statische und dynamische Zeichenarbeit muss getrennt und bei
  mehreren Pixeldichten gemessen werden.

## 2026-07-30 – Readiness muss die App-Identität beweisen

- Ausgangspunkt: lokaler paralleler MilosApps-Betrieb; Playwright.
- Beobachtung: Port `4173` lieferte nach einem Prozesswechsel HTTP 200 und
  `/health.json`, gehörte aber zu einer anderen App.
- Änderung: reservierter Gravity-Loop-Port `4317`, `strictPort`, keine
  E2E-Serverwiederverwendung und Healthcheck-Assertion auf
  `app: gravity-loop`.
- Regression: erster Browsertest prüft Status, App-Key und Umgebung.
- Allgemeine Bedeutung: Ein erreichbarer Port ist kein Identitätsnachweis. Bei
  parallelen Apps müssen Start und Readiness fail-closed arbeiten.

## 2026-07-30 – Canvas-Spiel braucht zugängliche DOM-Leitplanken

- Ausgangspunkt: Commit `4cfa453`; Axe, 200-Prozent-Zoom, Tastatur und
  Reduced-Motion-Tests.
- Beobachtung: Geschicklichkeit bleibt visuell, aber Start, Zustand, Hilfe,
  Pause, Neustart und Einstellungen müssen unabhängig vom Canvas verständlich
  bleiben.
- Änderung: zugänglicher Canvas-Name, DOM-Score, Live-Regionen, sichtbare
  Zustandskarten, native Dialog-/Formelemente, mindestens 44-Pixel-Ziele und
  dekorative statt physikalische Bewegungsreduktion.
- Regression: Axe A/AA in Start und Dialog, Tastaturreihenfolge,
  200-Prozent-Reflow und Reduced Motion in drei Engines.
- Allgemeine Bedeutung: Reduced Motion darf Regeln und Timing nicht verändern;
  Screenreader brauchen stabile DOM-Zustände rund um die visuelle Spielfläche.

## 2026-07-30 – Textzoom deckt Min-Content-Überläufe auf

- Ausgangspunkt: Commit `d30f2f8`; Chromium, Firefox und WebKit bei
  `360×800` und 200 Prozent Root-Textgröße.
- Beobachtung: Dreispaltige Scores erweiterten die Seite auf 403 Pixel; nach
  deren Korrektur blieb im Einstellungsdialog ein interner Überlauf von
  477 Pixel.
- Änderung: Grid-/Flex-Kinder erhalten `min-width: 0`, lange Beschriftungen
  dürfen umbrechen, und Settings sowie Bestätigungsaktionen werden auf sehr
  schmalen Viewports einspaltig.
- Regression: Browserprüfung misst Seiten- und Dialog-`scrollWidth`, öffnet den
  Einstellungsdialog und zeigt die Reset-Bestätigung bei 200 Prozent.
- Allgemeine Bedeutung: Ein überlauffreier Seitenrahmen beweist noch keinen
  zugänglichen Reflow. Modale Inhalte und verschachtelte Flex-/Grid-Kinder
  benötigen eigene Messungen; Abschneiden oder kleinere Schrift sind keine
  zulässige Korrektur.

## 2026-07-30 – DEV-Unterpfade brauchen relative Build- und Testnavigation

- Ausgangspunkt: App-Commit `a713482`; GitHub Pages unter dem Projektpfad
  `/MilosApps-GravityLoop/`.
- Beobachtung: Absolute Asset- oder E2E-Pfade wie `/assets/...` und
  `page.goto("/")` verlassen bei Projekt-Hosting den App-Unterpfad.
- Änderung: Das unveränderte App-Artefakt wird mit `vite build --base ./`
  erzeugt. Browsertests verwenden relative Navigation und besitzen eine
  HTTPS-only-Konfiguration ohne lokalen `webServer`.
- Regression: 3-Engine-Live-Matrix gegen die absolute Pages-DEV-URL samt
  Readiness, Responsive/DPR, Touch, Lifecycle, Accessibility und Performance.
- Allgemeine Bedeutung: Quell-SHA und Deployment-Artefakt-SHA müssen getrennt
  dokumentiert sein. Ein Unterpfad-Host gilt erst als bereit, wenn App,
  Assets, Healthcheck und Browsernavigation alle innerhalb desselben
  App-Pfads verifiziert wurden.

## 2026-07-30 – Spielregeloptionen brauchen einen atomaren Rundenwechsel

- Ausgangspunkt: Commit `69f4444`; Vitest und Drei-Engine-Playwright.
- Beobachtung: Schwierigkeit und Gravitationsmodell während einer laufenden
  Runde umzuschalten wäre zwar technisch einfach, aber weder fair noch
  deterministisch reproduzierbar.
- Änderung: Physikoptionen sind Teil des vollständigen Spielzustands. Ein
  Wechsel initialisiert Seed, Schrittzähler, Position und Score gemeinsam neu;
  rein kosmetische Optionen bleiben davon getrennt. Der lokale Datensatz
  migriert verlustfrei von Version 2 auf Version 3.
- Regression: geordnete Startgeschwindigkeit und Gefahrenrhythmen, verschiedene
  Sonnen-/Mond-Zugkurven, atomarer Browser-Reset sowie Speicherung, Migration
  und feindselige lokale Werte.
- Allgemeine Bedeutung: Persistierte Regelparameter dürfen nicht nebenläufig
  in eine aktive Simulation einsickern. Sie brauchen einen klaren
  Zustandsübergang, während Darstellung separat aktualisierbar bleiben sollte.

## 2026-07-30 – Eingabereaktion am sichtbaren Frame messen

- Ausgangspunkt: Commit `69f4444`; Chromium normal und mit vierfacher
  CPU-Drosselung.
- Beobachtung: Die erste Telemetrie quittierte Eingaben erst im nächsten
  Physikschritt. Nach einem Rundenende konnte deshalb ein alter Pending-Wert bis
  zum nächsten Start liegen bleiben, obwohl die sichtbare Held-Markierung
  bereits im nächsten Frame korrekt reagierte.
- Änderung: Pending Input wird einmal am Beginn jedes Renderframes übernommen;
  die feste 120-Hz-Simulation bleibt davon unverändert.
- Regression: Maus, Touch, Pointer-Cancel und Tastatur plus separate
  Performanceprofile für Standardgrafik und naturnahen Mond mit Hut.
- Evidenz: externer Abschlusslauf 19,40 ms Input-p95 normal, 11,70 ms mit
  naturnahem Mond und Hut sowie 11,90 ms unter 4× CPU-Drosselung; jeweils 0 ms
  verlorene Simulation.
- Allgemeine Bedeutung: Eingabelatenz muss an dem Punkt gemessen werden, an dem
  Nutzer die Reaktion sehen. Simulations- und Rendertakt dürfen dabei weiterhin
  getrennt bleiben.

## 2026-07-30 – Prozedurale Detailgrafik braucht stabile Bild-Regressionen

- Ausgangspunkt: Commit `69f4444`; Canvas 2D, DPR 1 bis 3, Chromium, Firefox
  und WebKit.
- Beobachtung: Ein einzelner Pixelvergleich direkt nach dem Schließen eines
  nativen Dialogs konnte in WebKit vor dem nächsten Renderframe abtasten.
  Gleichzeitig machte ein dunkler Hut auf dunklem Hintergrund die Form trotz
  korrekter Geometrie schwer erkennbar.
- Änderung: deterministisch vorerzeugte Oberflächenmarken für Sonne und Mond,
  kontrastreicher goldener Hut, Canvas-Vergleich erst nach nachgewiesenem
  Framewechsel. Die aufwendigste Optik besitzt ein eigenes Performanceprofil.
- Regression: echte Pixeländerung an Himmelskörper und Komet, visuelle
  Screenshot-Evidenz, High Contrast, Reduced Motion sowie externe
  Drei-Engine-Matrix.
- Evidenz: naturnaher Mond plus Hut erreicht extern 57,26 FPS,
  16,80 ms Frame-p95, 11,70 ms Input-p95 und 0 ms verlorene Simulation.
- Allgemeine Bedeutung: Canvas-Tests sollten auf semantische Zustände und einen
  nachgewiesenen Renderframe warten. Prozedurale Details bleiben performant,
  wenn Zufall und Geometrie vorbereitet statt pro Frame neu erzeugt werden.

## 2026-08-01 – CSP muss am gebauten Artefakt geprüft werden

- Ausgangspunkt: Commit `bfa148b`; Vite-Produktionsbuild, GitHub Pages sowie
  Chromium, Firefox und WebKit.
- Beobachtung: Die vendorte v2.0.3-Shell verwies korrekt auf externe
  Same-Origin-CSS. Vite wandelte die kleine Theme-CSS im Produktionsbuild
  dennoch in eine `data:`-URL um. Der Quellcode-Test blieb grün, während eine
  echte `style-src 'self'`-CSP das Theme blockierte.
- Änderung: `assetsInlineLimit: 0` hält Shell- und Theme-CSS als eigene
  Builddateien. Der CSP-Test setzt den Header am tatsächlich gebauten oder
  externen Hauptdokument und prüft zusätzlich, dass beide Stylesheet-URLs
  denselben Origin wie die App besitzen.
- Regression: fokussiert 6/6 CSP-/200-Prozent-Fälle in drei Engines; extern
  64/64 anwendbare Fachtests und keine CSP-Konsolenfehler.
- Allgemeine Bedeutung: CSP-Sicherheit ist eine Eigenschaft des ausgelieferten
  Artefakts, nicht nur des Quellvertrags. Bundler-Inlining muss explizit
  kontrolliert und nach dem Build geprüft werden.

## 2026-08-01 – Shell-Sprache und Fachsprache brauchen einen gemeinsamen Startzustand

- Ausgangspunkt: Commit `a1382ac`; Public-App-Shell v2.0.3 und vollständige
  DE/EN-Fachübersetzung.
- Beobachtung: Ein Locale-Event allein deckt den ersten Seitenaufbau nicht ab,
  weil die Shell ihre gespeicherte Sprache bereits vor dem App-Listener setzen
  kann.
- Änderung: Das Fach-Locale-Modul hört `milosapps:localechange` und liest beim
  Start zusätzlich `document.documentElement.lang`. Der vollständige lokale
  Reset entfernt auch den Shell-Sprachschlüssel und setzt sichtbar Deutsch.
- Regression: jede sichtbare Fachbeschriftung, DE/EN-Schalter,
  Reload-Persistenz, Tastaturfokus und Komplettreset in der Drei-Engine-Matrix.
- Allgemeine Bedeutung: Ereignisse synchronisieren Änderungen; ein expliziter
  Snapshot synchronisiert den Start. Öffentliche Apps benötigen beides.

## 2026-08-01 – Lokale E2E-Dienste unter Windows explizit besitzen

- Ausgangspunkt: Commit `bfa148b`; Windows, Vite auf Port 4317 und
  Playwright-Matrix.
- Beobachtung: Vom Test-Runner verwaltete Server konnten nach abgebrochenen
  Läufen beim Prozess-Cleanup hängen, obwohl die App-Tests bereits beendet
  waren. Eine bloße Porterreichbarkeit hätte zudem weiterhin eine fremde App
  akzeptieren können.
- Änderung: Für große lokale QA-Läufe wird der app-eigene Vite-Prozess im
  Vordergrund gestartet und Playwright mit `GRAVITY_LOOP_E2E_SERVER=external`
  verbunden. Global Setup prüft vor Fachtests die vollständige Health-Identität;
  beim Abschluss wird nur die bekannte eigene PID beendet und Port 4317
  erneut geprüft.
- Regression: vollständige gebaute Matrix, fokussierte Engine-Läufe und
  anschließender freier Port 4317.
- Allgemeine Bedeutung: Prozessbesitz, App-Identität und Test-Lifecycle sind
  getrennte Verträge. Server-Wiederverwendung ist nur nach fail-closed
  Identitätsprüfung sicher.

## 2026-08-01 – Mobile Spielgesten brauchen eine semantische Haltezone

- Ausgangspunkt: Nutzerfeedback zur nur im Canvas reagierenden
  Einfingersteuerung; echter Chromium-Touchstream bei `390×844 @3x`.
- Beobachtung: Auf einem schmalen Gerät liegt ein relevanter Teil der
  erreichbaren Daumenfläche über Score, Titel und Freiraum außerhalb des
  Canvas. Eine Canvas-exklusive Steuerung zwingt unnötig zum Umgreifen.
- Änderung: Touch und Stift werden auf der gesamten nicht-interaktiven
  App-Hauptfläche angenommen. Buttons, Links, Formfelder, Dialoge und Labels
  bleiben ausgeschlossen; Maussteuerung bleibt absichtlich auf das Canvas
  begrenzt. Pointer-ID-Menge, Capture und globale Release-/Cancel-Pfade gelten
  unverändert.
- Regression: echter Touchstart auf dem Score-Bereich oberhalb des Canvas,
  Long Hold, Release, Scrollposition, Lost Capture, Multi-Pointer und schnelle
  Wechsel. Die Drei-Engine-Kernflüsse prüfen weiterhin alle Lifecycle-Pfade.
- Allgemeine Bedeutung: Eine Touch-Haltezone ist eine Produktfläche, nicht
  zwangsläufig die Renderfläche. Ihre semantischen Ausschlüsse müssen ebenso
  explizit sein wie ihre Pointer-Capture- und Abbruchpfade.

## 2026-08-01 – Sammelobjekte sollten eine sichtbare taktische Wirkung haben

- Ausgangspunkt: Sterne erhöhten nur Punktzahl und Serie; Nutzerfeedback
  verlangte eine zusätzliche Spielwirkung.
- Beobachtung: Ein rein numerischer Pickup liefert kurzfristige Belohnung, aber
  keine neue Kursentscheidung. Eine unbegrenzte Rettungsmechanik würde dagegen
  die lesbaren Kernregeln entwerten.
- Änderung: Drei Lichtsterne laden einen klar sichtbaren Schild, der exakt eine
  Trabantenkollision deterministisch abfängt und den Kometen getrennt
  zurücklenkt. Sonne, Mond und Rand bleiben tödlich; der Schild verändert
  weder Seed noch feste Simulationsschritte.
- Regression: Laden nach exakt drei Pickups, einmaliger Verbrauch,
  deterministische Trennung und Geschwindigkeitsgrenze sowie explizit tödliche
  Zentralkollision. DOM-Anzeige, Canvas-Ring, Sound und Live-Region spiegeln
  denselben Zustand.
- Allgemeine Bedeutung: Sammelobjekte gewinnen an Wiederspielwert, wenn sie
  eine begrenzte, verständliche Entscheidung eröffnen. Schutzregeln müssen
  enger als die eigentlichen Verlustregeln definiert und automatisiert geprüft
  werden.

## 2026-08-02 – Ein Ladescreen braucht Fach-Readiness statt Zeitablauf

- Ausgangspunkt: `public-app-essentials/v1.0.0`, Shared-Commit `b09e090` und
  Gravity Loops getrennte Shell-, Fachruntime- und Canvas-Initialisierung.
- Beobachtung: `DOMContentLoaded` oder ein Timer beweisen weder registrierte
  Pointerpfade noch die erste vollständig übersetzte, bedienbare Spielansicht.
  Eine Loader-Überschrift hätte außerdem eine zweite Dokument-H1 erzeugt.
- Änderung: Kritische Essentials-CSS lädt vor jedem Modul. Der Loader-Titel ist
  ein tag-agnostisches `p`; erst nach Runtime, Input, Test-API und Share-Payload
  löst der nächste Renderframe `milosapps:ready` aus.
- Regression: künstlich verzögerte Fachruntime, exakt eine H1, 56/48-Pixel-
  Icon, Reduced Motion sowie sichtbarer Startbutton direkt nach Readiness in
  Chromium, Firefox und WebKit.
- Allgemeine Bedeutung: Ein gemeinsamer Loader darf die Fachbereitschaft nicht
  selbst schätzen. Der App-Eigentümer besitzt das explizite Ready-Signal; die
  gemeinsame Komponente besitzt nur Darstellung und sicheren Endzustand.

## 2026-08-02 – Vendorte CSS-Verträge müssen den Bundler überleben

- Ausgangspunkt: Vite-Produktionsbuild mit zwei korrekten externen
  Essentials-CSS-Links im Quell-HTML.
- Beobachtung: Vite zog beide Dateien zunächst in den allgemeinen App-CSS-Chunk.
  Quellvalidator und Browser-DEV blieben grün, obwohl das ausgelieferte
  fünfteilige Vendorverzeichnis und die getrennten MIME-/CSP-Grenzen fehlten.
- Änderung: Die Essentials-Links und der Bootstrap sind gezielt vom
  HTML-Bundling ausgenommen; ein app-eigenes Build-Plugin kopiert den exakt
  gelockten Vendorordner. Ein nachgelagerter Verifier verlangt zwei getrennte
  relative CSS-Links, ein relatives Bootstrap-Modul und alle fünf Dateien.
- Regression: App-Validator, Artefakt-Verifier, `text/css`-MIME, Same-Origin-
  URLs und echte `default-src 'self'; script-src 'self'; style-src 'self'`-
  Browserantwort in drei Engines.
- Allgemeine Bedeutung: Ein Vendor-Lock schützt Quellbytes, aber nicht deren
  Auslieferungsform. CI muss zusätzlich das gebaute HTML, die realen Dateien
  und die Browser-MIME-/CSP-Grenze prüfen.

## 2026-08-02 – Teilen und Datenschutz müssen lokale Spielwerte ausschließen

- Ausgangspunkt: lokale Bestwerte, Serien, Sprache und Einstellungen ohne
  Konto oder Datenbank.
- Beobachtung: Ein generischer `location.href`-Fallback kann Testparameter oder
  lokale Zustandsreferenzen übernehmen; ein scheinbarer Cookie-Dialog würde
  bei rein lokaler Speicherung eine nicht vorhandene Wahl vorspiegeln.
- Änderung: Der Hinweis nennt No-Cookies und lokale Speicherung ohne
  Einwilligungsattrappe. Der Share-Provider entfernt Query und Hash und liefert
  nur App-Titel, neutralen DE-/EN-Text und die App-URL. Der vollständige lokale
  Reset entfernt auch die Hinweis-Persistenz.
- Regression: native Share-API, bewusster `AbortError`, Clipboard-Fallback,
  auffälliger Test-Bestwert, DE/EN, Reload und zweistufiger Komplettreset.
- Allgemeine Bedeutung: Komfortpersistenz ist Teil des löschbaren lokalen
  Datensatzes. Teilen ist eine explizite Exportgrenze und darf keine impliziten
  Nutzungs- oder Erfolgsdaten aufnehmen.

## 2026-08-02 – Performance-Gates brauchen ein exklusives Messfenster

- Ausgangspunkt: unveränderte Baseline und Essentials-Stand wurden gemessen,
  während Cloud, Sky, Daylight und weitere owner-eigene Browsermatrizen auf
  demselben Host liefen.
- Beobachtung: Die Baseline fiel von zuvor extern belegten rund 60 FPS auf
  38,27 FPS; der neue Stand lag nahezu identisch bei 37,50 bis 39,25 FPS.
  Unter vierfacher Drosselung schwankte der Host noch stärker, obwohl die feste
  Simulation stets 0 ms verlor und Eingaben funktional korrekt blieben.
- Änderung: Kein Grenzwert wurde gesenkt und der Publish blieb angehalten. Der
  finale Performance-Rerun wurde erst nach Ende der parallelen Browserkampagnen
  isoliert ausgeführt und bestand alle drei unveränderten Profile.
- Regression: identische App, identische drei Profile, unveränderte Budgets und
  Vergleich von Frame-p95, Input-p95 und verlorener Simulationszeit.
- Allgemeine Bedeutung: Reproduzierbare Browserperformance benötigt nicht nur
  CPU-Drosselungsparameter, sondern auch Besitz des Host-Messfensters.
  Funktions- und Performancebefunde müssen getrennt dokumentiert werden.

## 2026-08-02 – Bytegenaue Vendor-Locks brauchen eine lokale LF-Grenze

- Ausgangspunkt: Der fünfteilige Essentials-Lock wird auf Windows mit
  aktiviertem `core.autocrlf` aus einem festen Shared-Commit übernommen.
- Beobachtung: Ein korrekter Upstream-Hash allein verhindert nicht, dass ein
  späterer Windows-Checkout vendorte Textdateien in CRLF materialisiert und
  damit den bytegenauen App-Lock bricht.
- Änderung: Das versionierte Vendorverzeichnis besitzt eine enge eigene
  `.gitattributes` mit exakt `* text eol=lf`. Sie erfasst auch künftig neue
  Textartefakte innerhalb dieser festen Vertragsversion, ohne die übrige App
  global umzuschreiben.
- Regression: `git check-attr text eol` für Manifestlock, Bootstrap, Runtime,
  beide CSS-Dateien und Verifier; anschließend echter Windows-Frischcheckout
  des App-Commits und erneuter vendorter Essentials-Verifier.
- Allgemeine Bedeutung: Bytegenaue vendorte Verträge benötigen ihre
  Zeilenendengrenze dort, wo Git die Dateien materialisiert. Eine lokale
  Vendorregel ist enger und zukunftsfester als eine Liste heutiger Endungen.
