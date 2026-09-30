import { HttpError, badRequest } from './errors.js';

const TYPES = new Set(['track', 'album', 'artist']);

/** Minimal Spotify Web API client using the client-credentials flow. */
export function createSpotify(getCreds) {
  let cached = null; // { key, token, exp }

  async function token(clientId, clientSecret) {
    if (!clientId || !clientSecret) throw badRequest('ADD SPOTIFY CREDENTIALS IN SETTINGS');
    const key = clientId + ':' + clientSecret;
    if (cached && cached.key === key && cached.exp > Date.now()) return cached.token;
    let r;
    try {
      r = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(key).toString('base64')
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      throw new HttpError(502, "COULDN'T REACH SPOTIFY");
    }
    if (r.status === 400 || r.status === 401) throw badRequest('INVALID CLIENT ID OR SECRET');
    if (!r.ok) throw new HttpError(502, 'SPOTIFY ERROR ' + r.status);
    const j = await r.json();
    cached = { key, token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
    return j.access_token;
  }

  async function call(path) {
    const { clientId, clientSecret } = getCreds();
    const t = await token(clientId, clientSecret);
    let r;
    try {
      r = await fetch('https://api.spotify.com/v1' + path, {
        headers: { Authorization: 'Bearer ' + t },
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      throw new HttpError(502, "COULDN'T REACH SPOTIFY");
    }
    if (r.status === 401) {
      cached = null;
      throw new HttpError(502, 'SESSION EXPIRED — TRY AGAIN');
    }
    if (!r.ok) throw new HttpError(502, 'SPOTIFY ERROR ' + r.status);
    return r.json();
  }

  return {
    async test(clientId, clientSecret) {
      cached = null;
      await token(clientId, clientSecret);
    },

    async search(type, query) {
      if (!TYPES.has(type)) throw badRequest('INVALID SEARCH TYPE');
      const j = await call(`/search?type=${type}&limit=8&q=${encodeURIComponent(query)}`);
      return ((j[type + 's'] || {}).items || []).filter(Boolean);
    },

    /** Album metadata plus every track (follows pagination). */
    async album(id) {
      if (!/^[A-Za-z0-9]+$/.test(id)) throw badRequest('INVALID ALBUM');
      const album = await call('/albums/' + id);
      const tracks = [...(album.tracks?.items || [])];
      let next = album.tracks?.next;
      while (next && tracks.length < 500) {
        const page = await call(next.replace('https://api.spotify.com/v1', ''));
        tracks.push(...(page.items || []));
        next = page.next;
      }
      return { album, tracks };
    }
  };
}

/** Largest image (or the smallest one at least 64px wide when `small`). */
export function pickImage(images, small = false) {
  if (!images || !images.length) return null;
  const s = [...images].sort((a, b) => (a.width || 0) - (b.width || 0));
  return small ? (s.find(i => (i.width || 0) >= 64) || s[s.length - 1]).url : s[s.length - 1].url;
}
