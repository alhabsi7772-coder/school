import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard, Settings, LogOut, GraduationCap,
  ChevronLeft, Menu, X, FolderOpen, BookOpen, Sparkles, Users, ShieldCheck, ClipboardList, ClipboardCheck, CalendarRange
} from 'lucide-react';
import Particles from '../Particles';
import { API, getAuthHeaders } from '../../utils';

export default function TeacherLayout({ children, title, backTo }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState(() => localStorage.getItem('academicYear') || '');
  const [semester, setSemester] = useState(() => localStorage.getItem('semester') || '1');
  const isAdmin = localStorage.getItem('teacherRole') === 'admin';

  useEffect(() => {
    const sync = () => {
      setAcademicYear(localStorage.getItem('academicYear') || '');
      setSemester(localStorage.getItem('semester') || '1');
    };
    window.addEventListener('academic-context-changed', sync);
    return () => window.removeEventListener('academic-context-changed', sync);
  }, []);

  useEffect(() => {
    if (!academicYear && localStorage.getItem('teacherToken')) {
      axios.get(`${API}/academic-years`, getAuthHeaders())
        .then(res => {
          const y = res.data.current || '2025-2026';
          localStorage.setItem('academicYear', y);
          localStorage.setItem('semester', res.data.semester || '1');
          setAcademicYear(y);
          setSemester(res.data.semester || '1');
        })
        .catch(() => {});
    }
  }, [academicYear]);

  const logout = () => {
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacherName');
    localStorage.removeItem('teacherRole');
    localStorage.removeItem('teacherUsername');
    localStorage.removeItem('academicYear');
    localStorage.removeItem('semester');
    navigate('/teacher/login');
  };

  const navItems = [
    { path: '/teacher/dashboard', icon: LayoutDashboard, label: 'الاختبارات', color: '#00E5FF' },
    { path: '/teacher/projects', icon: FolderOpen, label: 'المشاريع', color: '#D500F9' },
    { path: '/teacher/question-bank', icon: BookOpen, label: 'بنك الأسئلة', color: '#00E676' },
    { path: '/teacher/gradebooks', icon: ClipboardList, label: 'سجل الدرجات', color: '#FF8A65' },
    { path: '/teacher/rubrics', icon: ClipboardCheck, label: 'التقييم السريع', color: '#64B5F6' },
    ...(isAdmin ? [{ path: '/teacher/teachers', icon: Users, label: 'إدارة المعلمين', color: '#FF9100' }] : []),
    { path: '/teacher/settings', icon: Settings, label: 'الإعدادات', color: '#FFEA00' },
  ];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const SidebarInner = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="icon-3d-container w-11 h-11 flex-shrink-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, rgba(var(--theme-accent-rgb), 0.15), rgba(var(--theme-accent-rgb), 0.08))', border: '1px solid rgba(var(--theme-accent-rgb), 0.25)' }}>
              <GraduationCap className="w-5 h-5 icon-3d" style={{ color: 'var(--theme-accent)' }} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-tight">منصة الاختبارات</p>
            <p className="text-xs truncate" style={{ color: 'rgba(var(--theme-accent-rgb), 0.6)' }}>مدرسة الخيرات</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg lg:hidden transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        {academicYear && (
          <Link to="/teacher/settings" onClick={() => setSidebarOpen(false)}
            data-testid="academic-year-badge"
            className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'rgba(var(--theme-accent-rgb), 0.08)', border: '1px solid rgba(var(--theme-accent-rgb), 0.2)' }}>
            <CalendarRange className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--theme-accent)' }}>
              <span dir="ltr">{academicYear.replace('-', '/')}</span> · {semester === '2' ? 'الفصل الثاني' : 'الفصل الأول'}
            </span>
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <div className="icon-3d-wrapper">
                <item.icon
                  className="w-5 h-5 flex-shrink-0 icon-3d"
                  strokeWidth={active ? 2 : 1.5}
                  style={{ color: active ? item.color : undefined }}
                />
              </div>
              <span>{item.label}</span>
              {active && (
                <span className="mr-auto w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Badge */}
      <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(213,0,249,0.1), rgba(0,229,255,0.08))', border: '1px solid rgba(213,0,249,0.15)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#D500F9' }} />
          <p className="text-xs font-medium" style={{ color: 'rgba(213,0,249,0.9)' }}>مدعوم بالذكاء الاصطناعي</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <div className="px-3 py-2 mb-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-xs" style={{ color: 'var(--text-hint)' }}>مرحباً،</p>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white truncate">
              {localStorage.getItem('teacherName') || 'المعلم'}
            </p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0"
                style={{ background: 'rgba(255,145,0,0.12)', color: '#FFB74D', border: '1px solid rgba(255,145,0,0.25)' }}
                data-testid="admin-badge">
                <ShieldCheck className="w-3 h-3" />
                مدير
              </span>
            )}
          </div>
        </div>
        <button onClick={logout} data-testid="logout-btn"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{ color: '#F87171' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen font-tajawal" style={{ background: 'var(--mode-bg)' }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <Particles />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-30 w-64 glass-sidebar flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`}>
        <SidebarInner />
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto lg:mr-64 relative z-10">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
          data-mobile-header
          style={{ background: 'var(--mobile-header-bg, rgba(11,17,32,0.9))', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(var(--theme-accent-rgb), 0.06)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl transition-colors hover:bg-white/5">
            <Menu className="w-5 h-5 text-slate-400" />
          </button>
          {backTo && (
            <button onClick={() => navigate(backTo)} className="p-2 hover:bg-white/5 rounded-xl">
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
          )}
          {title && <h1 className="text-base font-bold text-white flex-1 truncate">{title}</h1>}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(var(--theme-accent-rgb), 0.15), rgba(var(--theme-accent-rgb), 0.08))', border: '1px solid rgba(var(--theme-accent-rgb), 0.2)' }}>
            <GraduationCap className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
          </div>
        </div>

        <div className="p-4 md:p-8">
          {(title || backTo) && (
            <div className="hidden lg:flex items-center gap-3 mb-8">
              {backTo && (
                <button onClick={() => navigate(backTo)} className="p-2 rounded-xl hover:bg-white/5 transition-colors border border-white/5">
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
              )}
              {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
