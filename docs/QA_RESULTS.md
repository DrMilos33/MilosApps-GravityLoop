# Gravity Loop: QA-Ergebnisse

Stand: 2026-07-30  
Branch: `codex/gravity-loop-dev`  
Production: nicht freigegeben

## Automatisierte Baseline

- Vitest: 21 Physik-, Kollisions-, Zustands-, Zufalls- und Speichertests.
- Kernabdeckung: 86,02 % Statements, 71,62 % Branches, 90,62 % Funktionen.
- Playwright/Chromium: 18 Browserprüfungen.
- Build: TypeScript strict und Vite-Produktionsbuild.
- Runtime-Payload im ersten Build: 25,36 kB JavaScript (8,51 kB gzip) und
  9,79 kB CSS (3,19 kB gzip).

## QA-Runde 1: Kernfluss und reproduzierbare Browsermatrix

Ausgangspunkt war Commit `3f8161d`.

### Verifiziert

- fester Simulationsschritt von 120 Hz bei 30, 60, 90, 120 und 144 Hz
  Renderfrequenz; nach zwölf Sekunden jeweils exakt 1.440 Schritte;
- Gravitation nur während aktiver Eingabe, gerade Flugbahn nach Loslassen,
  Swept-Circle-Kollisionen für Kern, Rand und Gefahren;
- Maus-Halten/Loslassen, Tastatur-Halten/Loslassen, Multi-Pointer-Cancel,
  Lost-Pointer-Capture und zwölf schnelle Pointer-Wechsel;
- Pause und explizite Wiederaufnahme nach Tabwechsel, Rotation und manueller
  Pause; dreifacher schneller Neustart bleibt idempotent;
- lokale Settings inklusive Migration und blockiertem Speicher; keine Cookies,
  kein Login und keine Netzwerkabhängigkeit;
- Smartphone hoch `360×800 @3x`, Smartphone quer `844×390 @2x`, Tablet
  `800×1180 @2x`, Desktop `1440×900 @1x` und dichter Desktop
  `1280×800 @2,5x`;
- 200-Prozent-Textzoom ohne horizontalen Seitenüberlauf, Reduced Motion ohne
  veränderte Physik, hoher Kontrast und WCAG-A/AA-Automatikprüfung ohne Befund;
- alle sichtbaren Spielkontrollen sind per Tastatur erreichbar und besitzen
  sichtbaren Fokus; Touchziele bleiben mindestens 44 CSS-Pixel hoch.

### Bestätigte Befunde und Änderungen

1. Der übliche Vite-Port `4173` wurde parallel von einer anderen App belegt.
   Ein allein auf HTTP-Status prüfender Testlauf akzeptierte dadurch die falsche
   Anwendung. Gravity Loop verwendet jetzt den vorläufig reservierten Port
   `4317`, `strictPort` und keine Playwright-Serverwiederverwendung. Der erste
   Browsertest prüft zusätzlich `app: gravity-loop` im Healthcheck.
2. Ein Gleitkomma-Rest im Fixed-Step-Akkumulator verlor bei 144-Hz-Rendering
   nach zwölf Sekunden einen Simulationsschritt. Ein enger, dokumentierter
   Akkumulator-Epsilon stellt exakt 1.440 Schritte wieder her.
3. Statisches Sternfeld, Arenafläche und Rand wurden zunächst pro Frame neu
   gerendert. Unter vierfacher CPU-Drosselung fielen Messungen bis auf
   28,1 FPS. Eine DPR-korrekte statische Canvas-Ebene hebt die wiederholten
   Messungen auf 47,9 bis 55,0 FPS im Mittel, ohne Simulationszeit zu verlieren.

### Performanceevidenz

Die Werte stammen aus vollständigen Browserläufen mit aktivierter
Video-/Trace-Infrastruktur und sind deshalb bewusst konservativ.

| Profil | Ø FPS | Frame p95 | Input p95 | verlorene Simulation |
|---|---:|---:|---:|---:|
| normale CPU, Abschlusslauf | 58,15 | 16,80 ms | 9,50 ms | 0 ms |
| CPU vierfach gedrosselt, Abschlusslauf | 54,98 | 16,80 ms | 9,70 ms | 0 ms |
| CPU vierfach gedrosselt, langsamster grüner Lauf | 47,92 | 50,00 ms | 33,30 ms | 0 ms |

