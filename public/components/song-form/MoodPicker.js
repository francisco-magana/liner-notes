import { useState } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { COLORS, pillColors } from '../../lib/theme.js';

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
    <div class="mono" style="display:flex;flex-wrap:wrap;gap:8px;font-weight:500;font-size:11px;letter-spacing:.04em">
      ${options.map(mood => {
        const isSelected = selected.includes(mood);
        return html`
          <span key=${mood} class="click" onClick=${() => toggleMood(mood)}
            style="padding:6px 10px;${pillColors(isSelected)};border:1px solid ${isSelected ? COLORS.ink : COLORS.line}">${mood}</span>`;
      })}
      <input class="mono" value=${newMood} onInput=${event => setNewMood(event.target.value)} onKeyDown=${handleNewMoodKey} placeholder="+ NEW, ENTER"
        style="width:110px;padding:6px 10px;border:1px dashed var(--mute);background:transparent;outline:none;font-weight:500;font-size:11px;letter-spacing:.04em" />
    </div>`;
}
