import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, User, ArrowLeftRight, ArrowRight } from 'lucide-react';
import { subApi, errMsg, SCHOOL_NAME } from './subApi';
import { useSubTheme, themeClass } from './subTheme';
import { ThemeSwitch } from './SubLayout';
import LuxParticles from '../LuxParticles';
import './substitution.css';

const REMEMBER_KEY = 'subRememberedCreds';

export default function SubLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [theme, setTheme] = useSubTheme();
  useEffect(() => {
    document.documentElement.classList.add('sub-app');
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const { u, p } = JSON.parse(atob(saved));
        setUsername(u || '');
        setPassword(p || '');
        setRemember(true);
      }
    } catch { /* بيانات محفوظة تالفة، تجاهلها */ }
    return () => document.documentElement.classList.remove('sub-app');
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await subApi.post('/auth/login', { username, password });
      localStorage.setItem('subToken', res.data.token);
      localStorage.setItem('subName', res.data.name || 'إدارة الاحتياط');
      if (remember) localStorage.setItem(REMEMBER_KEY, btoa(JSON.stringify({ u: username, p: password })));
      else localStorage.removeItem(REMEMBER_KEY);
      navigate('/substitution');
    } catch (err) {
      toast.error(errMsg(err, 'اسم المستخدم أو كلمة المرور غير صحيحة'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`sub-root flex items-center justify-center p-4 ${themeClass(theme)}`} data-testid="sub-login-page"
      style={theme === 'light' ? {
        backgroundImage: "url('https://customer-assets-39nsmqrw.emergentagent.net/job_school-frontend-3/artifacts/4xt9hn7h_Digen_image_1789729700911.webp')",
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      } : undefined}>
      {theme === 'lux' && <LuxParticles />}
      <div className="fixed top-4 left-4 z-20"><ThemeSwitch theme={theme} setTheme={setTheme} /></div>
      <div className="w-full max-w-md sub-rise">
        <div className="text-center mb-8">
          <img src="/moe-logo.jpeg" alt="وزارة التعليم" className="w-24 h-24 mx-auto rounded-2xl object-contain bg-white p-2 sub-card" />
          <h1 className="text-3xl sm:text-4xl font-black mt-5" style={{ color: 'var(--sub-navy-ink)' }}>نظام حصص الاحتياط</h1>
          <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--sub-muted)' }}>{SCHOOL_NAME}</p>
        </div>

        <form onSubmit={submit} className="sub-card p-7 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: 'var(--sub-line)' }}>
            <div className="ic" style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--sub-amber-soft)' }}>
              <ArrowLeftRight className="w-5 h-5" style={{ color: 'var(--sub-amber)' }} />
            </div>
            <div>
              <h2 className="font-extrabold" style={{ color: 'var(--sub-navy-ink)' }}>دخول إدارة الاحتياط</h2>
              <p className="text-xs" style={{ color: 'var(--sub-muted)' }}>حساب مستقل عن حسابات المعلمين</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--sub-muted)' }}>اسم المستخدم</label>
            <div className="relative">
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sub-muted)' }} />
              <input className="sub-input pr-11" dir="ltr" style={{ textAlign: 'left' }} value={username} onChange={(e) => setUsername(e.target.value)}
                autoComplete="username" required data-testid="sub-username-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--sub-muted)' }}>كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sub-muted)' }} />
              <input type="password" className="sub-input pr-11" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required data-testid="sub-password-input" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none" style={{ color: 'var(--sub-muted)' }} data-testid="sub-remember-label">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="sub-checkbox" data-testid="sub-remember-checkbox" />
              تذكرني على هذا الجهاز
            </label>
          </div>

          <button type="submit" disabled={loading} className="sub-btn sub-btn-primary w-full" style={{ padding: '0.85rem' }} data-testid="sub-login-btn">
            {loading ? 'جارٍ الدخول...' : 'دخول'}
          </button>

          <Link to="/teacher/login" className="flex items-center justify-center gap-1.5 text-xs font-bold pt-1" style={{ color: 'var(--sub-muted)' }} data-testid="sub-back-to-main">
            <ArrowRight className="w-3.5 h-3.5" /> العودة إلى المنصة الرئيسية
          </Link>
        </form>
      </div>
    </div>
  );
}
