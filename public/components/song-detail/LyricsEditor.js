import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { focusAtEnd } from '../../lib/dom.js';

export function LyricsEditor({ initialLyrics, onSave, onCancel }) {
  const [draft, setDraft] = useState(initialLyrics || '');

  return html`
    <div class="lyrics-editor">
      <div class="mono muted lyrics-editor__hint">ONE LINE PER LYRIC LINE · BLANK LINE = NEW SECTION · NOTES STAY ON THEIR LINE NUMBER</div>
      <textarea class="mono lyrics-editor__input" ref=${focusAtEnd} value=${draft} onInput=${event => setDraft(event.target.value)}
        placeholder="Paste or type lyrics…"></textarea>
      <div class="lbl lyrics-editor__actions">
        <span class="click lyrics-editor__save" onClick=${() => onSave(draft.replace(/\s+$/, ''))}>SAVE LYRICS</span>
        <span class="click lyrics-editor__cancel" onClick=${onCancel}>CANCEL</span>
      </div>
    </div>`;
}
