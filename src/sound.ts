export class SoundController {
  private audioContext: AudioContext | null = null;

  constructor(private enabled: () => boolean) {}

  private tone(frequency: number, duration: number, volume: number): void {
    if (!this.enabled()) {
      return;
    }

    const AudioContextClass = window.AudioContext;
    this.audioContext ??= new AudioContextClass();
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  pickup(series: number): void {
    this.tone(510 + Math.min(8, series) * 34, 0.12, 0.08);
  }

  gameOver(): void {
    this.tone(165, 0.22, 0.065);
  }

  start(): void {
    this.tone(360, 0.08, 0.045);
  }
}
