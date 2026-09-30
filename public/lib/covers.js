// Album art is the one style that is only known at runtime, so it stays inline.
// Elements that show art also carry the `.cover` class, whose striped placeholder
// shows through when there is no image.

export const imageBackground = url => `center / cover no-repeat url("${url}")`;

/** Inline style for an image URL, or undefined to keep the CSS placeholder. */
export const imageStyle = url => (url ? { background: imageBackground(url) } : undefined);

/** Inline style for anything with an optional `art` URL (a song or the song form). */
export const coverStyle = item => imageStyle(item && item.art);
