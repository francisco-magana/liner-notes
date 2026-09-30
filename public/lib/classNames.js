/** Joins class names, skipping falsy ones: classNames('pill', isActive && 'is-active'). */
export const classNames = (...names) => names.filter(Boolean).join(' ');
