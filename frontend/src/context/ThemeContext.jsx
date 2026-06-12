import { createContext, useContext, useEffect, useState } from 'react';
import { THEMES, DEFAULT_THEME_ID, getThemeById } from '../themes';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'al_khairat_theme';
const MODE_STORAGE_KEY  = 'al_khairat_mode';
const FONT_SIZE_KEY     = 'al_khairat_font_size';

// 6 مستويات لحجم الخط (بالبكسل على عنصر html)
export const FONT_SIZES = [
  { level: 1, px: 12, label: 'صغير جداً' },
  { level: 2, px: 14, label: 'صغير' },
  { level: 3, px: 16, label: 'متوسط' },
  { level: 4, px: 18, label: 'كبير' },
  { level: 5, px: 20, label: 'كبير جداً' },
  { level: 6, px: 22, label: 'ضخم' },
];
const DEFAULT_FONT_LEVEL = 3;

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
};

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_ID
  );
  const [mode, setMode] = useState(
    () => localStorage.getItem(MODE_STORAGE_KEY) || 'dark'
  );
  const [fontLevel, setFontLevel] = useState(() => {
    const saved = parseInt(localStorage.getItem(FONT_SIZE_KEY), 10);
    return [1,2,3,4,5,6].includes(saved) ? saved : DEFAULT_FONT_LEVEL;
  });

  const theme = getThemeById(themeId);

  // Apply theme CSS variables
  // In light mode the bright neon accent becomes unreadable on white,
  // so we swap it for the deeper gradient tone (grad1) for calm contrast.
  useEffect(() => {
    const t = theme;
    const root = document.documentElement;
    const light = mode === 'light';
    root.style.setProperty('--theme-accent',     light ? t.grad1 : t.accent);
    root.style.setProperty('--theme-accent-rgb', light ? hexToRgb(t.grad1) : t.accentRgb);
    root.style.setProperty('--theme-grad1',      t.grad1);
    root.style.setProperty('--theme-grad2',      t.grad2);
    root.style.setProperty('--theme-orb1',       t.orb1);
    root.style.setProperty('--theme-orb2',       t.orb2);
    root.style.setProperty('--theme-orb3',       t.orb3);
    root.style.setProperty('--theme-grid-color', t.gridColor);
    // Soft/realistic treatment for premium themes
    root.classList.toggle('theme-soft', !!t.soft);
  }, [theme, mode]);

  // Apply light/dark mode
  useEffect(() => {
    const html = document.documentElement;
    if (mode === 'light') {
      html.classList.add('mode-light');
      html.style.setProperty('--mode-bg', '#F5EEDC');                        /* warm parchment cream */
      html.style.setProperty('--mobile-header-bg', 'rgba(250,245,232,0.97)');
      html.style.setProperty('--text-muted', 'rgba(26, 26, 26, 0.88)');      /* near-black */
      html.style.setProperty('--text-hint',  'rgba(74, 66, 50, 0.85)');      /* warm dark brown */
    } else {
      html.classList.remove('mode-light');
      html.style.setProperty('--mode-bg', '#0B1120');
      html.style.setProperty('--mobile-header-bg', 'rgba(11,17,32,0.9)');
      html.style.setProperty('--text-muted', 'rgba(226, 232, 240, 0.9)');
      html.style.setProperty('--text-hint',  'rgba(203, 213, 225, 0.75)');
    }
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  const changeTheme = (id) => {
    setThemeId(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  };

  const toggleMode = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  // Apply font size to <html> — يقيس كل النصوص والمسافات تلقائياً (rem-based)
  useEffect(() => {
    const px = FONT_SIZES.find(f => f.level === fontLevel)?.px || 16;
    document.documentElement.style.fontSize = `${px}px`;
    localStorage.setItem(FONT_SIZE_KEY, String(fontLevel));
  }, [fontLevel]);

  const changeFontLevel = (level) => {
    if ([1,2,3,4,5,6].includes(level)) setFontLevel(level);
  };

  return (
    <ThemeContext.Provider value={{ themeId, theme, changeTheme, mode, toggleMode, isDark: mode === 'dark', fontLevel, changeFontLevel }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
