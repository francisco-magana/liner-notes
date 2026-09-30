// Pure data logic for the library view: filtering, sorting and grouping songs.

import { hasLyrics, lastActivity, latestActivity } from '../../lib/songs.js';

export const DEFAULT_LIBRARY_FILTERS = { tab: 'songs', filter: 'all', sort: 'recent', query: '' };

export const LIBRARY_TABS = [
  { key: 'songs', label: 'SONGS', title: 'LIBRARY' },
  { key: 'artists', label: 'ARTISTS', title: 'ARTISTS' },
  { key: 'albums', label: 'ALBUMS', title: 'ALBUMS' }
];

export const SONG_FILTERS = [
  { key: 'all', label: 'ALL', matches: () => true },
  { key: 'fiveStars', label: '★★★★★', matches: song => song.rating === 5 },
  { key: 'withReflection', label: 'WITH REFLECTION', matches: song => song.reflections.length > 0 },
  { key: 'needsLyrics', label: 'NEEDS LYRICS', matches: song => !hasLyrics(song) }
];

/** Clicking the sort chip cycles through these in order. */
export const SORT_ORDERS = {
  recent: { label: 'SORT: RECENT ↓', next: 'rating', compare: (first, second) => second.created.localeCompare(first.created) },
  rating: { label: 'SORT: RATING ↓', next: 'az', compare: (first, second) => second.rating - first.rating },
  az: { label: 'SORT: A–Z', next: 'recent', compare: (first, second) => first.title.localeCompare(second.title) }
};

/** True when the (already lowercased) query appears in the song's title, artist, album or lyrics. */
export function songMatchesQuery(song, query) {
  if (!query) return true;
  return [song.title, song.artist, song.album, song.lyrics].some(value => (value || '').toLowerCase().includes(query));
}

function groupSongs(songs, groupKey) {
  const groups = new Map();
  for (const song of songs) {
    const key = groupKey(song);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(song);
  }
  return groups;
}

export const groupByArtist = songs => groupSongs(songs, song => song.artist);

/** Albums are keyed by album and artist, so two artists' "Greatest Hits" stay apart. */
export const groupByAlbum = songs => groupSongs(songs, song => (song.album ? song.album + '§' + song.artist : null));

export function filterAndSortSongs(songs, { filter, sort, query }) {
  const { matches } = SONG_FILTERS.find(songFilter => songFilter.key === filter);
  return songs
    .filter(song => matches(song) && songMatchesQuery(song, query))
    .sort(SORT_ORDERS[sort].compare);
}

/** Artists with the most songs first. A search matches the artist's name or any of their songs. */
export function buildArtistRows(songs, query) {
  return [...groupByArtist(songs)]
    .filter(([name, artistSongs]) => !query || name.toLowerCase().includes(query) || artistSongs.some(song => songMatchesQuery(song, query)))
    .sort(([firstName, firstSongs], [secondName, secondSongs]) => secondSongs.length - firstSongs.length || firstName.localeCompare(secondName))
    .map(([name, artistSongs]) => ({
      name,
      songs: artistSongs,
      genre: artistSongs.find(song => song.genre)?.genre || '',
      topSong: [...artistSongs].sort((first, second) => second.rating - first.rating)[0],
      lastActivity: latestActivity(artistSongs),
      coverSong: artistSongs.find(song => song.art)
    }));
}

/** Albums with the most recent activity first. A search matches the album, artist or any of its songs. */
export function buildAlbumRows(songs, query) {
  return [...groupByAlbum(songs)]
    .filter(([key, albumSongs]) => !query || key.toLowerCase().includes(query) || albumSongs.some(song => songMatchesQuery(song, query)))
    .map(([key, albumSongs]) => ({
      key,
      album: albumSongs[0].album,
      artist: albumSongs[0].artist,
      year: albumSongs[0].year || '',
      songs: albumSongs,
      lastActivity: latestActivity(albumSongs),
      coverSong: albumSongs.find(song => song.art)
    }))
    .sort((first, second) => second.lastActivity.localeCompare(first.lastActivity));
}

/** The song with the most recent activity, or undefined for an empty library. */
export function mostRecentlyActiveSong(songs) {
  return [...songs].sort((first, second) => lastActivity(second).localeCompare(lastActivity(first)))[0];
}
