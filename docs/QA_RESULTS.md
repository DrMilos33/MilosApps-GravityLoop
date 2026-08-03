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

## QA-Runde 6: mobile Haltezone, strukturierte Settings und Sternenschild

Ausgangspunkt war Nutzerfeedback zur mobilen Steuerfläche, zur Verständlichkeit
der Einstellungen, zum Rundenreset bei Regelwechseln und zur fehlenden
Spielwirkung der Sterne. Baseline war der gesunde DEV-Quellstand `bfa148b`.

### Verbesserungsrunden

1. Fachlogik und Eingabe: Die neuen Tests belegten zunächst die fehlende
   Schildladung, den fehlenden einmaligen Kollisionsschutz und die auf das
   Canvas begrenzte Touchfläche. Danach waren drei Sterne, einmaliger
   Trabantenschutz, weiterhin tödlicher Zentralkörper und echter Touch oberhalb
   des Canvas deterministisch grün.
2. Bedienung und Reflow: Der lange flache Einstellungsdialog wurde in klar
   benannte Karten für Spiel, Aussehen, Komfort und lokale Daten umgebaut.
   Schwierigkeit und Zentralkörper sind große Radio-Karten; Änderungen bleiben
   bis `Übernehmen & neu starten` ausstehend. Die erste 200-Prozent-Prüfung
   fand tatsächlich überlaufende Aktions- und Hinweistexte. Feste
   Aktionsleiste, kompakter Mobilkopf, `min-width: 0` und gezielter Wortumbruch
   beseitigten den Befund ohne kleinere Fachschrift oder abgeschnittene
   Inhalte.
3. Plattform- und Performancegate: Sichtprüfung bei `390×844` und
   `1440×900`, danach vollständige Chromium-/Firefox-/WebKit-Matrix inklusive
   Pointer-Lifecycle, Offline, Pause/Resume, DE/EN, Axe, Reduced Motion,
   Self-only-CSP und 360×800 bei 200 Prozent.

### Lokale Abschlussevidenz

- Shared-Validator/5er-Lock: PASS.
- Unit: 32/32 bestanden.
- Kernabdeckung: 94,65 % Statements, 84,84 % Branches, 94,73 % Funktionen
  und 94,62 % Zeilen.
- Drei-Engine-Browsermatrix: 68 anwendbare Tests bestanden, 25 planmäßige
  Engine-/CDP-Skips, 0 fehlgeschlagen.
- Build: 53,93 kB JavaScript (17,48 kB gzip), 16,79 kB App-CSS
  (4,65 kB gzip), 5,47 kB Shell-CSS (1,55 kB gzip) und 0,37 kB Theme-CSS
  (0,21 kB gzip).
- Chromium normal: 59,73 FPS, Frame-p95 16,80 ms, Input-p95 13,30 ms,
  0 ms verlorene Simulation.
- Naturnaher Mond plus Hut: 57,71 FPS, Frame-p95 16,80 ms,
  Input-p95 13,30 ms, 0 ms verlorene Simulation.
- Vierfache CPU-Drosselung: 56,24 FPS, Frame-p95 16,80 ms,
  Input-p95 7,20 ms, 0 ms verlorene Simulation.

### Verbleibende Grenzen

### Externe DEV-Evidenz

- veröffentlichter Source:
  `b3b18c900c87d6e48c50e09404c00527ba821d6a`;
- daraus gebautes Pages-Artefakt:
  `fd7823e6fdc9113ca65052f7b5804b26c40987e5`;
- App-CI-Run `30706511129` und Pages-Run `30706693209`: vollständig
  erfolgreich;
- Readiness: HTTP 200, `application/json; charset=utf-8` und exakt
  `status: ok`, `app: gravity-loop`, `environment: dev`;
- frische öffentliche Drei-Engine-Matrix: 68 anwendbare Tests bestanden,
  25 planmäßige Engine-/CDP-Skips, 0 Fehler und 0 Retries;
- direkter Aufruf ohne Login, Portal-Cookie oder Redirect; bestehende
  Portal-DEV-Route weiterhin 302 auf dieselbe unabhängige App-URL;
