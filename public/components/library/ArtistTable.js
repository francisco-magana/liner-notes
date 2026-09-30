import { html } from '../../lib/html.js';
import { formatShortDate, padNumber } from '../../lib/format.js';
import { averageRating } from '../../lib/songs.js';
import { coverBackground } from '../../lib/theme.js';

const COLUMNS = 'grid-template-columns:30px 44px minmax(0,1fr) 60px 70px 180px 70px;gap:14px';

/** `artists` are rows from buildArtistRows(). */
export function ArtistTable({ artists, onSelectArtist }) {
  return html`
    <div style="display:flex;flex-direction:column">
      <div class="mono muted" style="display:grid;${COLUMNS};font-weight:500;font-size:10px;letter-spacing:.06em;padding-bottom:8px">
        <span>NO</span><span></span><span>ARTIST</span><span>SONGS</span><span>AVG</span><span>TOP SONG</span><span style="text-align:right">LAST</span>
      </div>
      ${artists.map((artist, index) => html`
        <div key=${artist.name} class="mono click h-row" onClick=${() => onSelectArtist(artist.name)} style="display:grid;${COLUMNS};align-items:center;padding:6px 0;border-top:1px solid var(--rule);font-size:12px">
          <span class="muted">${padNumber(index + 1)}</span>
          <div style="width:44px;height:44px;border-radius:50%;background:${coverBackground(artist.coverSong)}"></div>
          <div style="display:flex;flex-direction:column;gap:2px">
            <span style="font-weight:500">${artist.name.toUpperCase()}</span>
            <span class="muted">${(artist.genre || '—').toUpperCase()}</span>
          </div>
          <span>${padNumber(artist.songs.length)}</span>
          <span class="red">★ ${averageRating(artist.songs)}</span>
          <span class="ellipsis" style="color:var(--ink2)">${artist.topSong.title.toUpperCase()}</span>
          <span style="text-align:right">${formatShortDate(artist.lastActivity)}</span>
        </div>`)}
    </div>`;
}
