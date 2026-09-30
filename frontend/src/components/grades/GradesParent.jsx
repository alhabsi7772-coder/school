import { useEffect, useState } from 'react';
import ParentVideoBackground from './ParentVideoBackground';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, GraduationCap, BookOpen, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { gradesApi, errMsg, SCHOOL_NAME, QUIZ_MAX, levelLetter, LEVEL_COLORS } from './gradesApi';
import { useGradesTheme, themeClass } from './gradesTheme';
import { ThemeSwitch } from './GradesLayout';
import LuxParticles from '../LuxParticles';
import '../substitution/substitution.css';

export default function GradesParent() {
  const [civil, setCivil] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const [theme, setTheme] = useGradesTheme();

  useEffect(() => {
    document.documentElement.classList.add('sub-app');
    return () => document.documentElement.classList.remove('sub-app');
  }, []);

  const search = async (e) => {
    e?.preventDefault();
    if (!civil.trim()) return toast.error('أدخل الرقم المدني للطالب');
    setLoading(true);
    setData(null);
    try {
      const res = await gradesApi.get('/parent/results', { params: { civil_number: civil.trim() } });
      setData(res.data);
    } catch (err) {
      toast.error(errMsg(err, 'لا يوجد طالب بهذا الرقم المدني'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`sub-root min-h-screen ${themeClass(theme)}`} data-testid="grades-parent-page">
      {theme === 'lux' && <LuxParticles />}
      {/* خلفية الفيديو */}
      <ParentVideoBackground dim={theme === 'light' ? 0.08 : 0.35} />

      <div className="fixed top-4 left-4 z-20"><ThemeSwitch theme={theme} setTheme={setTheme} /></div>

      <div className={`relative z-10 px-4 py-10 ${data ? 'max-w-4xl mx-auto' : 'w-full lg:pl-20'}`}>
        {!data ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-md" style={{ marginRight: 'auto', marginLeft: 0 }}>
            <div className="text-center mb-8">
              <img src="/moe-logo.jpeg" alt="وزارة التعليم" className="w-24 h-24 mx-auto rounded-2xl object-contain bg-white p-2 sub-card" />
              <h1 className="text-3xl sm:text-4xl font-black mt-5" style={{ color: 'var(--sub-navy-ink)' }}>نتائج الطلاب</h1>
              <p className="text-sm mt-1 font-bold" style={{ color: 'var(--sub-navy-ink)', textShadow: '0 1px 8px rgba(255,255,255,.35)' }}>{SCHOOL_NAME} — نظام درجات الخيرات</p>
            </div>

            <form onSubmit={search} className="sub-card parent-glass-card p-7 w-full max-w-md sub-rise space-y-5" data-testid="grades-parent-login-card">
              <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: 'var(--sub-line)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--sub-teal-soft)' }}>
                  <GraduationCap className="w-5 h-5" style={{ color: 'var(--sub-teal-ink)' }} />
                </div>
                <div>
                  <h2 className="font-extrabold" style={{ color: 'var(--sub-navy-ink)' }}>دخول ولي الأمر</h2>
                  <p className="text-xs" style={{ color: 'var(--sub-muted)' }}>أدخل الرقم المدني لابنك لرؤية نتائجه</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--sub-muted)' }}>الرقم المدني للطالب</label>
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sub-muted)' }} />
                  <input className="sub-input pr-11" dir="ltr" style={{ textAlign: 'left' }} value={civil} onChange={(e) => setCivil(e.target.value)}
                    placeholder="مثال: 12345678" required data-testid="grades-parent-civil-input" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="sub-btn sub-btn-primary w-full" style={{ padding: '0.85rem' }} data-testid="grades-parent-search-btn">
                {loading ? 'جارٍ البحث...' : 'عرض النتائج'}
              </button>
              <Link to="/grades/login" className="flex items-center justify-center gap-1.5 text-xs font-bold pt-1" style={{ color: 'var(--sub-navy)' }}>
                <ArrowRight className="w-3.5 h-3.5" /> دخول المعلم / المدير
              </Link>
            </form>
          </div>
        ) : (
          <div>
            {/* معلومات الطالب */}
            <div className="sub-card p-6 mb-5 sub-rise">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--sub-navy-soft)', display: 'grid', placeItems: 'center' }}>
                    <GraduationCap className="w-6 h-6" style={{ color: 'var(--sub-navy-ink)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>مرحباً الطالب</p>
                    <h2 className="font-black text-xl" style={{ color: 'var(--sub-navy-ink)' }} data-testid="grades-parent-student-name">{data.student.name}</h2>
                    <p className="text-sm font-semibold" style={{ color: 'var(--sub-muted)' }}>{data.student.grade} / شعبة {data.student.section}</p>
                  </div>
                </div>
                <button onClick={() => setData(null)} className="sub-btn sub-btn-ghost sub-btn-sm">بحث عن طالب آخر</button>
              </div>
            </div>

            {/* النتائج حسب المادة */}
            <div className="sub-card p-5 mb-5 sub-rise">
              <h3 className="font-black mb-4 flex items-center gap-2" style={{ color: 'var(--sub-navy-ink)' }}>
                <BookOpen className="w-5 h-5" /> نتائج المواد
              </h3>
              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
                <table className="sub-table">
                  <thead><tr><th>المادة</th><th>الفصل</th><th>اختبار قصير 1</th><th>اختبار قصير 2</th><th>المجموع</th><th>المستوى</th></tr></thead>
                  <tbody>
                    {data.results.map((r, i) => (
                      <tr key={i}>
                        <td className="font-bold">{r.subject}</td>
                        <td className="text-xs">{r.semester_label}</td>
                        <td>{r.quiz1 ?? '—'}</td>
                        <td>{r.quiz2 ?? '—'}</td>
                        <td className="font-black">{r.total ?? '—'} <span className="text-[10px] font-normal" style={{ color: 'var(--sub-muted)' }}>/ {r.max}</span></td>
                        <td>{r.level ? <span className="sub-badge" style={{ background: `${LEVEL_COLORS[r.level]}22`, color: LEVEL_COLORS[r.level] }}>{r.level}</span> : '—'}</td>
                      </tr>
                    ))}
                    {data.results.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-6" style={{ color: 'var(--sub-muted)' }}>لا توجد درجات مدخلة بعد</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* إحصائيات المواد */}
            {data.subject_stats.length > 0 && (
              <div className="sub-card p-5 sub-rise">
                <h3 className="font-black mb-4 flex items-center gap-2" style={{ color: 'var(--sub-navy-ink)' }}>
                  <TrendingUp className="w-5 h-5" /> إحصائيات المواد
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.subject_stats.map((s, i) => (
                    <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--sub-surface-2)', border: '1px solid var(--sub-line)' }}>
                      <p className="font-bold text-sm mb-2" style={{ color: 'var(--sub-navy-ink)' }}>{s.subject}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--sub-muted)' }}>المتوسط</span>
                        <span className="font-black" style={{ color: 'var(--sub-amber-ink)' }}>{s.avg}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span style={{ color: 'var(--sub-muted)' }}>أعلى درجة</span>
                        <span className="font-black flex items-center gap-1" style={{ color: 'var(--sub-green-ink)' }}><Award className="w-3 h-3" /> {s.best}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
