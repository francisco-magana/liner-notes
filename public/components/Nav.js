import { html } from '../lib/html.js';
import { COLORS, underlineBorder } from '../lib/theme.js';

const LIBRARY_VIEWS = ['library', 'song', 'reflection'];

export function Nav({ route, onLibrary, onDiary, onAddSong, onSettings }) {
  const isAddingSong = route.view === 'songForm' && !route.songId;

  return html`
    <div style="height:80px;padding:0 40px;display:flex;align-items:center;justify-content:space-between;font-size:14px;letter-spacing:.04em;position:relative;z-index:2">
      <span class="click" onClick=${onLibrary} style="font-weight:600">L/N</span>
      <div style="display:flex;gap:28px">
        <span class="click" onClick=${onLibrary} style="padding-bottom:2px;border-bottom:${underlineBorder(LIBRARY_VIEWS.includes(route.view))}">LIBRARY</span>
        <span class="click" onClick=${onDiary} style="padding-bottom:2px;border-bottom:${underlineBorder(route.view === 'diary')}">DIARY</span>
        <span class="click h-fade" onClick=${onAddSong} style="color:var(--red);padding-bottom:2px;border-bottom:${underlineBorder(isAddingSong, COLORS.red)}">+ ADD SONG</span>
        <span class="click h-ink" onClick=${onSettings} style="padding-bottom:2px;color:var(--mute)">SETTINGS</span>
      </div>
    </div>`;
}