### Testgrenzen

- Noch nicht auf realer Android-/iOS-Hardware oder in einem Android WebView
  ausgeführt; Touch wird über Chromium-Geräteemulation und Pointer Events
  geprüft.
- Kein manueller Test mit VoiceOver, TalkBack oder NVDA; Rollen, Namen,
  Fokusreihenfolge, Live-Regionen und Axe-Regeln sind automatisiert geprüft.
- Andere Browser-Engines folgen in den weiteren Runden; Runde 1 ist bewusst die
  Chromium-Referenz.

## QA-Runde 2: Spielgefühl, echte Eingaben und Engine-Grenzen

Ausgangspunkt war Commit `4cfa453`.

### Verifiziert

- einfache radiale Pulsregel hält eine Referenzrunde 20 Sekunden am Leben und
  sammelt mindestens einen Funken; dadurch ist die Grundbahn nicht von
  framegenauem Expertenwissen abhängig;
- echter Chromium-Touchstream bei `390×844 @3x`: 520 ms langes Halten,
  `touchCancel` und zehn schnelle Start-/End-Wechsel ohne hängenbleibende
  Gravitation;
- globaler Pointer-Up-/Cancel-Fallback zusätzlich zu Pointer Capture; damit
  bleibt Loslassen auch in älteren oder eingebetteten WebViews zuverlässig;
- Fokusverlust durch anderes Fenster/Systemdialog pausiert die Runde und löst
  aktive Maus-, Touch- oder Stifteingaben;
- Chromium, Firefox und WebKit bestehen Start, Maus, Tastatur, Pointer-Cancel,
  Pause, Resume, Neustart, Speicher, Axe, Zoom und Reduced Motion;
- manuelle Browser-Sichtprüfung bei `390×844` und `844×390`, jeweils Startkarte
  und laufender Flug.

### Bestätigte Befunde und Änderungen

1. Ohne funktionierendes Pointer Capture konnte ein Loslassen außerhalb des
   Canvas unbemerkt bleiben. Window-weite `pointerup`- und `pointercancel`-
   Fallbacks sind idempotent ergänzt und als Multi-Pointer-Regression geprüft.
2. Sichtbarer Fokusverlust löste zwar Eingaben, pausierte aber die Simulation
   nicht. Ein Systemdialog konnte die Runde deshalb im Hintergrund beenden.
   `window.blur` pausiert jetzt mit dem verständlichen Grund `focus`.
3. Im kurzen Smartphone-Querformat blieb ein abgeschnittener Rest der
   Kopfzeilenhilfe hinter dem Score-Balken sichtbar. Die dort redundante Hilfe
   wird an diesem Breakpoint ausgeblendet; Score, Spielfeld und drei
   Hauptaktionen bleiben vollständig im Viewport.
4. Firefox und WebKit drosseln `requestAnimationFrame` im seriellen
   Headless-/Video-Lauf zeitweise stärker als Chromium. Zustandsreaktion und
   Eingabefunktion bleiben sofort korrekt; die harte 45-ms-Latenzgrenze gilt
   deshalb für die Chromium-Referenzmessung. Andere Engines besitzen weiterhin
   einen Hänger-Grenzwert von 180 ms.

### Abschlussmatrix Runde 2

- Unit: 22/22 bestanden.
- Browser: 41 bestanden, 19 bewusst engine-spezifisch übersprungen, 0
  fehlgeschlagen.
- Chromium: 20/20 der anwendbaren Tests bestanden.
- Firefox: 11/11 der anwendbaren Tests bestanden.
- WebKit: 10/10 der anwendbaren Tests bestanden; der reine Tab-Reihenfolgetest
  ist wegen der hostabhängigen macOS-Einstellung „Full Keyboard Access“
  ausgenommen. Direkte P-/R-/Leertastenflüsse bestehen.
- Abschlussmessung Chromium normal: 56,09 FPS, Frame-p95 33,20 ms,
  Input-p95 20,40 ms, 0 ms verlorene Simulation.
