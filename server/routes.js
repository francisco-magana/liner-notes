import express from 'express';
import { resolveArt, fetchImage } from './art.js';
import { pickImage } from './spotify.js';
import { badRequest, notFound } from './errors.js';

export function apiRouter(store, spotify) {
  const r = express.Router();

  r.get('/bootstrap', (req, res) => {
    res.json({ songs: store.listSongs(), settings: store.getSettings() });
  });

  // Settings
  r.get('/settings', (req, res) => res.json(store.getSettings()));
  r.put('/settings', (req, res) => res.json(store.saveSettings(req.body || {})));

  // Songs
  r.post('/songs', async (req, res) => {
    const art = await resolveArt(req.body?.art);
    res.status(201).json(store.createSong(req.body, art));
  });
  r.patch('/songs/:id', async (req, res) => {
    const art = await resolveArt(req.body?.art);
    res.json(store.updateSong(req.params.id, req.body, art));
  });
  r.delete('/songs/:id', (req, res) => {
    store.deleteSong(req.params.id);
    res.status(204).end();
  });

  // Reflections (each returns the updated song)
  r.post('/songs/:id/reflections', (req, res) => {
    res.status(201).json(store.addReflection(req.params.id, req.body || {}));
  });
  r.patch('/songs/:id/reflections/:rid', (req, res) => {
    res.json(store.updateReflection(req.params.id, req.params.rid, req.body || {}));
  });
  r.delete('/songs/:id/reflections/:rid', (req, res) => {
    res.json(store.deleteReflection(req.params.id, req.params.rid));
  });

  // Album art (content-addressed by id, so it never changes)
  r.get('/art/:id', (req, res) => {
    const art = store.getArt(req.params.id);
    if (!art) throw notFound('NOT FOUND');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(art.mime).send(Buffer.from(art.data));
  });

  // Spotify
  r.post('/spotify/test', async (req, res) => {
    const { clientId, clientSecret } = req.body || {};
    await spotify.test(String(clientId || '').trim(), String(clientSecret || '').trim());
    res.json({ ok: true });
  });
  r.get('/spotify/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) throw badRequest('TYPE SOMETHING TO SEARCH');
    res.json({ items: await spotify.search(String(req.query.type || 'track'), q) });
  });
  r.post('/spotify/import-album', async (req, res) => {
    const { albumId, genre = '', firstHeard = '' } = req.body || {};
    const { album, tracks } = await spotify.album(String(albumId || ''));
    const imgUrl = pickImage(album.images);
    const art = imgUrl ? await fetchImage(imgUrl).catch(() => null) : null;
    const year = (album.release_date || '').slice(0, 4);
    const added = store.importSongs(
      tracks.map(t => ({
        title: t.name,
        artist: (t.artists || []).map(a => a.name).join(', '),
        album: album.name, year, genre, firstHeard
      })),
      art
    );
    res.json({ album: album.name, added });
  });

  r.use((req, res) => res.status(404).json({ error: 'NOT FOUND' }));

  return r;
}
