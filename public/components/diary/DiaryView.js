import { html } from '../../lib/html.js';
import { classNames } from '../../lib/classNames.js';
import { MONTH_NAMES, padNumber, shortWeekday, starString } from '../../lib/format.js';
import { BarChart } from './BarChart.js';
import {
  buildMonthEntries, countEntriesPerDay, daysInMonth, monthStats, ratingDistribution, shiftMonth, topMoods
} from './diaryData.js';

/** Monthly overview. `month` is `{ year, month }` and lives in the App so it survives navigation. */
export function DiaryView({ songs, month, onMonthChange, onOpenSong }) {
  const entries = buildMonthEntries(songs, month);
  const stats = monthStats(songs, entries, month);
  const statTiles = [
    { value: padNumber(stats.songsTouched), label: 'SONGS LISTENED TO' },
    { value: stats.averageRating, label: 'AVG RATING' },
    { value: padNumber(stats.reflections), label: 'REFLECTIONS' },
    { value: stats.wordsWritten.toLocaleString(), label: 'WORDS WRITTEN' }
  ];

  return html`
    <div class="diary">
      <div class="diary__main">
        <div class="diary__header">
          <div class="display diary__month">${MONTH_NAMES[month.month]}</div>
          <div class="mono diary__month-nav">
            <span class="click h-red" onClick=${() => onMonthChange(shiftMonth(month, -1))}>←</span>
            <span>${month.year}</span>
            <span class="click h-red" onClick=${() => onMonthChange(shiftMonth(month, 1))}>→</span>
          </div>
        </div>
        <div class="diary__stats">
          ${statTiles.map(tile => html`
            <div key=${tile.label} class="diary__stat">
              <span class="diary__stat-value">${tile.value}</span>
              <span class="mono muted diary__stat-label">${tile.label}</span>
            </div>`)}
        </div>
        <${DayGrid} dayCount=${daysInMonth(month)} entriesPerDay=${countEntriesPerDay(entries)} />
        <div class="diary__charts">
          <div class="diary__chart">
            <span class="lbl red">RATINGS · WHOLE LIBRARY</span>
            <${BarChart} rows=${ratingDistribution(songs)} variant="ratings" />
          </div>
          <div class="diary__chart">
            <span class="lbl red">TOP MOODS · WHOLE LIBRARY</span>
            <${BarChart} rows=${topMoods(songs)} variant="moods" />
          </div>
        </div>
      </div>
      <${EntryList} entries=${entries} onOpenSong=${onOpenSong} />
    </div>`;
}

/** One square per day: grey for none, ink for one entry, red for two or more. */
function DayGrid({ dayCount, entriesPerDay }) {
  return html`
    <div class="day-grid">
      <div class="lbl day-grid__legend">
        <span class="red">DAYS WITH ENTRIES</span><span class="muted">GREY NONE · BLACK 1 · RED 2+</span>
      </div>
      <div class="day-grid__days">
        ${Array.from({ length: dayCount }, (_, index) => {
          const day = index + 1;
          const count = entriesPerDay[day] || 0;
          const dayClass = classNames('mono day-grid__day', count === 1 && 'day-grid__day--one', count > 1 && 'day-grid__day--many');
          return html`<div key=${day} class=${dayClass} title=${count + (count === 1 ? ' entry' : ' entries')}>${padNumber(day)}</div>`;
        })}
      </div>
    </div>`;
}

function EntryList({ entries, onOpenSong }) {
  return html`
    <div class="diary-entries">
      <div class="lbl red diary-entries__title">DIARY</div>
      ${entries.map(entry => {
        const date = new Date(entry.date);
        return html`
          <div key=${entry.key} class="click h-row diary-entry" onClick=${() => onOpenSong(entry.song.id)}>
            <div class="diary-entry__date">
              <span class="diary-entry__day">${padNumber(date.getDate())}</span>
              <span class="mono muted diary-entry__weekday">${shortWeekday(date)}</span>
            </div>
            <div class="diary-entry__body">
              <div class="mono diary-entry__heading">
                <span class="ellipsis diary-entry__title">${entry.song.title.toUpperCase()}</span>
                <span class="red diary-entry__stars">${starString(entry.song.rating)}</span>
              </div>
              <span class="diary-entry__text">${entry.text}</span>
            </div>
          </div>`;
      })}
      ${!entries.length && html`<span class="lbl muted diary-entries__empty">NO ENTRIES THIS MONTH.</span>`}
    </div>`;
}
