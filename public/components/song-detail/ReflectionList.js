import { html } from '../../lib/html.js';
import { countWords, excerpt, formatDayMonth, shortWeekday } from '../../lib/format.js';
import { newestFirst } from '../../lib/songs.js';

export function ReflectionList({ song, onWriteReflection, onOpenReflection }) {
  const reflections = [...song.reflections].sort(newestFirst);

  return html`
    <div style="display:flex;flex-direction:column;padding-top:8px">
      <div class="mono click h-slide" onClick=${onWriteReflection}
        style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;font-weight:500;font-size:12px;letter-spacing:.06em;color:var(--red)">
        <span>+ WRITE A NEW REFLECTION</span><span>→</span>
      </div>
      ${reflections.map(reflection => {
        const date = new Date(reflection.date);
        return html`
          <div key=${reflection.id} class="click h-row" onClick=${() => onOpenReflection(reflection.id)}
            style="display:grid;grid-template-columns:120px minmax(0,1fr) 60px;gap:24px;border-top:1px solid var(--rule);padding:16px 0">
            <div style="display:flex;flex-direction:column;gap:2px">
              <span style="font-size:36px;line-height:1;font-weight:500;font-stretch:72%">${formatDayMonth(date)}</span>
              <span class="mono muted" style="font-weight:500;font-size:10px;letter-spacing:.06em">${shortWeekday(date) + ' · ' + date.getFullYear()}</span>
            </div>
            <span style="font-size:16px;line-height:1.5;text-wrap:pretty;white-space:pre-line">${excerpt(reflection.text, 220)}</span>
            <span class="mono muted" style="font-weight:500;font-size:10px;text-align:right">${countWords(reflection.text)} W</span>
          </div>`;
      })}
      ${!reflections.length && html`
        <div class="lbl muted" style="border-top:1px solid var(--rule);padding:20px 0">NOTHING WRITTEN YET. WHAT DOES THIS SONG BRING UP FOR YOU?</div>`}
    </div>`;
}
