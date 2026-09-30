// Cleans up values sent by the client before they reach the database.
import { badRequest } from '../errors.js';

const MAX_LENGTH = {
  text: 300,
  genre: 100,
  year: 10,
  date: 10,
  mood: 40,
  note: 5000,
  lyrics: 100_000,
  reflection: 100_000
};

/** Any value as a trimmed string of at most `maxLength` characters ('' for null or undefined). */
export const cleanText = (value, maxLength = MAX_LENGTH.text) => (value == null ? '' : String(value)).trim().slice(0, maxLength);

/**
 * Validates the song fields in a request body. Title and artist are required.
 * With `partial` (for updates), only the fields present in `input` are checked and returned.
 */
export function validateSong(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object') throw badRequest('INVALID SONG');
  const isPresent = field => !partial || field in input;
  const song = {};

  for (const field of ['title', 'artist']) {
    if (!isPresent(field)) continue;
    song[field] = cleanText(input[field]);
    if (!song[field]) throw badRequest(`${field.toUpperCase()} IS REQUIRED`);
  }
  if (isPresent('album')) song.album = cleanText(input.album);
  if (isPresent('genre')) song.genre = cleanText(input.genre, MAX_LENGTH.genre);
  if (isPresent('year')) song.year = cleanText(input.year, MAX_LENGTH.year);
  if (isPresent('firstHeard')) song.firstHeard = cleanText(input.firstHeard, MAX_LENGTH.date);
  if (isPresent('rating')) song.rating = cleanRating(input.rating);
  if (isPresent('moods')) song.moods = cleanMoods(input.moods);
  if (isPresent('lyrics')) song.lyrics = cleanLyrics(input.lyrics);
  if (isPresent('notes')) song.notes = cleanNotes(input.notes);
  return song;
}

/** A whole number of stars from 0 to 5. */
function cleanRating(value) {
  return Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
}

/** Uppercase, unique, non-empty mood names. */
function cleanMoods(moods) {
  const list = Array.isArray(moods) ? moods : [];
  return [...new Set(list.map(mood => cleanText(mood, MAX_LENGTH.mood).toUpperCase()).filter(Boolean))];
}

/** Keeps leading whitespace and blank lines (they are section breaks); drops only trailing whitespace. */
function cleanLyrics(lyrics) {
  return (lyrics == null ? '' : String(lyrics)).replace(/\s+$/, '').slice(0, MAX_LENGTH.lyrics);
}

/** Keeps only non-empty notes keyed by a lyric line index. */
function cleanNotes(notes) {
  const source = notes && typeof notes === 'object' ? notes : {};
  const cleaned = {};
  for (const [lineIndex, note] of Object.entries(source)) {
    const text = cleanText(note, MAX_LENGTH.note);
    if (/^\d+$/.test(lineIndex) && text) cleaned[lineIndex] = text;
  }
  return cleaned;
}

export function validateReflectionText(text) {
  const cleaned = cleanText(text, MAX_LENGTH.reflection);
  if (!cleaned) throw badRequest('WRITE SOMETHING FIRST');
  return cleaned;
}

/** A valid date string as ISO, or now when it is missing or unreadable. */
export function toIsoDate(value) {
  const isValid = value && !Number.isNaN(Date.parse(value));
  return (isValid ? new Date(value) : new Date()).toISOString();
}
