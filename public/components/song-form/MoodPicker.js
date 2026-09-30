import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { classNames } from '../../lib/classNames.js';

/** Toggleable mood chips plus a field for adding a new mood (press Enter). */
export function MoodPicker({ options, selected, onChange }) {
  const [newMood, setNewMood] = useState('');

  const toggleMood = mood =>
    onChange(selected.includes(mood) ? selected.filter(existing => existing !== mood) : [...selected, mood]);

  function handleNewMoodKey(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const mood = newMood.trim().toUpperCase();
    if (mood && !selected.includes(mood)) onChange([...selected, mood]);
    setNewMood('');
  }

  return html`
    <div class="mono mood-picker">
      ${options.map(mood => html`
        <span key=${mood} class=${classNames('click pill mood-picker__mood', selected.includes(mood) && 'is-active')}
          onClick=${() => toggleMood(mood)}>${mood}</span>`)}
      <input class="mono mood-picker__new" value=${newMood} onInput=${event => setNewMood(event.target.value)}
        onKeyDown=${handleNewMoodKey} placeholder="+ NEW, ENTER" />
    </div>`;
}
