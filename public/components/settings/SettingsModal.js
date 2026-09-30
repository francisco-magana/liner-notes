import { useState } from 'preact/hooks';
import { api } from '../../api.js';
import { html } from '../../lib/html.js';
import { classNames } from '../../lib/classNames.js';

const THEMES = [{ value: 'light', label: 'LIGHT' }, { value: 'dark', label: 'DARK' }];

/**
 * Theme (applied immediately) and Spotify credentials (applied on Save).
 * `onSaveCredentials({ clientId, clientSecret })` is handled by the App.
 */
export function SettingsModal({ settings, isDark, onThemeChange, onSaveCredentials, onClose }) {
  const [credentials, setCredentials] = useState({ clientId: settings.clientId, clientSecret: settings.clientSecret });
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [testStatus, setTestStatus] = useState('');

  const hasSavedCredentials = Boolean(settings.clientId && settings.clientSecret);
  const status = testStatus || (hasSavedCredentials ? 'SAVED' : 'NOT CONNECTED');
  const isStatusPositive = /✓|SAVED/.test(status);

  function updateCredentials(changes) {
    setCredentials(current => ({ ...current, ...changes }));
    setTestStatus('');
  }

  async function testConnection() {
    const { clientId, clientSecret } = credentials;
    if (!clientId || !clientSecret) {
      setTestStatus('ENTER BOTH FIELDS');
      return;
    }
    setTestStatus('TESTING…');
    try {
      await api.testSpotify({ clientId, clientSecret });
      setTestStatus('CONNECTED ✓');
    } catch (error) {
      setTestStatus(error.message);
    }
  }

  function toggleSecretVisibility(event) {
    event.preventDefault(); // Keeps the click from focusing the input inside the same <label>.
    setIsSecretVisible(!isSecretVisible);
  }

  return html`
    <div class="settings-backdrop" onClick=${onClose}>
      <div class="settings" onClick=${event => event.stopPropagation()}>
        <div class="settings__header">
          <div class="display settings__title">SETTINGS</div>
          <span class="lbl click h-red settings__close" onClick=${onClose}>✕ CLOSE</span>
        </div>

        <div class="settings__section">
          <span class="lbl red">APPEARANCE</span>
          <div class="settings__row">
            <span class="settings__row-label">Theme</span>
            <div class="settings__theme-toggle">
              ${THEMES.map(theme => html`
                <span key=${theme.value} class=${classNames('lbl click pill settings__theme-option', isDark === (theme.value === 'dark') && 'is-active')}
                  onClick=${() => onThemeChange(theme.value)}>${theme.label}</span>`)}
            </div>
          </div>
        </div>

        <div class="settings__section settings__section--spotify">
          <div class="lbl settings__status-row">
            <span class="red">SPOTIFY</span>
            <span class=${classNames('settings__status', isStatusPositive && 'is-positive')}>${status}</span>
          </div>
          <span class="settings__help">
            Optional. Create an app in the Spotify developer dashboard and paste its Client ID and Client secret. They're saved only in this app's local database and used to look up songs, albums and artists.
          </span>
          <label class="settings__field">
            <span class="lbl muted">CLIENT ID</span>
            <input class="mono f-red settings__input" value=${credentials.clientId}
              onInput=${event => updateCredentials({ clientId: event.target.value.trim() })}
              placeholder="32-character ID" spellCheck=${false} />
          </label>
          <label class="settings__field">
            <div class="lbl muted settings__field-header">
              <span>CLIENT SECRET</span>
              <span class="click settings__secret-toggle" onClick=${toggleSecretVisibility}>${isSecretVisible ? 'HIDE' : 'SHOW'}</span>
            </div>
            <input class="mono f-red settings__input" type=${isSecretVisible ? 'text' : 'password'} value=${credentials.clientSecret}
              onInput=${event => updateCredentials({ clientSecret: event.target.value.trim() })}
              placeholder="32-character secret" spellCheck=${false} />
          </label>
          <div class="lbl settings__credential-actions">
            <span class="click h-row settings__test" onClick=${testConnection}>TEST CONNECTION</span>
            <span class="click red" onClick=${() => updateCredentials({ clientId: '', clientSecret: '' })}>REMOVE</span>
          </div>
        </div>

        <div class="mono settings__footer">
          <span class="click settings__cancel" onClick=${onClose}>CANCEL</span>
          <span class="click h-redbg settings__save" onClick=${() => onSaveCredentials(credentials)}>SAVE</span>
        </div>
      </div>
    </div>`;
}
