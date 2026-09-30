import { useEffect, useState } from 'preact/hooks';

const darkModeQuery = matchMedia('(prefers-color-scheme: dark)');

/** Whether the operating system is set to dark mode, kept up to date. */
export function useSystemDarkMode() {
  const [prefersDark, setPrefersDark] = useState(darkModeQuery.matches);

  useEffect(() => {
    const handleChange = event => setPrefersDark(event.matches);
    darkModeQuery.addEventListener('change', handleChange);
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersDark;
}