- strikte Self-only-CSP, getrennte HTTPS-Same-Origin-Shell-CSS,
  DE/EN-Persistenz, Axe, Reduced Motion, Touch außerhalb des Canvas und
  360×800 bei 200 Prozent bestanden;
- Chromium normal: 59,73 FPS, Frame-p95 16,80 ms, Input-p95 16,00 ms;
  naturnaher Mond plus Hut: 58,00 FPS, Frame-p95 16,80 ms,
  Input-p95 26,40 ms; vierfache CPU-Drosselung: 55,06 FPS,
  Frame-p95 16,80 ms, Input-p95 15,70 ms; jeweils 0 ms verlorene Simulation.

### Verbleibende Grenzen

Reale Android-/iOS-Hardware, Android WebView sowie manuelle Tests mit
TalkBack, VoiceOver oder NVDA standen nicht zur Verfügung. Production blieb
unverändert, die Production-Portalroute antwortet weiterhin mit 404 und ist
nicht freigegeben.

## QA-Runde 7: Public-App-Essentials v1.0.0

Der lokale Integrationsstand pinnt `public-app-essentials/v1.0.0` unverändert
auf Shared-Commit `b09e09008ff05fe87f05bc647a7c4964ff13e6f6`. Manifest,
app-eigenes Theme, Bootstrap, Runtime und fünfteiliger SHA-256-Lock liegen
vollständig im Gravity-Loop-Repository; es gibt kein CDN und keinen
Shared-Runtimeimport.

### Umgesetzt und funktional verifiziert

- CSS-first Ladescreen vor Shell- und Fachruntime, 56 Pixel auf Desktop und
  48 Pixel mobil, Reduced Motion, tag-neutraler Titel und exakt eine
  Dokument-H1; Ende ausschließlich durch das fachliche
  `milosapps:ready`-Signal;
- einmaliger, wegklickbarer DE-/EN-Hinweis mit wahrheitsgemäßem No-Cookies-
  und Local-Storage-Text, absolutem DEV-Datenschutzlink und lokal
  persistierter Kenntnisnahme;
- bewusste Teilen-Aktion mit nativer Share-API, stillem Nutzerabbruch und
  Clipboard-Fallback. Der Payload enthält nur Titel, neutralen Sprachtext und
  die App-URL ohne Query oder Hash, niemals Bestwert oder Serie;
- der zweistufige lokale Komplettreset entfernt neben Spielstand, Sprache und
  Einstellungen auch die Komfortpersistenz des Hinweises;
- Datumsauswahl und Ortssuche bleiben vertragsgemäß deaktiviert;
- Vite lässt beide Essentials-CSS-Dateien und den Bootstrap als getrennte
  relative Same-Origin-Artefakte stehen. Der Pages-Build kopiert den exakt
  gelockten Vendorordner; ein nachgelagerter Verifier prüft HTML, alle fünf
  Dateien, Pfade und fehlende Inline-Theme-Tokens fail-closed.

### Lokale Evidenz vor dem finalen Performancefenster

- Public-App-Shell-Validator/5er-Lock: PASS.
- Public-App-Essentials-Validator/5er-Lock: PASS.
- Unit: 32/32 bestanden.
- Relativer Pages-Build samt gebautem Essentials-Artefakt-Verifier: PASS;
  54,59 kB App-JavaScript (17,71 kB gzip), 17,47 kB App-CSS
  (4,76 kB gzip), beide Shell-CSS-Dateien separat sowie 7,77 kB
  Essentials-Basis-CSS und 0,36 kB Essentials-Theme-CSS unverändert im
  Vendorpfad.
- Neue Essentials-Matrix: 12/12 in Chromium, Firefox und WebKit.
- Vollständige funktionale Chromium-Matrix ohne Performanceprofil: 32/32.
- Axe A/AA, Tastaturfokus, 44-Pixel-Ziele, DE/EN samt Reload,
  1440×900, 390×844 und 360×800 bei 200 Prozent: bestanden.

### Finales isoliertes Gate

