import { html } from '../../lib/html.js';
import { MONTH_NAMES, padNumber, shortWeekday, starString } from '../../lib/format.js';
import { COLORS } from '../../lib/theme.js';
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
    <div style="padding:4px 40px 60px;display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:56px">
      <div style="display:flex;flex-direction:column;gap:22px;min-width:0">
        <div style="display:flex;align-items:flex-end;justify-content:space-between">
          <div class="display" style="font-size:clamp(72px,8vw,140px);line-height:.82;min-width:0">${MONTH_NAMES[month.month]}</div>
          <div class="mono" style="display:flex;gap:14px;flex-shrink:0;font-weight:500;font-size:12px;padding-bottom:6px">
            <span class="click h-red" onClick=${() => onMonthChange(shiftMonth(month, -1))}>←</span>
            <span>${month.year}</span>
            <span class="click h-red" onClick=${() => onMonthChange(shiftMonth(month, 1))}>→</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)">
          ${statTiles.map(tile => html`
            <div key=${tile.label} style="display:flex;flex-direction:column;gap:4px;padding:14px 0">
              <span style="font-size:56px;line-height:1;font-weight:500;font-stretch:72%;letter-spacing:-.03em">${tile.value}</span>
              <span class="mono muted" style="font-weight:500;font-size:10px;letter-spacing:.06em">${tile.label}</span>
            </div>`)}
        </div>
        <${DayGrid} dayCount=${daysInMonth(month)} entriesPerDay=${countEntriesPerDay(entries)} />
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px">
          <div style="display:flex;flex-direction:column;gap:8px">
            <span class="lbl red">RATINGS · WHOLE LIBRARY</span>
            <${BarChart} rows=${ratingDistribution(songs)} barColor=${COLORS.ink} labelWidth=${70} labelColor=${COLORS.red} />
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <span class="lbl red">TOP MOODS · WHOLE LIBRARY</span>
            <${BarChart} rows=${topMoods(songs)} barColor=${COLORS.red} labelWidth=${90} labelColor=${COLORS.ink} />
          </div>
        </div>
      </div>
      <${EntryList} entries=${entries} onOpenSong=${onOpenSong} />
    </div>`;
}

/** One square per day: grey for none, ink for one entry, red for two or more. */
function DayGrid({ dayCount, entriesPerDay }) {
  return html`
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="lbl" style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;white-space:nowrap">
        <span class="red">DAYS WITH ENTRIES</span><span class="muted">GREY NONE · BLACK 1 · RED 2+</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(16,1fr);gap:4px">
        ${Array.from({ length: dayCount }, (_, index) => {
          const day = index + 1;
          const count = entriesPerDay[day] || 0;
          const background = count > 1 ? COLORS.red : count ? COLORS.ink : COLORS.track;
          return html`
            <div key=${day} class="mono" title=${count + (count === 1 ? ' entry' : ' entries')}
              style="height:40px;background:${background};color:${count ? COLORS.background : COLORS.mute};font-size:9px;padding:4px;box-sizing:border-box">${padNumber(day)}</div>`;
        })}
      </div>
    </div>`;
}

function EntryList({ entries, onOpenSong }) {
  return html`
    <div style="display:flex;flex-direction:column;border-left:1px solid var(--rule);padding-left:28px">
      <div class="lbl red" style="padding-bottom:12px">DIARY</div>
      ${entries.map(entry => {
        const date = new Date(entry.date);
        return html`
          <div key=${entry.key} class="click h-row" onClick=${() => onOpenSong(entry.song.id)}
            style="display:grid;grid-template-columns:56px 1fr;gap:14px;border-top:1px solid var(--rule);padding:12px 0">
            <div style="display:flex;flex-direction:column;gap:2px">
              <span style="font-size:32px;line-height:1;font-weight:500;font-stretch:72%">${padNumber(date.getDate())}</span>
              <span class="mono muted" style="font-weight:500;font-size:10px">${shortWeekday(date)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <div class="mono" style="display:flex;justify-content:space-between;gap:10px;font-weight:500;font-size:11px;line-height:1.3;letter-spacing:.04em">
                <span class="ellipsis" style="min-width:0">${entry.song.title.toUpperCase()}</span>
                <span class="red" style="white-space:nowrap">${starString(entry.song.rating)}</span>
              </div>
              <span style="font-size:14px;line-height:1.4;color:var(--ink3);text-wrap:pretty">${entry.text}</span>
            </div>
          </div>`;
      })}
      ${!entries.length && html`<span class="lbl muted" style="border-top:1px solid var(--rule);padding-top:14px">NO ENTRIES THIS MONTH.</span>`}
    </div>`;
}
