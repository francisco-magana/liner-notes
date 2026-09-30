import { randomUUID } from 'node:crypto';
import { transaction } from './db.js';
import { artUrl } from './art.js';
import { badRequest, notFound } from './errors.js';

const newId = () => randomUUID().replace(/-/g, '').slice(0, 12);

const str = (v, max = 300) => (v == null ? '' : String(v)).trim().slice(0, max);

/** Validates song fields. With `partial`, only keys present in `input` are returned. */
function normalizeSong(input, { partial }) {
  if (!input || typeof input !== 'object') throw badRequest('INVALID SONG');
  const out = {};
  const has = k => !partial || k in input;

  for (const k of ['title', 'artist']) {
    if (!has(k)) continue;
    out[k] = str(input[k]);
    if (!out[k]) throw badRequest(`${k.toUpperCase()} IS REQUIRED`);
  }
  if (has('album')) out.album = str(input.album);
  if (has('genre')) out.genre = str(input.genre, 100);
  if (has('year')) out.year = str(input.year, 10);
  if (has('firstHeard')) out.firstHeard = str(input.firstHeard, 10);
  if (has('rating')) {
    const r = Math.round(Number(input.rating) || 0);
    out.rating = Math.min(5, Math.max(0, r));
  }
  if (has('moods')) {
    const list = Array.isArray(input.moods) ? input.moods : [];
    out.moods = [...new Set(list.map(m => str(m, 40).toUpperCase()).filter(Boolean))];
  }
  if (has('lyrics')) out.lyrics = (input.lyrics == null ? '' : String(input.lyrics)).replace(/\s+$/, '').slice(0, 100_000);
  if (has('notes')) {
    const notes = {};
    const src = input.notes && typeof input.notes === 'object' ? input.notes : {};
    for (const [k, v] of Object.entries(src)) {
      const text = str(v, 5000);
      if (/^\d+$/.test(k) && text) notes[k] = text;
    }
    out.notes = notes;
  }
  return out;
}

const COLUMNS = {
  title: 'title', artist: 'artist', album: 'album', year: 'year', genre: 'genre', rating: 'rating',
  moods: 'moods', lyrics: 'lyrics', notes: 'notes', firstHeard: 'first_heard'
};
const toColumn = (k, v) => (k === 'moods' || k === 'notes' ? JSON.stringify(v) : v);

