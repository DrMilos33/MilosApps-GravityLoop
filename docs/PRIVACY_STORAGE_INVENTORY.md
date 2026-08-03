# Datenschutz- und Endgerätezugriffs-Inventar

Stand: 2026-08-03. Gültig für das öffentliche Gravity-Loop-DEV ohne Login.
Dieses Inventar beschreibt den tatsächlich implementierten Zugriff; es ist
keine Rechtsberatung.

## Dauerhafte lokale Speicherung

| Schlüssel | Zweck | Lebensdauer | Erforderlichkeit | Übertragung |
| --- | --- | --- | --- | --- |
| `milosapps.gravity-loop.progress` | Bestwert, beste Sternenserie sowie ausdrücklich gewählte Spiel-, Darstellungs- und Komforteinstellungen erhalten | Bis zum ausdrücklichen lokalen Datenreset oder manuellen Löschen der Browserdaten | Für die zugesagte lokale Fortschritts- und Einstellungspersistenz erforderlich | Keine |
| `milosapps.gravity-loop.language` | Die ausdrücklich gewählte Sprache nach einem Reload beibehalten | Bis zum ausdrücklichen lokalen Datenreset oder manuellen Löschen der Browserdaten | Für die zugesagte vollständige DE-/EN-Persistenz erforderlich | Keine |

Beide Schlüssel sind im App-Manifest zweckweise als `strictlyNecessary=true`
deklariert. Gravity Loop enthält keine optionale Speicherung, Analyse,
Profilbildung, Werbung oder Cross-App-Kennung. Ist Web Storage gesperrt oder
beschädigt, bleibt das Spiel mit sicheren Standardwerten bedienbar; lediglich
die zugesagte Persistenz entfällt.

Der frühere Schlüssel `gravity-loop:progress` wird einmalig verlustfrei in
`milosapps.gravity-loop.progress` übernommen und nach erfolgreichem Schreiben
entfernt. Die alten Komfortschlüssel
`milosapps.gravity-loop.privacyNotice.v1` und
`milosapps.gravity-loop.essentialCookieInfo.v1` werden von der vendorten
v1.1-Runtime entfernt und nicht neu angelegt. Alle drei Altschlüssel sind keine
aktiven Speicherzwecke.

## Sitzungsbezogene Endgerätezugriffe

- Web Audio wird ausschließlich nach einer bewussten Spielinteraktion und nur
  bei aktivierter Klangeinstellung initialisiert. Es speichert nichts dauerhaft
  und sendet keine Daten.
- `navigator.share` beziehungsweise der Clipboard-Fallback wird nur nach der
  Teilen-Aktion ausgeführt. Der Payload enthält Titel, neutralen App-Text und
  die öffentliche URL ohne Query oder Hash; Bestwert, Sternenserie und lokale
  Einstellungen werden nie aufgenommen.
- Canvas, Pointer-, Touch-, Maus- und Tastaturereignisse bleiben im lokalen
  Laufzeitspeicher und werden nicht übertragen.
- Geladen werden nur statische Same-Origin-App-, Shell- und Essentials-Dateien.
  Gravity Loop führt keine eigene Fach-API-, Orts-, Datums-, Tracking- oder
  Telemetrieanfrage aus.

## Ausdrücklich nicht verwendet

- Cookies;
- `sessionStorage`, IndexedDB und Cache Storage;
- Service Worker oder Background Sync;
- WebSocket, EventSource, Beacon oder Analyse-SDK;
- externe Bilder, Schriftarten, Werbe- oder Trackingressourcen;
- gemeinsame App-Datenbank oder Shared-Runtimeimport.

Weil keine Cookies und ausschließlich die zwei nachgewiesenen notwendigen
Local-Storage-Zwecke verwendet werden, erscheint kein Einwilligungs- oder
Dismiss-Banner. Die sachliche Information bleibt jederzeit über den sichtbaren
Link „Datenschutz & lokale Speicherung“ beziehungsweise „Privacy & local
storage“ erreichbar.
