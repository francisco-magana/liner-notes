import { capitalizeWords } from './format.js';

export const SEARCH_TYPES = [
  { type: 'track', label: 'SONG', placeholder: 'Search a song title' },
  { type: 'album', label: 'ALBUM', placeholder: 'Search an album' },
  { type: 'artist', label: 'ARTIST', placeholder: 'Search an artist' }
];

const joinArtistNames = artists => (artists || []).map(artist => artist.name).join(', ');
const releaseYear = releaseDate => (releaseDate || '').slice(0, 4);

/**
 * Picks an image URL from a Spotify image list: the largest one,
 * or with `thumbnail` the smallest one that is at least 64px wide.
 */
export function pickImage(images, { thumbnail = false } = {}) {
  if (!images || !images.length) return null;
  const bySize = [...images].sort((first, second) => (first.width || 0) - (second.width || 0));
  const largest = bySize[bySize.length - 1];
  if (!thumbnail) return largest.url;
  return (bySize.find(image => (image.width || 0) >= 64) || largest).url;
}

export function resultThumbnail(type, item) {
  return pickImage(type === 'track' ? item.album?.images : item.images, { thumbnail: true });
}

/** The grey second line under a search result. */
export function resultSubtitle(type, item) {
  if (type === 'track') return joinArtistNames(item.artists) + ' · ' + (item.album?.name || '');
  if (type === 'album') {
    const trackCount = item.total_tracks ? item.total_tracks + ' TRACKS' : '';
    return [joinArtistNames(item.artists), releaseYear(item.release_date), trackCount].filter(Boolean).join(' · ');
  }
  return (item.genres || []).slice(0, 2).join(', ') || 'ARTIST';
}

/** The song form fields a search result fills in. */
export function resultToFormFields(type, item, currentGenre) {
  if (type === 'track') {
    const art = pickImage(item.album?.images);
    return {
      title: item.name,
      artist: joinArtistNames(item.artists),
      album: item.album?.name || '',
      year: releaseYear(item.album?.release_date),
      ...(art ? { art } : {})
    };
  }
  if (type === 'album') {
    const art = pickImage(item.images);
    return {
      album: item.name,
      artist: joinArtistNames(item.artists),
      year: releaseYear(item.release_date),
      ...(art ? { art } : {})
    };
  }
  return { artist: item.name, genre: currentGenre || capitalizeWords((item.genres || [])[0]) };
}
