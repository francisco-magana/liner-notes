import { useRef } from 'preact/hooks';
import { html } from '../../lib/html.js';
import { imageStyle } from '../../lib/covers.js';
import { cropImageToSquare } from '../../lib/dom.js';

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
    <input type="file" accept="image/*" class="artwork-picker__input" ref=${fileInput} onChange=${handleFileChosen} />
    <div class="mono click artwork-picker__dropzone" style=${imageStyle(art)}
      onClick=${browseFiles} onDragOver=${event => event.preventDefault()} onDrop=${handleDrop}>
      ${!art && html`
        <div class="artwork-picker__prompt">
          <span>DROP ALBUM ART</span>
          <span class="muted">JPG OR PNG · CROPPED TO SQUARE</span>
          <span class="h-invert artwork-picker__browse">BROWSE FILES</span>
        </div>`}
    </div>
    ${art && html`
      <div class="lbl artwork-picker__actions">
        <span class="click artwork-picker__replace" onClick=${browseFiles}>REPLACE</span>
        <span class="click red" onClick=${() => onChange(null)}>REMOVE</span>
      </div>`}`;
}
