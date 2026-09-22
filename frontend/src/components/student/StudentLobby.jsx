import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Clock, Users, GraduationCap, Wifi } from 'lucide-react';
import { API } from '../../utils';
import { useStudentMode } from '../../hooks/useStudentMode';

export default function StudentLobby() {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  useStudentMode();
  const [status, setStatus] = useState('waiting');
  const [dots, setDots] = useState('');

  const { submission_id, student_name, quiz } = location.state || {};

  useEffect(() => {
    if (!submission_id) {
      navigate('/');
      return;
    }
    const poll = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/quiz/${quizId}/status`);
        setStatus(res.data.status);
        if (res.data.status === 'active') {
          clearInterval(poll);
          navigate(`/quiz/${quizId}/exam`, { state: { submission_id, student_name, quiz } });
        }
        if (res.data.status === 'closed') {
          clearInterval(poll);
        }
      } catch {}
    }, 4000);  // 4s — reduces server load in production

    const dotsInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);

    return () => { clearInterval(poll); clearInterval(dotsInterval); };
  }, [quizId, submission_id]);

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4 font-tajawal">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${i * 0.5}s` }} />
        ))}
      </div>

      <div className="relative text-center max-w-md w-full">
        {/* Status icon */}
        <div className="relative inline-block mb-8">
          <div className="w-28 h-28 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mx-auto pulse-ring">
            <GraduationCap className="w-14 h-14 text-white" />
          </div>
        </div>

        {/* Student info */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-6">
          <p className="text-white/70 text-sm mb-1">مرحباً</p>
          <h2 className="text-2xl font-bold text-white">{student_name || 'الطالب'}</h2>
        </div>

        {/* Quiz info */}
        <div className="quiz-card p-6 mb-4 text-center">
          <h3 className="font-bold text-white text-lg mb-1">{quiz?.title || 'الاختبار'}</h3>
          {quiz?.settings?.time_limit && (
            <div className="flex items-center justify-center gap-2 text-slate-300 text-sm mt-2">
              <Clock className="w-4 h-4" />
              <span>المدة: {quiz.settings.time_limit} دقيقة</span>
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full transition-all" style={i < dots.length ? { background: 'var(--theme-accent)' } : { background: 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
            <p className="text-slate-300 text-sm">
              {status === 'closed' ? 'تم إغلاق الاختبار' : `في انتظار المعلم لبدء الاختبار${dots}`}
            </p>
          </div>
        </div>

        {status === 'closed' && (
          <div className="rounded-2xl p-4 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
            تم إغلاق الاختبار من قبل المعلم
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-white/50 text-xs mt-4">
          <Wifi className="w-3 h-3" />
          <span>متصل - يتم التحديث تلقائياً</span>
        </div>
      </div>
    </div>
  );
}
