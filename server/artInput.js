// Album art as the API sees it: the URL stored art is served at, and turning the
// `art` value a client sends into a change the store can apply.
import { badRequest } from './errors.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 10_000;
const STORED_ART_URL = /^\/api\/art\/([\w-]+)$/;
const DATA_URL = /^data:(image\/[\w.+-]+);base64,(.+)$/s;

/** The URL a stored image is served at, or null when there is none. */
export const artUrl = artId => (artId ? `/api/art/${artId}` : null);

/** Leave the song's art as it is. */
export const KEEP_ART = { type: 'keep' };

/**
 * Parses the `art` value from a request into an art change:
 *   { type: 'keep' }                field absent
 *   { type: 'remove' }              null or '' removes the art
 *   { type: 'existing', artId }     an /api/art/<id> URL of an image already stored
 *   { type: 'new', image }          new image bytes { mime, data }, from a data URL or an https download
 */
export async function parseArtInput(value) {
  if (value === undefined) return KEEP_ART;
  if (value === null || value === '') return { type: 'remove' };
  if (typeof value !== 'string') throw badRequest('INVALID ALBUM ART');

  const storedArt = STORED_ART_URL.exec(value);
  if (storedArt) return { type: 'existing', artId: storedArt[1] };
  if (value.startsWith('data:')) return { type: 'new', image: decodeDataUrl(value) };
  if (value.startsWith('https://')) return { type: 'new', image: await downloadImage(value) };
  throw badRequest('INVALID ALBUM ART');
}

function decodeDataUrl(dataUrl) {
  const match = DATA_URL.exec(dataUrl);
  if (!match) throw badRequest('ALBUM ART MUST BE AN IMAGE');
  const [, mime, base64] = match;
  return { mime, data: checkSize(Buffer.from(base64, 'base64')) };
}

/** Downloads an image and returns `{ mime, data }`. */
export async function downloadImage(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  } catch {
    throw badRequest("COULDN'T DOWNLOAD ALBUM ART");
  }
  const mime = (response.headers.get('content-type') || '').split(';')[0].trim();
  if (!response.ok || !mime.startsWith('image/')) throw badRequest("COULDN'T DOWNLOAD ALBUM ART");
  return { mime, data: checkSize(Buffer.from(await response.arrayBuffer())) };
}

function checkSize(data) {
  if (data.length > MAX_IMAGE_BYTES) throw badRequest('IMAGE TOO LARGE');
  return data;
}
