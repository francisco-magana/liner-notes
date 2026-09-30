export const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
export const WEEKDAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** 7 → "07" */
export const padNumber = value => String(value).padStart(2, '0');

/** ISO date → "DD.MM.YY" */
export function formatShortDate(iso) {
  const date = new Date(iso);
  return `${padNumber(date.getDate())}.${padNumber(date.getMonth() + 1)}.${String(date.getFullYear()).slice(2)}`;
}

/** Date → "DD.MM" */
export const formatDayMonth = date => `${padNumber(date.getDate())}.${padNumber(date.getMonth() + 1)}`;

/** Date → "HH:MM" */
export const formatTime = date => `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;

/** Date → "MON" */
export const shortWeekday = date => WEEKDAY_NAMES[date.getDay()].slice(0, 3);

/** Today as "YYYY-MM-DD" in local time (the value format of <input type="date">). */
export function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}-${padNumber(now.getDate())}`;
}

/** 3 → "★★★☆☆" */
export const starString = rating => '★'.repeat(rating) + '☆'.repeat(5 - rating);

export const countWords = text => (text.trim().match(/\S+/g) || []).length;

export const capitalizeWords = text => (text || '').replace(/\b\w/g, letter => letter.toUpperCase());

export const pluralize = (count, singular, plural = singular + 'S') => `${count} ${count === 1 ? singular : plural}`;

/** Shortens text to about `maxLength` characters without cutting a word in half. */
export function excerpt(text, maxLength = 150) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}
