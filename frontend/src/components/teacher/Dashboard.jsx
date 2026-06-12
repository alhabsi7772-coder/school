import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, BarChart2, Users, Eye, PlayCircle,
  Clock, FileQuestion, Copy, CopyPlus, Zap, CheckCircle2
} from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders, STATUS_MAP } from '../../utils';

const STATUS_STYLE = {
  draft:   { label: 'مسودة',     cls: 'badge-draft' },
  waiting: { label: 'في الانتظار', cls: 'badge-waiting' },
  active:  { label: 'جارٍ الآن',  cls: 'badge-active' },
  closed:  { label: 'منتهي',     cls: 'badge-closed' },
};

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchQuizzes(); }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await axios.get(`${API}/quizzes`, getAuthHeaders());
      setQuizzes(res.data);
    } catch { toast.error('تعذر تحميل الاختبارات'); }
    finally { setLoading(false); }
  };

  const deleteQuiz = async (id, title) => {
    if (!window.confirm(`هل تريد حذف اختبار "${title}"؟`)) return;
    try {
      await axios.delete(`${API}/quizzes/${id}`, getAuthHeaders());
      toast.success('تم حذف الاختبار');
      fetchQuizzes();
    } catch { toast.error('تعذر حذف الاختبار'); }
  };

  const copyCode = (code) => { navigator.clipboard.writeText(code); toast.success('تم نسخ الرمز'); };
  const copyQuizUrl = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    toast.success('تم نسخ رابط الاختبار');
  };
  const duplicateQuiz = async (id, title) => {
    try {
      await axios.post(`${API}/quizzes/${id}/duplicate`, {}, getAuthHeaders());
      toast.success(`تم نسخ "${title}" بنجاح`);
      fetchQuizzes();
    } catch { toast.error('تعذر نسخ الاختبار'); }
  };

  const stats = [
    { label: 'إجمالي الاختبارات', value: quizzes.length, icon: FileQuestion, color: '#00E5FF', glow: 'rgba(0,229,255,0.3)' },
    { label: 'جارٍ الآن', value: quizzes.filter(q => q.status === 'active').length, icon: PlayCircle, color: '#00E676', glow: 'rgba(0,230,118,0.3)' },
    { label: 'في الانتظار', value: quizzes.filter(q => q.status === 'waiting').length, icon: Clock, color: '#FFEA00', glow: 'rgba(255,234,0,0.3)' },
    { label: 'إجمالي الطلاب', value: quizzes.reduce((s, q) => s + (q.submission_count || 0), 0), icon: Users, color: '#D500F9', glow: 'rgba(213,0,249,0.3)' },
  ];

  return (
    <TeacherLayout title="لوحة التحكم">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="stat-card group" style={{ '--stat-color': s.color }}>
            <div className="flex items-start justify-between mb-4">
              <div className="icon-3d-wrapper">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center icon-3d"
                  style={{
                    background: `rgba(${s.color === '#00E5FF' ? '0,229,255' : s.color === '#00E676' ? '0,230,118' : s.color === '#FFEA00' ? '255,234,0' : '213,0,249'},0.1)`,
                    border: `1px solid ${s.color}30`
                  }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} strokeWidth={1.5} />
                </div>
              </div>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: s.color, boxShadow: `0 0 8px ${s.glow}` }} />
            </div>
            <p className="text-3xl font-black text-white mb-1">{s.value}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white">الاختبارات</h2>
        <button
          onClick={() => navigate('/teacher/quiz/new')}
          data-testid="create-quiz-btn"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>اختبار جديد</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="quiz-card p-5 shimmer h-24 rounded-2xl" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="quiz-card p-16 text-center">
          <div className="icon-3d-container inline-flex mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.1)' }}>
              <FileQuestion className="w-8 h-8" style={{ color: 'rgba(0,229,255,0.4)' }} strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-white font-bold mb-1">لا يوجد اختبارات بعد</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-hint)' }}>أنشئ أول اختبار الآن</p>
          <button onClick={() => navigate('/teacher/quiz/new')} className="btn-primary">
            <span>إنشاء أول اختبار</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {quizzes.map(quiz => {
            const st = STATUS_STYLE[quiz.status] || STATUS_STYLE.draft;
            const legacySt = STATUS_MAP[quiz.status] || STATUS_MAP.draft;
            return (
              <div key={quiz.id} data-testid={`quiz-card-${quiz.id}`}
                className="quiz-card p-5 group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="font-bold text-white text-base">{quiz.title}</h3>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                    {quiz.description && (
                      <p className="text-sm mb-2 line-clamp-1" style={{ color: 'var(--text-hint)' }}>{quiz.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-hint)' }}>
                        <FileQuestion className="w-3.5 h-3.5" />
                        {quiz.question_count || 0} سؤال
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-hint)' }}>
                        <Users className="w-3.5 h-3.5" />
                        {quiz.submission_count || 0} طالب
                      </span>
                      {quiz.settings?.time_limit && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-hint)' }}>
                          <Clock className="w-3.5 h-3.5" />
                          {quiz.settings.time_limit} دقيقة
                        </span>
                      )}
                      {quiz.settings?.secret_code && (
                        <button onClick={() => copyCode(quiz.settings.secret_code)}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition-all"
                          style={{ background: 'rgba(0,229,255,0.08)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.15)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.15)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,255,0.08)'}>
                          <Copy className="w-3 h-3" />
                          {quiz.settings.secret_code}
                        </button>
                      )}
                      {(quiz.status === 'waiting' || quiz.status === 'active') && quiz.settings?.secret_code && (
                        <button onClick={() => copyQuizUrl(quiz.settings.secret_code)}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition-all"
                          style={{ background: 'rgba(213,0,249,0.08)', color: '#D500F9', border: '1px solid rgba(213,0,249,0.15)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(213,0,249,0.15)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(213,0,249,0.08)'}>
                          نسخ الرابط
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {(quiz.status === 'waiting' || quiz.status === 'active') && (
                      <button onClick={() => navigate(`/teacher/quiz/${quiz.id}/monitor`)}
                        data-testid={`monitor-btn-${quiz.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{ background: 'rgba(0,230,118,0.1)', color: '#4ADE80', border: '1px solid rgba(0,230,118,0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,230,118,0.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,230,118,0.1)'}>
                        <Eye className="w-3.5 h-3.5" />
                        مراقبة
                      </button>
                    )}
                    {(quiz.status === 'closed' || quiz.submission_count > 0) && (
                      <button onClick={() => navigate(`/teacher/quiz/${quiz.id}/results`)}
                        data-testid={`results-btn-${quiz.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{ background: 'rgba(0,229,255,0.1)', color: '#67E8F9', border: '1px solid rgba(0,229,255,0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,255,0.1)'}>
                        <BarChart2 className="w-3.5 h-3.5" />
                        النتائج
                      </button>
                    )}
                    <button onClick={() => navigate(`/teacher/quiz/${quiz.id}/edit`)}
                      data-testid={`edit-btn-${quiz.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.07)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                      <Pencil className="w-3.5 h-3.5" />
                      تعديل
                    </button>
                    <button onClick={() => duplicateQuiz(quiz.id, quiz.title)}
                      data-testid={`duplicate-btn-${quiz.id}`}
                      title="نسخ الاختبار"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: 'rgba(213,0,249,0.08)', color: '#C084FC', border: '1px solid rgba(213,0,249,0.15)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(213,0,249,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(213,0,249,0.08)'}>
                      <CopyPlus className="w-3.5 h-3.5" />
                      نسخ
                    </button>
                    <button onClick={() => deleteQuiz(quiz.id, quiz.title)}
                      data-testid={`delete-btn-${quiz.id}`}
                      className="flex items-center gap-1.5 p-1.5 rounded-xl text-xs font-semibold transition-all btn-danger">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TeacherLayout>
  );
}
