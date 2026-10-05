import { html } from '../lib/html.js';
import { classNames } from '../lib/classNames.js';

const LIBRARY_VIEWS = ['library', 'song', 'reflection'];

export function Nav({ route, onLibrary, onDiary, onAddSong, onSettings }) {
  const isAddingSong = route.view === 'songForm' && !route.songId;

  return html`
    <div class="nav">
      <span class="click nav__logo" onClick=${onLibrary}>L/N</span>
      <div class="nav__links">
        <span class=${classNames('click nav__link', LIBRARY_VIEWS.includes(route.view) && 'is-active')} onClick=${onLibrary}>LIBRARY</span>
        <span class=${classNames('click nav__link', route.view === 'diary' && 'is-active')} onClick=${onDiary}>DIARY</span>
        <span class=${classNames('click nav__link nav__link--add', isAddingSong && 'is-active')} onClick=${onAddSong}>+ ADD SONG</span>
        <span class="click nav__link nav__settings" onClick=${onSettings}>SETTINGS</span>
      </div>
    </div>`;
}
