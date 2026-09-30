import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { BASE_MOODS, emptySongForm, songToForm } from '../../lib/songs.js';
import { COLORS } from '../../lib/theme.js';
import { RatingStars } from '../RatingStars.js';
import { ArtworkPicker } from './ArtworkPicker.js';
import { MoodPicker } from './MoodPicker.js';
import { SpotifyPanel } from './SpotifyPanel.js';

const FIELD_STYLE = 'font-size:20px;padding:4px 0 8px';
const TRIMMED_FIELDS = ['title', 'artist', 'album', 'genre', 'year'];

/**
 * Add a new song, or edit `song` when given. `onSave(fields)` persists the form;
 * the App handles errors and navigation, so it never throws.
 */
export function SongFormView({ song, knownMoods, isSpotifyConfigured, onSave, onCancel, onImportAlbum, onOpenSettings, onNotify }) {
  const [form, setForm] = useState(() => (song ? songToForm(song) : emptySongForm()));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(song);
  const moodOptions = [...new Set([...BASE_MOODS, ...knownMoods, ...form.moods])];

  function updateForm(changes) {
    setForm(current => ({ ...current, ...changes }));
    setErrors({});
  }

  const bindField = name => event => updateForm({ [name]: event.target.value });

  async function save() {
    const missing = {};
    if (!form.title.trim()) missing.title = '— NEEDED';
    if (!form.artist.trim()) missing.artist = '— NEEDED';
    if (Object.keys(missing).length) {
      setErrors(missing);
      return;
    }
    if (isSaving) return;

    const fields = { ...form };
    for (const name of TRIMMED_FIELDS) fields[name] = form[name].trim();
    setIsSaving(true);
    await onSave(fields);
    setIsSaving(false);
  }

  function fillFromSpotify(fields) {
    updateForm(fields);
    onNotify('FILLED FROM SPOTIFY');
  }

  return html`
    <div style="padding:4px 40px 60px;display:grid;grid-template-columns:minmax(300px,420px) minmax(0,1fr);gap:48px">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="display" style="font-size:clamp(80px,8vw,112px);line-height:.84">${isEditing ? 'EDIT' : 'NEW'}<br/>${isEditing ? 'SONG' : 'ENTRY'}</div>
        <${ArtworkPicker} art=${form.art} onChange=${art => updateForm({ art })} onError=${onNotify} />
      </div>

      <div style="display:flex;flex-direction:column;gap:22px;padding-top:6px;max-width:760px">
        <div class="lbl muted" style="display:flex;flex-wrap:wrap;gap:4px 16px;white-space:nowrap;justify-content:space-between">
          <span>EVERYTHING STAYS ON THIS DEVICE</span><span>* REQUIRED</span>
        </div>

        <${SpotifyPanel}
          isConfigured=${isSpotifyConfigured}
          currentGenre=${form.genre}
          firstHeard=${form.firstHeard}
          onFill=${fillFromSpotify}
          onImportAlbum=${onImportAlbum}
          onOpenSettings=${onOpenSettings} />

        <label style="display:flex;flex-direction:column;gap:6px">
          <${FieldLabel} text=${'TITLE * ' + (errors.title || '')} color=${COLORS.red} />
          <input class="field f-red" value=${form.title} onInput=${bindField('title')} placeholder="Song title"
            style="border-bottom-color:${errors.title ? COLORS.red : COLORS.ink};font-size:40px;font-weight:500;font-stretch:72%;letter-spacing:-.02em;padding:2px 0 8px;text-transform:uppercase" />
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
          <label style="display:flex;flex-direction:column;gap:6px">
            <${FieldLabel} text=${'ARTIST * ' + (errors.artist || '')} color=${errors.artist ? COLORS.red : COLORS.mute} />
            <input class="field f-red" value=${form.artist} onInput=${bindField('artist')} placeholder="Who made it"
              style="border-bottom-color:${errors.artist ? COLORS.red : COLORS.ink};${FIELD_STYLE}" />
          </label>
          <${TextField} label="ALBUM" value=${form.album} onInput=${bindField('album')} placeholder="Album or single" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px">
          <${TextField} label="YEAR" value=${form.year} onInput=${bindField('year')} placeholder="2026" inputMode="numeric" />
          <${TextField} label="GENRE" value=${form.genre} onInput=${bindField('genre')} placeholder="Dream pop" />
          <label style="display:flex;flex-direction:column;gap:6px">
            <${FieldLabel} text="FIRST HEARD" />
            <input class="field f-red" type="date" value=${form.firstHeard} onInput=${bindField('firstHeard')} style="font-size:18px;padding:4px 0 8px" />
          </label>
        </div>
        <div style="display:grid;grid-template-columns:220px minmax(0,1fr);gap:28px">
          <div style="display:flex;flex-direction:column;gap:8px">
            <${FieldLabel} text="RATING" />
            <${RatingStars} rating=${form.rating} onChange=${rating => updateForm({ rating })} size=${30} gap=${4} hoverClass="h-scale" />
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <${FieldLabel} text="MOOD" />
            <${MoodPicker} options=${moodOptions} selected=${form.moods} onChange=${moods => updateForm({ moods })} />
          </div>
        </div>
        <label style="display:flex;flex-direction:column;gap:8px">
          <div class="lbl muted" style="display:flex;flex-wrap:wrap;gap:4px 16px;justify-content:space-between">
            <span>LYRICS — OPTIONAL</span><span>ONE LINE PER LYRIC LINE · BLANK LINE = NEW SECTION</span>
          </div>
          <textarea class="mono f-box" value=${form.lyrics} onInput=${bindField('lyrics')} placeholder="Paste or type lyrics…"
            style="height:120px;resize:vertical;border:1px solid var(--line);background:var(--field);padding:12px 14px;outline:none;font-size:13px;line-height:1.6"></textarea>
        </label>
        <div class="mono" style="display:flex;justify-content:flex-end;gap:12px;font-weight:500;font-size:12px;letter-spacing:.06em">
          <span class="click h-row" onClick=${onCancel} style="padding:14px 22px;border:1px solid var(--ink)">CANCEL</span>
          <span class="click h-redbg" onClick=${save} style="padding:14px 28px;background:var(--ink);color:var(--bg);opacity:${isSaving ? 0.6 : 1}">
            ${isSaving ? 'SAVING…' : isEditing ? 'SAVE CHANGES →' : 'SAVE ENTRY →'}
          </span>
        </div>
      </div>
    </div>`;
}

function FieldLabel({ text, color = COLORS.mute }) {
  return html`<span class="lbl" style="color:${color}">${text}</span>`;
}

function TextField({ label, ...inputProps }) {
  return html`
    <label style="display:flex;flex-direction:column;gap:6px">
      <${FieldLabel} text=${label} />
      <input class="field f-red" style=${FIELD_STYLE} ...${inputProps} />
    </label>`;
}
