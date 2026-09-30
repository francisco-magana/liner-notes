import { html } from '../../lib/html.js';

/**
 * Horizontal bars scaled to the largest value. `rows` are `{ label, value }`;
 * `variant` is 'ratings' or 'moods'. Bar widths are data, so they stay inline.
 */
export function BarChart({ rows, variant }) {
  const maxValue = Math.max(0, ...rows.map(row => row.value));
  return rows.map(row => html`
    <div key=${row.label} class="mono bar-chart__row bar-chart__row--${variant}">
      <span class="bar-chart__label">${row.label}</span>
      <div class="bar-chart__track">
        <div class="bar-chart__bar" style=${{ width: (maxValue ? Math.round((row.value / maxValue) * 100) : 0) + '%' }}></div>
      </div>
      <span class="bar-chart__value">${row.value}</span>
    </div>`);
}
