import { todayIso } from './format.js';

export const BASE_MOODS = ['NOSTALGIC', 'LATE NIGHT', 'CALM', 'DRIVING', 'HOPEFUL', 'MELANCHOLY', 'ENERGETIC'];

/** Latest of the song's creation date and its reflection dates (ISO string). */
export const lastActivity = song => [song.created, ...song.reflections.map(reflection => reflection.date)].sort().pop();

/** Latest activity across several songs (ISO string). */
export const latestActivity = songs => songs.map(lastActivity).sort().pop();

/** Lyric lines that contain text (blank section breaks are skipped). */
export const lyricTextLines = song => (song.lyrics || '').split('\n').filter(line => line.trim());

export const hasLyrics = song => lyricTextLines(song).length > 0;

export const averageRating = songs =>
  (songs.reduce((total, song) => total + (song.rating || 0), 0) / songs.length).toFixed(1);

export const newestFirst = (first, second) => second.date.localeCompare(first.date);

/** "ARTIST — GENRE", skipping whichever is missing. */
export const artistAndGenre = song => [song.artist, song.genre].filter(Boolean).join(' — ').toUpperCase();

export const emptySongForm = () => ({
  title: '', artist: '', album: '', year: '', genre: '',
  firstHeard: todayIso(), rating: 0, moods: [], lyrics: '', art: null
});

export const songToForm = song => ({
  title: song.title,
  artist: song.artist,
  album: song.album || '',
  year: song.year || '',
  genre: song.genre || '',
  firstHeard: song.firstHeard || '',
  rating: song.rating,
  moods: [...song.moods],
  lyrics: song.lyrics || '',
  art: song.art
});
