import { useState } from 'preact/hooks';
import { api } from '../api.js';

const DEFAULT_SETTINGS = { theme: '', clientId: '', clientSecret: '' };

/** App settings. Changes show immediately and are then saved; failures go to `onError`. */
export function useSettings({ onError }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  async function saveSettings(changes) {
    setSettings(current => ({ ...current, ...changes }));
    try {
      setSettings(await api.saveSettings(changes));
    } catch (error) {
      onError(error);
    }
  }

  return { settings, setSettings, saveSettings };
}
