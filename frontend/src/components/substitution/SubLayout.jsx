import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeftRight, Users, BarChart3, LogOut, ExternalLink, KeyRound, X } from 'lucide-react';
import { subApi, errMsg, SCHOOL_NAME } from './subApi';
import './substitution.css';

const NAV = [
  { to: '/substitution', label: 'توزيع الاحتياط', icon: ArrowLeftRight, exact: true, tid: 'home' },
  { to: '/substitution/teachers', label: 'المعلمون', icon: Users, tid: 'teachers' },
  { to: '/substitution/stats', label: 'الإحصائيات', icon: BarChart3, tid: 'stats' },
];

function ChangePassword({ onClose }) {
  const [oldP, setOldP] = useState('');
  const [newP, setNewP] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await subApi.post('/auth/change-password', { old_password: oldP, new_password: newP });
      toast.success('تم تغيير كلمة المرور');
      onClose();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,31,46,0.45)' }} onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="sub-card p-6 w-full max-w-sm space-y-4 sub-rise" data-testid="sub-change-pwd-modal">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold" style={{ color: 'var(--sub-navy)' }}>تغيير كلمة المرور</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
        </div>
        <input type="password" className="sub-input" placeholder="كلمة المرور الحالية" value={oldP} onChange={(e) => setOldP(e.target.value)} required data-testid="sub-old-pwd" />
        <input type="password" className="sub-input" placeholder="كلمة المرور الجديدة (6 أحرف فأكثر)" value={newP} onChange={(e) => setNewP(e.target.value)} required minLength={6} data-testid="sub-new-pwd" />
        <button className="sub-btn sub-btn-primary w-full" disabled={busy} data-testid="sub-save-pwd">حفظ</button>
      </form>
    </div>
  );
}

export default function SubLayout({ children, title, subtitle, actions }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState(false);

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
    <div className="sub-root" data-testid="sub-layout">
      <header className="sticky top-0 z-30" style={{ background: 'rgba(243,240,232,0.85)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--sub-line)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
          <Link to="/substitution" className="flex items-center gap-3 flex-shrink-0">
            <img src="/moe-logo.jpeg" alt="" className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 border" style={{ borderColor: 'var(--sub-line)' }} />
            <div className="hidden sm:block leading-tight">
              <p className="font-black text-sm" style={{ color: 'var(--sub-navy)' }}>نظام حصص الاحتياط</p>
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
            <a href="/teacher/login" className="sub-nav-link" title="المنصة الرئيسية" data-testid="sub-main-site-link">
              <ExternalLink className="w-4 h-4" /><span className="hidden lg:inline">المنصة الرئيسية</span>
            </a>
            <button onClick={() => setPwd(true)} className="sub-nav-link" title="تغيير كلمة المرور" data-testid="sub-change-pwd-btn"><KeyRound className="w-4 h-4" /></button>
            <button onClick={logout} className="sub-nav-link" style={{ color: 'var(--sub-red)' }} title="خروج" data-testid="sub-logout-btn"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {(title || actions) && (
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6 sub-rise">
            <div>
              {title && <h1 className="text-2xl md:text-3xl font-black" style={{ color: 'var(--sub-navy)' }}>{title}</h1>}
              {subtitle && <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--sub-muted)' }}>{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
      {pwd && <ChangePassword onClose={() => setPwd(false)} />}
    </div>
  );
}
