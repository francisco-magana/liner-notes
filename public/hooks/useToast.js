import { useEffect, useRef, useState } from 'preact/hooks';

/** A short message at the bottom of the screen that hides itself after `duration` ms. */
export function useToast() {
  const [message, setMessage] = useState('');
  const hideTimer = useRef(null);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  function showToast(text, duration = 1800) {
    clearTimeout(hideTimer.current);
    setMessage(text);
    hideTimer.current = setTimeout(() => setMessage(''), duration);
  }

  return { message, showToast };
}
