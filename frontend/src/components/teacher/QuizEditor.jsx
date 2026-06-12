import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, Trash2, Pencil, Image, Save, ChevronRight,
  RefreshCw, X, Check, Settings2, ListChecks,
  PlayCircle, Eye, BarChart2
} from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders, QUESTION_TYPES, generateCode, STATUS_MAP } from '../../utils';

const EMPTY_Q = { type: 'mcq', text: '', image_url: '', options: ['', '', '', ''], correct_answer: '', points: 1 };

export default function QuizEditor() {
  const { quizId } = useParams();
  const isNew = !quizId;
  const navigate = useNavigate();

  const [tab, setTab] = useState('settings');
  const [settings, setSettings] = useState({
    title: '', description: '',
    settings: { time_limit: '', secret_code: '', show_results: true, home_exam: false, randomize_questions: true, question_count: '', show_question_nav: false }
  });
  const [questions, setQuestions] = useState([]);
  const [savedId, setSavedId] = useState(isNew ? null : quizId);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [quizStatus, setQuizStatus] = useState('draft');
  const [activating, setActivating] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [editQ, setEditQ] = useState(null);
  const [qForm, setQForm] = useState(EMPTY_Q);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (!isNew) fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const res = await axios.get(`${API}/quizzes/${quizId}`, getAuthHeaders());
      setSettings({
        title: res.data.title,
        description: res.data.description,
        settings: {
          ...res.data.settings,
          time_limit: res.data.settings.time_limit || '',
          question_count: res.data.settings.question_count || ''
        }
      });
      setQuestions(res.data.questions || []);
      setSavedId(quizId);
      setQuizStatus(res.data.status || 'draft');
    } catch { toast.error('تعذر تحميل الاختبار'); }
    finally { setLoading(false); }
  };

  const saveSettings = async () => {
    if (!settings.title.trim()) return toast.error('عنوان الاختبار مطلوب');
    setSaving(true);
    try {
      const payload = {
        title: settings.title,
        description: settings.description,
        settings: {
          ...settings.settings,
          time_limit: settings.settings.time_limit ? parseInt(settings.settings.time_limit) : null,
          question_count: settings.settings.question_count ? parseInt(settings.settings.question_count) : null,
        }
      };
      if (!savedId) {
        const res = await axios.post(`${API}/quizzes`, payload, getAuthHeaders());
        setSavedId(res.data.id);
        navigate(`/teacher/quiz/${res.data.id}/edit`, { replace: true });
        toast.success('تم إنشاء الاختبار');
      } else {
        await axios.put(`${API}/quizzes/${savedId}`, payload, getAuthHeaders());
        toast.success('تم حفظ الإعدادات');
      }
      setTab('questions');
    } catch { toast.error('تعذر حفظ الاختبار'); }
    finally { setSaving(false); }
  };

  const openAddDialog = () => { setEditQ(null); setQForm(EMPTY_Q); setDialog(true); };
  const openEditDialog = (q) => {
    setEditQ(q);
    setQForm({
      type: q.type, text: q.text, image_url: q.image_url || '',
      options: q.options?.length === 4 ? q.options : ['', '', '', ''],
      correct_answer: q.correct_answer || '', points: q.points || 1
    });
    setDialog(true);
  };

  const uploadImage = async (file) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`${API}/upload-image`, fd, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      setQForm(p => ({ ...p, image_url: res.data.image_url }));
      toast.success('تم رفع الصورة');
    } catch { toast.error('تعذر رفع الصورة'); }
    finally { setUploading(false); }
  };

  const saveQuestion = async () => {
    if (!qForm.text.trim()) return toast.error('نص السؤال مطلوب');
    if (qForm.type === 'mcq') {
      if (qForm.options.some(o => !o.trim())) return toast.error('يجب ملء جميع الخيارات');
      if (!qForm.correct_answer) return toast.error('يجب تحديد الإجابة الصحيحة');
    }
    if (qForm.type === 'true_false' && !qForm.correct_answer) return toast.error('يجب تحديد الإجابة الصحيحة');
    if (qForm.type === 'short' && !qForm.correct_answer.trim()) return toast.error('يجب كتابة الإجابة الصحيحة');

    const payload = {
      type: qForm.type,
      text: qForm.text,
      image_url: qForm.image_url || null,
      options: qForm.type === 'mcq' ? qForm.options : null,
      correct_answer: qForm.type === 'long' ? null : qForm.correct_answer,
      points: parseFloat(qForm.points) || 1
    };

    try {
      if (editQ) {
        await axios.put(`${API}/quizzes/${savedId}/questions/${editQ.id}`, payload, getAuthHeaders());
        toast.success('تم تعديل السؤال');
      } else {
        await axios.post(`${API}/quizzes/${savedId}/questions`, payload, getAuthHeaders());
        toast.success('تم إضافة السؤال');
      }
      fetchQuiz();
      setDialog(false);
    } catch { toast.error('تعذر حفظ السؤال'); }
  };

  const deleteQuestion = async (qid) => {
    if (!window.confirm('هل تريد حذف هذا السؤال؟')) return;
    try {
      await axios.delete(`${API}/quizzes/${savedId}/questions/${qid}`, getAuthHeaders());
      toast.success('تم حذف السؤال');
      fetchQuiz();
    } catch { toast.error('تعذر حذف السؤال'); }
  };

  const activateQuiz = async () => {
    if (!savedId) return toast.error('احفظ الاختبار أولاً');
    if (questions.length === 0) return toast.error('أضف أسئلة قبل التفعيل');
    if (!settings.settings.secret_code) return toast.error('يجب تحديد رمز سري للاختبار');
    setActivating(true);
    try {
      await axios.post(`${API}/quizzes/${savedId}/activate`, {}, getAuthHeaders());
      toast.success('تم تفعيل الاختبار - الطلاب يمكنهم الدخول الآن');
      navigate(`/teacher/quiz/${savedId}/monitor`);
    } catch { toast.error('تعذر تفعيل الاختبار'); }
    finally { setActivating(false); }
  };

  if (loading) return <TeacherLayout title="تعديل الاختبار"><div className="text-center py-16 text-slate-400">جارٍ التحميل...</div></TeacherLayout>;

  return (
    <TeacherLayout title={isNew ? 'اختبار جديد' : 'تعديل الاختبار'} backTo="/teacher/dashboard">
      {/* Tabs + Status/Action */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {[['settings', 'الإعدادات', Settings2], ['questions', 'الأسئلة', ListChecks]].map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { if (id === 'questions' && !savedId) { toast.error('احفظ الإعدادات أولاً'); return; } setTab(id); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white shadow text-violet-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'questions' && questions.length > 0 && (
                <span className="bg-violet-100 text-violet-700 text-xs px-1.5 py-0.5 rounded-full">{questions.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Status + Action button */}
        {savedId && (
          <div className="flex items-center gap-2">
            <span className={`badge ${STATUS_MAP[quizStatus]?.color || 'bg-slate-100 text-slate-600'}`}>
              {STATUS_MAP[quizStatus]?.label || quizStatus}
            </span>
            {quizStatus === 'draft' && (
              <button onClick={activateQuiz} disabled={activating}
                data-testid="activate-from-editor-btn"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                <PlayCircle className="w-4 h-4" />
                {activating ? 'جارٍ التفعيل...' : 'بدء الاختبار'}
              </button>
            )}
            {(quizStatus === 'waiting' || quizStatus === 'active') && (
              <button onClick={() => navigate(`/teacher/quiz/${savedId}/monitor`)}
                data-testid="monitor-from-editor-btn"
                className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-xl text-sm font-bold transition-colors">
                <Eye className="w-4 h-4" />
                مراقبة الاختبار
              </button>
            )}
            {quizStatus === 'closed' && (
              <button onClick={() => navigate(`/teacher/quiz/${savedId}/results`)}
                data-testid="results-from-editor-btn"
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold transition-colors hover:bg-blue-100">
                <BarChart2 className="w-4 h-4" />
                عرض النتائج
              </button>
            )}
          </div>
        )}
      </div>

      {tab === 'settings' && (
        <div className="quiz-card p-6 max-w-2xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">عنوان الاختبار *</label>
              <input className="input-field" placeholder="مثال: اختبار الفصل الأول - تقنية المعلومات"
                value={settings.title} onChange={e => setSettings(p => ({ ...p, title: e.target.value }))} data-testid="quiz-title-input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">الوصف (اختياري)</label>
              <textarea className="input-field resize-none" rows={2} placeholder="وصف مختصر للاختبار"
                value={settings.description} onChange={e => setSettings(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الرمز السري *</label>
                <div className="flex gap-2">
                  <input className="input-field" placeholder="EXAM01" maxLength={8}
                    value={settings.settings.secret_code}
                    onChange={e => setSettings(p => ({ ...p, settings: { ...p.settings, secret_code: e.target.value.toUpperCase() } }))}
                    data-testid="secret-code-input" />
                  <button onClick={() => setSettings(p => ({ ...p, settings: { ...p.settings, secret_code: generateCode() } }))}
                    className="px-3 py-2 bg-violet-50 text-violet-600 rounded-xl hover:bg-violet-100 transition-colors flex-shrink-0" title="توليد رمز">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">المدة الزمنية (دقيقة)</label>
                <input type="number" className="input-field" placeholder="بدون حد" min="1"
                  value={settings.settings.time_limit}
                  onChange={e => setSettings(p => ({ ...p, settings: { ...p.settings, time_limit: e.target.value } }))} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">عدد الأسئلة لكل طالب</label>
              <input type="number" className="input-field max-w-xs" placeholder="الكل (افتراضي)" min="1"
                value={settings.settings.question_count}
                onChange={e => setSettings(p => ({ ...p, settings: { ...p.settings, question_count: e.target.value } }))} />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'show_results', label: 'إظهار النتيجة فور انتهاء الطالب', desc: 'يرى الطالب نتيجته مباشرة بعد التسليم' },
                { key: 'home_exam', label: 'اختبار منزلي (الرقم المدني)', desc: 'يطلب من الطالب إدخال رقمه المدني' },
                { key: 'randomize_questions', label: 'توزيع الأسئلة عشوائياً', desc: 'كل طالب يحصل على ترتيب مختلف' },
                { key: 'show_question_nav', label: 'السماح للطالب بالتنقل بين الأسئلة', desc: 'يرى الطالب جميع أرقام الأسئلة ويختار أي سؤال يريد حله' },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" className="w-4 h-4 accent-violet-600"
                    checked={settings.settings[opt.key]}
                    onChange={e => setSettings(p => ({ ...p, settings: { ...p.settings, [opt.key]: e.target.checked } }))}
                    data-testid={`toggle-${opt.key}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {savedId && settings.settings.secret_code && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <p className="text-xs text-teal-600 font-semibold mb-1">رابط الاختبار المباشر للطلاب:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-teal-800 flex-1 truncate bg-white rounded px-2 py-1 border border-teal-200">
                    {window.location.origin}/join/{settings.settings.secret_code}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${settings.settings.secret_code}`); toast.success('تم نسخ الرابط'); }}
                    className="text-xs bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 transition-colors flex-shrink-0">نسخ</button>
                </div>
              </div>
            )}
            <button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-2" data-testid="save-settings-btn">
              <Save className="w-4 h-4" />
              {saving ? 'جارٍ الحفظ...' : (savedId ? 'حفظ الإعدادات' : 'إنشاء الاختبار')}
            </button>
          </div>
        </div>
      )}

      {tab === 'questions' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-slate-500">{questions.length} سؤال</p>
            <button onClick={openAddDialog} className="btn-primary flex items-center gap-2" data-testid="add-question-btn">
              <Plus className="w-4 h-4" />
              إضافة سؤال
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="quiz-card p-12 text-center">
              <p className="text-slate-400 mb-4">لا توجد أسئلة بعد</p>
              <button onClick={openAddDialog} className="btn-primary">إضافة أول سؤال</button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => {
                const qt = QUESTION_TYPES[q.type];
                return (
                  <div key={q.id} className="quiz-card p-4 flex items-start gap-4">
                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${qt?.color || 'bg-slate-100 text-slate-600'}`}>{qt?.label}</span>
                        <span className="text-xs text-slate-400">{q.points} درجة</span>
                      </div>
                      <p className="text-sm text-slate-800 font-medium line-clamp-2">{q.text}</p>
                      {q.image_url && <p className="text-xs text-teal-600 mt-1">📎 يحتوي على صورة</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEditDialog(q)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </button>
                      <button onClick={() => deleteQuestion(q.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Question Dialog */}
      {dialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setDialog(false); }}>
          <div className="glass-modal rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="font-bold text-slate-900">{editQ ? 'تعديل سؤال' : 'إضافة سؤال'}</h3>
              <button onClick={() => setDialog(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">نوع السؤال</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(QUESTION_TYPES).map(([k, v]) => (
                    <button key={k} onClick={() => setQForm(p => ({ ...p, type: k, correct_answer: '', options: ['', '', '', ''] }))}
                      className={`p-2.5 rounded-xl text-sm font-medium border-2 transition-all ${qForm.type === k ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question text */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">نص السؤال *</label>
                <textarea className="input-field resize-none" rows={3} placeholder="أكتب نص السؤال هنا..."
                  value={qForm.text} onChange={e => setQForm(p => ({ ...p, text: e.target.value }))} data-testid="question-text-input" />
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">صورة للسؤال (اختياري)</label>
                <div className="flex gap-2">
                  <input className="input-field" placeholder="رابط الصورة أو ارفع ملف"
                    value={qForm.image_url} onChange={e => setQForm(p => ({ ...p, image_url: e.target.value }))} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex-shrink-0">
                    {uploading ? '...' : <Image className="w-4 h-4" />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
                </div>
                {qForm.image_url && <img src={qForm.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover" onError={e => e.target.style.display = 'none'} />}
              </div>

              {/* MCQ options */}
              {qForm.type === 'mcq' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">الخيارات</label>
                  <div className="space-y-2">
                    {['أ', 'ب', 'ج', 'د'].map((letter, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button onClick={() => setQForm(p => ({ ...p, correct_answer: p.options[i] }))}
                          className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-all ${qForm.correct_answer === qForm.options[i] && qForm.options[i] ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-slate-500 hover:border-green-400'}`}>
                          {qForm.correct_answer === qForm.options[i] && qForm.options[i] ? <Check className="w-3 h-3" /> : letter}
                        </button>
                        <input className="input-field" placeholder={`الخيار ${letter}`}
                          value={qForm.options[i]}
                          onChange={e => {
                            const opts = [...qForm.options];
                            const wasCorrect = opts[i] === qForm.correct_answer;
                            opts[i] = e.target.value;
                            setQForm(p => ({ ...p, options: opts, correct_answer: wasCorrect ? e.target.value : p.correct_answer }));
                          }} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">انقر على الدائرة لتحديد الإجابة الصحيحة</p>
                </div>
              )}

              {/* True/False */}
              {qForm.type === 'true_false' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">الإجابة الصحيحة</label>
                  <div className="flex gap-3">
                    {['صح', 'خطأ'].map(v => (
                      <button key={v} onClick={() => setQForm(p => ({ ...p, correct_answer: v }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${qForm.correct_answer === v ? (v === 'صح' ? 'bg-green-500 border-green-500 text-white' : 'bg-red-500 border-red-500 text-white') : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Short answer */}
              {qForm.type === 'short' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">الإجابة الصحيحة *</label>
                  <input className="input-field" placeholder="الإجابة النموذجية"
                    value={qForm.correct_answer} onChange={e => setQForm(p => ({ ...p, correct_answer: e.target.value }))} />
                  <p className="text-xs text-slate-400 mt-1">سيتم المقارنة بدون مراعاة الأحرف الكبيرة/الصغيرة</p>
                </div>
              )}

              {qForm.type === 'long' && (
                <div className="p-3 bg-orange-50 rounded-xl">
                  <p className="text-sm text-orange-700">هذا النوع يحتاج تصحيح يدوي من المعلم بعد الانتهاء</p>
                </div>
              )}

              {/* Points */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الدرجة</label>
                <select className="input-field" value={qForm.points} onChange={e => setQForm(p => ({ ...p, points: parseFloat(e.target.value) }))}>
                  {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5].map(v => <option key={v} value={v}>{v} درجة</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-white/10">
              <button onClick={() => setDialog(false)} className="btn-ghost">إلغاء</button>
              <button onClick={saveQuestion} className="btn-primary" data-testid="save-question-btn">
                {editQ ? 'حفظ التعديلات' : 'إضافة السؤال'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
