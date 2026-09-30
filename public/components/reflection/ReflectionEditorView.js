import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { classNames } from '../../lib/classNames.js';
import { coverStyle } from '../../lib/covers.js';
import { focusAtEnd } from '../../lib/dom.js';
import { WEEKDAY_NAMES, countWords, excerpt, formatDayMonth, formatShortDate, formatTime } from '../../lib/format.js';
import { artistAndGenre, lyricTextLines, newestFirst } from '../../lib/songs.js';

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
    <div class="reflection-editor">
      <div class="reflection-editor__main">
        <div class="lbl click h-fade reflection-editor__back" onClick=${onBack}>
          <span class="muted">←</span>
          <div class="cover reflection-editor__cover" style=${coverStyle(song)}></div>
          <div class="reflection-editor__song"><span>${song.title.toUpperCase()}</span><span class="muted">${artistAndGenre(song)}</span></div>
        </div>
        <div class="reflection-editor__date-row">
          <div class="display reflection-editor__date">${formatDayMonth(shownDate)}</div>
          <div class="lbl reflection-editor__date-meta">
            <span>${WEEKDAY_NAMES[shownDate.getDay()]}</span>
            <span class="muted">${shownDate.getFullYear() + ' · ' + formatTime(shownDate)}</span>
          </div>
        </div>
        <div class="lbl reflection-editor__toolbar">
          <span class=${classNames('click reflection-editor__insert', isLyricPickerOpen && 'is-active')}
            onClick=${() => setIsLyricPickerOpen(!isLyricPickerOpen)}>❝ INSERT LYRIC</span>
          <span class="reflection-editor__spacer"></span>
          <span class="muted">${countWords(draft)} WORDS</span>
        </div>
        <textarea class="reflection-editor__text" ref=${focusAtEnd} value=${draft} onInput=${event => setDraft(event.target.value)}
          placeholder="Where were you when you listened? What did it bring up?"></textarea>
        <div class="mono reflection-editor__actions">
          <span class="click h-redbg reflection-editor__save" onClick=${() => onSave({ text: draft.trim(), date })}>SAVE REFLECTION</span>
          <span class="click reflection-editor__cancel" onClick=${onBack}>CANCEL</span>
          ${reflection && html`<span class="click red reflection-editor__delete" onClick=${onDelete}>DELETE</span>`}
        </div>
      </div>

      <div class="reflection-editor__aside">
        ${isLyricPickerOpen && html`
          <div class="lyric-picker">
            <div class="lbl red lyric-picker__title">CLICK A LINE TO QUOTE IT</div>
            ${lyricLines.map((line, index) => html`
              <span key=${index} class="click h-row lyric-picker__line" onClick=${() => setDraft(current => appendQuote(current, line))}>${line}</span>`)}
            ${!lyricLines.length && html`<span class="lbl muted">NO LYRICS ADDED FOR THIS SONG.</span>`}
          </div>`}
        <div class="lbl red">EARLIER REFLECTIONS</div>
        ${otherReflections.map(other => html`
          <div key=${other.id} class="click h-fade earlier-reflection" onClick=${() => onOpenReflection(other.id)}>
            <div class="lbl earlier-reflection__meta"><span>${formatShortDate(other.date)}</span><span class="muted">${countWords(other.text)} W</span></div>
            <span class="earlier-reflection__excerpt">${excerpt(other.text, 120)}</span>
          </div>`)}
        ${!otherReflections.length && html`<span class="lbl muted">THIS IS YOUR FIRST ONE.</span>`}
      </div>
    </div>`;
}
