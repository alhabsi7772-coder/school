import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeModeFab() {
  const { isDark, toggleMode } = useTheme();
  return (
    <button
      data-testid="student-theme-toggle"
      onClick={toggleMode}
      aria-label={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
      title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
      className="fixed bottom-5 left-5 z-[60] w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      style={isDark
        ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#FFD54F', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
        : { background: '#111111', color: '#FFFFFF', boxShadow: '0 10px 24px rgba(0,0,0,0.25)' }}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
