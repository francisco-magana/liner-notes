// The `settings` table: key/value pairs for the theme and Spotify credentials.
import { runInTransaction } from '../database.js';
import { cleanText } from './validation.js';

const THEMES = ['light', 'dark'];
const MAX_SETTING_LENGTH = 200;

/** API field name → key in the settings table. */
const STORAGE_KEYS = {
  theme: 'theme',
  clientId: 'spotifyClientId',
  clientSecret: 'spotifySecret'
};

/** '' means "follow the system theme". */
const cleanTheme = value => (THEMES.includes(value) ? value : '');

export function createSettingsStore(db) {
  const queries = {
    all: db.prepare('SELECT key, value FROM settings'),
    save: db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  };

  /** `{ theme, clientId, clientSecret }` */
  function get() {
    const stored = Object.fromEntries(queries.all.all().map(row => [row.key, row.value]));
    return {
      theme: cleanTheme(stored[STORAGE_KEYS.theme]),
      clientId: stored[STORAGE_KEYS.clientId] || '',
      clientSecret: stored[STORAGE_KEYS.clientSecret] || ''
    };
  }

  /** Saves the fields present in `input`; others keep their value. Returns all settings. */
  function save(input) {
    runInTransaction(db, () => {
      for (const [field, storageKey] of Object.entries(STORAGE_KEYS)) {
        if (!(field in input)) continue;
        const value = cleanText(input[field], MAX_SETTING_LENGTH);
        queries.save.run(storageKey, field === 'theme' ? cleanTheme(value) : value);
      }
    });
    return get();
  }

  return { get, save };
}
