// The `art` table: album art images stored as BLOBs. Songs from the same album can share one row.
import { newId } from '../database.js';
import { badRequest } from '../errors.js';

export function createAlbumArtStore(db) {
  const queries = {
    get: db.prepare('SELECT mime, data FROM art WHERE id = ?'),
    exists: db.prepare('SELECT 1 FROM art WHERE id = ?'),
    insert: db.prepare('INSERT INTO art (id, mime, data) VALUES (?, ?, ?)'),
    deleteUnused: db.prepare('DELETE FROM art WHERE id NOT IN (SELECT art_id FROM songs WHERE art_id IS NOT NULL)')
  };

  /** `{ mime, data }` of a stored image, or null. */
  function get(artId) {
    return queries.get.get(artId) || null;
  }

  /** Stores an image `{ mime, data }` and returns its new id. */
  function insert({ mime, data }) {
    const artId = newId();
    queries.insert.run(artId, mime, data);
    return artId;
  }

  /** Applies an art change (see parseArtInput) and returns the art id the song should point at. */
  function applyChange(change, currentArtId = null) {
    switch (change.type) {
      case 'keep':
        return currentArtId;
      case 'remove':
        return null;
      case 'existing':
        if (!queries.exists.get(change.artId)) throw badRequest('ALBUM ART NOT FOUND');
        return change.artId;
      case 'new':
        return insert(change.image);
      default:
        throw new Error(`Unknown art change: ${change.type}`);
    }
  }

  /** Removes images that no song uses anymore. */
  function deleteUnused() {
    queries.deleteUnused.run();
  }

  return { get, insert, applyChange, deleteUnused };
}
