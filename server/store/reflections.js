// The `reflections` table. Every change returns the updated song, so the client can
// replace its copy in one go.
import { newId } from '../database.js';
import { notFound } from '../errors.js';
import { toIsoDate, validateReflectionText } from './validation.js';

export function createReflectionStore(db, songs) {
  const queries = {
    find: db.prepare('SELECT 1 FROM reflections WHERE id = ? AND song_id = ?'),
    insert: db.prepare('INSERT INTO reflections (id, song_id, date, text) VALUES (?, ?, ?, ?)'),
    updateText: db.prepare('UPDATE reflections SET text = ? WHERE id = ?'),
    delete: db.prepare('DELETE FROM reflections WHERE id = ?')
  };

  function assertExists(songId, reflectionId) {
    if (!queries.find.get(reflectionId, songId)) throw notFound('REFLECTION NOT FOUND');
  }

  /** Adds a reflection. `date` defaults to now. */
  function add(songId, { text, date }) {
    songs.get(songId); // Throws when the song does not exist.
    queries.insert.run(newId(), songId, toIsoDate(date), validateReflectionText(text));
    return songs.get(songId);
  }

  /** Changes a reflection's text; its date stays the same. */
  function update(songId, reflectionId, { text }) {
    assertExists(songId, reflectionId);
    queries.updateText.run(validateReflectionText(text), reflectionId);
    return songs.get(songId);
  }

  function remove(songId, reflectionId) {
    assertExists(songId, reflectionId);
    queries.delete.run(reflectionId);
    return songs.get(songId);
  }

  return { add, update, remove };
}
