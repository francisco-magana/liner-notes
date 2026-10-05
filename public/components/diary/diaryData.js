// Pure data logic for the diary view.

import { countWords, starString } from '../../lib/format.js';
import { averageRating } from '../../lib/songs.js';

/** `{ year, month }` of today, with month 0–11. */
export function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

/** Moves a `{ year, month }` by `offset` months, rolling over the year. */
export function shiftMonth({ year, month }, offset) {
  const shifted = new Date(year, month + offset, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() };
}

export const daysInMonth = ({ year, month }) => new Date(year, month + 1, 0).getDate();

function isInMonth(iso, { year, month }) {
  const date = new Date(iso);
  return date.getFullYear() === year && date.getMonth() === month;
}

const sameDay = (firstIso, secondIso) => firstIso.slice(0, 10) === secondIso.slice(0, 10);

/**
 * Diary entries for one month, newest first: every reflection written that month,
 * plus "added" entries for songs created that month, unless a reflection on the same day already covers them.
 */
export function buildMonthEntries(songs, month) {
  const entries = [];
  for (const song of songs) {
    const monthReflections = song.reflections.filter(reflection => isInMonth(reflection.date, month));
    for (const reflection of monthReflections) {
      entries.push({ key: reflection.id, date: reflection.date, song, text: reflection.text.trim() });
    }
    const wasAddedThisMonth = isInMonth(song.created, month);
    if (wasAddedThisMonth && !monthReflections.some(reflection => sameDay(reflection.date, song.created))) {
      entries.push({ key: 'added-' + song.id, date: song.created, song, text: 'Added to the library.' });
    }
  }
  return entries.sort((first, second) => second.date.localeCompare(first.date));
}

/** Map of day-of-month → number of entries. */
export function countEntriesPerDay(entries) {
  const counts = {};
  for (const entry of entries) {
    const day = new Date(entry.date).getDate();
    counts[day] = (counts[day] || 0) + 1;
  }
  return counts;
}

/** The four big numbers at the top of the diary. */
export function monthStats(songs, entries, month) {
  const songsTouched = [...new Set(entries.map(entry => entry.song))];
  const reflections = songs.flatMap(song => song.reflections.filter(reflection => isInMonth(reflection.date, month)));
  const wordsWritten = reflections.reduce((total, reflection) => total + countWords(reflection.text), 0);

  return { songsTouched: songsTouched.length, averageRating: averageRating(songsTouched), reflections: reflections.length, wordsWritten };
}

/** One row per star rating, 5 down to 1, for the whole library. */
export function ratingDistribution(songs) {
  return [5, 4, 3, 2, 1].map(rating => ({
    label: starString(rating),
    value: songs.filter(song => song.rating === rating).length
  }));
}

/** The most used moods across the whole library. */
export function topMoods(songs, limit = 5) {
  const counts = {};
  for (const song of songs) {
    for (const mood of song.moods) counts[mood] = (counts[mood] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}
