import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { focusAtEnd } from '../../lib/dom.js';

export function LyricsEditor({ initialLyrics, onSave, onCancel }) {
  const [draft, setDraft] = useState(initialLyrics || '');

  return html`
    <div style="display:flex;flex-direction:column;gap:10px;padding-top:12px">
      <div class="mono muted" style="font-weight:500;font-size:10px;letter-spacing:.06em">ONE LINE PER LYRIC LINE · BLANK LINE = NEW SECTION · NOTES STAY ON THEIR LINE NUMBER</div>
      <textarea class="mono" ref=${focusAtEnd} value=${draft} onInput=${event => setDraft(event.target.value)} placeholder="Paste or type lyrics…"
        style="height:320px;resize:vertical;border:1px solid var(--ink);background:var(--field);padding:14px 16px;outline:none;font-size:14px;line-height:1.7"></textarea>
      <div class="lbl" style="display:flex;gap:12px">
        <span class="click" onClick=${() => onSave(draft.replace(/\s+$/, ''))} style="background:var(--ink);color:var(--bg);padding:10px 18px">SAVE LYRICS</span>
        <span class="click" onClick=${onCancel} style="padding:10px 18px;border:1px solid var(--ink)">CANCEL</span>
      </div>
    </div>`;
}
