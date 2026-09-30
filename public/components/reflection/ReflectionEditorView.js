import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { focusAtEnd } from '../../lib/dom.js';
import { WEEKDAY_NAMES, countWords, excerpt, formatDayMonth, formatShortDate, formatTime } from '../../lib/format.js';
import { artistAndGenre, lyricTextLines, newestFirst } from '../../lib/songs.js';
import { COLORS, coverBackground } from '../../lib/theme.js';

/** Appends a lyric line to the draft as its own quoted paragraph. */
function appendQuote(draft, line) {
  const separator = draft.trim() ? '\n\n' : '';
  return draft.replace(/\s*$/, '') + separator + '“' + line + '”\n\n';
}

/**
 * Write a new reflection about `song`, or edit `reflection` when given.
 * `onSave({ text, date })` and `onDelete()` are handled by the App.
 */
export function ReflectionEditorView({ song, reflection, onSave, onDelete, onBack, onOpenReflection }) {
  const [draft, setDraft] = useState(reflection ? reflection.text : '');
  const [isLyricPickerOpen, setIsLyricPickerOpen] = useState(false);
  const [date] = useState(() => (reflection ? reflection.date : new Date().toISOString()));

  const shownDate = new Date(date);
  const lyricLines = lyricTextLines(song);
  const otherReflections = [...song.reflections].sort(newestFirst).filter(other => other.id !== reflection?.id);

  return html`
    <div style="padding:4px 40px 60px;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:64px">
      <div style="display:flex;flex-direction:column;gap:20px;padding-left:80px">
        <div class="lbl click h-fade" onClick=${onBack} style="display:flex;align-items:center;gap:14px">
          <span class="muted">←</span>
          <div style="width:40px;height:40px;background:${coverBackground(song)}"></div>
          <div style="display:flex;flex-direction:column;gap:2px"><span>${song.title.toUpperCase()}</span><span class="muted">${artistAndGenre(song)}</span></div>
        </div>
        <div style="display:flex;align-items:flex-end;gap:18px">
          <div class="display" style="font-size:150px;line-height:.8;letter-spacing:-.05em">${formatDayMonth(shownDate)}</div>
          <div class="lbl" style="display:flex;flex-direction:column;gap:4px;padding-bottom:6px">
            <span>${WEEKDAY_NAMES[shownDate.getDay()]}</span>
            <span class="muted">${shownDate.getFullYear() + ' · ' + formatTime(shownDate)}</span>
          </div>
        </div>
        <div class="lbl" style="display:flex;gap:18px;border-top:1px solid var(--ink);border-bottom:1px solid var(--rule);padding:9px 0;color:var(--ink2)">
          <span class="click" onClick=${() => setIsLyricPickerOpen(!isLyricPickerOpen)} style="color:${isLyricPickerOpen ? COLORS.red : 'var(--ink2)'}">❝ INSERT LYRIC</span>
          <span style="flex:1"></span>
          <span class="muted">${countWords(draft)} WORDS</span>
        </div>
        <textarea ref=${focusAtEnd} value=${draft} onInput=${event => setDraft(event.target.value)}
          placeholder="Where were you when you listened? What did it bring up?"
          style="min-height:360px;max-width:680px;resize:vertical;border:0;background:transparent;outline:none;font-size:21px;line-height:1.6"></textarea>
        <div class="mono" style="display:flex;gap:12px;font-weight:500;font-size:12px;letter-spacing:.06em">
          <span class="click h-redbg" onClick=${() => onSave({ text: draft.trim(), date })} style="padding:14px 28px;background:var(--ink);color:var(--bg)">SAVE REFLECTION</span>
          <span class="click" onClick=${onBack} style="padding:14px 22px;border:1px solid var(--ink)">CANCEL</span>
          ${reflection && html`<span class="click red" onClick=${onDelete} style="padding:14px 0">DELETE</span>`}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;border-left:1px solid var(--rule);padding-left:28px">
        ${isLyricPickerOpen && html`
          <div style="display:flex;flex-direction:column;gap:4px;padding-bottom:16px">
            <div class="lbl red" style="padding-bottom:8px">CLICK A LINE TO QUOTE IT</div>
            ${lyricLines.map((line, index) => html`
              <span key=${index} class="click h-row" onClick=${() => setDraft(current => appendQuote(current, line))}
                style="font-size:14px;line-height:1.4;padding:5px 6px;border-top:1px solid var(--rule2)">${line}</span>`)}
            ${!lyricLines.length && html`<span class="lbl muted">NO LYRICS ADDED FOR THIS SONG.</span>`}
          </div>`}
        <div class="lbl red">EARLIER REFLECTIONS</div>
        ${otherReflections.map(other => html`
          <div key=${other.id} class="click h-fade" onClick=${() => onOpenReflection(other.id)}
            style="display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--rule);padding-top:12px">
            <div class="lbl" style="display:flex;justify-content:space-between"><span>${formatShortDate(other.date)}</span><span class="muted">${countWords(other.text)} W</span></div>
            <span style="font-size:14px;line-height:1.45;color:var(--ink3);text-wrap:pretty">${excerpt(other.text, 120)}</span>
          </div>`)}
        ${!otherReflections.length && html`<span class="lbl muted">THIS IS YOUR FIRST ONE.</span>`}
      </div>
    </div>`;
}