export function createStore(db) {
  const q = {
    songs: db.prepare('SELECT * FROM songs ORDER BY created DESC'),
    song: db.prepare('SELECT * FROM songs WHERE id = ?'),
    songKeys: db.prepare('SELECT lower(title) AS t, lower(artist) AS a FROM songs'),
    refls: db.prepare('SELECT * FROM reflections ORDER BY date'),
    reflsFor: db.prepare('SELECT * FROM reflections WHERE song_id = ? ORDER BY date'),
    refl: db.prepare('SELECT * FROM reflections WHERE id = ? AND song_id = ?'),
    insertSong: db.prepare(`INSERT INTO songs (id, title, artist, album, year, genre, rating, moods, lyrics, notes, art_id, first_heard, created)
      VALUES (:id, :title, :artist, :album, :year, :genre, :rating, :moods, :lyrics, :notes, :art_id, :first_heard, :created)`),
    deleteSong: db.prepare('DELETE FROM songs WHERE id = ?'),
    insertRefl: db.prepare('INSERT INTO reflections (id, song_id, date, text) VALUES (?, ?, ?, ?)'),
    updateRefl: db.prepare('UPDATE reflections SET text = ? WHERE id = ?'),
    deleteRefl: db.prepare('DELETE FROM reflections WHERE id = ?'),
    art: db.prepare('SELECT mime, data FROM art WHERE id = ?'),
    artExists: db.prepare('SELECT 1 FROM art WHERE id = ?'),
    insertArt: db.prepare('INSERT INTO art (id, mime, data) VALUES (?, ?, ?)'),
    pruneArt: db.prepare('DELETE FROM art WHERE id NOT IN (SELECT art_id FROM songs WHERE art_id IS NOT NULL)'),
    settings: db.prepare('SELECT key, value FROM settings'),
    setSetting: db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  };

  const toRefl = r => ({ id: r.id, date: r.date, text: r.text });
  const toSong = (r, refls) => ({
    id: r.id, title: r.title, artist: r.artist, album: r.album, year: r.year, genre: r.genre,
    rating: r.rating, moods: JSON.parse(r.moods), lyrics: r.lyrics, notes: JSON.parse(r.notes),
    art: artUrl(r.art_id), firstHeard: r.first_heard, created: r.created, reflections: refls.map(toRefl)
  });

  function getSong(id) {
    const row = q.song.get(id);
    if (!row) throw notFound('SONG NOT FOUND');
    return toSong(row, q.reflsFor.all(id));
  }

  /** Applies a resolved art value (see resolveArt) and returns the art_id to store. */
  function applyArt(art, current = null) {
    if (art.keep) return current;
    if (art.none) return null;
    if (art.ref) {
      if (!q.artExists.get(art.ref)) throw badRequest('ALBUM ART NOT FOUND');
      return art.ref;
    }
    return insertArt(art.blob);
  }

  function insertArt({ mime, data }) {
    const id = newId();
    q.insertArt.run(id, mime, data);
    return id;
  }

  function insertSong(fields, artId, created = new Date().toISOString()) {
    const id = newId();
    q.insertSong.run({
      id, title: fields.title, artist: fields.artist, album: fields.album ?? '', year: fields.year ?? '',
      genre: fields.genre ?? '', rating: fields.rating ?? 0, moods: JSON.stringify(fields.moods ?? []),
      lyrics: fields.lyrics ?? '', notes: JSON.stringify(fields.notes ?? {}), art_id: artId,
      first_heard: fields.firstHeard ?? '', created
    });
    return id;
  }

  return {
    listSongs() {
      const bySong = new Map();
      for (const r of q.refls.all()) {
        if (!bySong.has(r.song_id)) bySong.set(r.song_id, []);
        bySong.get(r.song_id).push(r);
      }
      return q.songs.all().map(r => toSong(r, bySong.get(r.id) || []));
    },

    getSong,

    createSong(input, art) {
      const fields = normalizeSong(input, { partial: false });
      const id = transaction(db, () => insertSong(fields, applyArt(art)));
      return getSong(id);
    },

    updateSong(id, input, art) {
      const fields = normalizeSong(input, { partial: true });
      transaction(db, () => {
        const row = q.song.get(id);
        if (!row) throw notFound('SONG NOT FOUND');
        const sets = [], params = [];
        for (const [k, v] of Object.entries(fields)) {
          sets.push(`${COLUMNS[k]} = ?`);
          params.push(toColumn(k, v));
        }
        const artId = applyArt(art, row.art_id);
        if (artId !== row.art_id) {
          sets.push('art_id = ?');
          params.push(artId);
        }
        if (sets.length) db.prepare(`UPDATE songs SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
        q.pruneArt.run();
      });
      return getSong(id);
    },

    deleteSong(id) {
      transaction(db, () => {
        if (!q.deleteSong.run(id).changes) throw notFound('SONG NOT FOUND');
        q.pruneArt.run();
      });
    },

    /** Inserts many songs sharing one piece of art, skipping title+artist pairs already in the library. */
    importSongs(list, artBlob) {
      return transaction(db, () => {
        const seen = new Set(q.songKeys.all().map(r => r.t + '§' + r.a));
        const fresh = list
          .map(s => normalizeSong(s, { partial: false }))
          .filter(s => {
            const k = (s.title + '§' + s.artist).toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        if (!fresh.length) return [];
        const artId = artBlob ? insertArt(artBlob) : null;
        const now = Date.now();
        return fresh.map((s, i) => insertSong(s, artId, new Date(now - i * 1000).toISOString()));
      }).map(getSong);
    },

    /** Used by the seed script to backdate demo songs. */
    setCreated(id, created) {
      db.prepare('UPDATE songs SET created = ? WHERE id = ?').run(created, id);
    },

    addReflection(songId, { text, date }) {
      getSong(songId);
      const body = str(text, 100_000);
      if (!body) throw badRequest('WRITE SOMETHING FIRST');
      const when = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : new Date().toISOString();
      q.insertRefl.run(newId(), songId, when, body);
      return getSong(songId);
    },

    updateReflection(songId, reflId, { text }) {
      if (!q.refl.get(reflId, songId)) throw notFound('REFLECTION NOT FOUND');
      const body = str(text, 100_000);
      if (!body) throw badRequest('WRITE SOMETHING FIRST');
      q.updateRefl.run(body, reflId);
      return getSong(songId);
    },

    deleteReflection(songId, reflId) {
      if (!q.refl.get(reflId, songId)) throw notFound('REFLECTION NOT FOUND');
      q.deleteRefl.run(reflId);
      return getSong(songId);
    },

    getArt(id) {
      return q.art.get(id) || null;
    },

    getSettings() {
      const raw = Object.fromEntries(q.settings.all().map(r => [r.key, r.value]));
      return {
        theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : '',
        clientId: raw.spotifyClientId || '',
        clientSecret: raw.spotifySecret || ''
      };
    },

    saveSettings(input) {
      const map = { theme: 'theme', clientId: 'spotifyClientId', clientSecret: 'spotifySecret' };
      transaction(db, () => {
        for (const [k, key] of Object.entries(map)) {
          if (!(k in input)) continue;
          let v = str(input[k], 200);
          if (k === 'theme' && v !== 'light' && v !== 'dark') v = '';
          q.setSetting.run(key, v);
        }
      });
      return this.getSettings();
    }
  };
}