Während paralleler owner-eigener Playwright-Matrizen mehrerer Apps lag bereits
die unveränderte Gravity-Baseline nur bei 38,27 FPS normal. Der neue Stand lag
im selben belasteten Fenster bei 37,50 bis 39,25 FPS normal; die feste
Simulation verlor in allen Messungen 0 ms. Kein Performancebudget wurde
gesenkt. Nach dem Ende aller konkurrierenden Browserläufe bestand derselbe Stand
den isolierten Wiederholungslauf mit 53,33 FPS normal, 55,50 FPS mit
naturnahem Mond und Hut sowie 51,40 FPS bei vierfacher CPU-Drosselung. Die
Input-p95-Werte lagen bei 11,70, 18,90 und 47,00 ms; verlorene
Simulationszeit blieb in allen Profilen bei 0 ms.

Die abschließende Matrix lief zusätzlich vollständig gegen das gebaute relative
Pages-Artefakt: 80 Tests bestanden in Chromium, Firefox und WebKit, 25
profilspezifische Engine-/CDP-Skips, 0 Fehler. Der darin erneut gemessene
Chromium-Performancepfad erreichte 58,41 / 54,15 / 51,12 FPS mit
Input-p95 10,60 / 22,60 / 47,70 ms und jeweils 0 ms verlorener Simulation.
Health antwortete dabei mit HTTP 200, `application/json`, `status: ok`,
`app: gravity-loop` und `environment: dev`. Der eigene Previewprozess wurde
anschließend beendet und Port 4317 erneut als frei geprüft.

### Externe DEV-Evidenz

- deployter Source:
  `62624263f9a3154f4cddeeaf2344f6bd758a5f6a`;
- daraus gebautes Pages-Artefakt:
  `a7e52aa062f217f1ecd15d763c75d926640ce0cf`;
- Source-CI-Runs `30748263177` (`main`) und `30748262909` (Feature) sowie
  Pages-Run `30748438877`: vollständig erfolgreich;
- frische öffentliche Drei-Engine-Matrix: 80 anwendbare Tests bestanden,
  25 planmäßige Engine-/CDP-Skips, 0 Fehler;
- direkter HTTPS-Aufruf und Health ohne Login oder Portal-Cookie; Health exakt
  HTTP 200, `application/json; charset=utf-8`, `status: ok`,
  `app: gravity-loop`, `environment: dev`;
- beide Essentials-CSS-Dateien als getrennte HTTPS-Same-Origin-Ressourcen mit
  `text/css; charset=utf-8`, Bootstrap und Runtime als JavaScript; strikte
  Self-only-CSP in Chromium, Firefox und WebKit ohne Fehler;
- DE/EN samt Reload-Persistenz, Loader, wahrheitsgemäßer Datenschutzhinweis,
  native Share-/Abbruch-/Clipboard-Pfade, 44-Pixel-Ziele, Axe A/AA, Reduced
  Motion, Touch-/Pointer-/Lifecycle, 390×844, 1440×900 und 360×800 bei
  200 Prozent bestanden;
- sichtbare Browserabnahme: `scrollWidth = clientWidth` bei 390 und 360 Pixeln,
  Footer exakt am Dokumentende, Share-Ziel 59 bis 61 Pixel hoch und 0
  öffentliche Warnungen oder Fehler;
- externe Chromium-Performance: 54,69 FPS / 9,40 ms Input-p95 normal,
  50,52 FPS / 21,00 ms mit naturnahem Mond und Hut sowie 44,60 FPS /
  38,80 ms bei vierfacher CPU-Drosselung; jeweils 0 ms verlorene Simulation;
- bestehende Portal-DEV-Route liefert cookie-los per GET und HEAD HTTP 302 auf
  exakt dieselbe unabhängige App-URL; die Productionroute bleibt HTTP 404.

Rollback bleibt der zuvor gesunde Source
`b3b18c900c87d6e48c50e09404c00527ba821d6a` mit Pages-Artefakt
`fd7823e6fdc9113ca65052f7b5804b26c40987e5`. Reale Android-/iOS-Hardware,
Android WebView sowie manuelle Tests mit TalkBack, VoiceOver oder NVDA standen
nicht zur Verfügung. Production wurde nicht verändert und ist nicht
freigegeben.

