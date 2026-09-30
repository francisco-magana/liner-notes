import { html } from '../../lib/html.js';
import { COLORS, pillColors } from '../../lib/theme.js';
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
    <div style="display:grid;grid-template-columns:380px minmax(0,1fr)">
      <${RecordHero} song=${mostRecentlyActiveSong(songs)} onOpenSong=${onOpenSong} onAddSong=${onAddSong} />
      <div style="padding:4px 40px 80px;display:flex;flex-direction:column;gap:18px;min-width:0">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px">
          <div class="display" style="font-size:clamp(80px,8vw,140px);line-height:.82;min-width:0">${title}</div>
          <${TabList} activeTab=${filters.tab} counts=${tabCounts} onSelect=${tab => onFiltersChange({ tab })} />
        </div>
        <div class="lbl" style="display:flex;justify-content:space-between;align-items:center;gap:20px;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:8px 0">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${chips.map(chip => html`
              <span key=${chip.label} class="click h-under" onClick=${chip.onClick} style="padding:4px 8px;white-space:nowrap;${pillColors(chip.isActive)}">${chip.label}</span>`)}
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
    <div class="mono" style="display:flex;flex-direction:column;gap:6px;font-weight:500;font-size:12px;letter-spacing:.06em;padding-bottom:4px;min-width:150px">
      ${LIBRARY_TABS.map(tab => {
        const isActive = tab.key === activeTab;
        return html`
          <div key=${tab.key} class="click h-ink" onClick=${() => onSelect(tab.key)}
            style="display:flex;justify-content:space-between;gap:24px;color:${isActive ? COLORS.ink : COLORS.mute};border-bottom:1px solid ${isActive ? COLORS.ink : 'transparent'};padding-bottom:2px">
            <span>${(isActive ? '● ' : '○ ') + tab.label}</span><span>${counts[tab.key]}</span>
          </div>`;
      })}
    </div>`;
}

function SearchBox({ value, onChange }) {
  return html`
    <div style="display:flex;align-items:center;gap:8px;flex:0 1 260px;min-width:160px;border-bottom:1px solid var(--line)">
      <span class="muted">⌕</span>
      <input class="lbl" value=${value} onInput=${event => onChange(event.target.value)} placeholder="SEARCH TITLE, ARTIST, LYRIC"
        style="flex:1;min-width:0;border:0;background:transparent;outline:none;padding:4px 0" />
      ${value && html`<span class="click muted" onClick=${() => onChange('')}>✕</span>`}
    </div>`;
}
