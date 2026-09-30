// The `songs` table. Every function that returns a song returns the full API shape,
// reflections included.
import { KEEP_ART, artUrl } from '../artInput.js';
import { newId, runInTransaction } from '../database.js';
import { notFound } from '../errors.js';
import { validateSong } from './validation.js';

/** API field name → column name, for the fields a client can update. */
const COLUMNS = {
  title: 'title',
  artist: 'artist',
  album: 'album',
  year: 'year',
  genre: 'genre',
  rating: 'rating',
  moods: 'moods',
  lyrics: 'lyrics',
  notes: 'notes',
  firstHeard: 'first_heard'
};

/** Fields stored as JSON text. */
const JSON_FIELDS = new Set(['moods', 'notes']);

const toColumnValue = (field, value) => (JSON_FIELDS.has(field) ? JSON.stringify(value) : value);

const toReflection = row => ({ id: row.id, date: row.date, text: row.text });

function toSong(row, reflectionRows) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    year: row.year,
    genre: row.genre,
    rating: row.rating,
    moods: JSON.parse(row.moods),
    lyrics: row.lyrics,
    notes: JSON.parse(row.notes),
    art: artUrl(row.art_id),
    firstHeard: row.first_heard,
    created: row.created,
    reflections: reflectionRows.map(toReflection)
  };
}

/** Used to spot duplicates: two songs match when title and artist match, ignoring case. */
const duplicateKey = (title, artist) => `${title}§${artist}`.toLowerCase();

export function createSongStore(db, albumArt) {
  const queries = {
    all: db.prepare('SELECT * FROM songs ORDER BY created DESC'),
    byId: db.prepare('SELECT * FROM songs WHERE id = ?'),
    titlesAndArtists: db.prepare('SELECT title, artist FROM songs'),
    allReflections: db.prepare('SELECT * FROM reflections ORDER BY date'),
    reflectionsOf: db.prepare('SELECT * FROM reflections WHERE song_id = ? ORDER BY date'),
    insert: db.prepare(`
      INSERT INTO songs (id, title, artist, album, year, genre, rating, moods, lyrics, notes, art_id, first_heard, created)
      VALUES (:id, :title, :artist, :album, :year, :genre, :rating, :moods, :lyrics, :notes, :art_id, :first_heard, :created)`),
    delete: db.prepare('DELETE FROM songs WHERE id = ?')
  };

  function findRow(songId) {
    const row = queries.byId.get(songId);
    if (!row) throw notFound('SONG NOT FOUND');
    return row;
  }

  /** Every song, newest first. */
  function list() {
    const reflectionsBySong = Map.groupBy(queries.allReflections.all(), reflection => reflection.song_id);
    return queries.all.all().map(row => toSong(row, reflectionsBySong.get(row.id) || []));
  }

  function get(songId) {
    return toSong(findRow(songId), queries.reflectionsOf.all(songId));
  }

  /** Inserts already-validated fields and returns the new song's id. */
  function insertRow(fields, artId, created = new Date().toISOString()) {
    const songId = newId();
    queries.insert.run({
      id: songId,
      title: fields.title,
      artist: fields.artist,
      album: fields.album ?? '',
      year: fields.year ?? '',
      genre: fields.genre ?? '',
      rating: fields.rating ?? 0,
      moods: JSON.stringify(fields.moods ?? []),
      lyrics: fields.lyrics ?? '',
      notes: JSON.stringify(fields.notes ?? {}),
      art_id: artId,
      first_heard: fields.firstHeard ?? '',
      created
    });
    return songId;
  }

  /** Adds a song. `created` backdates it (used by the demo library). */
  function create(input, { artChange = KEEP_ART, created } = {}) {
    const fields = validateSong(input);
    const songId = runInTransaction(db, () => insertRow(fields, albumArt.applyChange(artChange), created));
    return get(songId);
  }

  /** Changes only the fields present in `input`. */
  function update(songId, input, { artChange = KEEP_ART } = {}) {
    const fields = validateSong(input, { partial: true });
    runInTransaction(db, () => {
      const row = findRow(songId);
      const changes = Object.entries(fields).map(([field, value]) => [COLUMNS[field], toColumnValue(field, value)]);
      const artId = albumArt.applyChange(artChange, row.art_id);
      if (artId !== row.art_id) changes.push(['art_id', artId]);

      if (changes.length) {
        const assignments = changes.map(([column]) => `${column} = ?`).join(', ');
        db.prepare(`UPDATE songs SET ${assignments} WHERE id = ?`).run(...changes.map(([, value]) => value), songId);
      }
      albumArt.deleteUnused();
    });
    return get(songId);
  }

  /** Deletes a song; its reflections go with it (ON DELETE CASCADE). */
  function remove(songId) {
    runInTransaction(db, () => {
      if (!queries.delete.run(songId).changes) throw notFound('SONG NOT FOUND');
      albumArt.deleteUnused();
    });
  }

  /**
   * Adds many songs that share one image (an album import), skipping any whose title
   * and artist are already in the library. Returns the added songs.
   */
  function importMany(inputs, image) {
    const addedIds = runInTransaction(db, () => {
      const existing = new Set(queries.titlesAndArtists.all().map(row => duplicateKey(row.title, row.artist)));
      const newSongs = inputs.map(input => validateSong(input)).filter(song => {
        const key = duplicateKey(song.title, song.artist);
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });
      if (!newSongs.length) return [];

      const artId = image ? albumArt.insert(image) : null;
      // One second apart, so the "recent" sort keeps the album's track order.
      const now = Date.now();
      return newSongs.map((song, index) => insertRow(song, artId, new Date(now - index * 1000).toISOString()));
    });
    return addedIds.map(get);
  }

  return { list, get, create, update, remove, importMany };
}
