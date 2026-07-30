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
