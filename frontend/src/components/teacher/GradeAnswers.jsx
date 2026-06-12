import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';

const SCORE_OPTIONS = (maxPts) => {
  const opts = [];
  for (let i = 0; i <= maxPts; i += 0.5) opts.push(i);
  return opts;
};

export default function GradeAnswers() {
  const { quizId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [grades, setGrades] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPending(); }, [quizId]);

  const fetchPending = async () => {
    try {
      const res = await axios.get(`${API}/quizzes/${quizId}/pending`, getAuthHeaders());
      setData(res.data);
      if (res.data.submissions?.length > 0) {
        initGrades(res.data.submissions[0], res.data.quiz);
      }
    } catch { toast.error('تعذر تحميل البيانات'); }
    finally { setLoading(false); }
  };

  const initGrades = (sub, quiz) => {
    const longQs = quiz?.questions?.filter(q => q.type === 'long') || [];
    const g = {};
    for (const q of longQs) {
      const ans = sub.answers?.find(a => a.question_id === q.id);
      g[q.id] = { score: 0, is_correct: false, text: ans?.answer_text || '' };
    }
    setGrades(g);
  };

  const selectStudent = (idx) => {
    setCurrent(idx);
    initGrades(data.submissions[idx], data.quiz);
  };

  const saveCurrent = async () => {
    const sub = data.submissions[current];
    setSaving(true);
    try {
      const gradeList = Object.entries(grades).map(([qid, g]) => ({
        question_id: qid, score: g.score, is_correct: g.is_correct
      }));
      await axios.post(`${API}/quizzes/${quizId}/grade/${sub.id}`, gradeList, getAuthHeaders());
      toast.success(`تم تصحيح إجابات ${sub.student_name}`);
      fetchPending();
    } catch { toast.error('تعذر حفظ التصحيح'); }
    finally { setSaving(false); }
  };

  if (loading) return <TeacherLayout title="التصحيح اليدوي"><div className="text-center py-16 text-slate-400">جارٍ التحميل...</div></TeacherLayout>;

  const { submissions, quiz } = data || {};
  const longQuestions = quiz?.questions?.filter(q => q.type === 'long') || [];

  if (!submissions?.length) {
    return (
      <TeacherLayout title="التصحيح اليدوي" backTo={`/teacher/quiz/${quizId}/results`}>
        <div className="quiz-card p-16 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">تم تصحيح جميع الاختبارات!</p>
        </div>
      </TeacherLayout>
    );
  }

  const sub = submissions[current];

  return (
    <TeacherLayout title="التصحيح اليدوي" backTo={`/teacher/quiz/${quizId}/results`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students list */}
        <div className="quiz-card p-4">
          <h3 className="font-bold text-slate-800 mb-3">الطلاب ({submissions.length})</h3>
          <div className="space-y-2">
            {submissions.map((s, i) => (
              <button key={s.id} onClick={() => selectStudent(i)}
                className={`w-full text-right p-3 rounded-xl transition-all ${i === current ? 'bg-violet-50 border border-violet-200' : 'hover:bg-slate-50'}`}>
                <p className="font-medium text-slate-900 text-sm">{s.student_name}</p>
                <p className="text-xs text-slate-500">{s.grade} / {s.section}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Grading panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="quiz-card p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">{sub.student_name}</h3>
              <p className="text-sm text-slate-500">{sub.grade} / {sub.section}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => current > 0 && selectStudent(current - 1)} disabled={current === 0}
                className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-500">{current + 1}/{submissions.length}</span>
              <button onClick={() => current < submissions.length - 1 && selectStudent(current + 1)} disabled={current === submissions.length - 1}
                className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {longQuestions.map((q, i) => {
            const ans = sub.answers?.find(a => a.question_id === q.id);
            const g = grades[q.id] || { score: 0, is_correct: false };
            return (
              <div key={q.id} className="quiz-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="text-xs text-slate-500">الدرجة القصوى: {q.points}</span>
                </div>
                <p className="font-medium text-slate-800 mb-3">{q.text}</p>
                {q.image_url && <img src={q.image_url} alt="" className="mb-3 h-32 rounded-lg object-cover" />}

                <div className="bg-slate-50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-slate-500 mb-1">إجابة الطالب:</p>
                  <p className="text-sm text-slate-800 font-medium">{ans?.answer_text || '(لم يجب)'}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">الدرجة المخصصة:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {SCORE_OPTIONS(q.points).map(score => (
                      <button key={score} onClick={() => setGrades(p => ({ ...p, [q.id]: { score, is_correct: score > 0, text: g.text } }))}
                        className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all ${g.score === score ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <button onClick={saveCurrent} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2" data-testid="save-grade-btn">
            <Save className="w-4 h-4" />
            {saving ? 'جارٍ الحفظ...' : `حفظ تصحيح ${sub.student_name}`}
          </button>
        </div>
      </div>
    </TeacherLayout>
  );
}
