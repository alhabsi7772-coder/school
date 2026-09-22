import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { User, ArrowRight, Award, Loader2, Pencil, Sparkles, GraduationCap, Clock } from 'lucide-react';
import { API, GRADES } from '../../utils';
import Particles from '../Particles';
import { useStudentMode } from '../../hooks/useStudentMode';

const STORAGE_KEY = (code) => `gradeSession:${code}`;
const semLabel = (s) => (s === '2' ? 'الفصل الثاني' : 'الفصل الأول');

const GRADE_COLORS = (pct) =>
  pct >= 90 ? '#34D399' : pct >= 80 ? '#38BDF8' : pct >= 65 ? '#FBBF24' : pct >= 50 ? '#FB923C' : '#F87171';

export default function StudentJoinGrade() {
  const { code } = useParams();
  const navigate = useNavigate();
  useStudentMode();
  const upperCode = (code || '').toUpperCase();

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY(upperCode)) || 'null'); } catch { return null; }
  })();

  const [sessInfo, setSessInfo] = useState(null);
  const [phase, setPhase] = useState(saved?.participant_id ? 'polling' : 'form');
  const [form, setForm] = useState({
    name: saved?.name || '',
    grade: saved?.grade || '',
    section: saved?.section || '',
  });
  const [participantId, setParticipantId] = useState(saved?.participant_id || null);
  const [state, setState] = useState(null);
  const [joining, setJoining] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const timerRef = useRef(null);

  // load session info on mount
  useEffect(() => {
    if (!upperCode) return;
    axios.get(`${API}/public/grade-sessions/${upperCode}`)
      .then(r => setSessInfo(r.data))
      .catch(() => setNotFound(true));
  }, [upperCode]);

  // poll for state
  useEffect(() => {
    if (phase !== 'polling' || !participantId) return undefined;
    const poll = async () => {
      try {
        const r = await axios.get(`${API}/public/grade-sessions/${upperCode}/state`, {
          params: { participant_id: participantId }
        });
        setState(r.data);
      } catch (err) {
        if (err.response?.status === 404) {
          // participant was removed
          localStorage.removeItem(STORAGE_KEY(upperCode));
          setParticipantId(null);
          setPhase('form');
          toast.error('تم إلغاء تسجيلك من المعلم');
        }
      }
    };
    poll();
    timerRef.current = setInterval(poll, 4000);
    return () => clearInterval(timerRef.current);
  }, [phase, participantId, upperCode]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('اكتب اسمك');
    if (!form.grade) return toast.error('اختر الصف');
    if (!form.section) return toast.error('اختر الشعبة');
    setJoining(true);
    try {
      const r = await axios.post(`${API}/public/grade-sessions/${upperCode}/join`, {
        name: form.name.trim(),
        grade: form.grade,
        section: form.section,
      });
      const pid = r.data.participant_id;
      localStorage.setItem(STORAGE_KEY(upperCode), JSON.stringify({
        participant_id: pid, name: form.name.trim(), grade: form.grade, section: form.section,
      }));
      setParticipantId(pid);
      setPhase('polling');
      toast.success(r.data.rejoined ? 'استئناف الجلسة' : 'تم الانضمام — انتظر معلمك');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'تعذر الانضمام');
    } finally { setJoining(false); }
  };

  const editInfo = () => {
    clearInterval(timerRef.current);
    localStorage.removeItem(STORAGE_KEY(upperCode));
    setParticipantId(null);
    setState(null);
    setPhase('form');
  };

  const sections = form.grade ? GRADES[form.grade] || [] : [];

  if (notFound) {
    return (
      <PageShell>
        <div className="glass-modal rounded-3xl p-8 text-center" data-testid="session-notfound">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Clock className="w-7 h-7" style={{ color: '#F87171' }} />
          </div>
          <p className="text-white font-bold text-lg mb-1">الرابط غير صحيح أو منتهي</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-hint)' }}>اطلب من معلمك رابطاً جديداً</p>
          <button onClick={() => navigate('/')} className="btn-primary inline-flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> العودة للصفحة الرئيسية
          </button>
        </div>
      </PageShell>
    );
  }

  if (!sessInfo) {
    return (
      <PageShell>
        <div className="text-center py-10">
          <Loader2 className="w-10 h-10 mx-auto animate-spin" style={{ color: '#34D399' }} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Session banner */}
      <div className="text-center mb-6">
        <div className="icon-3d-container inline-flex mb-4">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(0,229,255,0.08))',
              border: '1px solid rgba(52,211,153,0.25)',
              boxShadow: '0 0 40px rgba(52,211,153,0.15)'
            }}>
            <Award className="w-10 h-10 icon-3d-float" style={{ color: '#34D399', filter: 'drop-shadow(0 4px 12px rgba(52,211,153,0.5))' }} />
          </div>
        </div>
        <h1 className="text-2xl font-black text-white mb-1.5">{sessInfo.rubric_title}</h1>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: 'rgba(var(--theme-accent-rgb),0.12)', color: 'var(--theme-accent)' }}>
          {sessInfo.column_label} • الصف {sessInfo.grade}/{sessInfo.section}
        </div>
      </div>

      <div className="glass-modal rounded-3xl overflow-hidden">
        {phase === 'form' && (
          <div className="p-7">
            <h2 className="text-lg font-bold text-white mb-1">اكتب بياناتك للانضمام</h2>
            <p className="text-xs mb-6" style={{ color: 'var(--text-hint)' }}>
              اكتب اسمك كاملاً كما هو مسجل لدى المعلم — لتظهر درجتك بدقة
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(52,211,153,0.5)' }} />
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="اسمك الكامل"
                  className="input-field pr-12" required data-testid="join-name-input" />
              </div>
              <div className="flex gap-3">
                <select className="input-field flex-1" value={form.grade} required
                  onChange={e => setForm(f => ({ ...f, grade: e.target.value, section: '' }))}
                  data-testid="join-grade-select">
                  <option value="">الصف</option>
                  {Object.keys(GRADES).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="input-field flex-1" value={form.section} required
                  onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                  data-testid="join-section-select">
                  <option value="">الشعبة</option>
                  {sections.map(s => <option key={s} value={String(s)}>{s}</option>)}
                </select>
              </div>
              <button type="submit" disabled={joining}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40" data-testid="join-submit-btn">
                {joining ? 'جارٍ الانضمام...' : 'انضمام'}
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </form>
          </div>
        )}

        {phase === 'polling' && state && state.phase === 'waiting' && (
          <div className="p-10 text-center" data-testid="join-waiting">
            <Loader2 className="w-12 h-12 mx-auto mb-5 animate-spin" style={{ color: '#34D399' }} />
            <p className="font-bold text-white text-lg mb-1">مرحباً {state.joined_name} 👋</p>
            <p className="text-xs mb-5" style={{ color: 'var(--text-hint)' }}>
              تم انضمامك بنجاح. في انتظار إرسال المعلم للدرجات...
            </p>
            <button onClick={editInfo} className="text-xs font-bold inline-flex items-center gap-1.5"
              style={{ color: 'var(--text-muted)' }} data-testid="join-edit-btn">
              <Pencil className="w-3 h-3" /> تعديل بياناتي
            </button>
          </div>
        )}

        {phase === 'polling' && state && state.phase === 'not_matched' && (
          <div className="p-8 text-center" data-testid="join-notmatched">
            <p className="font-bold text-white text-lg mb-2">⚠️ لم نتمكن من إيجاد درجتك</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              {state.message || 'راجع معلمك للتأكد من كتابة اسمك بشكل صحيح'}
            </p>
            <button onClick={editInfo} className="btn-primary inline-flex items-center gap-2" data-testid="join-fix-btn">
              <Pencil className="w-4 h-4" /> تصحيح بياناتي
            </button>
          </div>
        )}

        {phase === 'polling' && state && state.phase === 'not_evaluated' && (
          <div className="p-8 text-center" data-testid="join-notevaluated">
            <p className="font-bold text-white text-lg mb-2">⏳ لم يتم تقييمك بعد</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              المعلم لم يرصد درجتك على هذا النشاط بعد — انتظر قليلاً
            </p>
          </div>
        )}

        {phase === 'polling' && state && state.phase === 'released' && (
          <div className="p-7" data-testid="join-released">
            <div className="text-center mb-5">
              <Sparkles className="w-8 h-8 mx-auto mb-2" style={{ color: '#FBBF24' }} />
              <p className="font-black text-white text-xl">{state.matched_name}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
                {state.rubric_title} — {semLabel(state.semester)}
              </p>
            </div>

            {/* Total */}
            {state.total != null && (
              <div className="rounded-2xl p-5 mb-5 text-center"
                style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(0,229,255,0.05))', border: '1px solid rgba(52,211,153,0.25)' }}>
                <p className="text-[11px] font-bold mb-1.5" style={{ color: 'var(--text-hint)' }}>الدرجة الإجمالية للنشاط</p>
                <div>
                  <span className="text-5xl font-black"
                    style={{ color: GRADE_COLORS((state.total / state.total_max) * 100) }}>
                    {state.total}
                  </span>
                  <span className="text-xl font-bold" style={{ color: 'var(--text-hint)' }}> / {state.total_max}</span>
                </div>
                {state.gb_score != null && state.gb_max != null && (
                  <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                    الدرجة في السجل: <span className="font-bold text-white">{state.gb_score} / {state.gb_max}</span>
                  </p>
                )}
              </div>
            )}

            {/* Criteria breakdown */}
            <p className="text-sm font-bold text-white mb-3">معايير التقييم</p>
            <div className="space-y-2.5" data-testid="criteria-list">
              {state.criteria.map((c, i) => {
                const has = c.score != null;
                const pct = has ? (c.score / c.max) * 100 : 0;
                return (
                  <div key={i} className="rounded-xl p-3.5"
                    data-testid={`criterion-${i}`}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="font-bold text-white text-sm flex-1 min-w-0">{c.name}</p>
                      {has ? (
                        <div className="text-left flex-shrink-0">
                          <span className="text-lg font-black" style={{ color: GRADE_COLORS(pct) }}>{c.score}</span>
                          <span className="text-xs font-bold" style={{ color: 'var(--text-hint)' }}> / {c.max}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-hint)' }}>—</span>
                      )}
                    </div>
                    {has && (
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: GRADE_COLORS(pct) }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-5">
              <button onClick={editInfo} className="text-xs font-bold inline-flex items-center gap-1.5"
                style={{ color: 'var(--text-muted)' }}>
                <Pencil className="w-3 h-3" /> إعادة الانضمام
              </button>
            </div>
          </div>
        )}

        {phase === 'polling' && !state && (
          <div className="p-10 text-center">
            <Loader2 className="w-10 h-10 mx-auto animate-spin" style={{ color: '#34D399' }} />
          </div>
        )}
      </div>

      <div className="text-center mt-6">
        <button onClick={() => navigate('/')} className="text-sm font-bold inline-flex items-center gap-2"
          style={{ color: 'var(--text-muted)' }} data-testid="join-home-btn">
          <GraduationCap className="w-4 h-4" />
          الصفحة الرئيسية
        </button>
      </div>
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div className="min-h-screen page-bg font-tajawal flex items-center justify-center p-4 relative overflow-hidden">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="page-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <Particles />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
