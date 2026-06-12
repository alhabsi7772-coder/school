import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, GraduationCap, ArrowLeft, User, CreditCard, Zap, Clock } from 'lucide-react';
import { API, GRADES } from '../../utils';
import Particles from '../Particles';
import { useStudentMode } from '../../hooks/useStudentMode';

export default function StudentJoin() {
  const navigate = useNavigate();
  const { urlCode } = useParams();
  useStudentMode();

  const [step, setStep] = useState(urlCode ? 0 : 1);
  const [code, setCode] = useState(urlCode || '');
  const [quiz, setQuiz] = useState(null);
  const [form, setForm] = useState({ student_name: '', grade: '', section: '', civil_id: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlCode) fetchQuizByCode(urlCode.toUpperCase());
  }, []);

  const fetchQuizByCode = async (codeValue) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/quiz/join/${codeValue.trim().toUpperCase()}`);
      setQuiz(res.data);
      setCode(codeValue.toUpperCase());
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'رمز الاختبار غير صحيح أو الاختبار غير متاح');
      setStep(1);
      if (urlCode) navigate('/');
    } finally { setLoading(false); }
  };

  const checkCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    fetchQuizByCode(code);
  };

  const joinQuiz = async (e) => {
    e.preventDefault();
    if (!form.student_name.trim()) return toast.error('يجب إدخال اسمك');
    if (!form.grade) return toast.error('يجب تحديد الصف');
    if (!form.section) return toast.error('يجب تحديد الشعبة');
    if (quiz.settings?.home_exam && !form.civil_id.trim()) return toast.error('يجب إدخال الرقم المدني');
    setLoading(true);
    try {
      const payload = {
        student_name: form.student_name.trim(),
        grade: form.grade, section: form.section,
        civil_id: quiz.settings?.home_exam ? form.civil_id.trim() : null
      };
      const res = await axios.post(`${API}/quiz/${quiz.id}/join`, payload);
      const { submission_id } = res.data;
      localStorage.setItem(`student_${quiz.id}`, JSON.stringify({ submission_id, ...form }));
      navigate(`/quiz/${quiz.id}/lobby`, { state: { submission_id, student_name: form.student_name, quiz } });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'تعذر الانضمام');
    } finally { setLoading(false); }
  };

  const sections = form.grade ? GRADES[form.grade] || [] : [];

  return (
    <div className="min-h-screen page-bg font-tajawal flex items-center justify-center p-4 relative overflow-hidden">

      {/* Orbs */}
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
                background: 'linear-gradient(135deg, rgba(213,0,249,0.12), rgba(0,229,255,0.08))',
                border: '1px solid rgba(213,0,249,0.25)',
                boxShadow: '0 0 40px rgba(213,0,249,0.15)'
              }}>
              <GraduationCap className="w-10 h-10 icon-3d-float" style={{ color: '#D500F9', filter: 'drop-shadow(0 4px 12px rgba(213,0,249,0.5))' }} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">
            منصة <span className="neon-text-fuchsia">الاختبارات</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>مدرسة الخيرات للتعليم الأساسي</p>
        </div>

        {/* Card */}
        <div className="glass-modal rounded-3xl overflow-hidden">
          {step === 0 && (
            <div className="p-10 text-center">
              <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{ borderColor: 'rgba(0,229,255,0.4)', borderTopColor: 'transparent' }} />
              <p style={{ color: 'var(--text-muted)' }}>جارٍ التحقق من الرمز...</p>
            </div>
          )}

          {step === 1 && (
            <div className="p-7">
              <h2 className="text-xl font-bold text-white mb-1">أدخل رمز الاختبار</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-hint)' }}>اطلب الرمز من معلمك</p>
              <form onSubmit={checkCode} className="space-y-4">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(0,229,255,0.4)' }} />
                  <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="مثال: EXAM01"
                    className="input-field pr-12 text-center text-2xl font-black tracking-widest uppercase"
                    style={{ letterSpacing: '0.25em', color: '#00E5FF' }}
                    maxLength={8} required data-testid="code-input" />
                </div>
                <button type="submit" disabled={loading || !code.trim()} className="btn-primary w-full"
                  style={{ padding: '0.875rem' }} data-testid="check-code-btn">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />جارٍ التحقق...</>
                    ) : (
                      <><Zap className="w-4 h-4" />دخول</>
                    )}
                  </span>
                </button>
              </form>
              <button type="button" onClick={() => navigate('/my-grades')}
                data-testid="my-grades-link"
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
                style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}>
                🏆 عرض درجاتي (الأنشطة والمشروع)
              </button>
            </div>
          )}

          {step === 2 && quiz && (
            <div className="p-7">
              {/* Quiz Info */}
              <div className="rounded-2xl p-4 mb-5"
                style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)' }}>
                <p className="text-xs font-bold tracking-widest uppercase mb-1.5" style={{ color: 'rgba(0,229,255,0.5)' }}>
                  الاختبار
                </p>
                <h3 className="font-bold text-white text-base">{quiz.title}</h3>
                {quiz.description && <p className="text-sm mt-1" style={{ color: 'var(--text-hint)' }}>{quiz.description}</p>}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {quiz.settings?.time_limit && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg"
                      style={{ background: 'rgba(255,234,0,0.1)', color: '#FCD34D', border: '1px solid rgba(255,234,0,0.2)' }}>
                      <Clock className="w-3 h-3" />
                      {quiz.settings.time_limit} دقيقة
                    </span>
                  )}
                  {quiz.settings?.home_exam && (
                    <span className="text-xs px-2 py-0.5 rounded-lg"
                      style={{ background: 'rgba(213,0,249,0.1)', color: '#E879F9', border: '1px solid rgba(213,0,249,0.2)' }}>
                      اختبار منزلي
                    </span>
                  )}
                </div>
              </div>

              <h2 className="font-bold text-white mb-4 text-sm">بياناتك</h2>
              <form onSubmit={joinQuiz} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase mb-1.5"
                    style={{ color: 'rgba(0,229,255,0.6)' }}>الاسم الكامل *</label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(0,229,255,0.4)' }} />
                    <input className="input-field pr-11" placeholder="أدخل اسمك الكامل"
                      value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))}
                      required data-testid="student-name-input" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1.5" style={{ color: 'rgba(0,229,255,0.6)' }}>الصف *</label>
                    <select className="input-field" value={form.grade}
                      onChange={e => setForm(p => ({ ...p, grade: e.target.value, section: '' }))}
                      required data-testid="grade-select">
                      <option value="">اختر</option>
                      {Object.keys(GRADES).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1.5" style={{ color: 'rgba(0,229,255,0.6)' }}>الشعبة *</label>
                    <select className="input-field" value={form.section}
                      onChange={e => setForm(p => ({ ...p, section: e.target.value }))}
                      required disabled={!form.grade} data-testid="section-select">
                      <option value="">الشعبة</option>
                      {sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {quiz.settings?.home_exam && (
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1.5" style={{ color: 'rgba(213,0,249,0.7)' }}>
                      الرقم المدني * <span className="normal-case">(مطلوب)</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(213,0,249,0.5)' }} />
                      <input className="input-field pr-11" placeholder="أدخل رقمك المدني"
                        value={form.civil_id} onChange={e => setForm(p => ({ ...p, civil_id: e.target.value }))}
                        required data-testid="civil-id-input" />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  {!urlCode && (
                    <button type="button" onClick={() => setStep(1)} className="btn-ghost flex items-center gap-1.5 flex-shrink-0">
                      <ArrowLeft className="w-4 h-4" />رجوع
                    </button>
                  )}
                  <button type="submit" disabled={loading} className="btn-primary flex-1"
                    style={{ padding: '0.75rem' }} data-testid="join-btn">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? (
                        <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />جارٍ الانضمام...</>
                      ) : (
                        <><Zap className="w-4 h-4" />دخول الاختبار</>
                      )}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {!urlCode && (
          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-hint)' }}>
            هل أنت معلم؟{' '}
            <a href="/teacher/login" style={{ color: 'rgba(0,229,255,0.6)' }} className="hover:text-cyan-300 transition-colors">
              دخول المعلم
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
