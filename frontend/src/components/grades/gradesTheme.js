import { useEffect, useState } from 'react';

// نفس ثيم نظام الاحتياط (يستخدم نفس أصناف CSS من substitution.css)
export const THEMES = ['light', 'dark', 'lux'];
export const getGradesTheme = () => {
  const t = localStorage.getItem('gradesTheme');
  return THEMES.includes(t) ? t : 'light';
};
export const themeClass = (t) => (t === 'dark' ? 'sub-dark' : t === 'lux' ? 'sub-lux' : '');

export function useGradesTheme() {
  const [theme, setTheme] = useState(getGradesTheme);
  useEffect(() => {
    localStorage.setItem('gradesTheme', theme);
    const html = document.documentElement;
    html.classList.toggle('sub-app-dark', theme === 'dark');
    html.classList.toggle('sub-app-lux', theme === 'lux');
    return () => { html.classList.remove('sub-app-dark', 'sub-app-lux'); };
  }, [theme]);
  return [theme, setTheme];
}