- Abschlussmessung Chromium bei vierfacher CPU-Drosselung: 54,05 FPS,
  Frame-p95 16,80 ms, Input-p95 19,90 ms, 0 ms verlorene Simulation.

## QA-Runde 3

Ausgangspunkt war Commit `d30f2f8`.

### Verifiziert

- 60 Sekunden deterministischer Referenzflug mit verständlicher radialer
  Pulsregel und mindestens einem gesammelten Funken;
- Offline-Weiterlauf nach vollständigem Laden ohne Netzwerkzugriff;
- `pagehide`/`pageshow` mit Back-Forward-Cache-Simulation: aktive Runde pausiert,
  bleibt unverändert und wird nur explizit fortgesetzt;
- zweistufig bestätigter Reset von Bestwert, Funkenserie, Einstellungen und
  aktueller Runde; Abbrechen verändert keine lokalen Daten;
- Smartphone `360×800` bei 200 Prozent Textzoom: Startzustand,
  Steuerleiste, Einstellungsdialog und Reset-Bestätigung ohne Seiten- oder
  Dialogüberlauf;
- vollständiger Wiederholungslauf in Chromium, Firefox und WebKit;
- reproduzierbarer `pnpm install --frozen-lockfile`, Strict-TypeScript-Build und
  eigene GitHub-Actions-CI-Definition.

### Bestätigte Befunde und Änderungen

1. Der QA-Plan verlangte einen lokalen Reset, die erste Oberfläche konnte
   Einstellungen aber nur einzeln zurückstellen. Der neue Bereich „Lokale
   Daten“ zeigt erst eine Erklärung und verlangt danach eine zweite explizite
   Bestätigung. Die laufende Runde wird ebenfalls reproduzierbar neu
   initialisiert.
2. Bei 360 Pixel Breite und 200 Prozent Textzoom hielten Score-Zellen ihre
   Min-Content-Breite und vergrößerten die Seite auf 403 Pixel. Danach zeigte
   der Dialog noch einen internen Min-Content-Überlauf von 477 Pixel.
   `min-width: 0`, gezieltes Wort-Wrapping und einspaltige mobile
   Einstellungs-/Bestätigungsaktionen beseitigen beide Überläufe, ohne Text zu
   verkleinern oder abzuschneiden.
3. Der externe DEV-Lifecycle war nicht ausführbar dokumentiert. Ein eigener
   Übergabevertrag hält jetzt lokale URL, Health-Identität, Portalroute,
   Eingabemethoden, Daten- und Rechteangaben sowie den fehlenden externen
   HTTPS-DEV-Dienst fest. Production bleibt unberührt.

### Finale Test- und Performanceevidenz

- Abhängigkeitsinstallation: `pnpm install --frozen-lockfile` bestanden.
- Unit: 22/22 bestanden.
- Abdeckung: 86,02 % Statements, 71,62 % Branches, 90,62 % Funktionen,
  86,48 % Zeilen für Kernlogik und Speicher.
- Browser: 47 bestanden, 19 bewusst engine-spezifisch übersprungen,
  0 fehlgeschlagen.
- Build: 26,23 kB JavaScript (8,71 kB gzip), 11,30 kB CSS (3,51 kB gzip);
  keine Runtime-Pakete oder externen Assets.
- Chromium normal: 59,28 FPS, Frame-p95 16,80 ms, Input-p95 14,80 ms,
  0 ms verlorene Simulation.
- Chromium bei vierfacher CPU-Drosselung: 55,96 FPS, Frame-p95 16,80 ms,
  Input-p95 7,10 ms, 0 ms verlorene Simulation.

### Verbleibende Grenzen

- Reale Android-/iOS-Hardware, Android WebView, TalkBack, VoiceOver und NVDA
  waren in dieser lokalen Umgebung nicht verfügbar. Das ist eine Testgrenze,
  kein bestätigter App-Defekt.
- Die WebKit-Tabreihenfolge ist im Headless-Lauf von der hostseitigen
  macOS-Einstellung „Full Keyboard Access“ abhängig. Direkte Tastaturflüsse,
  Fokusdarstellung, Semantik und Axe-Prüfungen sind in den anwendbaren Engines
  bestanden.
