// A small Spotify Web API client using the client-credentials flow. All Spotify
// requests go through the server, so credentials never reach the browser.
import { badGateway, badRequest } from './errors.js';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_URL = 'https://api.spotify.com/v1';
const REQUEST_TIMEOUT_MS = 10_000;
const SEARCH_TYPES = new Set(['track', 'album', 'artist']);
const SEARCH_LIMIT = 8;
const MAX_ALBUM_TRACKS = 500;
/** Renew the token a minute before Spotify says it expires. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

/** `getCredentials()` returns the saved `{ clientId, clientSecret }`. */
export function createSpotifyClient(getCredentials) {
  let cachedToken = null; // { credentials, accessToken, expiresAt }

  async function request(url, options = {}) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch {
      throw badGateway("COULDN'T REACH SPOTIFY");
    }
  }

  async function getAccessToken(clientId, clientSecret) {
    if (!clientId || !clientSecret) throw badRequest('ADD SPOTIFY CREDENTIALS IN SETTINGS');
    const credentials = `${clientId}:${clientSecret}`;
    if (cachedToken && cachedToken.credentials === credentials && cachedToken.expiresAt > Date.now()) {
      return cachedToken.accessToken;
    }

    const response = await request(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(credentials).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    if (response.status === 400 || response.status === 401) throw badRequest('INVALID CLIENT ID OR SECRET');
    if (!response.ok) throw badGateway('SPOTIFY ERROR ' + response.status);

    const { access_token: accessToken, expires_in: expiresInSeconds } = await response.json();
    cachedToken = { credentials, accessToken, expiresAt: Date.now() + expiresInSeconds * 1000 - TOKEN_EXPIRY_MARGIN_MS };
    return accessToken;
  }

  /** GET a Web API URL with the saved credentials and return the parsed JSON. */
  async function apiGet(url) {
    const { clientId, clientSecret } = getCredentials();
    const accessToken = await getAccessToken(clientId, clientSecret);
    const response = await request(url, { headers: { Authorization: 'Bearer ' + accessToken } });
    if (response.status === 401) {
      cachedToken = null;
      throw badGateway('SESSION EXPIRED — TRY AGAIN');
    }
    if (!response.ok) throw badGateway('SPOTIFY ERROR ' + response.status);
    return response.json();
  }

  /** Checks credentials before they are saved. Throws when Spotify rejects them. */
  async function testCredentials(clientId, clientSecret) {
    cachedToken = null;
    await getAccessToken(clientId, clientSecret);
  }

  /** Searches tracks, albums or artists. Returns Spotify's result objects. */
  async function search(type, query) {
    if (!SEARCH_TYPES.has(type)) throw badRequest('INVALID SEARCH TYPE');
    const results = await apiGet(`${API_URL}/search?type=${type}&limit=${SEARCH_LIMIT}&q=${encodeURIComponent(query)}`);
    return (results[type + 's']?.items || []).filter(Boolean);
  }

  /** An album's details plus all its tracks, following Spotify's pagination. */
  async function getAlbumWithTracks(albumId) {
    if (!/^[A-Za-z0-9]+$/.test(albumId)) throw badRequest('INVALID ALBUM');
    const album = await apiGet(`${API_URL}/albums/${albumId}`);
    const tracks = [...(album.tracks?.items || [])];
    let nextPageUrl = album.tracks?.next;
    while (nextPageUrl && tracks.length < MAX_ALBUM_TRACKS) {
      const page = await apiGet(nextPageUrl);
      tracks.push(...(page.items || []));
      nextPageUrl = page.next;
    }
    return { album, tracks };
  }

  return { testCredentials, search, getAlbumWithTracks };
}

/** URL of the largest image in a Spotify image list, or null. */
export function largestImageUrl(images) {
  if (!images || !images.length) return null;
  return images.reduce((largest, image) => ((image.width || 0) >= (largest.width || 0) ? image : largest)).url;
}

/** "Artist One, Artist Two" */
export const joinArtistNames = artists => (artists || []).map(artist => artist.name).join(', ');
