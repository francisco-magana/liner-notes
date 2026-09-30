import { html } from '../../lib/html.js';

/** Horizontal bars scaled to the largest value. `rows` are `{ label, value }`. */
export function BarChart({ rows, barColor, labelWidth, labelColor }) {
  const maxValue = Math.max(0, ...rows.map(row => row.value));
  return rows.map(row => {
    const width = maxValue ? Math.round((row.value / maxValue) * 100) : 0;
    return html`
      <div key=${row.label} class="mono" style="display:grid;grid-template-columns:${labelWidth}px 1fr 24px;gap:10px;align-items:center;font-size:11px">
        <span style="color:${labelColor}">${row.label}</span>
        <div style="height:8px;background:var(--track)"><div style="height:8px;background:${barColor};width:${width}%"></div></div>
        <span style="text-align:right">${row.value}</span>
      </div>`;
  });
}
