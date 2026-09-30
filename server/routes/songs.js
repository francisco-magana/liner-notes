// /api/songs, including each song's reflections.
import express from 'express';
import { parseArtInput } from '../artInput.js';

export function songRoutes(store) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const artChange = await parseArtInput(req.body?.art);
    res.status(201).json(store.songs.create(req.body, { artChange }));
  });

  router.patch('/:songId', async (req, res) => {
    const artChange = await parseArtInput(req.body?.art);
    res.json(store.songs.update(req.params.songId, req.body, { artChange }));
  });

  router.delete('/:songId', (req, res) => {
    store.songs.remove(req.params.songId);
    res.status(204).end();
  });

  // Reflections. Each returns the updated song.
  router.post('/:songId/reflections', (req, res) => {
    res.status(201).json(store.reflections.add(req.params.songId, req.body ?? {}));
  });

  router.patch('/:songId/reflections/:reflectionId', (req, res) => {
    res.json(store.reflections.update(req.params.songId, req.params.reflectionId, req.body ?? {}));
  });

  router.delete('/:songId/reflections/:reflectionId', (req, res) => {
    res.json(store.reflections.remove(req.params.songId, req.params.reflectionId));
  });

  return router;
}
