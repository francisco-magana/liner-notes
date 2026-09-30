import { html } from '../../lib/html.js';
import { coverStyle } from '../../lib/covers.js';
import { formatShortDate, padNumber, starString } from '../../lib/format.js';

export function SongTable({ songs, onOpenSong }) {
  return html`
    <div class="song-table">
      <div class="mono muted song-table__header">
        <span>NO</span><span></span><span>TITLE / ARTIST</span><span>ALBUM</span><span>RATING</span><span>NOTES</span>
        <span class="song-table__date">ADDED</span>
      </div>
      ${songs.map((song, index) => html`<${SongRow} key=${song.id} song=${song} position=${index + 1} onOpen=${() => onOpenSong(song.id)} />`)}
    </div>`;
}

function SongRow({ song, position, onOpen }) {
  const noteCount = Object.keys(song.notes).length;
  return html`
    <div class="mono click h-row song-table__row" onClick=${onOpen}>
      <span class="muted">${padNumber(position)}</span>
      <div class="cover song-table__cover" style=${coverStyle(song)}></div>
      <div class="song-table__name">
        <span class="ellipsis song-table__title">${song.title.toUpperCase()}</span>
        <span class="muted">${song.artist.toUpperCase()}</span>
      </div>
      <span class="ellipsis song-table__album">${(song.album || '—').toUpperCase()}</span>
      <span class="red song-table__stars">${starString(song.rating)}</span>
      <span>${noteCount ? padNumber(noteCount) : '—'}</span>
      <span class="song-table__date">${formatShortDate(song.created)}</span>
    </div>`;
}
