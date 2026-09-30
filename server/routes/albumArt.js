// /api/art/:artId serves stored album art.
import express from 'express';
import { notFound } from '../errors.js';

export function albumArtRoutes(store) {
  const router = express.Router();

  router.get('/:artId', (req, res) => {
    const image = store.albumArt.get(req.params.artId);
    if (!image) throw notFound('NOT FOUND');
    // A stored image never changes (a new image gets a new id), so browsers can cache it forever.
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(image.mime).send(Buffer.from(image.data));
  });

  return router;
}
