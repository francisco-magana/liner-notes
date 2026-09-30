import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { coverStyle } from '../../lib/covers.js';
import { formatShortDate } from '../../lib/format.js';
import { RatingStars } from '../RatingStars.js';

/** Left column of the song page: cover, details, rating, moods and edit/delete. */
export function SongSidebar({ song, onBack, onRate, onEdit, onDelete }) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const details = [
    ['ALBUM', song.album],
    ['YEAR', song.year],
    // Noon avoids the date shifting a day when parsed in a timezone behind UTC.
    ['FIRST HEARD', song.firstHeard ? formatShortDate(song.firstHeard + 'T12:00') : ''],
    ['ADDED', formatShortDate(song.created)]
  ];

  return html`
    <div class="song-sidebar">
      <span class="lbl muted click h-ink" onClick=${onBack}>← BACK TO LIBRARY</span>
      <div class="cover song-sidebar__cover" style=${coverStyle(song)}></div>
      <div class="mono song-sidebar__details">
        ${details.map(([label, value]) => html`
          <div key=${label} class="song-sidebar__detail">
            <span class="muted">${label}</span><span class="song-sidebar__detail-value">${(value || '—').toUpperCase()}</span>
          </div>`)}
        <div class="song-sidebar__rating">
          <span class="muted">RATING</span>
          <${RatingStars} rating=${song.rating} onChange=${onRate} />
        </div>
      </div>
      <div class="mono song-sidebar__moods">
        ${song.moods.map(mood => html`<span key=${mood} class="song-sidebar__mood">${mood}</span>`)}
      </div>
      <div class="lbl song-sidebar__actions">
        <span class="click song-sidebar__edit" onClick=${onEdit}>EDIT DETAILS</span>
        <span class="click red" onClick=${() => setIsConfirmingDelete(true)}>DELETE</span>
      </div>
      ${isConfirmingDelete && html`
        <div class="lbl song-sidebar__confirm">
          <span>DELETE THIS SONG, ITS NOTES AND REFLECTIONS?</span>
          <div class="song-sidebar__confirm-buttons">
            <span class="click song-sidebar__confirm-delete" onClick=${onDelete}>DELETE</span>
            <span class="click song-sidebar__confirm-keep" onClick=${() => setIsConfirmingDelete(false)}>KEEP</span>
          </div>
        </div>`}
    </div>`;
}
