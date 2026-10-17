import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Users, BookOpen, BarChart3, LogOut, ExternalLink, Lock, Sun, Moon, Sparkles, Settings } from 'lucide-react';
import LuxParticles from '../LuxParticles';
import { SCHOOL_NAME } from './gradesApi';
import { useGradesTheme, themeClass } from './gradesTheme';
import '../substitution/substitution.css';

export function ThemeSwitch({ theme, setTheme }) {
  const opts = [['light', Sun, 'نهاري'], ['dark', Moon, 'ليلي'], ['lux', Sparkles, 'لوكس AI']];
  return (
    <div className="sub-theme-switch" data-testid="grades-theme-switch">
      {opts.map(([k, Icon, l]) => (
        <button key={k} type="button" title={l} onClick={() => setTheme(k)} className={theme === k ? 'active' : ''} data-testid={`grades-theme-${k}`}>
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

const ADMIN_NAV = [
  { to: '/grades', label: 'الرئيسية', icon: BarChart3, exact: true, tid: 'home' },
  { to: '/grades/teachers', label: 'المعلمون', icon: Users, tid: 'teachers' },
  { to: '/grades/students', label: 'الطلاب', icon: BookOpen, tid: 'students' },
  { to: '/grades/enter', label: 'إدخال الدرجات', icon: GraduationCap, tid: 'enter' },
  { to: '/grades/stats', label: 'الإحصائيات', icon: BarChart3, tid: 'stats' },
  { to: '/grades/settings', label: 'الإعدادات', icon: Settings, tid: 'settings' },
];

const TEACHER_NAV = [
  { to: '/grades', label: 'إدخال الدرجات', icon: GraduationCap, exact: true, tid: 'enter' },
  { to: '/grades/stats', label: 'الإحصائيات', icon: BarChart3, tid: 'stats' },
];

export default function GradesLayout({ children, title, subtitle, actions }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useGradesTheme();
  const role = localStorage.getItem('gradesRole') || 'teacher';
  const userName = localStorage.getItem('gradesName') || '';
  const nav = role === 'admin' ? ADMIN_NAV : TEACHER_NAV;

  useEffect(() => {
    document.documentElement.classList.add('sub-app');
    return () => document.documentElement.classList.remove('sub-app');
  }, []);

  const logout = () => {
    localStorage.removeItem('gradesToken');
    localStorage.removeItem('gradesName');
    localStorage.removeItem('gradesRole');
    navigate('/grades/login');
  };

  const isActive = (n) => (n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to));

  return (
    <div className={`sub-root ${themeClass(theme)}`} data-testid="grades-layout" data-theme={theme}>
      {theme === 'lux' && <LuxParticles />}
      <header className="sticky top-0 z-30" style={{ background: 'var(--sub-header-bg)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--sub-line)' }}>
        <div className="max-w-[1440px] mx-auto px-3 md:px-4 py-1.5 md:py-0 md:h-12 flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3">
          <Link to="/grades" className="flex items-center gap-2.5 flex-shrink-0 order-1">
            <img src="/moe-logo.jpeg" alt="" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border" style={{ borderColor: 'var(--sub-line)' }} />
            <div className="hidden 2xl:block leading-tight">
              <p className="font-black text-xs" style={{ color: 'var(--sub-navy-ink)' }}>نظام درجات الخيرات</p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--sub-muted)' }}>{SCHOOL_NAME}</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 flex-shrink-0 order-2 md:order-3 mr-0">
            {userName && (
              <div className="hidden xl:block leading-tight text-left mr-1" data-testid="grades-welcome">
                <p className="text-[10px] font-semibold" style={{ color: 'var(--sub-muted)' }}>مرحباً</p>
                <p className="text-xs font-black" style={{ color: 'var(--sub-navy-ink)' }}>
                  {role === 'admin' ? userName : `الأستاذ ${userName}`}
                </p>
              </div>
            )}
            <ThemeSwitch theme={theme} setTheme={setTheme} />
            <a href="/teacher/login" className="sub-nav-link" title="المنصة الرئيسية" data-testid="grades-main-site-link">
              <ExternalLink className="w-4 h-4" /><span className="hidden lg:inline">المنصة</span>
            </a>
            <button onClick={logout} className="sub-nav-link" style={{ color: 'var(--sub-red-ink)' }} title="خروج" data-testid="grades-logout-btn"><LogOut className="w-4 h-4" /></button>
          </div>

          <nav className="sub-nav-compact flex flex-wrap md:flex-nowrap items-center gap-0.5 md:overflow-x-auto order-3 md:order-2 w-full md:w-auto md:flex-1 md:mx-auto justify-start md:justify-center pt-2 md:pt-0 mt-1 md:mt-0 border-t md:border-t-0" style={{ borderColor: 'var(--sub-line)' }} data-testid="grades-nav">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className={`sub-nav-link whitespace-nowrap ${isActive(n) ? 'active' : ''}`} data-testid={`grades-nav-${n.tid}`}>
                <n.icon className="w-3.5 h-3.5" />
                <span>{n.label}</span>
              </Link>
            ))}
          </nav>
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
