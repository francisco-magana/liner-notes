// Style values shared by components. Colors point at the CSS tokens in styles.css,
// so they follow the light and dark themes automatically.

export const COLORS = {
  red: 'var(--red)',
  ink: 'var(--ink)',
  background: 'var(--bg)',
  mute: 'var(--mute)',
  line: 'var(--line)',
  track: 'var(--track)'
};

/** Placeholder pattern for songs without album art. */
export const STRIPE_PATTERN = 'repeating-linear-gradient(135deg,var(--s1) 0 5px,var(--s2) 5px 10px)';

/** Lighter pattern for the empty artwork drop zone. */
export const FORM_STRIPE_PATTERN = 'repeating-linear-gradient(135deg,var(--f1) 0 6px,var(--f2) 6px 12px)';

export const imageBackground = url => `center / cover no-repeat url("${url}")`;

/** CSS background for anything with an optional `art` URL (a song or the song form). */
export const coverBackground = item => (item && item.art ? imageBackground(item.art) : STRIPE_PATTERN);

/** Bottom border that is only visible when active. */
export const underlineBorder = (isActive, color = COLORS.ink) => `1px solid ${isActive ? color : 'transparent'}`;

/** Colors for a toggle chip: filled when active, outline text when not. */
export const pillColors = isActive =>
  `background:${isActive ? COLORS.ink : 'transparent'};color:${isActive ? COLORS.background : COLORS.ink}`;
