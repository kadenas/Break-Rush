export class Haptics {
  private enabled = true;

  setEnabled(flag: boolean): void {
    this.enabled = flag;
  }

  pulse(pattern: number | number[]): void {
    if (!this.enabled) return;
    if (!('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch (err) {
      console.warn('Vibration rejected', err);
    }
  }
}
