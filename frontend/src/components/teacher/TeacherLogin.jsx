import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Lock, GraduationCap, Zap, User, Check } from 'lucide-react';
import { API } from '../../utils';
import LoginVideoBackground from '../LoginVideoBackground';

const REMEMBER_KEY = 'teacherRememberCreds';

export default function TeacherLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // عند الفتح: استرجاع بيانات الدخول المحفوظة (إن وُجدت)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const { u, p } = JSON.parse(saved);
        if (u && p) { setUsername(u); setPassword(p); setRemember(true); }
      }
    } catch { /* تجاهل أي خطأ */ }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      localStorage.setItem('teacherToken', res.data.token);
      localStorage.setItem('teacherName', res.data.teacher_name);
      localStorage.setItem('teacherRole', res.data.role);
      localStorage.setItem('teacherUsername', res.data.username);
      localStorage.setItem('academicYear', res.data.academic_year || '2025-2026');
      localStorage.setItem('semester', res.data.semester || '1');
      // حفظ/مسح بيانات "تذكّرني" حسب اختيار المستخدم
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ u: username, p: password }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      navigate('/teacher/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-tajawal flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0B1120' }}>

      {/* خلفية فيديو لانهائية بكامل الشاشة */}
      <LoginVideoBackground />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10 login-stagger login-stagger-1">
          <div className="icon-3d-container inline-flex mb-6">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center relative login-glow-pulse"
              style={{
                background: 'linear-gradient(135deg, rgba(var(--theme-accent-rgb), 0.22), rgba(var(--theme-accent-rgb), 0.08))',
                border: '1px solid rgba(var(--theme-accent-rgb), 0.40)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}>
              <GraduationCap className="w-12 h-12 icon-3d-float" style={{ color: 'var(--theme-accent)' }} />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 leading-tight" style={{ textShadow: '0 4px 28px rgba(0,0,0,0.85)' }}>
            منصة <span className="neon-text-cyan">الاختبارات</span>
          </h1>
          <p className="text-sm tracking-wide" style={{ color: 'rgba(255,255,255,0.78)', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
            مدرسة الخيرات للتعليم الأساسي
          </p>
        </div>

        {/* Card */}
        <div className="glass-modal rounded-3xl p-8 relative login-stagger login-stagger-2 login-card-shimmer"
          style={{
            background: 'rgba(11,17,32,0.62)',
            backdropFilter: 'blur(16px) saturate(150%)',
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 30px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
          <div className="flex items-center gap-3 mb-7">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--theme-accent-rgb), 0.1)', border: '1px solid rgba(var(--theme-accent-rgb), 0.2)' }}>
              <Zap className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            </div>
            <div>
              <h2 className="font-bold text-white">دخول المعلم</h2>
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>أدخل كلمة المرور للمتابعة</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: 'rgba(var(--theme-accent-rgb), 0.7)' }}>
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(var(--theme-accent-rgb), 0.4)' }} />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="username"
                  className="input-field pr-12"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                  autoComplete="username"
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: 'rgba(var(--theme-accent-rgb), 0.7)' }}>
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(var(--theme-accent-rgb), 0.4)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="input-field pr-12"
                  autoComplete="current-password"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            {/* تذكّرني — يحفظ اسم المستخدم وكلمة المرور بعد تسجيل الدخول */}
            <label htmlFor="remember-me-toggle"
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              data-testid="remember-me-label">
              <input
                id="remember-me-toggle"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="sr-only peer"
                data-testid="remember-me-checkbox"
              />
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md transition-all"
                style={remember
                  ? { background: 'var(--theme-accent)', borderColor: 'var(--theme-accent)', boxShadow: '0 0 12px rgba(var(--theme-accent-rgb), 0.45)' }
                  : { background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                <Check
                  className="w-3.5 h-3.5 transition-all"
                  strokeWidth={3}
                  style={{
                    color: '#0B1120',
                    opacity: remember ? 1 : 0,
                    transform: remember ? 'scale(1)' : 'scale(0.5)',
                  }}
                />
              </span>
              <span className="text-sm font-medium flex-1 group-hover:text-white transition-colors"
                style={{ color: remember ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.72)' }}>
                تذكّرني — حفظ اسم المستخدم وكلمة المرور
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-btn"
              className="btn-primary w-full text-center relative overflow-hidden"
              style={{ padding: '0.875rem', fontSize: '1rem', fontWeight: 700 }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    جارٍ الدخول...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    دخول
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-5 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <p className="text-center text-xs" style={{ color: 'var(--text-hint)' }}>
              ليس لديك حساب؟ تواصل مع مدير المنصة للحصول على حسابك الخاص
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
