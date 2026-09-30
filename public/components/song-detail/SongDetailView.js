import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { artistAndGenre, hasLyrics } from '../../lib/songs.js';
import { COLORS } from '../../lib/theme.js';
import { EmptyState } from '../EmptyState.js';
import { AnnotatedLyrics } from './AnnotatedLyrics.js';
import { LyricsEditor } from './LyricsEditor.js';
import { ReflectionList } from './ReflectionList.js';
import { SongSidebar } from './SongSidebar.js';

/**
 * One song: details on the left, lyrics with notes or reflections on the right.
 * `onUpdate(changes)` saves a partial update of the song.
 */
export function SongDetailView({
  song, initialTab = 'lyrics',
  onBack, onUpdate, onEdit, onDelete, onWriteReflection, onOpenReflection, onNotify
}) {
  const [tab, setTab] = useState(initialTab);
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);

  const tabs = [
    { key: 'lyrics', label: 'LYRICS & NOTES' },
    { key: 'reflections', label: `REFLECTIONS (${song.reflections.length})` }
  ];

  function saveLyrics(lyrics) {
    onUpdate({ lyrics });
    setIsEditingLyrics(false);
    onNotify('LYRICS SAVED');
  }

  function renderLyricsTab() {
    if (isEditingLyrics) {
      return html`<${LyricsEditor} initialLyrics=${song.lyrics} onSave=${saveLyrics} onCancel=${() => setIsEditingLyrics(false)} />`;
    }
    if (!hasLyrics(song)) {
      return html`
        <${EmptyState} size="medium" title="NO LYRICS YET" hint="ADD THEM TO START ANNOTATING LINE BY LINE."
          actionLabel="+ ADD LYRICS" onAction=${() => setIsEditingLyrics(true)} />`;
    }
    return html`<${AnnotatedLyrics} song=${song} onEditLyrics=${() => setIsEditingLyrics(true)} onSaveNotes=${notes => onUpdate({ notes })} />`;
  }

  return html`
    <div style="padding:4px 40px 80px;display:grid;grid-template-columns:240px minmax(0,1fr);gap:48px">
      <${SongSidebar} song=${song} onBack=${onBack} onRate=${rating => onUpdate({ rating })} onEdit=${onEdit} onDelete=${onDelete} />

      <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
        <div class="display" style="font-size:108px;line-height:.84;text-wrap:balance">${song.title.toUpperCase()}</div>
        <div class="mono" style="font-weight:500;font-size:12px;letter-spacing:.06em">${artistAndGenre(song)}</div>
        <div class="mono" style="display:flex;gap:28px;border-bottom:1px solid var(--ink);font-weight:500;font-size:12px;letter-spacing:.06em;margin-top:12px">
          ${tabs.map(({ key, label }) => html`
            <span key=${key} class="click" onClick=${() => setTab(key)}
              style="padding:10px 0;margin-bottom:-1px;border-bottom:2px solid ${tab === key ? COLORS.ink : 'transparent'};color:${tab === key ? COLORS.ink : COLORS.mute}">${label}</span>`)}
        </div>

        ${tab === 'lyrics' && renderLyricsTab()}
        ${tab === 'reflections' && html`
          <${ReflectionList} song=${song} onWriteReflection=${onWriteReflection} onOpenReflection=${onOpenReflection} />`}
      </div>
    </div>`;
}
