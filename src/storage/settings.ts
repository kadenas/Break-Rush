export type ThemeVariant = 'default' | 'colorblind';

export interface SettingsData {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  theme: ThemeVariant;
  useLaneMode: boolean;
}

const STORAGE_KEY = 'break-rush-settings-v1';

const DEFAULT_SETTINGS: SettingsData = {
  soundEnabled: true,
  hapticsEnabled: true,
  theme: 'default',
  useLaneMode: false
};

export class SettingsStore {
  private data: SettingsData = { ...DEFAULT_SETTINGS };

  constructor() {
    this.load();
  }

  get(): SettingsData {
    return this.data;
  }

  update(partial: Partial<SettingsData>): SettingsData {
    this.data = { ...this.data, ...partial };
    this.persist();
    return this.data;
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SettingsData;
        this.data = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('No se pudieron cargar las preferencias', error);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.warn('No se pudieron guardar las preferencias', error);
    }
  }
}
