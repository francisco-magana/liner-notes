import { html } from '../../lib/html.js';
import { pluralize } from '../../lib/format.js';
import { averageRating } from '../../lib/songs.js';
import { coverBackground } from '../../lib/theme.js';

/** `albums` are rows from buildAlbumRows(). */
export function AlbumGrid({ albums, onSelectAlbum }) {
  return html`
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:24px 20px">
      ${albums.map(album => html`
        <div key=${album.key} class="click h-fade75" onClick=${() => onSelectAlbum(album.album)} style="display:flex;flex-direction:column;gap:8px">
          <div class="mono" style="aspect-ratio:1;background:${coverBackground(album.coverSong)};display:flex;align-items:flex-end;justify-content:flex-end;padding:8px;box-sizing:border-box;font-size:10px">
            <span style="background:var(--ink);color:var(--bg);padding:2px 5px">${pluralize(album.songs.length, 'SONG')}</span>
          </div>
          <div class="mono" style="display:flex;flex-direction:column;gap:2px;font-size:11px">
            <span style="font-weight:500">${album.album.toUpperCase()}</span>
            <div class="muted" style="display:flex;justify-content:space-between"><span>${album.artist.toUpperCase()}</span><span>${album.year}</span></div>
            <span class="red">★ ${averageRating(album.songs)}</span>
          </div>
        </div>`)}
    </div>`;
}
