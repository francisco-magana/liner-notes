import { html } from '../lib/html.js';
import { COLORS } from '../lib/theme.js';

const STAR_VALUES = [1, 2, 3, 4, 5];

/** Clickable 1–5 stars. Clicking the current rating clears it back to 0. */
export function RatingStars({ rating, onChange, size = 15, gap = 1, hoverClass = 'h-scale2' }) {
  return html`
    <div style="display:flex;gap:${gap}px">
      ${STAR_VALUES.map(value => html`
        <span key=${value} class="click ${hoverClass}" onClick=${() => onChange(rating === value ? 0 : value)}
          style="font-size:${size}px;color:${value <= rating ? COLORS.red : COLORS.line}">★</span>`)}
    </div>`;
}
