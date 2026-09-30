import { html } from '../../lib/html.js';
import { countWords, excerpt, formatDayMonth, shortWeekday } from '../../lib/format.js';
import { newestFirst } from '../../lib/songs.js';

export function ReflectionList({ song, onWriteReflection, onOpenReflection }) {
  const reflections = [...song.reflections].sort(newestFirst);

  return html`
    <div class="reflection-list">
      <div class="mono click h-slide reflection-list__new" onClick=${onWriteReflection}>
        <span>+ WRITE A NEW REFLECTION</span><span>→</span>
      </div>
      ${reflections.map(reflection => {
        const date = new Date(reflection.date);
        return html`
          <div key=${reflection.id} class="click h-row reflection-list__item" onClick=${() => onOpenReflection(reflection.id)}>
            <div class="reflection-list__date">
              <span class="reflection-list__day">${formatDayMonth(date)}</span>
              <span class="mono muted reflection-list__weekday">${shortWeekday(date) + ' · ' + date.getFullYear()}</span>
            </div>
            <span class="reflection-list__excerpt">${excerpt(reflection.text, 220)}</span>
            <span class="mono muted reflection-list__words">${countWords(reflection.text)} W</span>
          </div>`;
      })}
      ${!reflections.length && html`
        <div class="lbl muted reflection-list__empty">NOTHING WRITTEN YET. WHAT DOES THIS SONG BRING UP FOR YOU?</div>`}
    </div>`;
}