## QA-Runde 8: UX refinement und Public-App-Essentials v1.1.2

Der lokale Kandidat pinnt `public-app-essentials/v1.1.2` unveränderlich auf
Shared-Commit `b14aac6107b75f03ff49e74160af7e7e30c29e59`. Manifest, Schema,
app-eigenes Theme, Bootstrap, Runtime und Verifier liegen als sechsteiliger
Verbraucher-Lock im App-Repository; die enge Vendorregel `* text eol=lf`
schützt alle vendorten Textartefakte.

### Produkt- und Interaktionsverbesserungen

- Die Startaktion liegt auf 390×844 und 360×800 vollständig mit mindestens
  16 Pixeln Sicherheitsrand im ersten Viewport. Physik, Canvas-DPR und die
  mobile Haltezone außerhalb des Canvas blieben unverändert.
- Die technische Bezeichnung „Zentralkörper“ wurde in DE/EN durch
  „Sonne oder Mond“ / „Sun or Moon“ und eine direkte Orbit-Erklärung ersetzt.
- Native Selects reservieren am Inline-Ende mindestens `2.25rem`; längste
  DE-/EN-Option, Dialoggrenzen und Pfeil-Safe-Area werden bei 200 Prozent
  geometrisch geprüft.
- Gravity Loop setzt keine Cookies und keine optionale Speicherung ein. Zwei
  notwendige, app-namensräumige Local-Storage-Zwecke sind inventarisiert; ein
  Schein-Einwilligungsdialog entfällt, der absolute Datenschutzlink bleibt
  dauerhaft sichtbar.
- Alter Spielfortschritt wird erst nach erfolgreichem Schreiben verlustfrei in
  `milosapps.gravity-loop.progress` migriert. Der zweistufige Komplettreset
  entfernt Sprache und alle bekannten app-eigenen Altschlüssel.
- Der Loader verwendet den race-sicheren Ready-Endpunkt. Physische Iconquelle
  (`public/gravity-loop-mark.svg`) und Runtime-URL
  (`./gravity-loop-mark.svg`) sind getrennt deklariert; Build und HTTP-Test
  belegen `image/svg+xml` und identischen SHA-256.

### Lokale Evidenz

- Public-App-Shell- und Public-App-Essentials-Verifier: PASS; Essentials
  `1.1.2`, sechs Lockartefakte und LF-Attribute verifiziert.
- Unit: 33/33 bestanden.
- Pages-Build samt nachgelagertem Built-HTML-/Consumerentry-/Icon-/Vendorgate:
  PASS; 54,83 kB App-JavaScript (17,77 kB gzip), 17,53 kB App-CSS
  (4,78 kB gzip), beide Shell-CSS-Dateien separat.
- Chromium: 36/36 funktionale Fälle bestanden. Firefox: 25 bestanden und
  11 planmäßige Chromium-/CDP-Skips. WebKit: 24 bestanden und 12 planmäßige
  Engine-/CDP-Skips. Zusätzliche Icon-MIME-/SHA- und Reset-Nachläufe bestanden
  in allen drei Engines.
- Axe A/AA, Tastatur/Fokus, 44-Pixel-Ziele, DE/EN samt Reload, Reduced Motion,
  strikte Self-only-CSP, Offline/App-Resume, Pointer-Cancel, Rotation,
  1440×900, 390×844 und 360×800 bei 200 Prozent: bestanden.
- Sichtbare Browserabnahme: Root `scrollWidth = clientWidth` bei 390 und
  360 Pixeln, verständliche DE-/EN-Texte, 40-Pixel-Select-Pfeilbereich,
  gestapelte 360-Pixel-Dialogaktionen und keine App-Warnungen oder -Fehler.

### Isoliertes Performancegate

Nach dem expliziten `HOST FREI` blieb ein erster naturnaher Mond-/Hut-Lauf bei
Frames und Simulation grün, enthielt aber bei nur fünf Eingabestichproben einen
einmaligen Input-p95-Ausreißer von 74,3 ms. Kein Budget wurde verändert. Zwei
unveränderte vollständige Bestätigungsläufe bestanden anschließend:

