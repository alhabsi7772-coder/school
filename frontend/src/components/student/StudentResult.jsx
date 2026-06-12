import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Clock, Trophy, Award } from 'lucide-react';
import { API, getScoreColor } from '../../utils';
import { downloadCertificate } from '../../utils/generateCertificate';
import { useStudentMode } from '../../hooks/useStudentMode';

export default function StudentResult() {
  const { quizId, submissionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  useStudentMode();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [genCert, setGenCert] = useState(false);

  useEffect(() => { fetchResult(); }, [submissionId]);

  const fetchResult = async () => {
    try {
      const res = await axios.get(`${API}/quiz/${quizId}/result/${submissionId}`);
      setResult(res.data);
      // Start polling if submitted but not yet graded
      if (res.data.submitted && !res.data.is_graded) {
        setPolling(true);
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/quiz/${quizId}/result/${submissionId}`);
        setResult(res.data);
        if (res.data.is_graded) {
          setPolling(false);
          clearInterval(interval);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  if (loading) return (
    <div className="min-h-screen page-bg flex items-center justify-center font-tajawal">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      <p className="text-white text-lg">جارٍ تحميل النتيجة...</p>
    </div>
  );

  if (!result?.submitted) return (
    <div className="min-h-screen page-bg flex items-center justify-center font-tajawal">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      <div className="text-center">
        <p className="text-slate-300">لم يتم تسليم الاختبار بعد</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">الرئيسية</button>
      </div>
    </div>
  );

  if (!result?.show_results || !result?.is_graded) return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4 font-tajawal">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      <div className="text-center text-white max-w-sm relative z-10">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 float-anim">
          <Clock className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2">تم التسليم!</h2>
        <p className="text-white/80 mb-6">
          {!result?.is_graded
            ? 'في انتظار تصحيح المعلم للأسئلة الطويلة...'
            : 'في انتظار المعلم لنشر النتائج...'}
        </p>
        {polling && (
          <div className="flex justify-center gap-1 mb-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}
        <p className="text-white/70 text-sm">انتظر إعلان النتيجة من المعلم</p>
      </div>
    </div>
  );

  const handleCertificate = async () => {
    setGenCert(true);
    const templateId = localStorage.getItem('certTemplate') || 'classic_blue';
    try {
      await downloadCertificate(result, { title: result.quiz_title }, templateId);
    } catch { }
    finally { setGenCert(false); }
  };

  const pct = Math.round(result.percentage || 0);
  const isFullScore = result.total_score > 0 && result.total_score >= result.max_score;
  const scoreColor = pct >= 80 ? 'from-green-400 to-teal-500' : pct >= 60 ? 'from-yellow-400 to-orange-400' : 'from-red-400 to-rose-500';
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '⭐' : pct >= 50 ? '👍' : '📚';

  return (
    <div className="min-h-screen page-bg font-tajawal">
      {/* Score header */}
      <div className={`bg-gradient-to-bl ${scoreColor} text-white py-10 px-4 text-center`}>
        <div className="text-5xl mb-3">{emoji}</div>
        <h1 className="text-2xl font-bold mb-1">{result.student_name}</h1>
        <p className="text-white/80 text-sm mb-6">{result.grade} / الشعبة {result.section}</p>

        <div className="inline-flex items-baseline gap-2 bg-white/20 backdrop-blur rounded-2xl px-8 py-4">
          <span className="text-5xl font-extrabold">{result.total_score}</span>
          <span className="text-2xl text-white/70">/{result.max_score}</span>
        </div>
        <p className="text-white/80 mt-3 text-lg font-bold">{pct}%</p>
        <p className="text-white/60 text-sm mt-1">{result.quiz_title}</p>

        {/* Certificate button - only for full score */}
        {isFullScore && (
          <button onClick={handleCertificate} disabled={genCert} data-testid="download-cert-btn"
            className="mt-5 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white font-semibold px-5 py-2.5 rounded-2xl transition-all text-sm disabled:opacity-60">
            {genCert
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />جارٍ الإنشاء...</>
              : <><Award className="w-4 h-4" />تحميل شهادة الإتمام</>
            }
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3 relative z-10">
        <h2 className="font-bold text-white mb-4">تفاصيل الإجابات</h2>

        {result.answers?.map((ans, i) => {
          const isCorrect = ans.is_correct;
          const isPending = isCorrect === null;
          return (
            <div key={i} className="rounded-2xl border p-4 backdrop-blur-sm"
              style={isCorrect
                ? { background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }
                : isPending
                ? { background: 'rgba(251,146,60,0.08)', borderColor: 'rgba(251,146,60,0.25)' }
                : { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }
              }>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {isCorrect ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /> : isPending ? <Clock className="w-5 h-5 text-orange-400 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  <span className="text-xs text-slate-400 font-medium">سؤال {i + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-bold ${isCorrect ? 'text-green-400' : isPending ? 'text-orange-400' : 'text-red-400'}`}>
                    {ans.score}/{ans.points}
                  </span>
                  <span className={`badge text-xs ${isCorrect ? 'bg-green-900/40 text-green-400 border border-green-700/30' : isPending ? 'bg-orange-900/40 text-orange-400 border border-orange-700/30' : 'bg-red-900/40 text-red-400 border border-red-700/30'}`}>
                    {isCorrect ? 'صحيح' : isPending ? 'قيد التصحيح' : 'خطأ'}
                  </span>
                </div>
              </div>

              <p className="text-sm font-semibold text-white mb-2">{ans.question_text}</p>
              {ans.image_url && <img src={ans.image_url} alt="" className="mb-2 h-24 rounded-lg object-cover" />}

              <div className="rounded-lg p-2.5"
                style={isCorrect
                  ? { background: 'rgba(34,197,94,0.12)' }
                  : isPending
                  ? { background: 'rgba(251,146,60,0.12)' }
                  : { background: 'rgba(239,68,68,0.12)' }
                }>
                <p className="text-xs text-slate-400 mb-0.5">إجابتك:</p>
                <p className={`text-sm font-semibold ${isCorrect ? 'text-green-300' : isPending ? 'text-orange-300' : 'text-red-300'}`}>
                  {ans.answer_text || '(لم يجب)'}
                </p>
              </div>

              {!isCorrect && !isPending && ans.correct_answer && (
                <div className="rounded-lg p-2.5 mt-2" style={{ background: 'rgba(34,197,94,0.12)' }}>
                  <p className="text-xs text-slate-400 mb-0.5">الإجابة الصحيحة:</p>
                  <p className="text-sm font-semibold text-green-300">{ans.correct_answer}</p>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex gap-3 pt-4">
          {isFullScore && (
            <button onClick={handleCertificate} disabled={genCert} data-testid="download-cert-btn-bottom"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-60"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
              {genCert
                ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                : <Award className="w-4 h-4" />
              }
              تحميل الشهادة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
