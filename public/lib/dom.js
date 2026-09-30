/** Ref callback: focuses a field and puts the cursor at the end of its text. */
export function focusAtEnd(element) {
  if (!element) return;
  element.focus();
  element.setSelectionRange?.(element.value.length, element.value.length);
}

const COVER_SIZE = 480;

/** Crops an image file to a square JPEG data URL of COVER_SIZE pixels. */
export function cropImageToSquare(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const side = Math.min(image.width, image.height);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = COVER_SIZE;
        canvas.getContext('2d').drawImage(
          image,
          (image.width - side) / 2, (image.height - side) / 2, side, side,
          0, 0, COVER_SIZE, COVER_SIZE
        );
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