- Der lokale Dienst bleibt für reproduzierbare Offline-Entwicklung unter
  `http://127.0.0.1:4317/` verfügbar. Die danach ergänzte externe
  DEV-Verifikation ist im folgenden Abschnitt dokumentiert.

## Externe DEV-Verifikation

Am 30. Juli 2026 wurde exakt der verifizierte App-Commit
`a713482c1db746f72aeb4c2665d20e8856c84ca9` als unabhängiges GitHub-Pages-DEV
unter `https://drmilos33.github.io/MilosApps-GravityLoop/` veröffentlicht. Das
aus diesem Commit gebaute statische Artefakt ist
`28dbdd173b98dc61cc2611286f1e52b99acea587`.

### Verifiziert

- Pages-Deployment-Run `30534546197` erfolgreich;
- `GET /health.json`: HTTP 200, `application/json` und exakt
  `status: ok`, `app: gravity-loop`, `environment: dev`;
- direkter Aufruf ohne Portal-Cookie, Milos-Login, Konto oder Redirect;
- keine Console-Errors im sichtbaren Live-Smoke;
- vollständige externe Playwright-Matrix in Chromium, Firefox und WebKit:
  46 Tests im ersten Gesamtlauf bestanden, 19 engine-spezifische Tests
  planmäßig übersprungen;
- der einzige erste WebKit-Latenzfehler bestand im isolierten Wiederholungslauf
  und blieb funktional korrekt; alle übrigen WebKit-Eingabe-, Pause-, Resume-,
  Speicher-, Zoom- und Accessibility-Flüsse bestanden;
- Chromium normal: 47,36 FPS, Frame-p95 33,4 ms, Input-p95 22,2 ms,
  0 ms verlorene Simulation;
- Chromium bei vierfacher CPU-Drosselung: 36,08 FPS, Frame-p95 50,0 ms,
  Input-p95 19,2 ms, 0 ms verlorene Simulation;
- Smartphone-, Landscape-, Tablet-, Desktop- und DPR-Matrix gegen die
  öffentliche URL bestanden.

### Testwerkzeuggrenze

Headless WebKit lieferte mit Video-/Trace-Instrumentierung in zwei Messungen
222 beziehungsweise 229 ms Input-p95 statt unter 180 ms; der nächste isolierte
Retry bestand. Maus-, Tastatur- und Pointerzustände wechselten in allen Läufen
korrekt und blieben nie hängen. Die harte Performance-Referenz ist weiterhin
Chromium; dies ist als intermittierende Engine-/Instrumentierungsgrenze
dokumentiert und kein bestätigter Hosting- oder Spiellogikdefekt.

## QA-Runde 4: Schwierigkeit, Sonne, Mond und Skins

Ausgangspunkt war das Nutzerfeedback zu mehreren Schwierigkeitsgraden,
verlorenen Sonnenstürzen, einem Mondmodus, naturnahen Himmelskörpern und
Kometen-Skins. Funktionsmeilenstein war `cbd27f8`, der cross-platform
gehärtete und veröffentlichte Quellstand ist
`69f4444748e4918987824a8940b354377ec636c7`.

### Umgesetzt und verifiziert

- `Leicht`, `Normal` und `Schwer` staffeln Starttempo, Zugkraft,
  Gefahrenrhythmus, Maximalzahl/-tempo der Trabanten und Punkte deterministisch;
- der Sonnensog steigt zur Mitte hin deutlich an; eine gesweepte Kollision mit
  der Sonne beendet die Runde auch bei großen Simulationsschritten;
- der Mondmodus verwendet eine schwächere, gleichmäßigere Zugkurve und ein
  ruhigeres Grundtempo; ein Mundeinschlag beendet die Runde;
- grafische und naturnahe, vollständig prozedurale Sonne-/Mond-Darstellung ohne
  externe Assets;
- vier rein kosmetische Kometen-Skins: Mint, Feuer, Eis und ein goldener Hut;
- lokales Settings-Schema Version 3 mit verlustfreier Migration aus Version 2
  und sicherem Komplettreset;
