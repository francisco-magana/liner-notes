// /api/settings
import express from 'express';

export function settingsRoutes(store) {
  const router = express.Router();

  router.get('/', (req, res) => res.json(store.settings.get()));
  router.put('/', (req, res) => res.json(store.settings.save(req.body ?? {})));

  return router;
}
