import { useEffect, useState } from 'react';

export const THEMES = ['light', 'dark', 'lux'];
export const getSubTheme = () => {
  const t = localStorage.getItem('subTheme');
  return THEMES.includes(t) ? t : 'light';
};
export const themeClass = (t) => (t === 'dark' ? 'sub-dark' : t === 'lux' ? 'sub-lux' : '');

export function useSubTheme() {
  const [theme, setTheme] = useState(getSubTheme);
  useEffect(() => {
    localStorage.setItem('subTheme', theme);
    const html = document.documentElement;
    html.classList.toggle('sub-app-dark', theme === 'dark');
    html.classList.toggle('sub-app-lux', theme === 'lux');
    return () => { html.classList.remove('sub-app-dark', 'sub-app-lux'); };
  }, [theme]);
  return [theme, setTheme];
}
