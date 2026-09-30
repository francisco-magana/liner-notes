import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { classNames } from '../../lib/classNames.js';
import { BASE_MOODS, emptySongForm, songToForm } from '../../lib/songs.js';
import { RatingStars } from '../RatingStars.js';
import { ArtworkPicker } from './ArtworkPicker.js';
import { MoodPicker } from './MoodPicker.js';
import { SpotifyPanel } from './SpotifyPanel.js';

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
    <div class="song-form">
      <div class="song-form__aside">
        <div class="display song-form__heading">${isEditing ? 'EDIT' : 'NEW'}<br/>${isEditing ? 'SONG' : 'ENTRY'}</div>
        <${ArtworkPicker} art=${form.art} onChange=${art => updateForm({ art })} onError=${onNotify} />
      </div>

      <div class="song-form__fields">
        <div class="lbl muted song-form__notice">
          <span>EVERYTHING STAYS ON THIS DEVICE</span><span>* REQUIRED</span>
        </div>

        <${SpotifyPanel}
          isConfigured=${isSpotifyConfigured}
          currentGenre=${form.genre}
          firstHeard=${form.firstHeard}
          onFill=${fillFromSpotify}
          onImportAlbum=${onImportAlbum}
          onOpenSettings=${onOpenSettings} />

        <${TextField} label=${'TITLE * ' + (errors.title || '')} isLabelAlert isInvalid=${Boolean(errors.title)} variant="title"
          value=${form.title} onInput=${bindField('title')} placeholder="Song title" />
        <div class="song-form__row song-form__row--halves">
          <${TextField} label=${'ARTIST * ' + (errors.artist || '')} isLabelAlert=${Boolean(errors.artist)} isInvalid=${Boolean(errors.artist)}
            value=${form.artist} onInput=${bindField('artist')} placeholder="Who made it" />
          <${TextField} label="ALBUM" value=${form.album} onInput=${bindField('album')} placeholder="Album or single" />
        </div>
        <div class="song-form__row song-form__row--thirds">
          <${TextField} label="YEAR" value=${form.year} onInput=${bindField('year')} placeholder="2026" inputMode="numeric" />
          <${TextField} label="GENRE" value=${form.genre} onInput=${bindField('genre')} placeholder="Dream pop" />
          <${TextField} label="FIRST HEARD" variant="date" type="date" value=${form.firstHeard} onInput=${bindField('firstHeard')} />
        </div>
        <div class="song-form__row song-form__row--rating">
          <div class="song-form__rating">
            <${FieldLabel} text="RATING" />
            <${RatingStars} rating=${form.rating} onChange=${rating => updateForm({ rating })} size="large" />
          </div>
          <div class="song-form__moods">
            <${FieldLabel} text="MOOD" />
            <${MoodPicker} options=${moodOptions} selected=${form.moods} onChange=${moods => updateForm({ moods })} />
          </div>
        </div>
        <label class="song-form__lyrics-field">
          <div class="lbl muted song-form__lyrics-hint">
            <span>LYRICS — OPTIONAL</span><span>ONE LINE PER LYRIC LINE · BLANK LINE = NEW SECTION</span>
          </div>
          <textarea class="mono f-box song-form__lyrics" value=${form.lyrics} onInput=${bindField('lyrics')} placeholder="Paste or type lyrics…"></textarea>
        </label>
        <div class="mono song-form__actions">
          <span class="click h-row song-form__cancel" onClick=${onCancel}>CANCEL</span>
          <span class=${classNames('click h-redbg song-form__save', isSaving && 'is-saving')} onClick=${save}>
            ${isSaving ? 'SAVING…' : isEditing ? 'SAVE CHANGES →' : 'SAVE ENTRY →'}
          </span>
        </div>
      </div>
    </div>`;
}

function FieldLabel({ text, isAlert = false }) {
  return html`<span class=${classNames('lbl song-form__label', isAlert && 'is-alert')}>${text}</span>`;
}

/** Labelled underline input. `variant` is 'title' or 'date' for the larger and date fields. */
function TextField({ label, isLabelAlert = false, isInvalid = false, variant, ...inputProps }) {
  const inputClass = classNames('field f-red song-form__input', variant && `song-form__input--${variant}`, isInvalid && 'is-invalid');
  return html`
    <label class="song-form__field">
      <${FieldLabel} text=${label} isAlert=${isLabelAlert} />
      <input class=${inputClass} ...${inputProps} />
    </label>`;
}