- Lauf 2: 59,46 / 57,22 / 54,55 FPS, Frame-p95 jeweils 16,8 ms,
  Input-p95 16,4 / 12,9 / 13,4 ms und jeweils 0 ms verlorene Simulation;
- Lauf 3: 60,00 / 56,15 / 55,83 FPS, Frame-p95 höchstens 16,8 ms,
  Input-p95 15,2 / 29,8 / 14,2 ms und jeweils 0 ms verlorene Simulation.

Das abschließende repositoryeigene Gesamttor bestand anschließend 88
anwendbare Browserfälle bei 29 planmäßigen Engine-/CDP-Skips. Der darin erneut
gemessene Performancepfad erreichte 60,00 / 57,29 / 56,97 FPS,
Input-p95 14,0 / 26,8 / 7,5 ms und jeweils 0 ms verlorene Simulation.

### CI-Schriftmetrikregression und Korrektur

Die ersten Source-CI-Runs `30784688143` und `30784688161` für
`02572c7c2472e2634960a36a18f171e338a689ee` stoppten den Publish vor dem
Pages-Artefakt. Unter den Linux-Schriftmetriken aller drei Engines standen der
Option „Naturnah“ bei 200 Prozent nur rund 151,2 Pixel zur Verfügung, während
der gerenderte Text 169,39 Pixel benötigte. Zwei nur im ersten Versuch
aufgetretene Fälle – 47,8 ms Input-p95 im reichen Chromium-Profil und zwei
statt drei WebKit-Eingabestichproben – bestanden ihren unveränderten Retry und
werden getrennt als Timing-Flakes geführt, nicht als Produktfehler.

Die app-eigene Korrektur hält den linken Textgutter bei festen 8 Pixeln,
bewahrt rechts die mit Textzoom skalierende `2.25rem`-Pfeil-Safe-Area und
verdichtet ausschließlich die Select-Schrift auf 95 Prozent. Der fokussierte
200-Prozent-Fall bestand anschließend in Chromium, Firefox und WebKit (3/3).
Die vollständige Settings-/Responsive-Matrix bestand 38 anwendbare Fälle bei
16 planmäßigen Skips, einschließlich 390×844, 360×800, DPR 1 bis 3 und
Rotation. Das unveränderte isolierte Performancegate erreichte
60,00 / 57,23 / 56,27 FPS, Input-p95 12,3 / 14,9 / 7,8 ms und jeweils 0 ms
verlorene Simulation. Das abschließende Gesamttor bestand erneut beide
Verifier, 33/33 Unit, den Build und 88 anwendbare Browserfälle bei 29
planmäßigen Skips; darin 59,72 / 57,25 / 55,80 FPS,
Input-p95 13,9 / 31,8 / 13,4 ms und 0 ms verlorene Simulation.

### Externe DEV-Veröffentlichung

- Source `1bdecf63d9963ab8c580735397a60603e979925c` steht auf Feature und
  `main`; CI-Runs `30785423278` und `30785423293` sind vollständig grün.
- Das ausschließlich daraus gebaute Pages-Artefakt
  `8d99c8495f20976536e76fb5ce731308a73d6e24` wurde im erfolgreichen
  Pages-Run `30785700551` veröffentlicht. Aus `02572c7` entstand bewusst kein
  Pages-Artefakt.
- Cookie-loser Direktaufruf, Health und App-Icon liefern HTTPS 200. Health ist
  exakt `status: ok`, `app: gravity-loop`, `environment: dev`; das Icon wird
  als `image/svg+xml` ausgeliefert und ist mit SHA-256
  `ce6d0540c08726e702dec86d5e2cf7b85c4fabf8f7ae07a0fc93a4faed08001c`
  bytegleich zur Source. Beide Essentials-CSS-Dateien und Bootstrap bleiben
  getrennte Same-Origin-Ressourcen mit korrektem MIME.
- Die frische öffentliche Drei-Engine-Matrix bestand 88 anwendbare Fälle bei
  29 planmäßigen Skips ohne Fehler oder Retry. Externe Performance:
  59,17 / 56,30 / 55,30 FPS, Input-p95 11,0 / 29,3 / 14,8 ms und jeweils
  0 ms verlorene Simulation.
