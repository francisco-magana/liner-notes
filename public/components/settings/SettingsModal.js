import { useState } from 'preact/hooks';
import { api } from '../../api.js';
import { html } from '../../lib/html.js';
import { COLORS, pillColors } from '../../lib/theme.js';

const THEMES = [{ value: 'light', label: 'LIGHT' }, { value: 'dark', label: 'DARK' }];
const FIELD_STYLE = 'border:0;border-bottom:1px solid var(--ink);background:transparent;outline:none;font-size:14px;padding:6px 0';

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
    <div onClick=${onClose} style="position:fixed;inset:0;background:rgba(10,10,9,.5);z-index:20;display:flex;align-items:center;justify-content:center">
      <div onClick=${event => event.stopPropagation()}
        style="width:560px;max-width:calc(100vw - 48px);max-height:calc(100vh - 48px);overflow:auto;box-sizing:border-box;background:var(--bg);color:var(--ink);border:1px solid var(--ink);padding:32px;display:flex;flex-direction:column;gap:26px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="display" style="font-size:72px;line-height:.82">SETTINGS</div>
          <span class="lbl click h-red" onClick=${onClose} style="padding:4px">✕ CLOSE</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--ink);padding-top:14px">
          <span class="lbl red">APPEARANCE</span>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:17px">Theme</span>
            <div style="display:flex;border:1px solid var(--ink)">
              ${THEMES.map(theme => html`
                <span key=${theme.value} class="lbl click" onClick=${() => onThemeChange(theme.value)}
                  style="padding:8px 16px;${pillColors(isDark === (theme.value === 'dark'))}">${theme.label}</span>`)}
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;border-top:1px solid var(--ink);padding-top:14px">
          <div class="lbl" style="display:flex;justify-content:space-between">
            <span class="red">SPOTIFY</span>
            <span style="color:${isStatusPositive ? COLORS.ink : COLORS.mute}">${status}</span>
          </div>
          <span style="font-size:14px;line-height:1.5;color:var(--ink3);text-wrap:pretty">
            Optional. Create an app in the Spotify developer dashboard and paste its Client ID and Client secret. They're saved only in this app's local database and used to look up songs, albums and artists.
          </span>
          <label style="display:flex;flex-direction:column;gap:6px">
            <span class="lbl muted">CLIENT ID</span>
            <input class="mono f-red" value=${credentials.clientId} onInput=${event => updateCredentials({ clientId: event.target.value.trim() })}
              placeholder="32-character ID" spellCheck=${false} style=${FIELD_STYLE} />
          </label>
          <label style="display:flex;flex-direction:column;gap:6px">
            <div class="lbl muted" style="display:flex;justify-content:space-between">
              <span>CLIENT SECRET</span>
              <span class="click" onClick=${toggleSecretVisibility} style="color:var(--ink)">${isSecretVisible ? 'HIDE' : 'SHOW'}</span>
            </div>
            <input class="mono f-red" type=${isSecretVisible ? 'text' : 'password'} value=${credentials.clientSecret}
              onInput=${event => updateCredentials({ clientSecret: event.target.value.trim() })}
              placeholder="32-character secret" spellCheck=${false} style=${FIELD_STYLE} />
          </label>
          <div class="lbl" style="display:flex;gap:16px;align-items:center">
            <span class="click h-row" onClick=${testConnection} style="border:1px solid var(--ink);padding:8px 14px">TEST CONNECTION</span>
            <span class="click red" onClick=${() => updateCredentials({ clientId: '', clientSecret: '' })}>REMOVE</span>
          </div>
        </div>

        <div class="mono" style="display:flex;justify-content:flex-end;gap:12px;border-top:1px solid var(--rule);padding-top:18px;font-weight:500;font-size:12px;letter-spacing:.06em">
          <span class="click" onClick=${onClose} style="padding:12px 20px;border:1px solid var(--ink)">CANCEL</span>
          <span class="click h-redbg" onClick=${() => onSaveCredentials(credentials)} style="padding:12px 24px;background:var(--ink);color:var(--bg)">SAVE</span>
        </div>
      </div>
    </div>`;
}
