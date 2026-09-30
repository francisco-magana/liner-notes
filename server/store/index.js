// All database access, grouped by table:
//   store.songs, store.reflections, store.albumArt, store.settings
import { createAlbumArtStore } from './albumArt.js';
import { createReflectionStore } from './reflections.js';
import { createSettingsStore } from './settings.js';
import { createSongStore } from './songs.js';

export function createStore(db) {
  const albumArt = createAlbumArtStore(db);
  const songs = createSongStore(db, albumArt);
  const reflections = createReflectionStore(db, songs);
  const settings = createSettingsStore(db);
  return { songs, reflections, albumArt, settings };
}
