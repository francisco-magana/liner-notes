import { html } from '../../lib/html.js';
import { coverStyle } from '../../lib/covers.js';
import { formatShortDate, starString } from '../../lib/format.js';
import { lastActivity } from '../../lib/songs.js';

/** The half-visible vinyl record on the left of the library, labelled with the latest song. */
export function RecordHero({ song, onOpenSong, onAddSong }) {
  const hero = song
    ? {
        kicker: 'LAST REVIEWED',
        title: song.title.toUpperCase(),
        caption: starString(song.rating) + ' / ' + formatShortDate(lastActivity(song)),
        onClick: () => onOpenSong(song.id)
      }
    : { kicker: 'NOTHING HERE', title: 'ADD A SONG', caption: '', onClick: onAddSong };

  return html`
    <div class="record-hero">
      <div class="record-hero__sticky">
        <div class="record-hero__rim"></div>
        <div class="record-hero__vinyl"></div>
        <div class="cover record-hero__label" style=${coverStyle(song)}></div>
        <div class="record-hero__spindle"></div>
        <div class="record-hero__needle"></div>
        <div class="click record-hero__heading" onClick=${hero.onClick}>
          <span class="mono record-hero__kicker">${hero.kicker}</span>
          <span class="record-hero__title">${hero.title}</span>
        </div>
        <div class="mono muted record-hero__caption">${hero.caption}</div>
      </div>
    </div>`;
}
