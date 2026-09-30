import { html } from '../../lib/html.js';
import { coverStyle } from '../../lib/covers.js';
import { formatShortDate, padNumber } from '../../lib/format.js';
import { averageRating } from '../../lib/songs.js';

/** `artists` are rows from buildArtistRows(). */
export function ArtistTable({ artists, onSelectArtist }) {
  return html`
    <div class="artist-table">
      <div class="mono muted artist-table__header">
        <span>NO</span><span></span><span>ARTIST</span><span>SONGS</span><span>AVG</span><span>TOP SONG</span>
        <span class="artist-table__date">LAST</span>
      </div>
      ${artists.map((artist, index) => html`
        <div key=${artist.name} class="mono click h-row artist-table__row" onClick=${() => onSelectArtist(artist.name)}>
          <span class="muted">${padNumber(index + 1)}</span>
          <div class="cover artist-table__cover" style=${coverStyle(artist.coverSong)}></div>
          <div class="artist-table__name">
            <span class="artist-table__title">${artist.name.toUpperCase()}</span>
            <span class="muted">${(artist.genre || '—').toUpperCase()}</span>
          </div>
          <span>${padNumber(artist.songs.length)}</span>
          <span class="red">★ ${averageRating(artist.songs)}</span>
          <span class="ellipsis artist-table__top-song">${artist.topSong.title.toUpperCase()}</span>
          <span class="artist-table__date">${formatShortDate(artist.lastActivity)}</span>
        </div>`)}
    </div>`;
}
