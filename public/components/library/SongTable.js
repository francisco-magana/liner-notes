import { html } from '../../lib/html.js';
import { formatShortDate, padNumber, starString } from '../../lib/format.js';
import { coverBackground } from '../../lib/theme.js';

const COLUMNS = 'grid-template-columns:30px 44px minmax(0,1fr) 150px 84px 50px 70px;gap:14px';

export function SongTable({ songs, onOpenSong }) {
  return html`
    <div style="display:flex;flex-direction:column">
      <div class="mono muted" style="display:grid;${COLUMNS};font-weight:500;font-size:10px;letter-spacing:.06em;padding-bottom:8px">
        <span>NO</span><span></span><span>TITLE / ARTIST</span><span>ALBUM</span><span>RATING</span><span>NOTES</span><span style="text-align:right">ADDED</span>
      </div>
      ${songs.map((song, index) => html`<${SongRow} key=${song.id} song=${song} position=${index + 1} onOpen=${() => onOpenSong(song.id)} />`)}
    </div>`;
}

function SongRow({ song, position, onOpen }) {
  const noteCount = Object.keys(song.notes).length;
  return html`
    <div class="mono click h-row" onClick=${onOpen} style="display:grid;${COLUMNS};align-items:center;padding:6px 0;border-top:1px solid var(--rule);font-size:12px">
      <span class="muted">${padNumber(position)}</span>
      <div style="width:44px;height:44px;background:${coverBackground(song)}"></div>
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
        <span class="ellipsis" style="font-weight:500">${song.title.toUpperCase()}</span>
        <span class="muted">${song.artist.toUpperCase()}</span>
      </div>
      <span class="ellipsis" style="color:var(--ink2)">${(song.album || '—').toUpperCase()}</span>
      <span class="red" style="letter-spacing:1px">${starString(song.rating)}</span>
      <span>${noteCount ? padNumber(noteCount) : '—'}</span>
      <span style="text-align:right">${formatShortDate(song.created)}</span>
    </div>`;
}
