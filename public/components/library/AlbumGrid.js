import { html } from '../../lib/html.js';
import { coverStyle } from '../../lib/covers.js';
import { pluralize } from '../../lib/format.js';
import { averageRating } from '../../lib/songs.js';

/** `albums` are rows from buildAlbumRows(). */
export function AlbumGrid({ albums, onSelectAlbum }) {
  return html`
    <div class="album-grid">
      ${albums.map(album => html`
        <div key=${album.key} class="click h-fade75 album-grid__item" onClick=${() => onSelectAlbum(album.album)}>
          <div class="mono cover album-grid__cover" style=${coverStyle(album.coverSong)}>
            <span class="album-grid__count">${pluralize(album.songs.length, 'SONG')}</span>
          </div>
          <div class="mono album-grid__info">
            <span class="album-grid__title">${album.album.toUpperCase()}</span>
            <div class="muted album-grid__meta"><span>${album.artist.toUpperCase()}</span><span>${album.year}</span></div>
            <span class="red">★ ${averageRating(album.songs)}</span>
          </div>
        </div>`)}
    </div>`;
}
