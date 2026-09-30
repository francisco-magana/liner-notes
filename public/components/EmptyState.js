import { html } from '../lib/html.js';

const SIZES = {
  large: { padding: 60, gap: 14, titleSize: 48 },
  medium: { padding: 40, gap: 12, titleSize: 40 }
};

/** Big headline, a hint and one call-to-action button. */
export function EmptyState({ title, hint, actionLabel, onAction, size = 'large' }) {
  const { padding, gap, titleSize } = SIZES[size];
  return html`
    <div class="mono" style="padding:${padding}px 0;display:flex;flex-direction:column;gap:${gap}px;align-items:flex-start;font-weight:500;font-size:12px;letter-spacing:.06em">
      <span style="font-family:'Archivo';font-size:${titleSize}px;font-stretch:72%;letter-spacing:-.02em">${title}</span>
      <span class="muted">${hint}</span>
      <span class="click" onClick=${onAction} style="background:var(--ink);color:var(--bg);padding:12px 20px">${actionLabel}</span>
    </div>`;
}
