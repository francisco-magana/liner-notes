import { html } from '../../lib/html.js';
import { formatShortDate, starString } from '../../lib/format.js';
import { lastActivity } from '../../lib/songs.js';
import { STRIPE_PATTERN, coverBackground } from '../../lib/theme.js';

/** The half-visible vinyl record on the left of the library, labelled with the latest song. */
export function RecordHero({ song, onOpenSong, onAddSong }) {
  const hero = song
    ? {
        kicker: 'LAST REVIEWED',
        title: song.title.toUpperCase(),
        caption: starString(song.rating) + ' / ' + formatShortDate(lastActivity(song)),
        labelBackground: coverBackground(song),
        onClick: () => onOpenSong(song.id)
      }
    : { kicker: 'NOTHING HERE', title: 'ADD A SONG', caption: '', labelBackground: STRIPE_PATTERN, onClick: onAddSong };

  return html`
    <div style="position:relative">
      <div style="position:sticky;top:0;height:calc(100vh - 80px);min-height:640px;overflow:hidden">
        <div style="position:absolute;left:-340px;top:calc(50% - 340px);width:680px;height:680px;border-radius:50%;border:1px solid var(--red2)"></div>
        <div style="position:absolute;left:-310px;top:calc(50% - 310px);width:620px;height:620px;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 2px,#1c1c1c 2px 4px)"></div>
        <div style="position:absolute;left:-90px;top:calc(50% - 90px);width:180px;height:180px;border-radius:50%;background:${hero.labelBackground}"></div>
        <div style="position:absolute;left:-6px;top:calc(50% - 6px);width:12px;height:12px;border-radius:50%;background:var(--bg)"></div>
        <div style="position:absolute;left:334px;top:calc(50% - 6px);width:12px;height:12px;border-radius:50%;background:var(--red2);box-shadow:0 0 0 4px var(--bg),0 0 0 5px var(--red2)"></div>
        <div class="click" onClick=${hero.onClick} style="position:absolute;left:112px;top:calc(50% - 18px);display:flex;flex-direction:column;gap:4px;color:#f7f6f2;max-width:190px">
          <span class="mono" style="font-size:10px;opacity:.7;letter-spacing:.06em">${hero.kicker}</span>
          <span style="font-size:18px;letter-spacing:.02em;line-height:1.1">${hero.title}</span>
        </div>
        <div class="mono muted" style="position:absolute;left:40px;bottom:30px;font-size:12px">${hero.caption}</div>
      </div>
    </div>`;
}
