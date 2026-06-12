import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import JSZip from 'jszip';
import {
  Trophy, Users, BarChart2, Eye, Pencil, CheckCircle, XCircle,
  Clock, GraduationCap, Save, X, Download, ImageDown, Archive, Award
} from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import GradebookSyncButton from './GradebookSyncButton';
import { API, getAuthHeaders, getScoreColor } from '../../utils';
import { generateStudentResultCanvas, canvasToBlob, buildFileName } from '../../utils/generateResultImage';
import { generateCertificate, certFileName } from '../../utils/generateCertificate';

const SCORE_OPTIONS = (maxPts) => {
  const opts = [];
  for (let i = 0; i <= maxPts; i += 0.5) opts.push(i);
  return opts;
};

export default function QuizResults() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showResultsEnabled, setShowResultsEnabled] = useState(true);
  const [grades, setGrades] = useState({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => { fetchResults(); }, [quizId]);

  // Build question map for enriching answers
  const qMap = {};
  data?.quiz?.questions?.forEach(q => { qMap[q.id] = q; });

  // Init grades when modal opens
  useEffect(() => {
    if (selected && data?.quiz?.questions) {
      const gs = {};
      data.quiz.questions.filter(q => q.type === 'long').forEach(q => {
        const ans = selected.answers?.find(a => a.question_id === q.id);
        gs[q.id] = { score: ans?.manual_score ?? ans?.score ?? 0, is_correct: ans?.is_correct ?? false };
      });
      setGrades(gs);
    }
  }, [selected]);

  const fetchResults = async () => {
    try {
      const res = await axios.get(`${API}/quizzes/${quizId}/results`, getAuthHeaders());
      setData(res.data);
      setShowResultsEnabled(res.data.quiz?.settings?.show_results ?? true);
    } catch { toast.error('تعذر تحميل النتائج'); }
    finally { setLoading(false); }
  };

  const toggleResults = async () => {
    try {
      const res = await axios.put(`${API}/quizzes/${quizId}/toggle-results`, {}, getAuthHeaders());
      setShowResultsEnabled(res.data.show_results);
      toast.success(res.data.show_results ? 'تم تفعيل عرض النتائج للطلاب' : 'تم إخفاء النتائج عن الطلاب');
    } catch { toast.error('تعذر تغيير الإعداد'); }
  };

  const saveGrades = async () => {
    setSavingGrades(true);
    try {
      const gradeList = Object.entries(grades).map(([qid, g]) => ({
        question_id: qid, score: g.score, is_correct: g.is_correct
      }));
      await axios.post(`${API}/quizzes/${quizId}/grade/${selected.id}`, gradeList, getAuthHeaders());
      toast.success(`تم حفظ تصحيح ${selected.student_name}`);
      fetchResults();
      setSelected(null);
    } catch { toast.error('تعذر حفظ التصحيح'); }
    finally { setSavingGrades(false); }
  };

  const downloadStudentImage = async (student) => {
    setDownloadingId(student.id);
    try {
      const canvas = await generateStudentResultCanvas(student, data.quiz);
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildFileName(student);
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('تعذر إنشاء الصورة'); }
    finally { setDownloadingId(null); }
  };

  const downloadAllAsZip = async () => {
    const submissions = data?.submissions;
    if (!submissions?.length) return;
    setDownloadingAll(true);
    toast.info('جارٍ إنشاء الملف المضغوط...');
    try {
      const zip = new JSZip();
      for (const student of submissions) {
        const canvas = await generateStudentResultCanvas(student, data.quiz);
        const blob = await canvasToBlob(canvas);
        zip.file(buildFileName(student), blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `نتائج_${data.quiz?.title || 'الاختبار'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تحميل الملف المضغوط');
    } catch { toast.error('تعذر إنشاء الملف المضغوط'); }
    finally { setDownloadingAll(false); }
  };

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const date = d.toLocaleDateString('ar-KW', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date} - ${time}`;
  };

  const exportCSV = () => {
    const submissions = data?.submissions;
    const quiz = data?.quiz;
    if (!submissions?.length) return;
    const sortedSubs = [...submissions].sort((a, b) => b.percentage - a.percentage);
    const headers = ['الترتيب', 'اسم الطالب', 'الصف', 'الشعبة', 'وقت الدخول', 'الدرجة', 'من', 'النسبة%', 'الحالة'];
    const rows = sortedSubs.map((s, i) => [
      i + 1,
      s.student_name,
      s.grade,
      s.section,
      s.started_at ? new Date(s.started_at).toLocaleString('ar-KW') : '—',
      s.total_score,
      s.max_score,
      Math.round(s.percentage),
      s.is_graded ? 'مصحح' : 'ينتظر'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نتائج_${quiz?.title || 'الاختبار'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <TeacherLayout title="النتائج"><div className="text-center py-16 text-slate-400">جارٍ التحميل...</div></TeacherLayout>;

  const { quiz, submissions, stats } = data || {};
  const sorted = [...(submissions || [])].sort((a, b) => b.percentage - a.percentage);
  const top3 = sorted.slice(0, 3);
  const hasLongQuestions = quiz?.questions?.some(q => q.type === 'long');
  const downloadStudentCert = async (student) => {
    setDownloadingId('cert-' + student.id);
    const templateId = localStorage.getItem('certTemplate') || 'classic_blue';
    try {
      const canvas = await generateCertificate(student, data.quiz, templateId);
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = certFileName(student); a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('تعذر إنشاء الشهادة'); }
    finally { setDownloadingId(null); }
  };

  const downloadAllCerts = async () => {
    const submissions = data?.submissions;
    if (!submissions?.length) return;
    setDownloadingAll(true);
    toast.info('جارٍ إنشاء الشهادات...');
    const templateId = localStorage.getItem('certTemplate') || 'classic_blue';
    try {
      const zip = new JSZip();
      for (const s of submissions) {
        const canvas = await generateCertificate(s, data.quiz, templateId);
        const blob = await canvasToBlob(canvas);
        zip.file(certFileName(s), blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `شهادات_${data.quiz?.title || 'الاختبار'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تحميل الشهادات');
    } catch { toast.error('تعذر إنشاء الشهادات'); }
    finally { setDownloadingAll(false); }
  };

  return (
    <TeacherLayout title={`نتائج: ${quiz?.title || ''}`} backTo="/teacher/dashboard">
      {/* Actions */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {hasLongQuestions && submissions?.some(s => !s.is_graded && s.submitted_at) && (
            <button onClick={() => navigate(`/teacher/quiz/${quizId}/grade`)}
              data-testid="grade-btn"
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
              <Pencil className="w-4 h-4" />
              تصحيح من صفحة مخصصة
            </button>
          )}
          {sorted?.length > 0 && (
            <button onClick={exportCSV} data-testid="export-csv-btn"
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
          )}
          {sorted?.length > 0 && <GradebookSyncButton quizId={quizId} />}
          {sorted?.length > 0 && (
            <button onClick={downloadAllAsZip} disabled={downloadingAll} data-testid="download-all-zip-btn"
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-60">
              <Archive className="w-4 h-4" />
              {downloadingAll ? 'جارٍ الإنشاء...' : 'تحميل الكل (ZIP)'}
            </button>
          )}
          {sorted?.length > 0 && (
            <button onClick={downloadAllCerts} disabled={downloadingAll} data-testid="download-all-certs-btn"
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-60">
              <Award className="w-4 h-4" />
              {downloadingAll ? 'جارٍ الإنشاء...' : 'شهادات الكل (ZIP)'}
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={toggleResults} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${showResultsEnabled ? 'bg-violet-600' : 'bg-slate-300'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showResultsEnabled ? 'right-1' : 'left-1'}`} />
          </div>
          <span className="text-sm font-medium text-slate-700">إظهار النتائج للطلاب</span>
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'إجمالي الطلاب', value: stats?.total || 0, color: 'text-violet-600' },
          { label: 'أعلى درجة', value: `${Math.round(stats?.max || 0)}%`, color: 'text-green-600' },
          { label: 'أدنى درجة', value: `${Math.round(stats?.min || 0)}%`, color: 'text-red-500' },
          { label: 'المتوسط', value: `${Math.round(stats?.avg || 0)}%`, color: 'text-yellow-600' },
        ].map((s, i) => (
          <div key={i} className="quiz-card p-4 text-center">
            <p className={`text-2xl md:text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      {top3.length > 0 && (
        <div className="quiz-card p-5 mb-6">
          <h3 className="font-bold text-white mb-5 text-center">المتصدرون</h3>
          <div className="flex items-end justify-center gap-3 md:gap-6">
            {[top3[1], top3[0], top3[2]].map((s, i) => {
              if (!s) return <div key={i} className="w-20 md:w-28" />;
              const heights = ['h-16 md:h-20', 'h-24 md:h-28', 'h-12 md:h-16'];
              const colors = ['bg-yellow-400', 'bg-slate-200', 'bg-amber-600'];
              const medals = ['🥇', '🥈', '🥉'];
              const pos = i === 1 ? 1 : i === 0 ? 2 : 3;
              return (
                <div key={s.id || i} className="flex flex-col items-center gap-1.5">
                  <span className="text-xl md:text-2xl">{medals[i]}</span>
                  <div className="text-center">
                    <p className="text-xs font-bold text-white w-20 md:w-24 text-center leading-tight">{s.student_name}</p>
                    <p className="text-xs text-slate-400">{s.grade}/{s.section}</p>
                    <span className={`badge text-xs mt-1 ${getScoreColor(s.percentage)}`}>
                      {s.total_score}/{s.max_score}
                    </span>
                  </div>
                  <div className={`w-16 md:w-20 ${heights[i]} ${colors[i]} rounded-t-xl flex items-center justify-center`}>
                    <span className="font-bold text-white text-base md:text-lg">{pos}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results table */}
      <div className="quiz-card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-white">جميع النتائج ({submissions?.length || 0})</h3>
        </div>
        {submissions?.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">لا يوجد نتائج بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-right">
                  <th className="px-3 md:px-4 py-3 font-semibold">#</th>
                  <th className="px-3 md:px-4 py-3 font-semibold">الطالب</th>
                  <th className="px-3 md:px-4 py-3 font-semibold hidden md:table-cell">الصف</th>
                  <th className="px-3 md:px-4 py-3 font-semibold hidden md:table-cell">وقت الدخول</th>
                  <th className="px-3 md:px-4 py-3 font-semibold">الدرجة</th>
                  <th className="px-3 md:px-4 py-3 font-semibold">النسبة</th>
                  <th className="px-3 md:px-4 py-3 font-semibold hidden sm:table-cell">الحالة</th>
                  <th className="px-3 md:px-4 py-3 font-semibold">عرض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map((s, i) => (
                  <tr key={s.id || i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 md:px-4 py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                    </td>
                    <td className="px-3 md:px-4 py-3 font-medium text-slate-900">{s.student_name}</td>
                    <td className="px-3 md:px-4 py-3 text-slate-600 hidden md:table-cell">{s.grade} / {s.section}</td>
                    <td className="px-3 md:px-4 py-3 text-slate-500 text-xs hidden md:table-cell" data-testid={`entry-time-${s.id}`}>
                      {formatDateTime(s.started_at)}
                    </td>
                    <td className="px-3 md:px-4 py-3 font-bold text-slate-800">{s.total_score}/{s.max_score}</td>
                    <td className="px-3 md:px-4 py-3">
                      <span className={`badge ${getScoreColor(s.percentage)}`}>{Math.round(s.percentage)}%</span>
                    </td>
                    <td className="px-3 md:px-4 py-3 hidden sm:table-cell">
                      {s.is_graded ? (
                        <span className="badge bg-green-100 text-green-700">مصحح</span>
                      ) : (
                        <span className="badge bg-orange-100 text-orange-600">ينتظر</span>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(s)} data-testid={`view-btn-${s.id}`}
                          className="p-1.5 hover:bg-violet-50 rounded-lg transition-colors" title="عرض التفاصيل">
                          <Eye className="w-4 h-4 text-violet-600" />
                        </button>
                        <button onClick={() => downloadStudentImage(s)} data-testid={`download-img-btn-${s.id}`}
                          disabled={downloadingId === s.id}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50" title="تحميل كصورة">
                          {downloadingId === s.id
                            ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            : <ImageDown className="w-4 h-4 text-indigo-600" />
                          }
                        </button>
                        <button onClick={() => downloadStudentCert(s)} data-testid={`download-cert-btn-${s.id}`}
                          disabled={downloadingId === 'cert-' + s.id || s.total_score < s.max_score}
                          className={`p-1.5 rounded-lg transition-colors ${s.total_score >= s.max_score ? 'hover:bg-amber-50' : 'opacity-25 cursor-not-allowed'}`}
                          title={s.total_score >= s.max_score ? 'تحميل الشهادة' : 'الشهادة للدرجة الكاملة فقط'}>
                          {downloadingId === 'cert-' + s.id
                            ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            : <Award className="w-4 h-4 text-amber-600" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student detail modal with grading */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 md:p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="glass-modal rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            {/* Modal header */}
            <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-slate-900">{selected.student_name}</h3>
                <p className="text-sm text-slate-500">{selected.grade} / الشعبة {selected.section}</p>
                {selected.started_at && (
                  <p className="text-xs text-slate-400 mt-0.5">دخل: {formatDateTime(selected.started_at)}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge text-sm px-3 py-1 ${getScoreColor(selected.percentage)}`}>
                  {selected.total_score}/{selected.max_score} ({Math.round(selected.percentage)}%)
                </span>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-4 md:p-5 space-y-3">
              {selected.answers?.map((ans, i) => {
                const qInfo = qMap[ans.question_id] || {};
                const isLong = qInfo.type === 'long';
                const g = grades[ans.question_id];
                return (
                  <div key={i} className={`p-4 rounded-xl border ${
                    ans.is_correct === true ? 'bg-green-50 border-green-200'
                    : ans.is_correct === null ? 'bg-orange-50 border-orange-200'
                    : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {ans.is_correct === true ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          : ans.is_correct === null ? <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        <span className="text-xs font-semibold text-slate-500">س {i + 1}</span>
                        {isLong && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">طويل</span>}
                      </div>
                      <span className="text-sm font-bold text-slate-700 flex-shrink-0">
                        {isLong && g ? g.score : ans.score}/{qInfo.points || 1}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 mb-2">{qInfo.text || '—'}</p>
                    {qInfo.image_url && <img src={qInfo.image_url} alt="" className="mb-2 h-24 rounded-lg object-cover" />}

                    <div className={`rounded-lg p-2.5 ${ans.is_correct ? 'bg-green-100' : ans.is_correct === null ? 'bg-orange-100' : 'bg-red-100'}`}>
                      <p className="text-xs text-slate-500 mb-0.5">إجابة الطالب:</p>
                      <p className={`text-sm font-semibold ${ans.is_correct ? 'text-green-800' : ans.is_correct === null ? 'text-orange-800' : 'text-red-800'}`}>
                        {ans.answer_text || '(لم يجب)'}
                      </p>
                    </div>

                    {!ans.is_correct && ans.is_correct !== null && qInfo.correct_answer && !isLong && (
                      <div className="bg-green-100 rounded-lg p-2.5 mt-2">
                        <p className="text-xs text-slate-500 mb-0.5">الإجابة الصحيحة:</p>
                        <p className="text-sm font-semibold text-green-800">{qInfo.correct_answer}</p>
                      </div>
                    )}

                    {/* Long answer grading */}
                    {isLong && g !== undefined && (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <p className="text-xs font-semibold text-slate-600 mb-2">الدرجة المخصصة (من {qInfo.points || 1}):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SCORE_OPTIONS(qInfo.points || 1).map(score => (
                            <button key={score} onClick={() => setGrades(prev => ({
                              ...prev, [ans.question_id]: { score, is_correct: score > 0 }
                            }))}
                              className={`px-2.5 py-1 rounded-lg text-sm font-bold border-2 transition-all ${
                                g.score === score ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-200 text-slate-600 hover:border-violet-300'
                              }`}>
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal footer - save grades if has long questions */}
            {hasLongQuestions && (
              <div className="p-4 border-t border-white/10 flex-shrink-0">
                <button onClick={saveGrades} disabled={savingGrades}
                  data-testid="save-grades-from-results"
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {savingGrades ? 'جارٍ الحفظ...' : 'حفظ التصحيح'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
