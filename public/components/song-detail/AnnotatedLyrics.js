import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { classNames } from '../../lib/classNames.js';
import { focusAtEnd } from '../../lib/dom.js';
import { padNumber } from '../../lib/format.js';

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
    <div class="annotated-lyrics">
      <div class="mono muted annotated-lyrics__header">
        <span></span>
        <div class="annotated-lyrics__header-lyrics">
          <span>LYRICS</span>
          <span class="click annotated-lyrics__edit" onClick=${onEditLyrics}>EDIT LYRICS</span>
        </div>
        <span>NOTES — CLICK A LINE TO ANNOTATE</span>
      </div>
      ${toLyricLines(song).map(line => {
        if (!line.hasText) return line.index > 0 ? html`<div key=${line.index} class="annotated-lyrics__section-break"></div>` : null;
        const isActive = activeLine === line.index;
        return html`
          <div key=${line.index} class=${classNames('annotated-lyrics__line', isActive && 'is-active')}>
            <span class="mono muted annotated-lyrics__number">${padNumber(line.number)}</span>
            <span class=${classNames('click h-lyric annotated-lyrics__text', (line.note || isActive) && 'is-highlighted')}
              onClick=${() => openLine(line.index)}>${line.text}</span>
            <div class="annotated-lyrics__notes">
              ${line.note && !isActive && html`
                <span class="click annotated-lyrics__note" onClick=${() => openLine(line.index)}>${line.note}</span>`}
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
    <div class="note-editor">
      <textarea class="note-editor__input" ref=${focusAtEnd} value=${draft} onInput=${event => onDraftChange(event.target.value)}
        onKeyDown=${handleKeyDown} placeholder="What do you hear in this line?"></textarea>
      <div class="mono note-editor__actions">
        <span class="click note-editor__save" onClick=${onSave}>SAVE ⌘↵</span>
        <span class="click note-editor__link" onClick=${onCancel}>CANCEL</span>
        ${hasExistingNote && html`<span class="click red note-editor__link" onClick=${onRemove}>REMOVE</span>`}
      </div>
    </div>`;
}
