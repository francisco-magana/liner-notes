// /api/spotify: credential check, search and whole-album import.
import express from 'express';
import { downloadImage } from '../artInput.js';
import { badRequest } from '../errors.js';
import { joinArtistNames, largestImageUrl } from '../spotify.js';

export function spotifyRoutes(store, spotify) {
  const router = express.Router();

  router.post('/test', async (req, res) => {
    const { clientId, clientSecret } = req.body ?? {};
    await spotify.testCredentials(String(clientId || '').trim(), String(clientSecret || '').trim());
    res.json({ ok: true });
  });

  router.get('/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query) throw badRequest('TYPE SOMETHING TO SEARCH');
    const type = String(req.query.type || 'track');
    res.json({ items: await spotify.search(type, query) });
  });

  /** Adds every track of an album. `genre` and `firstHeard` come from the song form. */
  router.post('/import-album', async (req, res) => {
    const { albumId, genre = '', firstHeard = '' } = req.body ?? {};
    const { album, tracks } = await spotify.getAlbumWithTracks(String(albumId || ''));
    const year = (album.release_date || '').slice(0, 4);
    const songs = tracks.map(track => ({
      title: track.name,
      artist: joinArtistNames(track.artists),
      album: album.name,
      year,
      genre,
      firstHeard
    }));
    const added = store.songs.importMany(songs, await downloadAlbumCover(album));
    res.json({ album: album.name, added });
  });

  return router;
}

/** The album's cover image, or null. A failed download doesn't stop the import. */
async function downloadAlbumCover(album) {
  const coverUrl = largestImageUrl(album.images);
  if (!coverUrl) return null;
  return downloadImage(coverUrl).catch(() => null);
}
