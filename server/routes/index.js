// Everything under /api.
import express from 'express';
import { albumArtRoutes } from './albumArt.js';
import { settingsRoutes } from './settings.js';
import { songRoutes } from './songs.js';
import { spotifyRoutes } from './spotify.js';

export function apiRoutes(store, spotify) {
  const router = express.Router();

  // Everything the app needs on first load.
  router.get('/bootstrap', (req, res) => {
    res.json({ songs: store.songs.list(), settings: store.settings.get() });
  });

  router.use('/settings', settingsRoutes(store));
  router.use('/songs', songRoutes(store));
  router.use('/art', albumArtRoutes(store));
  router.use('/spotify', spotifyRoutes(store, spotify));

  router.use((req, res) => res.status(404).json({ error: 'NOT FOUND' }));

  return router;
}
