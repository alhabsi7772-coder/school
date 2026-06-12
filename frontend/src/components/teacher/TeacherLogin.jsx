import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Lock, GraduationCap, Zap, User } from 'lucide-react';
import { API } from '../../utils';
import Particles from '../Particles';

export default function TeacherLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

      {/* Animated Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      {/* Grid bg */}
      <div className="page-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      {/* Particles */}
      <Particles />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md animation: slide-in-up 0.5s ease-out">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="icon-3d-container inline-flex mb-6">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, rgba(var(--theme-accent-rgb), 0.12), rgba(var(--theme-accent-rgb), 0.06))',
                border: '1px solid rgba(var(--theme-accent-rgb), 0.25)',
                boxShadow: '0 0 40px rgba(var(--theme-accent-rgb), 0.15)'
              }}>
              <GraduationCap className="w-12 h-12 icon-3d-float" style={{ color: 'var(--theme-accent)' }} />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 leading-tight">
            منصة <span className="neon-text-cyan">الاختبارات</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            مدرسة الخيرات للتعليم الأساسي
          </p>
        </div>

        {/* Card */}
        <div className="glass-modal rounded-3xl p-8">
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
