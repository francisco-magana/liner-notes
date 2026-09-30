import { useRef } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { cropImageToSquare } from '../../lib/dom.js';
import { FORM_STRIPE_PATTERN, imageBackground } from '../../lib/theme.js';

/** Square drop zone for album art. Images are cropped to a square in the browser before upload. */
export function ArtworkPicker({ art, onChange, onError }) {
  const fileInput = useRef(null);
  const browseFiles = () => fileInput.current?.click();

  async function loadImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      onChange(await cropImageToSquare(file));
    } catch {
      onError("COULDN'T READ THAT IMAGE");
    }
  }

  function handleFileChosen(event) {
    loadImageFile(event.target.files[0]);
    event.target.value = ''; // Allows choosing the same file again.
  }

  function handleDrop(event) {
    event.preventDefault();
    loadImageFile(event.dataTransfer.files[0]);
  }

  return html`
    <input type="file" accept="image/*" ref=${fileInput} onChange=${handleFileChosen} style="display:none" />
    <div class="mono click" onClick=${browseFiles} onDragOver=${event => event.preventDefault()} onDrop=${handleDrop}
      style="width:100%;aspect-ratio:1;box-sizing:border-box;border:1px dashed var(--mute);white-space:nowrap;background:${art ? imageBackground(art) : FORM_STRIPE_PATTERN};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-weight:500;font-size:12px;letter-spacing:.06em">
      ${!art && html`
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
          <span>DROP ALBUM ART</span>
          <span class="muted">JPG OR PNG · CROPPED TO SQUARE</span>
          <span class="h-invert" style="margin-top:8px;border:1px solid var(--ink);padding:8px 14px">BROWSE FILES</span>
        </div>`}
    </div>
    ${art && html`
      <div class="lbl" style="display:flex;gap:18px">
        <span class="click" onClick=${browseFiles} style="border-bottom:1px solid var(--ink)">REPLACE</span>
        <span class="click red" onClick=${() => onChange(null)}>REMOVE</span>
      </div>`}`;
}
