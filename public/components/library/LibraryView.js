import { html } from '../../lib/html.js';
import { classNames } from '../../lib/classNames.js';
import { EmptyState } from '../EmptyState.js';
import { AlbumGrid } from './AlbumGrid.js';
import { ArtistTable } from './ArtistTable.js';
import { RecordHero } from './RecordHero.js';
import { SongTable } from './SongTable.js';
import {
  LIBRARY_TABS, SONG_FILTERS, SORT_ORDERS,
  buildAlbumRows, buildArtistRows, filterAndSortSongs, groupByAlbum, groupByArtist, mostRecentlyActiveSong
} from './libraryData.js';

/**
 * The library: songs, artists or albums, with filter chips and a search box.
 * `filters` ({ tab, filter, sort, query }) lives in the App so it survives navigation.
 */
export function LibraryView({ songs, filters, onFiltersChange, onOpenSong, onAddSong }) {
  const query = filters.query.trim().toLowerCase();
  const tabCounts = {
    songs: songs.length,
    artists: groupByArtist(songs).size,
    albums: groupByAlbum(songs).size
  };
  const showSongsMatching = text => onFiltersChange({ tab: 'songs', filter: 'all', query: text });

  let chips;
  let results;
  let resultCount;
  if (filters.tab === 'songs') {
    const visibleSongs = filterAndSortSongs(songs, { ...filters, query });
    chips = [
      ...SONG_FILTERS.map(songFilter => ({
        label: `${songFilter.label} ${songs.filter(songFilter.matches).length}`,
        isActive: filters.filter === songFilter.key,
        onClick: () => onFiltersChange({ filter: songFilter.key })
      })),
      { label: SORT_ORDERS[filters.sort].label, isActive: false, onClick: () => onFiltersChange({ sort: SORT_ORDERS[filters.sort].next }) }
    ];
    resultCount = visibleSongs.length;
    results = html`<${SongTable} songs=${visibleSongs} onOpenSong=${onOpenSong} />`;
  } else if (filters.tab === 'artists') {
    const artists = buildArtistRows(songs, query);
    chips = [{ label: 'MOST SONGS', isActive: true }];
    resultCount = artists.length;
    results = html`<${ArtistTable} artists=${artists} onSelectArtist=${showSongsMatching} />`;
  } else {
    const albums = buildAlbumRows(songs, query);
    chips = [{ label: 'RECENT', isActive: true }];
    resultCount = albums.length;
    results = html`<${AlbumGrid} albums=${albums} onSelectAlbum=${showSongsMatching} />`;
  }

  const title = LIBRARY_TABS.find(tab => tab.key === filters.tab).title;

  return html`
    <div class="library">
      <${RecordHero} song=${mostRecentlyActiveSong(songs)} onOpenSong=${onOpenSong} onAddSong=${onAddSong} />
      <div class="library__main">
        <div class="library__header">
          <div class="display library__title">${title}</div>
          <${TabList} activeTab=${filters.tab} counts=${tabCounts} onSelect=${tab => onFiltersChange({ tab })} />
        </div>
        <div class="lbl library__toolbar">
          <div class="library__chips">
            ${chips.map(chip => html`
              <span key=${chip.label} class=${classNames('click h-under pill library__chip', chip.isActive && 'is-active')} onClick=${chip.onClick}>${chip.label}</span>`)}
          </div>
          <${SearchBox} value=${filters.query} onChange=${text => onFiltersChange({ query: text })} />
        </div>
        ${resultCount > 0 ? results : html`
          <${EmptyState}
            title=${songs.length ? 'NOTHING MATCHES' : 'YOUR LIBRARY IS EMPTY'}
            hint=${songs.length ? 'TRY ANOTHER SEARCH OR FILTER.' : 'ADD THE FIRST SONG YOU WANT TO THINK ABOUT.'}
            actionLabel="+ ADD A SONG"
            onAction=${onAddSong} />`}
      </div>
    </div>`;
}

function TabList({ activeTab, counts, onSelect }) {
  return html`
    <div class="mono library-tabs">
      ${LIBRARY_TABS.map(tab => {
        const isActive = tab.key === activeTab;
        return html`
          <div key=${tab.key} class=${classNames('click h-ink library-tabs__tab', isActive && 'is-active')} onClick=${() => onSelect(tab.key)}>
            <span>${(isActive ? '● ' : '○ ') + tab.label}</span><span>${counts[tab.key]}</span>
          </div>`;
      })}
    </div>`;
}

function SearchBox({ value, onChange }) {
  return html`
    <div class="library-search">
      <span class="muted">⌕</span>
      <input class="lbl library-search__input" value=${value} onInput=${event => onChange(event.target.value)} placeholder="SEARCH TITLE, ARTIST, LYRIC" />
      ${value && html`<span class="click muted" onClick=${() => onChange('')}>✕</span>`}
    </div>`;
}
