# Produktbrief: Gravity Loop

## Produktversprechen

Eine Steuerung, die in zwei Sekunden verstanden wird, aber durch Rhythmus,
Risiko und Fluggefühl zu vielen kurzen Runden einlädt.

## Kernablauf

1. Direkt spielen, ohne Menüpflicht.
2. Halten krümmt die Flugbahn; Loslassen verändert den Kurs.
3. Lichtsterne sammeln; drei Sterne laden einen Schild gegen den nächsten
   Trabanten.
4. Kollision mit Sonne, Mond, Trabant oder Rand beendet die Runde.
5. Sofort neu starten und Bestwert lokal vergleichen.

## Spielvarianten im öffentlichen DEV

- `Leicht`, `Normal` und `Schwer` staffeln Starttempo, Zugkraft,
  Gefahrenrhythmus und Punkte transparent.
- Im Sonnenmodus wächst die Zugkraft spürbar zur Mitte hin. Wer zu lange hält,
  wird in die Sonne gezogen und verliert die Runde.
- Der Mondmodus verwendet eine schwächere, gleichmäßigere Zugkraft und ein
  ruhigeres Grundtempo. Ein Einschlag auf dem Mond beendet die Runde ebenfalls.
- Sonne und Mond können grafisch oder naturnah gewählt werden. Beide Varianten
  werden deterministisch und prozedural im Canvas gezeichnet; es gibt keine
  externen Fotos, Assets oder Trackingaufrufe.
- Die Skins `Mint`, `Feuer`, `Eis` und `Komet mit Hut` verändern ausschließlich
  die Darstellung. Hitbox und Physik bleiben identisch.
- Ein geladener Sternenschild fängt genau einen Trabanten ab. Sonne, Mond und
  Rand bleiben immer tödlich, damit Risiko und Kursentscheidung verständlich
  bleiben.
- Spielregelwechsel initialisieren die Runde fair neu; kosmetische Optionen
  verändern keine laufende Simulation.

## MVP

- flüssige, deterministisch testbare Physik;
- zuverlässige Pointer-, Touch-, Maus- und Tastatursteuerung;
- mobile Haltesteuerung auf der gesamten nicht-interaktiven App-Fläche, ohne
  Buttons, Links oder Einstellungen zu blockieren;
- klar erkennbare Flugbahnwirkung und unmittelbares Feedback;
- kurze Runden mit verständlicher Punktewertung;
- lokale Bestwerte und zurücksetzbare Einstellungen;
- Pause bei Tabwechsel und saubere Wiederaufnahme oder Neustart;
- skalierbare Darstellung für Smartphone und Desktop;
- eigene codebasierte Grafik und eigene Sounds oder bewusst lautloser Start;
- Tageschallenge nur, wenn sie ohne Konto reproduzierbar und fair funktioniert.

## Qualitätsziele

- Eingaben fühlen sich ohne merkliche Verzögerung an.
- Schwierigkeit steigt nachvollziehbar und nicht durch unlesbare Zufälle.
- Neustart ist eine schnelle, sichere Aktion.
- Hohe Bildwiederholrate wird auf repräsentativen Geräten gemessen.
- Animation, Blitz- und Farbeffekte respektieren reduzierte Bewegung und
  Kontrastanforderungen.
- Spielzustand, Fokus und Bedienelemente bleiben tastatur- und
  screenreaderverständlich, auch wenn das eigentliche Geschicklichkeitsspiel
  visuell bleibt.

## Nicht Teil des ersten Produkts

- Login, globale Rangliste, Echtgeld, Werbung oder manipulative Serienmechanik;
- kopierte Level, Figuren, Sounds oder Markenästhetik;
- Production-Veröffentlichung.

## Portalvertrag

Der Portal-Task erhält später App-Key, Titel, Kurzbeschreibung, DEV-URL,
Status, Vorschaubildrechte, Eingabemethoden und Healthcheck.

## Öffentliche App-Grundfunktionen

- Ein kleiner app-eigener Ladescreen schützt den ersten Aufbau vor einem
  übergroßen Icon oder einer kurz unformatierten Shell. Er endet nur, wenn
  Spielruntime, Eingaben und sichtbare Oberfläche tatsächlich bereit sind.
- Gravity Loop setzt keine Cookies und keine optionale Speicherung. Deshalb
  erscheint kein Schein-Einwilligungsdialog. Eine dauerhaft erreichbare
  Datenschutzinformation erklärt die notwendigen lokalen Speicherzwecke für
  Sprache und Spielfortschritt und verlinkt absolut auf den
  DEV-Datenschutztext.
- Teilen ist eine bewusste Nutzeraktion. Geteilt wird ein neutraler Link auf
  Gravity Loop in der aktiven Sprache; Bestwerte, Serien, Einstellungen und
  Testparameter bleiben lokal.
- Datumsauswahl und Ortssuche gehören nicht zum Spiel und sind im
  Essentials-Vertrag ausdrücklich deaktiviert.
