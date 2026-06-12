import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, CheckCircle, Hourglass } from 'lucide-react';
import { API, QUESTION_TYPES } from '../../utils';
import { useStudentMode } from '../../hooks/useStudentMode';

/* ─── Timer ─────────────────────────────────────────────── */
function Timer({ startTime, timeLimit, onExpire }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!startTime || !timeLimit) return;
    const interval = setInterval(() => {
      const end = new Date(startTime).getTime() + timeLimit * 60 * 1000;
      const rem = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) { clearInterval(interval); onExpire(); }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, timeLimit]);

  if (remaining === null) return null;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining < 60;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${isLow ? 'bg-red-900/40 text-red-300 animate-pulse border border-red-700/40' : 'bg-white/10 text-white border border-white/20'}`}>
      <Clock className="w-4 h-4" />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}

/* ─── Waiting for results screen ────────────────────────── */
function WaitingResults({ quizId, submissionId, locationState, navigate, autoReady }) {
  const [status, setStatus] = useState(autoReady ? 'ready' : 'waiting');
  const [countdown, setCountdown] = useState(3);

  // Poll every 5s for results
  useEffect(() => {
    if (autoReady) return;
    const poll = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/quiz/${quizId}/result/${submissionId}`);
        if (res.data.submitted && res.data.show_results && res.data.is_graded) {
          setStatus('ready');
          clearInterval(poll);
        } else if (res.data.submitted && res.data.show_results === false) {
          setStatus('hidden');
          clearInterval(poll);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [quizId, submissionId, autoReady]);

  // Countdown when ready
  useEffect(() => {
    if (status !== 'ready') return;
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) {
        clearInterval(t);
        navigate(`/quiz/${quizId}/result/${submissionId}`, { state: locationState });
      }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [status]);

  return (
    <div className="min-h-screen page-bg font-tajawal flex items-center justify-center">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

      <div className="relative z-10 text-center px-4 w-full max-w-sm">
        {status === 'ready' && (
          <div className="glass-card rounded-3xl p-10">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}>
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">النتيجة جاهزة!</h2>
            <p className="text-slate-400 text-sm mb-4">جارٍ الانتقال للنتيجة خلال {countdown} ثوانٍ...</p>
            <button
              data-testid="view-result-btn"
              onClick={() => navigate(`/quiz/${quizId}/result/${submissionId}`, { state: locationState })}
              className="btn-primary w-full py-3">
              عرض النتيجة الآن
            </button>
          </div>
        )}

        {status === 'hidden' && (
          <div className="glass-card rounded-3xl p-10">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(var(--theme-accent-rgb), 0.1)', border: '2px solid rgba(var(--theme-accent-rgb), 0.3)' }}>
              <Hourglass className="w-10 h-10" style={{ color: 'var(--theme-accent)' }} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">تم تسليم إجاباتك</h2>
            <p className="text-slate-400 text-sm">ستُعلن النتيجة لاحقاً من قبل المعلم</p>
          </div>
        )}

        {status === 'waiting' && (
          <div className="glass-card rounded-3xl p-10">
            {/* Spinning loader */}
            <div className="w-20 h-20 mx-auto mb-5 relative">
              <div className="absolute inset-0 rounded-full"
                style={{ border: '3px solid rgba(var(--theme-accent-rgb), 0.15)' }} />
              <div className="absolute inset-0 rounded-full animate-spin"
                style={{ border: '3px solid transparent', borderTopColor: 'var(--theme-accent)' }} />
              <div className="absolute inset-3 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(var(--theme-accent-rgb), 0.08)' }}>
                <CheckCircle className="w-7 h-7" style={{ color: 'var(--theme-accent)' }} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">تم تسليم إجاباتك</h2>
            <p className="text-slate-400 text-sm mb-1">جارٍ تصحيح إجاباتك...</p>
            <p className="text-xs" style={{ color: 'rgba(var(--theme-accent-rgb), 0.6)' }}>
              انتظر ظهور النتيجة من المعلم
            </p>

            {/* Animated dots */}
            <div className="flex justify-center gap-1.5 mt-5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full"
                  style={{
                    background: 'var(--theme-accent)',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.7,
                  }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main exam component ───────────────────────────────── */
export default function StudentExam() {
  const { quizId } = useParams();
  const location   = useLocation();
  const navigate   = useNavigate();
  useStudentMode();

  const { submission_id, student_name } = location.state || {};
  const [questions, setQuestions]   = useState([]);
  const [answers, setAnswers]       = useState({});
  const [current, setCurrent]       = useState(0);
  const [examMeta, setExamMeta]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [autoReady, setAutoReady]   = useState(false);
  const [teacherClosed, setTeacherClosed] = useState(false);

  // Refs to avoid stale closures in setInterval
  const submittedRef  = useRef(false);
  const submittingRef = useRef(false);
  const answersRef    = useRef({});
  const questionsRef  = useRef([]);

  useEffect(() => { submittedRef.current  = submitted;  }, [submitted]);
  useEffect(() => { submittingRef.current = submitting; }, [submitting]);
  useEffect(() => { answersRef.current    = answers;    }, [answers]);
  useEffect(() => { questionsRef.current  = questions;  }, [questions]);

  // Core submit logic (also called by timer expiry and teacher-close)
  const doSubmit = useCallback(async (qs, ans, silent = false) => {
    if (submittingRef.current || submittedRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const answerList = qs.map(q => ({
        question_id: q.id,
        answer_text: ans[q.id] || '',
      }));
      const res = await axios.post(`${API}/quiz/${quizId}/submit/${submission_id}`, { answers: answerList });
      const graded = res.data.is_graded && res.data.show_results;
      setAutoReady(graded);
      submittedRef.current = true;
      setSubmitted(true);
      if (!silent) toast.success('تم تسليم الاختبار بنجاح!');
    } catch {
      if (!silent) toast.error('تعذر تسليم الاختبار');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [quizId, submission_id]);

  useEffect(() => {
    if (!submission_id) { navigate('/'); return; }
    loadQuestions();
  }, [submission_id]);

  const loadQuestions = async () => {
    try {
      const res = await axios.get(`${API}/quiz/${quizId}/questions/${submission_id}`);
      if (res.data.status !== 'active') {
        navigate(`/quiz/${quizId}/lobby`, { state: location.state });
        return;
      }
      setQuestions(res.data.questions || []);
      setExamMeta({
        time_limit:          res.data.time_limit,
        start_time:          res.data.start_time,
        show_question_nav:   res.data.show_question_nav,
      });
      const init = {};
      (res.data.questions || []).forEach(q => { init[q.id] = ''; });
      setAnswers(init);
    } catch { toast.error('تعذر تحميل الأسئلة'); }
    finally { setLoading(false); }
  };

  // Poll quiz status — auto-submit when teacher closes exam
  // Only triggers if quiz was CONFIRMED active first (prevents false-positive on closed quizzes)
  useEffect(() => {
    if (!submission_id) return;
    const hasBeenActive = { current: false };

    const poll = setInterval(async () => {
      if (submittedRef.current || submittingRef.current) return;
      try {
        const r = await axios.get(`${API}/quiz/${quizId}/status`);
        if (r.data.status === 'active') {
          hasBeenActive.current = true;
        } else if (hasBeenActive.current) {
          // Teacher closed the quiz after it was active
          clearInterval(poll);
          setTeacherClosed(true);
          toast.info('تم إنهاء الاختبار من قبل المعلم، جارٍ حفظ إجاباتك...');
          doSubmit(questionsRef.current, answersRef.current, true);
        }
      } catch {}
    }, 7000);
    return () => clearInterval(poll);
  }, [submission_id, quizId, doSubmit]);

  // Wrapped for timer onExpire (uses latest refs)
  const submitExam = useCallback(() => {
    doSubmit(questionsRef.current, answersRef.current, false);
  }, [doSubmit]);

  // Manual submit (from confirm modal)
  const handleConfirmSubmit = () => {
    setShowConfirm(false);
    doSubmit(questionsRef.current, answersRef.current, false);
  };

  const answered = Object.values(answers).filter(a => a !== '').length;
  const total    = questions.length;
  const q        = questions[current];

  if (loading) return (
    <div className="min-h-screen page-bg flex items-center justify-center font-tajawal">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      <p className="text-white text-lg">جارٍ تحميل الأسئلة...</p>
    </div>
  );

  // After submission → show waiting screen (no home button)
  if (submitted) return (
    <WaitingResults
      quizId={quizId}
      submissionId={submission_id}
      locationState={location.state}
      navigate={navigate}
      autoReady={autoReady}
    />
  );

  return (
    <div className="min-h-screen page-bg font-tajawal">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

      {/* Header */}
      <div className="relative z-10"
        style={{ background: 'rgba(11,17,32,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(var(--theme-accent-rgb), 0.12)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-hint)' }}>الطالب</p>
            <p className="font-bold text-white text-sm">{student_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{answered}/{total} إجابة</span>
            {examMeta && (
              <Timer startTime={examMeta.start_time} timeLimit={examMeta.time_limit} onExpire={submitExam} />
            )}
          </div>
        </div>
        <div className="h-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full transition-all duration-300"
            style={{ width: `${total > 0 ? answered / total * 100 : 0}%`, background: 'var(--theme-accent)', boxShadow: '0 0 8px rgba(var(--theme-accent-rgb),0.6)' }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">
        {/* Question nav pills */}
        {examMeta?.show_question_nav && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {questions.map((q2, i) => (
              <button key={q2.id} onClick={() => setCurrent(i)}
                className="flex-shrink-0 w-9 h-9 rounded-xl text-sm font-bold transition-all"
                style={i === current
                  ? { background: 'var(--theme-accent)', color: '#000' }
                  : answers[q2.id]
                  ? { background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }
                  : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }
                }>
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Question card */}
        {q && (
          <div className="quiz-card p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`badge ${QUESTION_TYPES[q.type]?.color || 'bg-slate-700 text-slate-300'}`}>
                {QUESTION_TYPES[q.type]?.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.25)' }}>
                {q.points} {q.points === 1 ? 'درجة' : 'درجات'}
              </span>
              <span className="text-xs text-slate-400 mr-auto">السؤال {current + 1} من {total}</span>
            </div>

            <p className="text-base font-semibold text-white mb-4 leading-relaxed">{q.text}</p>
            {q.image_url && (
              <img src={q.image_url} alt="سؤال" className="mb-4 max-h-48 rounded-xl object-contain border border-white/10" />
            )}

            {/* MCQ */}
            {q.type === 'mcq' && (
              <div className="space-y-2">
                {(q.options || []).map((opt, i) => {
                  const isSel = answers[q.id] === opt;
                  return (
                    <button key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))}
                      data-testid={`option-${i}`}
                      className="w-full text-right p-3.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-3"
                      style={isSel
                        ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb), 0.12)', color: 'var(--theme-accent)' }
                        : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.9)' }
                      }>
                      <span className="font-bold flex-shrink-0 w-6 text-center" style={{ color: isSel ? 'var(--theme-accent)' : 'var(--text-hint)' }}>
                        {['أ', 'ب', 'ج', 'د'][i]}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* True/False */}
            {q.type === 'true_false' && (
              <div className="flex gap-4">
                {['صح', 'خطأ'].map(v => (
                  <button key={v} onClick={() => setAnswers(p => ({ ...p, [q.id]: v }))}
                    className="flex-1 py-4 rounded-xl font-bold text-lg border-2 transition-all"
                    style={answers[q.id] === v
                      ? (v === 'صح'
                        ? { background: 'rgba(34,197,94,0.2)', borderColor: '#4ade80', color: '#4ade80' }
                        : { background: 'rgba(239,68,68,0.2)', borderColor: '#f87171', color: '#f87171' })
                      : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.9)' }
                    }>
                    {v}
                  </button>
                ))}
              </div>
            )}

            {/* Short */}
            {q.type === 'short' && (
              <input className="input-field" placeholder="اكتب إجابتك هنا..."
                value={answers[q.id] || ''}
                onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                data-testid="short-answer-input" />
            )}

            {/* Long */}
            {q.type === 'long' && (
              <textarea className="input-field resize-none" rows={5} placeholder="اكتب إجابتك هنا..."
                value={answers[q.id] || ''}
                onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                data-testid="long-answer-input" />
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.9)' }}>
            <ChevronRight className="w-4 h-4" />
            السابق
          </button>

          {current < total - 1 ? (
            <button onClick={() => setCurrent(c => Math.min(total - 1, c + 1))}
              className="btn-primary flex items-center gap-2 px-5 py-2 text-sm font-bold">
              التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setShowConfirm(true)} disabled={submitting}
              data-testid="submit-exam-btn"
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
              style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}>
              <Send className="w-4 h-4" />
              تسليم الاختبار
            </button>
          )}
        </div>

        {answered < total && (
          <div className="mt-4 flex items-center gap-2 text-xs p-3 rounded-xl"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fcd34d' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            لديك {total - answered} سؤال لم تجب عليه بعد.
          </div>
        )}
      </div>

      {/* ── Confirm Submit Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-modal rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(251,191,36,0.12)', border: '2px solid rgba(251,191,36,0.35)' }}>
                <AlertCircle className="w-8 h-8" style={{ color: '#fcd34d' }} />
              </div>
              <h3 className="font-bold text-white text-lg mb-2">تأكيد تسليم الاختبار</h3>
              <p className="text-slate-300 text-sm mb-3">بعد التسليم لن تتمكن من تعديل إجاباتك.</p>
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
                style={answered === total
                  ? { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }
                  : { background: 'rgba(251,191,36,0.1)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.25)' }
                }>
                أجبت على {answered} من {total} سؤال
                {answered < total && <span className="mr-1">• {total - answered} بدون إجابة</span>}
              </div>
            </div>
            <div className="flex gap-3">
              <button data-testid="cancel-submit-btn" onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(226,232,240,0.9)' }}>
                إلغاء
              </button>
              <button data-testid="confirm-submit-btn" onClick={handleConfirmSubmit}
                className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}>
                <Send className="w-4 h-4" />
                تأكيد التسليم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