- regelverändernde Optionen starten atomar eine neue faire Runde, kosmetische
  Optionen verändern weder Hitbox noch Physik;
- alle neuen Auswahlfelder, Dialogzustände und dynamischen Canvas-Namen sind
  tastatur- und screenreaderverständlich.

### Drei vollständige Verbesserungsrunden

1. Physik-/Speicher-Baseline: neue Unit-Tests schlugen zunächst erwartbar fehl;
   danach waren Schwierigkeit, Sonnen-/Mondzug, Kollision, Gefahrenrhythmus,
   Migration und feindselige Speicherwerte deterministisch abgedeckt.
2. Browser-/Layout-Runde: neue Settings, Canvas-Pixeländerung,
   Smartphone/Querformat/Tablet/Desktop/DPR, 200-%-Reflow, Reduced Motion und
   Axe A/AA. Veraltete Selektoren und der asynchrone Dialog-Close wurden als
   Regressionen korrigiert.
3. Performance-/Plattform-Runde: Eingabetelemetrie an den sichtbaren Frame
   verschoben, Hutkontrast nach Screenshotprüfung erhöht,
   Linux-Scrollbar-Gutter-Reflow korrigiert und der visuelle WebKit-Test auf
   einen nachgewiesenen Renderframe synchronisiert.

### Finale lokale und externe Evidenz

- Unit: 27/27 bestanden.
- Abdeckung: 97,15 % Statements, 86,36 % Branches, 94,59 % Funktionen und
  97,14 % Zeilen für Kernlogik und Speicher.
- Build: 32,76 kB JavaScript (10,59 kB gzip), 11,69 kB CSS
  (3,60 kB gzip), keine Runtime-Pakete oder externen Bildassets.
- Lokale Drei-Engine-Matrix: 54 anwendbare Tests bestanden,
  21 engine-spezifisch übersprungen, 0 fehlgeschlagen.
- Externe Drei-Engine-Matrix gegen die öffentliche HTTPS-DEV-URL:
  54 bestanden, 21 übersprungen, 0 fehlgeschlagen, 0 Retry/Flakes.
- Extern Chromium normal: 58,94 FPS, Frame-p95 16,80 ms,
  Input-p95 19,40 ms, 0 ms verlorene Simulation.
- Extern naturnaher Mond plus Hut: 57,26 FPS, Frame-p95 16,80 ms,
  Input-p95 11,70 ms, 0 ms verlorene Simulation.
- Extern bei vierfacher CPU-Drosselung: 53,71 FPS,
  Frame-p95 16,80 ms, Input-p95 11,90 ms, 0 ms verlorene Simulation.
- `main`-CI-Run `30546531157`: vollständig erfolgreich.
- Pages-Run `30546553237`: vollständig erfolgreich.
- DEV-Quellstand: `69f4444748e4918987824a8940b354377ec636c7`.
- DEV-Artefakt: `47c53cad1bacc0e1cbda02d9b15148846ff7d46b`.

### Verbleibende Grenzen

Reale Android-/iOS-Hardware, Android WebView, TalkBack, VoiceOver und NVDA
standen weiterhin nicht zur Verfügung. Die automatisierten Touch-, Pointer-,
Tastatur-, Semantik-, Reflow- und Engine-Prüfungen sind vollständig grün.
Production blieb unverändert und ist nicht freigegeben.

## QA-Runde 5: Public-App-Shell v2.0.3 und CSP-sicheres Pages-Artefakt

Der veröffentlichte Quellstand ist
`bfa148ba68dcec9dfedbb3e3804102a923111695`; das daraus erzeugte
Pages-Artefakt ist `e5bf3855d12a919b11b8c95628c2e5d01b83ea04`.
Die Shell ist auf `public-app-shell/v2.0.3` und Shared-Commit
`ed898412306e22c6ae1b10ee8953df29f8acd627` fest gepinnt. Alle fünf
vendorten Artefakte werden durch `shell-lock.json` und den portablen
Shared-Validator geprüft.

### Umgesetzt und verifiziert

