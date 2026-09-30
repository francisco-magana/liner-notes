import { useState } from 'preact/hooks';
import { api } from '../../api.js';
import { html } from '../../lib/html.js';
import { SEARCH_TYPES, resultSubtitle, resultThumbnail, resultToFormFields } from '../../lib/spotify.js';
import { STRIPE_PATTERN, imageBackground, pillColors } from '../../lib/theme.js';

/**
 * "Load from Spotify" box on the song form. `onFill` receives form fields from a
 * result. `onImportAlbum` adds a whole album; its errors are shown inside the panel.
 */
export function SpotifyPanel({ isConfigured, currentGenre, firstHeard, onFill, onImportAlbum, onOpenSettings }) {
  const [searchType, setSearchType] = useState('track');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  function changeSearchType(type) {
    setSearchType(type);
    setResults([]);
    setError('');
  }

  async function search() {
    const text = query.trim();
    if (!text) return;
    setIsLoading(true);
    setError('');
    setResults([]);
    try {
      const { items } = await api.spotifySearch(searchType, text);
      setResults(items.map(item => ({ type: searchType, item })));
      setError(items.length ? '' : 'NO RESULTS');
    } catch (searchError) {
      setError(searchError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function importAlbum(album) {
    setIsLoading(true);
    setError('');
    try {
      await onImportAlbum({ albumId: album.id, genre: currentGenre || '', firstHeard: firstHeard || '' });
    } catch (importError) {
      setIsLoading(false);
      setError(importError.message);
    }
  }

  const placeholder = SEARCH_TYPES.find(option => option.type === searchType).placeholder;

  return html`
    <div style="border:1px solid var(--ink);padding:14px 16px;display:flex;flex-direction:column;gap:12px">
      <div class="lbl" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <span class="red" style="white-space:nowrap">LOAD FROM SPOTIFY</span>
        <div style="display:flex;gap:6px">
          ${SEARCH_TYPES.map(option => html`
            <span key=${option.type} class="click" onClick=${() => changeSearchType(option.type)} style="padding:3px 8px;${pillColors(searchType === option.type)}">${option.label}</span>`)}
        </div>
      </div>
      ${isConfigured ? html`
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;gap:10px;align-items:center">
            <input class="f-ink" value=${query} onInput=${event => setQuery(event.target.value)}
              onKeyDown=${event => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} placeholder=${placeholder}
              style="flex:1;min-width:0;border:0;border-bottom:1px solid var(--line);background:transparent;outline:none;font-size:16px;padding:6px 0" />
            <span class="lbl click h-redbg" onClick=${search} style="background:var(--ink);color:var(--bg);padding:8px 14px">SEARCH</span>
          </div>
          ${isLoading && html`<span class="lbl muted">SEARCHING…</span>`}
          ${error && !isLoading && html`<span class="lbl red">${error}</span>`}
          ${results.length > 0 && html`
            <div style="display:flex;flex-direction:column;max-height:248px;overflow:auto">
              ${results.map(({ type, item }) => html`
                <${SearchResult} key=${item.id} type=${type} item=${item}
                  onUse=${() => onFill(resultToFormFields(type, item, currentGenre))}
                  onAddAll=${() => importAlbum(item)} />`)}
            </div>`}
        </div>` : html`
        <div class="lbl muted" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <span>ADD SPOTIFY CREDENTIALS IN SETTINGS TO SEARCH SONGS, ALBUMS AND ARTISTS.</span>
          <span class="click" onClick=${onOpenSettings} style="color:var(--ink);border-bottom:1px solid var(--ink);white-space:nowrap">OPEN SETTINGS</span>
        </div>`}
    </div>`;
}

function SearchResult({ type, item, onUse, onAddAll }) {
  const thumbnail = resultThumbnail(type, item);
  return html`
    <div style="display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:6px 0;border-top:1px solid var(--rule2)">
      <div style="width:40px;height:40px;border-radius:${type === 'artist' ? '50%' : '0'};background:${thumbnail ? imageBackground(thumbnail) : STRIPE_PATTERN}"></div>
      <div class="mono" style="display:flex;flex-direction:column;gap:2px;min-width:0;font-size:12px">
        <span class="ellipsis" style="font-weight:500">${item.name.toUpperCase()}</span>
        <span class="ellipsis muted">${resultSubtitle(type, item).toUpperCase()}</span>
      </div>
      <div class="lbl" style="display:flex;gap:8px;font-size:10px">
        <span class="click h-invert" onClick=${onUse} style="border:1px solid var(--ink);padding:5px 8px;white-space:nowrap">USE</span>
        ${type === 'album' && html`
          <span class="click" onClick=${onAddAll} style="background:var(--red);color:#fff;padding:6px 8px;white-space:nowrap">ADD ALL ${item.total_tracks || ''}</span>`}
      </div>
    </div>`;
}
