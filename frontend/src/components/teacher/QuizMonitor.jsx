import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Users, PlayCircle, StopCircle, CheckCircle, Clock,
  RefreshCw, BarChart2, GraduationCap
} from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';

export default function QuizMonitor() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [lobby, setLobby] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);  // 5s — reduced DB load
    return () => clearInterval(interval);
  }, [quizId]);

  const fetchAll = async () => {
    try {
      const res = await axios.get(`${API}/quizzes/${quizId}/monitor`, getAuthHeaders());
      setQuiz(res.data.quiz);
      setLobby(res.data.submissions);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const activate = async () => {
    try {
      await axios.post(`${API}/quizzes/${quizId}/activate`, {}, getAuthHeaders());
      toast.success('تم تفعيل الاختبار - الطلاب يمكنهم الدخول الآن');
      fetchAll();
    } catch { toast.error('تعذر تفعيل الاختبار'); }
  };

  const startExam = async () => {
    try {
      await axios.post(`${API}/quizzes/${quizId}/start`, {}, getAuthHeaders());
      toast.success('بدأ الاختبار!');
      fetchAll();
    } catch { toast.error('تعذر بدء الاختبار'); }
  };

  const closeExam = async () => {
    if (!window.confirm('هل تريد إنهاء الاختبار؟')) return;
    try {
      await axios.post(`${API}/quizzes/${quizId}/close`, {}, getAuthHeaders());
      toast.success('تم إغلاق الاختبار');
      navigate(`/teacher/quiz/${quizId}/results`);
    } catch { toast.error('تعذر إغلاق الاختبار'); }
  };

  const waitingStudents = lobby.filter(s => !s.submitted_at);
  const submittedStudents = lobby.filter(s => s.submitted_at);

  if (loading) return <TeacherLayout title="مراقبة الاختبار"><div className="text-center py-16 text-slate-400">جارٍ التحميل...</div></TeacherLayout>;

  return (
    <TeacherLayout title={quiz?.title || 'مراقبة الاختبار'} backTo="/teacher/dashboard">
      {/* Status card */}
      <div className={`rounded-2xl p-5 mb-6 ${quiz?.status === 'active' ? 'bg-green-500/10 border border-green-500/35' : quiz?.status === 'waiting' ? 'bg-yellow-500/10 border border-yellow-500/35' : 'glass-card border border-white/10'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${quiz?.status === 'active' ? 'bg-green-500 pulse-ring' : quiz?.status === 'waiting' ? 'bg-yellow-500' : 'bg-slate-400'}`} />
            <span className="font-bold text-white">
              {quiz?.status === 'active' ? 'الاختبار جارٍ الآن' : quiz?.status === 'waiting' ? 'في الانتظار - يمكن للطلاب الدخول' : 'مسودة'}
            </span>
            {quiz?.settings?.secret_code && (
              <span className="bg-white border border-slate-200 text-violet-700 font-bold px-3 py-1 rounded-lg text-sm">
                الرمز: {quiz.settings.secret_code}
              </span>
            )}
          </div>
          {quiz?.settings?.secret_code && (quiz?.status === 'waiting' || quiz?.status === 'active') && (
            <div className="w-full mt-3 flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl p-2.5">
              <span className="text-xs text-slate-500 flex-shrink-0">رابط الطلاب:</span>
              <code className="text-xs text-teal-700 flex-1 truncate">{window.location.origin}/join/{quiz.settings.secret_code}</code>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${quiz.settings.secret_code}`); toast.success('تم نسخ الرابط'); }}
                className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors flex-shrink-0 font-bold">
                نسخ الرابط
              </button>
            </div>
          )}


          <div className="flex items-center gap-2 flex-wrap">
            {quiz?.status === 'draft' && (
              <button onClick={activate} data-testid="activate-btn" className="btn-secondary flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                تفعيل الاختبار
              </button>
            )}
            {quiz?.status === 'waiting' && (
              <button onClick={startExam} data-testid="start-btn" className="btn-primary flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                ابدأ الاختبار ({waitingStudents.length} طالب)
              </button>
            )}
            {quiz?.status === 'active' && (
              <button onClick={closeExam} data-testid="close-btn" className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 transition-colors">
                <StopCircle className="w-4 h-4" />
                إنهاء الاختبار
              </button>
            )}
            <button onClick={fetchAll} className="p-2 hover:bg-white/70 rounded-xl transition-colors">
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'في الانتظار', value: waitingStudents.length, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'سلّموا', value: submittedStudents.length, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'الإجمالي', value: lobby.length, icon: Users, color: 'text-violet-600 bg-violet-50' },
        ].map((s, i) => (
          <div key={i} className="quiz-card p-4 text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Students table */}
      <div className="quiz-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-white">الطلاب المنضمون</h3>
          {quiz?.status === 'closed' && (
            <button onClick={() => navigate(`/teacher/quiz/${quizId}/results`)}
              className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium">
              <BarChart2 className="w-4 h-4" />
              عرض النتائج
            </button>
          )}
        </div>
        {lobby.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">لم ينضم أي طالب بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-right">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">الطالب</th>
                  <th className="px-4 py-3 font-semibold">الصف</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lobby.map((s, i) => (
                  <tr key={s.id || i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.student_name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.grade} / {s.section}</td>
                    <td className="px-4 py-3">
                      {s.submitted_at ? (
                        <span className="badge bg-green-100 text-green-700">سلّم</span>
                      ) : (
                        <span className="badge bg-yellow-100 text-yellow-700">ينتظر</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
