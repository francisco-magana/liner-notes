import { useState } from 'preact/hooks';
import { api } from '../api.js';

/**
 * The song library plus every request that changes it. Each mutation keeps the
 * local list in sync with the server's copy. Failures are thrown to the caller,
 * except for `updateSong`, which is optimistic and reports through `onError`.
 */
export function useSongs({ onError }) {
  const [songs, setSongs] = useState([]);

  const replaceSong = song => setSongs(list => list.map(existing => (existing.id === song.id ? song : existing)));

  async function reloadSongs() {
    try {
      const { songs: freshSongs } = await api.bootstrap();
      setSongs(freshSongs);
    } catch {
      // Keep what we have; the error was already reported.
    }
  }

  /** Applies the change on screen right away, then saves it and takes the server's copy. */
  async function updateSong(songId, changes) {
    setSongs(list => list.map(song => (song.id === songId ? { ...song, ...changes } : song)));
    try {
      replaceSong(await api.updateSong(songId, changes));
    } catch (error) {
      onError(error);
      reloadSongs();
    }
  }

  /** Creates a song, or replaces an existing song's details when `songId` is given. */
  async function saveSong(songId, fields) {
    if (songId) {
      const song = await api.updateSong(songId, fields);
      replaceSong(song);
      return song;
    }
    const song = await api.createSong(fields);
    setSongs(list => [song, ...list]);
    return song;
  }

  async function deleteSong(songId) {
    await api.deleteSong(songId);
    setSongs(list => list.filter(song => song.id !== songId));
  }

  /** Adds a reflection, or edits an existing one's text when `reflectionId` is given. */
  async function saveReflection(songId, reflectionId, { text, date }) {
    const song = reflectionId
      ? await api.updateReflection(songId, reflectionId, { text })
      : await api.addReflection(songId, { text, date });
    replaceSong(song);
  }

  async function deleteReflection(songId, reflectionId) {
    replaceSong(await api.deleteReflection(songId, reflectionId));
  }

  /** Imports every track of a Spotify album. Resolves to `{ added, album }`. */
  async function importAlbum(request) {
    const result = await api.importAlbum(request);
    setSongs(list => [...result.added, ...list]);
    return result;
  }

  return { songs, setSongs, updateSong, saveSong, deleteSong, saveReflection, deleteReflection, importAlbum };
}
