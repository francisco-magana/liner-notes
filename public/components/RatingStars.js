import { html } from '../lib/html.js';
import { classNames } from '../lib/classNames.js';

const STAR_VALUES = [1, 2, 3, 4, 5];

/** Clickable 1–5 stars, `size` 'small' or 'large'. Clicking the current rating clears it back to 0. */
export function RatingStars({ rating, onChange, size = 'small' }) {
  const hoverClass = size === 'large' ? 'h-scale' : 'h-scale2';
  return html`
    <div class=${classNames('rating-stars', size === 'large' && 'rating-stars--large')}>
      ${STAR_VALUES.map(value => html`
        <span key=${value} class=${classNames('click rating-stars__star', hoverClass, value <= rating && 'is-filled')}
          onClick=${() => onChange(rating === value ? 0 : value)}>★</span>`)}
    </div>`;
}
