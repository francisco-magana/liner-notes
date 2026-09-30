import { html } from '../lib/html.js';

export function Toast({ message }) {
  if (!message) return null;
  return html`<div class="lbl toast">${message}</div>`;
}
