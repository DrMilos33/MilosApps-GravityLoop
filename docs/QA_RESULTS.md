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

## QA-Runde 2

Ausstehend.

## QA-Runde 3

Ausstehend.