- Sichtbare Abnahme: DE/EN samt Reload, 390×844, 360×800, Desktop,
  verständliche Settings, „Naturnah“, 44-Pixel-Ziele und kein horizontaler
  Überlauf. Bei 360 Pixeln lagen Dialog und alle Selects innerhalb des
  345-Pixel-Clients; die Selects boten 210 Pixel Textbreite, 8 Pixel linken
  Gutter und 36 Pixel Pfeilzone. Die Browserkonsole blieb ohne Warnung oder
  Fehler. Der automatisierte externe Reflowfall bestätigt zusätzlich
  360×800 bei 200 Prozent in Chromium, Firefox und WebKit.
- Rollback bleibt Source `62624263f9a3154f4cddeeaf2344f6bd758a5f6a`
  mit Pages-Artefakt `a7e52aa062f217f1ecd15d763c75d926640ce0cf`.

Die Reihenfolge lautet jeweils Normalprofil, naturnaher Mond plus Hut und
vierfache CPU-Drosselung. Reale Android-/iOS-Hardware, Android WebView sowie
manuelle Tests mit TalkBack, VoiceOver oder NVDA bleiben externe Grenzen.
Production ist nicht freigegeben.

## QA-Runde 9: einheitliches 32-Pixel-Ladesymbol

Der lokale Kandidat pinnt `public-app-essentials/v1.1.3` unveränderlich auf
Shared-Commit `babe74a0e62e1a7f9095648195e54b322a837726`. Schema, app-eigenes
Theme, Bootstrap, Runtime und Verifier bilden weiterhin den atomaren
sechsteiligen Verbraucher-Lock; die enge Vendorregel `* text eol=lf` bleibt
unverändert. Die App behält ihren bestehenden dauerhaften Datenschutzlink und
ändert weder Privacy-/Share-Verhalten noch Fachfunktion.

### Umsetzung und lokale Evidenz

- Das intrinsische Loader-Markup setzt `width="32"` und `height="32"`, sodass
  das App-Symbol bereits vor dem ersten Stylesheet exakt 32×32 Pixel belegt.
- Der gemeinsame v1.1.3-Vertrag begrenzt Breite, Höhe, Maximalbreite und
  Maximalhöhe anschließend ebenfalls exakt auf 32 Pixel. Es gibt keine
  app-eigene Größen-Gegenregel.
- Der vendorte Essentials-Verifier, der Public-App-Shell-Verifier, der
  sechsteilige Lock und die festen Shared-Hashes bestehen unverändert.
- Ein frischer lokaler Windows-Checkout mit `core.autocrlf=true` bestand beide
  vendorten Verifier; sämtliche Dateien im Essentials-v1-Verzeichnis lagen
  dort weiterhin als `i/lf w/lf` mit `text eol=lf` vor.
- Unit: 33/33 bestanden. Pages-Build und nachgelagertes Built-HTML-/Vendor-Gate
  bestanden; das gebaute HTML enthält weiterhin beide Essentials-CSS-Dateien
  und den Bootstrap als getrennte relative Same-Origin-Ressourcen.
- Fokussiertes Loader-/Ready-/Privacy-/Share-/CSP-/MIME-Gate: 12/12 in
  Chromium, Firefox und WebKit bestanden. Das Symbol misst bei 1440×900,
  390×844 und 360×800 mit 200 Prozent Textzoom jeweils exakt 32×32 Pixel;
  `max-width` und `max-height` sind ebenfalls 32 Pixel.
- Vollständige nicht-performancekritische Drei-Engine-Matrix für App,
  Essentials, Responsive/Reflow, Settings, Shell und Touch: 85 anwendbare
  Fälle bestanden, 23 planmäßige Engine-/CDP-Skips, 0 Fehler. Gameplay,
  mobile Haltezone, Pointer-Cancel, Pause/App-Resume, Offline, DE/EN samt
  Persistenz, Axe A/AA, Fokus, 44-Pixel-Ziele und Reduced Motion blieben grün.

### Isoliertes Performancegate

