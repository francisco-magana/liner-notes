import { html } from '../lib/html.js';

export function Toast({ message }) {
  if (!message) return null;
  return html`
    <div class="lbl" style="position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:12px 20px;letter-spacing:.08em;z-index:30">${message}</div>`;
}
