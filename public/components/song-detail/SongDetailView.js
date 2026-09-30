import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { classNames } from '../../lib/classNames.js';
import { artistAndGenre, hasLyrics } from '../../lib/songs.js';
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
    <div class="song-detail">
      <${SongSidebar} song=${song} onBack=${onBack} onRate=${rating => onUpdate({ rating })} onEdit=${onEdit} onDelete=${onDelete} />

      <div class="song-detail__main">
        <div class="display song-detail__title">${song.title.toUpperCase()}</div>
        <div class="mono song-detail__byline">${artistAndGenre(song)}</div>
        <div class="mono song-detail__tabs">
          ${tabs.map(({ key, label }) => html`
            <span key=${key} class=${classNames('click song-detail__tab', tab === key && 'is-active')} onClick=${() => setTab(key)}>${label}</span>`)}
        </div>

        ${tab === 'lyrics' && renderLyricsTab()}
        ${tab === 'reflections' && html`
          <${ReflectionList} song=${song} onWriteReflection=${onWriteReflection} onOpenReflection=${onOpenReflection} />`}
      </div>
    </div>`;
}