Ein erster Lauf während nachgewiesener paralleler owner-eigener Node- und
Browsermatrizen fiel unter vierfacher CPU-Drosselung auf 19,13 FPS. Der eigene
Testprozess war bereits beendet, Port 4317 frei und die verbleibenden
Prozessbäume gehörten zu anderen laufenden Tasks; dieser Wert wird deshalb als
Hostlastbefund und nicht als Produktregression geführt. Kein Budget wurde
gesenkt.

Im anschließend freien exklusiven Messfenster bestand derselbe unveränderte
Stand alle drei Profile:

| Profil | Ø FPS | Frame p95 | Input p95 | verlorene Simulation |
|---|---:|---:|---:|---:|
| normal | 49,92 | 33,4 ms | 36,0 ms | 0 ms |
| naturnaher Mond plus Hut | 47,70 | 33,4 ms | 30,2 ms | 0 ms |
| CPU vierfach gedrosselt | 43,01 | 33,4 ms | 32,1 ms | 0 ms |

Ein erneuter paralleler lokaler Performance-Gesamtlauf blieb während neu
gestarteter Browserkampagnen bewusst ausgesetzt. Die beiden SHA-genauen
Source-CI-Läufe bestanden dennoch das vollständige repositoryeigene Browsergate;
die bereits bestandene isolierte Messung gehört exakt zum veröffentlichten
v1.1.3-Code. Kein Budget wurde verändert.

### Externe DEV-Veröffentlichung

- Source `f41963731f77ca324292e1cb3dd769afebfdba62` steht auf Feature und
  `main`; die CI-Runs `30801758378` und `30801758952` sind vollständig grün.
- Das ausschließlich daraus gebaute Pages-Artefakt
  `321ef0dc7ba3b44d04d8b0ef5b2ba6b364b31c49` wurde im erfolgreichen
  Pages-Run `30802288647` veröffentlicht.
- Cookie-loser Direktaufruf und Health liefern HTTPS 200. Health antwortet
  exakt mit `status: ok`, `app: gravity-loop`, `environment: dev` und
  `application/json; charset=utf-8`.
- App-Icon, beide Essentials-CSS-Dateien, Bootstrap und Runtime liefern 200 mit
  korrektem SVG-, CSS- beziehungsweise JavaScript-MIME. Der ausgelieferte
  Icon-SHA-256
  `ce6d0540c08726e702dec86d5e2cf7b85c4fabf8f7ae07a0fc93a4faed08001c`
  ist bytegleich zur Source.
- Die frische öffentliche Drei-Engine-Funktionsmatrix bestand 85 anwendbare
  Fälle bei 23 planmäßigen Engine-/CDP-Skips, 0 Fehlern und 0 Retries.
  Loader/Ready, Privacy, Share, strikte Self-only-CSP, MIME, DE/EN samt Reload,
  Gameplay, Settings, Axe A/AA, Reduced Motion, Offline/App-Resume,
  Touch/Pointer sowie 360×800 bei 200 Prozent blieben grün.
- Sichtbare Browserabnahme: Loader-CSS exakt 32×32 Pixel; genau eine H1;
  Startaktion bei 390×844 mit 43,3 Pixel und bei 360×800 mit 26,2 Pixel
  Sicherheitsrand; `scrollWidth = clientWidth` bei 390, 360 und Desktop;
  DE/EN-Persistenz und 0 Browserwarnungen/-fehler.
- Portal-DEV liefert cookie-los per GET und HEAD weiterhin HTTP 302 auf exakt
  dieselbe unabhängige App-URL. Die Productionroute bleibt HTTP 404.
- Rollback bleibt Source `1bdecf63d9963ab8c580735397a60603e979925c`
  mit Pages-Artefakt `8d99c8495f20976536e76fb5ce731308a73d6e24`.

Reale Android-/iOS-Hardware, Android WebView sowie manuelle Tests mit TalkBack,
VoiceOver oder NVDA bleiben externe Grenzen. Production blieb unverändert und
ist nicht freigegeben.

## QA-Runde 10: stabiles Shell-Icon während des Komponentenstarts

