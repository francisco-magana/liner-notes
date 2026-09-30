import { useState } from 'preact/hooks';
import { api } from '../../api.js';
import { html } from '../../lib/html.js';
import { classNames } from '../../lib/classNames.js';
import { imageStyle } from '../../lib/covers.js';
import { SEARCH_TYPES, resultSubtitle, resultThumbnail, resultToFormFields } from '../../lib/spotify.js';

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
    <div class="spotify-panel">
      <div class="lbl spotify-panel__header">
        <span class="red spotify-panel__title">LOAD FROM SPOTIFY</span>
        <div class="spotify-panel__types">
          ${SEARCH_TYPES.map(option => html`
            <span key=${option.type} class=${classNames('click pill spotify-panel__type', searchType === option.type && 'is-active')}
              onClick=${() => changeSearchType(option.type)}>${option.label}</span>`)}
        </div>
      </div>
      ${isConfigured ? html`
        <div class="spotify-panel__search">
          <div class="spotify-panel__search-row">
            <input class="f-ink spotify-panel__query" value=${query} onInput=${event => setQuery(event.target.value)}
              onKeyDown=${event => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} placeholder=${placeholder} />
            <span class="lbl click h-redbg spotify-panel__search-button" onClick=${search}>SEARCH</span>
          </div>
          ${isLoading && html`<span class="lbl muted">SEARCHING…</span>`}
          ${error && !isLoading && html`<span class="lbl red">${error}</span>`}
          ${results.length > 0 && html`
            <div class="spotify-panel__results">
              ${results.map(({ type, item }) => html`
                <${SearchResult} key=${item.id} type=${type} item=${item}
                  onUse=${() => onFill(resultToFormFields(type, item, currentGenre))}
                  onAddAll=${() => importAlbum(item)} />`)}
            </div>`}
        </div>` : html`
        <div class="lbl muted spotify-panel__setup">
          <span>ADD SPOTIFY CREDENTIALS IN SETTINGS TO SEARCH SONGS, ALBUMS AND ARTISTS.</span>
          <span class="click spotify-panel__setup-link" onClick=${onOpenSettings}>OPEN SETTINGS</span>
        </div>`}
    </div>`;
}

function SearchResult({ type, item, onUse, onAddAll }) {
  const thumbnailClass = classNames('cover spotify-result__thumbnail', type === 'artist' && 'spotify-result__thumbnail--round');
  return html`
    <div class="spotify-result">
      <div class=${thumbnailClass} style=${imageStyle(resultThumbnail(type, item))}></div>
      <div class="mono spotify-result__info">
        <span class="ellipsis spotify-result__name">${item.name.toUpperCase()}</span>
        <span class="ellipsis muted">${resultSubtitle(type, item).toUpperCase()}</span>
      </div>
      <div class="lbl spotify-result__actions">
        <span class="click h-invert spotify-result__use" onClick=${onUse}>USE</span>
        ${type === 'album' && html`
          <span class="click spotify-result__add-all" onClick=${onAddAll}>ADD ALL ${item.total_tracks || ''}</span>`}
      </div>
    </div>`;
}
