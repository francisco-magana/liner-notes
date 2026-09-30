import { html } from '../lib/html.js';
import { classNames } from '../lib/classNames.js';

/** Big headline, a hint and one call-to-action button. `size` is 'large' or 'medium'. */
export function EmptyState({ title, hint, actionLabel, onAction, size = 'large' }) {
  return html`
    <div class=${classNames('mono empty-state', size === 'medium' && 'empty-state--medium')}>
      <span class="empty-state__title">${title}</span>
      <span class="muted">${hint}</span>
      <span class="click empty-state__action" onClick=${onAction}>${actionLabel}</span>
    </div>`;
}
