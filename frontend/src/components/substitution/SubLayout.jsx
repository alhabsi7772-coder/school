import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Users, BarChart3, LogOut, ExternalLink, Settings, Sun, Moon, Sparkles } from 'lucide-react';
import LuxParticles from '../LuxParticles';
import { SCHOOL_NAME } from './subApi';
import { useSubTheme, themeClass } from './subTheme';
import './substitution.css';

const NAV = [
  { to: '/substitution', label: 'توزيع الاحتياط', icon: ArrowLeftRight, exact: true, tid: 'home' },
  { to: '/substitution/teachers', label: 'المعلمون', icon: Users, tid: 'teachers' },
  { to: '/substitution/stats', label: 'الإحصائيات', icon: BarChart3, tid: 'stats' },
  { to: '/substitution/settings', label: 'الإعدادات', icon: Settings, tid: 'settings' },
];

export function ThemeSwitch({ theme, setTheme }) {
  const opts = [['light', Sun, 'نهاري'], ['dark', Moon, 'ليلي'], ['lux', Sparkles, 'لوكس AI']];
  return (
    <div className="sub-theme-switch" data-testid="sub-theme-switch">
      {opts.map(([k, Icon, l]) => (
        <button key={k} type="button" title={l} onClick={() => setTheme(k)} className={theme === k ? 'active' : ''} data-testid={`sub-theme-${k}`}>
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

export default function SubLayout({ children, title, subtitle, actions }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useSubTheme();

  useEffect(() => {
    document.documentElement.classList.add('sub-app');
    return () => document.documentElement.classList.remove('sub-app');
  }, []);

  const logout = () => {
    localStorage.removeItem('subToken');
    localStorage.removeItem('subName');
    navigate('/substitution/login');
  };

  const isActive = (n) => (n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to));

  return (
    <div className={`sub-root ${themeClass(theme)}`} data-testid="sub-layout" data-theme={theme}>
      {theme === 'lux' && <LuxParticles />}
      <header className="sticky top-0 z-30" style={{ background: 'var(--sub-header-bg)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--sub-line)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <Link to="/substitution" className="flex items-center gap-3 flex-shrink-0">
            <img src="/moe-logo.jpeg" alt="" className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 border" style={{ borderColor: 'var(--sub-line)' }} />
            <div className="hidden sm:block leading-tight">
              <p className="font-black text-sm" style={{ color: 'var(--sub-navy-ink)' }}>نظام حصص الاحتياط</p>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--sub-muted)' }}>{SCHOOL_NAME}</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 mx-auto overflow-x-auto" data-testid="sub-nav">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={`sub-nav-link ${isActive(n) ? 'active' : ''}`} data-testid={`sub-nav-${n.tid}`}>
                <n.icon className="w-4 h-4" />
                <span className="hidden md:inline">{n.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ThemeSwitch theme={theme} setTheme={setTheme} />
            <a href="/teacher/login" className="sub-nav-link" title="المنصة الرئيسية" data-testid="sub-main-site-link">
              <ExternalLink className="w-4 h-4" /><span className="hidden lg:inline">المنصة الرئيسية</span>
            </a>
            <button onClick={logout} className="sub-nav-link" style={{ color: 'var(--sub-red-ink)' }} title="خروج" data-testid="sub-logout-btn"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {(title || actions) && (
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6 sub-rise">
            <div>
              {title && <h1 className="text-2xl md:text-3xl font-black" style={{ color: 'var(--sub-navy-ink)' }}>{title}</h1>}
              {subtitle && <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--sub-muted)' }}>{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
