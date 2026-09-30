import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { formatShortDate } from '../../lib/format.js';
import { coverBackground } from '../../lib/theme.js';
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
    <div style="display:flex;flex-direction:column;gap:14px">
      <span class="lbl muted click h-ink" onClick=${onBack}>← BACK TO LIBRARY</span>
      <div style="width:240px;height:240px;background:${coverBackground(song)}"></div>
      <div class="mono" style="display:flex;flex-direction:column;font-size:11px">
        ${details.map(([label, value]) => html`
          <div key=${label} style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--rule)">
            <span class="muted">${label}</span><span style="text-align:right">${(value || '—').toUpperCase()}</span>
          </div>`)}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)">
          <span class="muted">RATING</span>
          <${RatingStars} rating=${song.rating} onChange=${onRate} />
        </div>
      </div>
      <div class="mono" style="display:flex;flex-wrap:wrap;gap:6px;font-weight:500;font-size:10px;letter-spacing:.04em">
        ${song.moods.map(mood => html`<span key=${mood} style="padding:5px 8px;background:var(--ink);color:var(--bg)">${mood}</span>`)}
      </div>
      <div class="lbl" style="display:flex;gap:16px;padding-top:8px">
        <span class="click" onClick=${onEdit} style="border-bottom:1px solid var(--ink)">EDIT DETAILS</span>
        <span class="click red" onClick=${() => setIsConfirmingDelete(true)}>DELETE</span>
      </div>
      ${isConfirmingDelete && html`
        <div class="lbl" style="border:1px solid var(--red);padding:12px;display:flex;flex-direction:column;gap:10px">
          <span>DELETE THIS SONG, ITS NOTES AND REFLECTIONS?</span>
          <div style="display:flex;gap:10px">
            <span class="click" onClick=${onDelete} style="background:var(--red);color:#fff;padding:6px 12px">DELETE</span>
            <span class="click" onClick=${() => setIsConfirmingDelete(false)} style="padding:6px 12px;border:1px solid var(--ink)">KEEP</span>
          </div>
        </div>`}
    </div>`;
}
