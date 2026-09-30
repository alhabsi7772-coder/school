import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { GraduationCap, User, ArrowRight, Award, Loader2, Pencil, Sparkles } from 'lucide-react';
import { API, GRADES } from '../../utils';
import Particles from '../Particles';
import { useStudentMode } from '../../hooks/useStudentMode';

const STORAGE_KEY = 'myGradesInfo';
const semLabel = (s) => (s === '2' ? 'الفصل الثاني' : 'الفصل الأول');

const GRADE_COLORS = (pct) =>
  pct >= 90 ? '#34D399' : pct >= 80 ? '#38BDF8' : pct >= 65 ? '#FBBF24' : pct >= 50 ? '#FB923C' : '#F87171';

export default function StudentGrades() {
  const navigate = useNavigate();
  useStudentMode();

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  })();

  const [form, setForm] = useState(saved || { student_name: '', grade: '', section: '' });
  const [phase, setPhase] = useState(saved ? 'waiting' : 'form'); // form | waiting | found | notfound
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);

  const check = async (info) => {
    try {
      const res = await axios.post(`${API}/student/check-grades`, info);
      if (res.data.waiting) {
        setPhase('waiting');
      } else if (res.data.found) {
        setResult(res.data);
        setPhase('found');
      } else {
        setResult(res.data);
        setPhase('notfound');
      }
    } catch { /* الشبكة — سيعيد المحاولة في الدورة القادمة */ }
  };

  // polling طالما الصفحة في وضع الانتظار أو العرض (لالتقاط درجات جديدة)
  useEffect(() => {
    if (phase === 'form') return undefined;
    check(form);
    timerRef.current = setInterval(() => check(form), 5000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, form.student_name, form.grade, form.section]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.student_name.trim()) return toast.error('اكتب اسمك');
    if (!form.grade) return toast.error('اختر الصف');
    if (!form.section) return toast.error('اختر الشعبة');
    const info = { ...form, student_name: form.student_name.trim() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    setForm(info);
    setPhase('waiting');
  };

  const editInfo = () => {
    clearInterval(timerRef.current);
    setPhase('form');
    setResult(null);
  };

  const sections = form.grade ? GRADES[form.grade] || [] : [];

  return (
    <div className="min-h-screen page-bg font-tajawal flex items-center justify-center p-4 relative overflow-hidden">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="page-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <Particles />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="icon-3d-container inline-flex mb-5">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(0,229,255,0.08))',
                border: '1px solid rgba(52,211,153,0.25)',
                boxShadow: '0 0 40px rgba(52,211,153,0.15)'
              }}>
              <Award className="w-10 h-10 icon-3d-float" style={{ color: '#34D399', filter: 'drop-shadow(0 4px 12px rgba(52,211,153,0.5))' }} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">
            عرض <span style={{ color: '#34D399' }}>درجاتي</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>درجات الأنشطة العملية والمشروع — مدرسة الخيرات</p>
        </div>

        {/* Card */}
        <div className="glass-modal rounded-3xl overflow-hidden">
          {phase === 'form' && (
            <div className="p-7">
              <h2 className="text-xl font-bold text-white mb-1">اكتب بياناتك</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-hint)' }}>
                اكتب اسمك كاملاً كما هو مسجل لدى المعلم، ثم انتظر حتى يرسل المعلم الدرجات
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(52,211,153,0.5)' }} />
                  <input type="text" value={form.student_name}
                    onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                    placeholder="اسمك الكامل"
                    className="input-field pr-12" required data-testid="grades-name-input" />
                </div>
                <div className="flex gap-3">
                  <select className="input-field flex-1" value={form.grade} required
                    onChange={e => setForm(f => ({ ...f, grade: e.target.value, section: '' }))}
                    data-testid="grades-grade-select">
                    <option value="">الصف</option>
                    {Object.keys(GRADES).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select className="input-field flex-1" value={form.section} required
                    onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                    data-testid="grades-section-select">
                    <option value="">الشعبة</option>
                    {sections.map(s => <option key={s} value={String(s)}>{s}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" data-testid="grades-submit-btn">
                  متابعة
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </form>
            </div>
          )}

          {phase === 'waiting' && (
            <div className="p-10 text-center" data-testid="grades-waiting">
              <Loader2 className="w-12 h-12 mx-auto mb-5 animate-spin" style={{ color: '#34D399' }} />
              <p className="font-bold text-white text-lg mb-1">مرحباً {form.student_name} 👋</p>
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                الصف {form.grade} / {form.section}
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-hint)' }}>
                في انتظار إرسال الدرجات من المعلم... ستظهر هنا تلقائياً
              </p>
              <button onClick={editInfo} className="text-xs font-bold inline-flex items-center gap-1.5"
                style={{ color: 'var(--text-muted)' }} data-testid="grades-edit-btn">
                <Pencil className="w-3 h-3" /> تعديل بياناتي
              </button>
            </div>
          )}

          {phase === 'notfound' && (
            <div className="p-8 text-center" data-testid="grades-notfound">
              <p className="font-bold text-white text-lg mb-2">⚠️ لم نجد اسمك</p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                {result?.message || 'تأكد من كتابة اسمك كاملاً كما هو مسجل لدى المعلم'}
              </p>
              <button onClick={editInfo} className="btn-primary inline-flex items-center gap-2" data-testid="grades-fix-btn">
                <Pencil className="w-4 h-4" /> تصحيح بياناتي
              </button>
            </div>
          )}

          {phase === 'found' && result && (
            <div className="p-7" data-testid="grades-found">
              <div className="text-center mb-6">
                <Sparkles className="w-8 h-8 mx-auto mb-2" style={{ color: '#FBBF24' }} />
                <p className="font-black text-white text-xl">{result.student_name}</p>
                <p className="text-xs" style={{ color: 'var(--text-hint)' }}>الصف {form.grade} / {form.section}</p>
              </div>
              <div className="space-y-3">
                {result.grades.map((g, i) => {
                  const pct = g.score != null ? (g.score / g.max) * 100 : null;
                  return (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl"
                      data-testid={`grade-card-${g.column}`}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div>
                        <p className="font-bold text-white">{g.label}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{semLabel(g.semester)}</p>
                      </div>
                      {g.score != null ? (
                        <div className="text-left">
                          <span className="text-2xl font-black" style={{ color: GRADE_COLORS(pct) }}>
                            {g.score}
                          </span>
                          <span className="text-sm font-bold" style={{ color: 'var(--text-hint)' }}> / {g.max}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold" style={{ color: 'var(--text-hint)' }}>لم تُرصد بعد</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-center mt-5" style={{ color: 'var(--text-hint)' }}>
                تتحدث الصفحة تلقائياً عند إرسال درجات جديدة
              </p>
              <div className="text-center mt-3">
                <button onClick={editInfo} className="text-xs font-bold inline-flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  <Pencil className="w-3 h-3" /> تعديل بياناتي
                </button>
              </div>
            </div>
          )}
        </div>

        {/* back to home */}
        <div className="text-center mt-6">
          <button onClick={() => navigate('/')} className="text-sm font-bold inline-flex items-center gap-2"
            style={{ color: 'var(--text-muted)' }} data-testid="grades-home-btn">
            <GraduationCap className="w-4 h-4" />
            العودة لصفحة الاختبارات
          </button>
        </div>
      </div>
    </div>
  );
}
