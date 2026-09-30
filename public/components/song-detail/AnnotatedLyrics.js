import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { focusAtEnd } from '../../lib/dom.js';
import { padNumber } from '../../lib/format.js';
import { COLORS } from '../../lib/theme.js';

const COLUMNS = 'grid-template-columns:30px minmax(0,1fr) minmax(0,1fr);column-gap:24px';

/**
 * Lyrics next to their notes. Notes are keyed by the line's index in the raw
 * lyrics (blank lines included), so they stay put when a section break is added.
 */
function toLyricLines(song) {
  let textLineNumber = 0;
  return (song.lyrics || '').split('\n').map((text, index) => {
    const hasText = Boolean(text.trim());
    if (hasText) textLineNumber++;
    return { index, text, hasText, number: textLineNumber, note: song.notes[index] || '' };
  });
}

/** Click a line to write a note about it. `onSaveNotes` receives the whole notes object. */
export function AnnotatedLyrics({ song, onEditLyrics, onSaveNotes }) {
  const [activeLine, setActiveLine] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  function openLine(index) {
    setActiveLine(index);
    setNoteDraft(song.notes[index] || '');
  }

  function saveNote(text) {
    const notes = { ...song.notes };
    if (text) notes[activeLine] = text;
    else delete notes[activeLine];
    onSaveNotes(notes);
    setActiveLine(null);
  }

  const closeNote = () => setActiveLine(null);

  return html`
    <div style="display:flex;flex-direction:column">
      <div class="mono muted" style="display:grid;${COLUMNS};font-weight:500;font-size:10px;letter-spacing:.06em;padding:8px 0">
        <span></span>
        <div style="display:flex;justify-content:space-between">
          <span>LYRICS</span>
          <span class="click" onClick=${onEditLyrics} style="color:var(--ink);border-bottom:1px solid var(--ink)">EDIT LYRICS</span>
        </div>
        <span>NOTES — CLICK A LINE TO ANNOTATE</span>
      </div>
      ${toLyricLines(song).map(line => {
        if (!line.hasText) return line.index > 0 ? html`<div key=${line.index} style="height:18px"></div>` : null;
        const isActive = activeLine === line.index;
        return html`
          <div key=${line.index} style="display:grid;${COLUMNS};align-items:baseline;border-top:1px solid var(--rule2);padding:6px 0;background:${isActive ? 'var(--hover)' : 'transparent'}">
            <span class="mono muted" style="font-size:10px">${padNumber(line.number)}</span>
            <span class="click h-lyric" onClick=${() => openLine(line.index)}
              style="font-size:18px;line-height:1.3;color:${line.note || isActive ? 'var(--redInk)' : COLORS.ink}">${line.text}</span>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${line.note && !isActive && html`
                <span class="click" onClick=${() => openLine(line.index)} style="font-size:14px;line-height:1.4;color:var(--ink3);text-wrap:pretty">${line.note}</span>`}
              ${isActive && html`
                <${NoteEditor}
                  draft=${noteDraft}
                  onDraftChange=${setNoteDraft}
                  hasExistingNote=${Boolean(line.note)}
                  onSave=${() => saveNote(noteDraft.trim())}
                  onRemove=${() => saveNote('')}
                  onCancel=${closeNote} />`}
            </div>
          </div>`;
      })}
    </div>`;
}

function NoteEditor({ draft, onDraftChange, hasExistingNote, onSave, onRemove, onCancel }) {
  function handleKeyDown(event) {
    if (event.key === 'Escape') onCancel();
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) onSave();
  }

  return html`
    <div style="display:flex;flex-direction:column;gap:8px">
      <textarea ref=${focusAtEnd} value=${draft} onInput=${event => onDraftChange(event.target.value)} onKeyDown=${handleKeyDown}
        placeholder="What do you hear in this line?"
        style="height:76px;resize:vertical;border:1px solid var(--ink);background:var(--field);padding:8px 10px;outline:none;font-size:14px;line-height:1.4"></textarea>
      <div class="mono" style="display:flex;gap:12px;font-weight:500;font-size:10px;letter-spacing:.06em">
        <span class="click" onClick=${onSave} style="background:var(--ink);color:var(--bg);padding:5px 10px">SAVE ⌘↵</span>
        <span class="click" onClick=${onCancel} style="padding:5px 0">CANCEL</span>
        ${hasExistingNote && html`<span class="click red" onClick=${onRemove} style="padding:5px 0">REMOVE</span>`}
      </div>
    </div>`;
}
