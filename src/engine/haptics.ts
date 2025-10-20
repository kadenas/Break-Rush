export class HapticsManager {
  private enabled = false;

  toggle(enable: boolean): void {
    this.enabled = enable;
  }

  pulse(duration = 40): void {
    if (!this.enabled) {
      return;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }
}