- app-eigene Public-App-Shell mit Inline-SVG-Icon, DEV-Kennzeichnung,
  absoluten DEV-/Legal-Links und kompaktem Footer; kein CDN oder
  Shared-Runtimeimport;
- vollständige deutsche und englische Fachoberfläche; Shell-Event und
  Initialisierung aus `document.documentElement.lang`, lokale Persistenz und
  sicherer Komplettreset auf Deutsch;
- externe Same-Origin-Stylesheets für Shell, Shadow DOM und App-Theme unter
  `default-src 'self'; script-src 'self'; style-src 'self'`;
- Vite baut auch kleine CSS-Dateien als echte Dateien. Der E2E-Test setzt die
  strikte CSP am tatsächlich gebauten beziehungsweise externen Hauptdokument
  und prüft beide Stylesheet-Origins. Dadurch kann eine erneute `data:`-
  Einbettung nicht unbemerkt veröffentlicht werden;
- Header, Footer, Fokus, 44-Pixel-Ziele, Reduced Motion, 1440×900, 390×844
  sowie 360×800 bei 200 Prozent ohne horizontalen Überlauf oder Leerraum unter
  dem Footer;
- Spiel-, Canvas-, Pointer-, Lifecycle-, Pause-, Offline- und
  Performanceverträge blieben unverändert grün.

### Lokale Evidenz

- Shared-Validator/5er-Lock: PASS.
- Unit: 30/30 bestanden.
- TypeScript-/Vite-Build: 49,08 kB JavaScript (15,97 kB gzip), 11,26 kB
  App-CSS (3,50 kB gzip), 5,47 kB Shell-CSS (1,55 kB gzip) und 0,37 kB
  Theme-CSS (0,21 kB gzip); keine CSS-`data:`-URL im JavaScript.
- Fokussiertes CSP-/200-Prozent-Gate: 6/6 in Chromium, Firefox und WebKit.
- Vollständiges gebautes Artefakt: 62 Fachtests bestanden, 23 planmäßige
  Engine-Skips. Ein Playwright-internes Firefox-Problem trat erst beim
  Schließen eines Browserkontexts auf; der betroffene Firefox-Kernfluss
  bestand direkt danach isoliert 7/7.
- GitHub-CI für `main`: Run `30703160956`, vollständig erfolgreich. Der
  identische Featurebranch-Run `30703160837` war ebenfalls grün.

### Externe DEV-Evidenz

- Pages-Run `30703430131`: Build und Deployment vollständig erfolgreich.
- `GET /health.json`: HTTP 200, `application/json; charset=utf-8` und exakt
  `status: ok`, `app: gravity-loop`, `environment: dev`.
- Frische öffentliche Drei-Engine-Matrix: 64 bestanden, 23 planmäßig
  übersprungen, 0 fehlgeschlagen, 0 Retry/Flakes.
- Strikte Self-only-CSP, Themefarbe, Host-Grid, 44-Pixel-Ziele und beide
  HTTPS-Same-Origin-Stylesheets wurden am echten Pages-Build geprüft; keine
  CSP-Konsolenfehler.
- Direkter Aufruf und Portal-DEV-Redirect funktionierten cookie-los und ohne
  Milos-Login. Sichtprüfung bei 390×844 und 1440×900 bestätigte DE/EN samt
  Reload-Persistenz, lesbare Spielzustände und fehlenden horizontalen
  Überlauf.
- Extern Chromium normal: 58,14 FPS, Frame-p95 16,80 ms,
  Input-p95 14,60 ms, 0 ms verlorene Simulation.
- Extern naturnahe Grafik plus Hut: 57,30 FPS, Frame-p95 16,80 ms,
  Input-p95 10,80 ms, 0 ms verlorene Simulation.
- Extern bei vierfacher CPU-Drosselung: 55,19 FPS,
  Frame-p95 16,80 ms, Input-p95 13,20 ms, 0 ms verlorene Simulation.

### Verbleibende Grenzen

Reale Android-/iOS-Hardware, Android WebView sowie manuelle Tests mit
TalkBack, VoiceOver oder NVDA standen nicht zur Verfügung. Production blieb
unverändert und ist weiterhin nicht freigegeben.