Gravity Loop pinnt `public-app-essentials/v1.1.5` unveränderlich auf
Shared-Commit `2942132ad3bf6cf39edc9f52ed918de6a230be23`. Der sechsteilige
Verbraucher-Lock wurde atomar erneuert; `public-app-shell/v2.0.3`, der
32×32-Pixel-Essentials-Loader sowie Fachfunktion, Privacy, Share, Routen und
Productiongrenze blieben unverändert.

### Umsetzung und Contract-Evidenz

- Das app-eigene `svg[slot="app-icon"]` deklariert intrinsisch exakt
  `width="38" height="38"`. Die frühere Landscape-Breite in `rem` entfällt,
  damit Textzoom die feste Shell-Geometrie nicht überschreiben kann.
- Ein neuer fail-closed Browserfall blockiert zuerst den tatsächlich
  ausgelieferten Shell-registrierenden Moduleinstieg und danach das
  Komponenten-CSS. Er belegt: vor dem Upgrade verborgen und höchstens 38×38,
  nach Upgrade bei verzögertem CSS sichtbar und höchstens 38×38, nach
  erfolgreicher Same-Origin-CSS-Response exakt 38×38. Das Gate erkennt sowohl
  die lokale Quellmodul- als auch die gebündelte Pages-Entry-URL.
- Shell- und Essentials-Verifier sowie `pnpm build` und `pnpm build:pages`
  bestanden. Ein echter temporärer Windows-Worktree mit
  `core.autocrlf=true` bestand beide Verifier; alle Essentials-Dateien lagen
  als `i/lf w/lf` unter `* text eol=lf` vor.
- Das fokussierte lokale Gate bestand in Chromium, Firefox und WebKit. Die
  Viewports 390×844, 360×800 bei 200 Prozent sowie Landscape bei 200 Prozent
  blieben ohne horizontalen Überlauf; der getrennte Loader blieb 32×32.
- Der finale SHA-genaue `main`-CI-Lauf `30817484302` bestand Verifier, 33
  Unit-Tests, Build und die bestehende Browsermatrix mit 90 anwendbaren Fällen,
  29 planmäßigen Skips und einem bestandenen WebKit-Retry. Das isolierte
  Performancegate meldete 54,76 / 55,13 / 50,77 FPS, Input-p95
  21,2 / 39,8 / 12,0 ms und jeweils 0 ms verlorene Simulation.
- Ein zuvor parallel zum Feature-CI gestarteter `main`-Lauf überschritt nur im
  Rich-Visuals-Profil das Input-p95 knapp (47,6 beziehungsweise 54,5 ms),
  während FPS, Frame-p95 und Simulation bestanden. Der unveränderte isolierte
  Retry war grün; kein Performancebudget wurde gesenkt.

### Externe DEV-Veröffentlichung

- Source `15b090d494d491ae8b977d2dc0035f7844847bb0` steht auf Feature und
  `main`. Das Pages-Artefakt
  `d9ce4798073010f8ae3a4cf3be83e7fef75ce1fc` wurde im erfolgreichen Run
  `30817964986` veröffentlicht.
- Direkt-App und Health liefern HTTPS 200. Health antwortet exakt mit
  `status: ok`, `app: gravity-loop`, `environment: dev`. Das ausgelieferte
  Essentials-CSS liefert `text/css; charset=utf-8` und den gelockten SHA-256
  `45639329f6a94093354fd7d416a636d4e0da4d751b9fa97e2c75c84c7c6c4ade`.
- Die frische externe Drei-Engine-Contract-Matrix bestand vier anwendbare
  Fälle bei zwei planmäßigen Layout-Skips. Alle drei Iconphasen, Loadergröße
  und die mobile/200-Prozent-Reflowgrenze blieben grün.
- Die unveränderte Portalroute liefert cookie-los per GET und HEAD HTTP 302
  auf exakt die unabhängige App-URL. Die Productionroute bleibt HTTP 404.
- Rollback ist Source `f41963731f77ca324292e1cb3dd769afebfdba62`
  mit Pages-Artefakt `321ef0dc7ba3b44d04d8b0ef5b2ba6b364b31c49`.

Production blieb unverändert und ist nicht freigegeben.
