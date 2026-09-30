import { badRequest } from './errors.js';

const MAX_BYTES = 8 * 1024 * 1024;
const ART_PATH = /^\/api\/art\/([\w-]+)$/;

export const artUrl = id => (id ? `/api/art/${id}` : null);

/**
 * Turns the `art` value a client sends into something the store can apply:
 *   { keep: true }          field absent, or an unchanged /api/art/<id> reference
 *   { none: true }          remove the art
 *   { ref: id }             point at an art row that already exists
 *   { blob: {mime, data} }  new image bytes (uploaded data URL or fetched https image)
 */
export async function resolveArt(value) {
  if (value === undefined) return { keep: true };
  if (value === null || value === '') return { none: true };
  if (typeof value !== 'string') throw badRequest('INVALID ALBUM ART');

  const ref = ART_PATH.exec(value);
  if (ref) return { ref: ref[1] };
  if (value.startsWith('data:')) return { blob: decodeDataUrl(value) };
  if (value.startsWith('https://')) return { blob: await fetchImage(value) };
  throw badRequest('INVALID ALBUM ART');
}

function decodeDataUrl(url) {
  const m = /^data:(image\/[\w.+-]+);base64,(.+)$/s.exec(url);
  if (!m) throw badRequest('ALBUM ART MUST BE AN IMAGE');
  const data = Buffer.from(m[2], 'base64');
  if (data.length > MAX_BYTES) throw badRequest('IMAGE TOO LARGE');
  return { mime: m[1], data };
}

export async function fetchImage(url) {
  let r;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw badRequest("COULDN'T DOWNLOAD ALBUM ART");
  }
  const mime = (r.headers.get('content-type') || '').split(';')[0].trim();
  if (!r.ok || !mime.startsWith('image/')) throw badRequest("COULDN'T DOWNLOAD ALBUM ART");
  const data = Buffer.from(await r.arrayBuffer());
  if (data.length > MAX_BYTES) throw badRequest('IMAGE TOO LARGE');
  return { mime, data };
}
