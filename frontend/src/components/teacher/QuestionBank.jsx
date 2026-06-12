import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import TeacherLayout from './TeacherLayout';
import {
  Sparkles, Trash2, CheckSquare, Square, BookOpen,
  Filter, ChevronDown, PlusCircle, X, Loader2, AlertCircle, RefreshCw
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const GRADE5_TOPICS = [
  "الجداول الإلكترونية (Microsoft Excel) - إدخال البيانات والصيغ الحسابية",
  "الجداول الإلكترونية - دوال SUM وAVERAGE وMAX وMIN وCOUNT وIF",
  "الجداول الإلكترونية - التحقق من صحة البيانات والتنسيق الشرطي",
  "الجداول الإلكترونية - الرسوم البيانية وأنواعها",
  "الشبكات والإنترنت - أنواع الشبكات LAN وWAN",
  "خدمات الإنترنت والبريد الإلكتروني",
  "الأمن المعلوماتي وحماية الخصوصية"
];

const GRADE8_TOPICS = [
  "قواعد البيانات - المفاهيم الأساسية: الجداول والحقول والسجلات",
  "Microsoft Access - إنشاء الجداول والعلاقات بين الجداول",
  "Microsoft Access - الاستعلامات (Queries) وأنواعها",
  "Microsoft Access - النماذج (Forms) والتقارير (Reports)",
  "تطوير الويب - بنية صفحة HTML والعلامات الأساسية",
  "تطوير الويب - تنسيق CSS والعناصر الأساسية",
  "الأمن المعلوماتي - التهديدات الإلكترونية وأساليب الحماية"
];

const TYPE_LABELS = { mcq: 'اختياري', true_false: 'صح/خطأ', short: 'قصير', long: 'طويل' };
const DIFF_LABELS = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
const DIFF_COLORS = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200'
};
const TYPE_COLORS = {
  mcq: 'bg-blue-50 text-blue-700 border-blue-200',
  true_false: 'bg-purple-50 text-purple-700 border-purple-200',
  short: 'bg-teal-50 text-teal-700 border-teal-200',
  long: 'bg-orange-50 text-orange-700 border-orange-200'
};

export default function QuestionBank() {
  const navigate = useNavigate();
  const token = localStorage.getItem('teacherToken');

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [filterType, setFilterType] = useState('');

  // Generate dialog state
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [genGrade, setGenGrade] = useState('');
  const [genTopic, setGenTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  // Create quiz dialog state
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterGrade) params.grade = filterGrade;
      if (filterDiff) params.difficulty = filterDiff;
      if (filterType) params.type = filterType;
      const res = await axios.get(`${API}/api/question-bank`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setQuestions(res.data);
    } catch {
      toast.error('خطأ في جلب الأسئلة');
    } finally {
      setLoading(false);
    }
  }, [token, filterGrade, filterDiff, filterType]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleGenerate = async () => {
    if (!genGrade) { toast.error('يجب اختيار الصف أولاً'); return; }
    setGenerating(true);
    try {
      const res = await axios.post(
        `${API}/api/question-bank/generate`,
        { grade: genGrade, topic: genTopic || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`تم توليد ${res.data.count} سؤال بنجاح`);
      setShowGenDialog(false);
      setGenGrade('');
      setGenTopic('');
      fetchQuestions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'خطأ في توليد الأسئلة');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/api/question-bank/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      toast.success('تم حذف السؤال');
      fetchQuestions();
    } catch {
      toast.error('خطأ في الحذف');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) { toast.error('يجب إدخال عنوان الاختبار'); return; }
    if (selectedIds.size === 0) { toast.error('لم تختر أي أسئلة'); return; }
    setCreating(true);
    try {
      const res = await axios.post(
        `${API}/api/question-bank/create-quiz`,
        { title: quizTitle, question_ids: Array.from(selectedIds) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم إنشاء الاختبار بنجاح');
      setShowQuizDialog(false);
      setQuizTitle('');
      setSelectedIds(new Set());
      navigate(`/teacher/quiz/${res.data.id}/edit`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'خطأ في إنشاء الاختبار');
    } finally {
      setCreating(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  const topicsForGrade = genGrade === '5' ? GRADE5_TOPICS : genGrade === '8' ? GRADE8_TOPICS : [];

  return (
    <TeacherLayout title="بنك الأسئلة">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          data-testid="generate-questions-btn"
          onClick={() => setShowGenDialog(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          توليد أسئلة بالذكاء الاصطناعي
        </button>

        {selectedIds.size > 0 && (
          <button
            data-testid="create-quiz-from-bank-btn"
            onClick={() => setShowQuizDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            إنشاء اختبار ({selectedIds.size} سؤال)
          </button>
        )}

        <button
          onClick={fetchQuestions}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors ml-auto"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">تصفية:</span>
        </div>

        <select
          data-testid="filter-grade"
          value={filterGrade}
          onChange={e => setFilterGrade(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400"
        >
          <option value="">كل الصفوف</option>
          <option value="5">الصف الخامس</option>
          <option value="8">الصف الثامن</option>
        </select>

        <select
          data-testid="filter-difficulty"
          value={filterDiff}
          onChange={e => setFilterDiff(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400"
        >
          <option value="">كل المستويات</option>
          <option value="easy">سهل</option>
          <option value="medium">متوسط</option>
          <option value="hard">صعب</option>
        </select>

        <select
          data-testid="filter-type"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-violet-400"
        >
          <option value="">كل الأنواع</option>
          <option value="mcq">اختياري</option>
          <option value="true_false">صح/خطأ</option>
          <option value="short">قصير</option>
          <option value="long">طويل</option>
        </select>

        {(filterGrade || filterDiff || filterType) && (
          <button
            onClick={() => { setFilterGrade(''); setFilterDiff(''); setFilterType(''); }}
            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            مسح الفلاتر
          </button>
        )}

        <span className="mr-auto text-sm text-slate-400">{questions.length} سؤال</span>
      </div>

      {/* Select All bar */}
      {questions.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 transition-colors"
            data-testid="select-all-btn"
          >
            {selectedIds.size === questions.length
              ? <CheckSquare className="w-4 h-4 text-violet-600" />
              : <Square className="w-4 h-4" />
            }
            {selectedIds.size === questions.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          </button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-violet-600 font-medium">
              {selectedIds.size} محدد
            </span>
          )}
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p>جاري التحميل...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <BookOpen className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium text-slate-500">بنك الأسئلة فارغ</p>
          <p className="text-sm mt-1">استخدم زر "توليد أسئلة" لإضافة أسئلة جديدة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              q={q}
              idx={idx}
              selected={selectedIds.has(q.id)}
              onToggle={() => toggleSelect(q.id)}
              onDelete={() => setDeletingId(q.id)}
              deletingId={deletingId}
              onConfirmDelete={() => handleDelete(q.id)}
              onCancelDelete={() => setDeletingId(null)}
            />
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      {showGenDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="gen-dialog">
          <div className="glass-modal rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">توليد أسئلة بالذكاء الاصطناعي</h2>
                <p className="text-sm text-slate-500">سيتم توليد 15 سؤالاً متنوعاً</p>
              </div>
              <button onClick={() => setShowGenDialog(false)} className="mr-auto p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  الصف الدراسي <span className="text-red-500">*</span>
                </label>
                <select
                  data-testid="gen-grade-select"
                  value={genGrade}
                  onChange={e => { setGenGrade(e.target.value); setGenTopic(''); }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="">-- اختر الصف --</option>
                  <option value="5">الصف الخامس</option>
                  <option value="8">الصف الثامن</option>
                </select>
              </div>

              {genGrade && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    الموضوع (اختياري)
                  </label>
                  <select
                    data-testid="gen-topic-select"
                    value={genTopic}
                    onChange={e => setGenTopic(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="">اختيار عشوائي من المنهج</option>
                    {topicsForGrade.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">إذا لم تختر موضوعاً سيتم اختياره عشوائياً من منهج الفصل الثاني</p>
                </div>
              )}

              {!genGrade && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">يجب اختيار الصف الدراسي أولاً لعرض المواضيع</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGenDialog(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                data-testid="confirm-generate-btn"
                onClick={handleGenerate}
                disabled={!genGrade || generating}
                className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    توليد 15 سؤال
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Quiz Dialog */}
      {showQuizDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="quiz-dialog">
          <div className="glass-modal rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">إنشاء اختبار من البنك</h2>
                <p className="text-sm text-slate-500">{selectedIds.size} سؤال محدد</p>
              </div>
              <button onClick={() => setShowQuizDialog(false)} className="mr-auto p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                عنوان الاختبار <span className="text-red-500">*</span>
              </label>
              <input
                data-testid="quiz-title-input"
                value={quizTitle}
                onChange={e => setQuizTitle(e.target.value)}
                placeholder="مثال: اختبار الجداول الإلكترونية - الصف الخامس"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="text-xs text-slate-400 mt-1">
                سيتم إنشاء الاختبار في حالة "مسودة" ويمكنك تعديل الأسئلة بعد ذلك
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowQuizDialog(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                data-testid="confirm-create-quiz-btn"
                onClick={handleCreateQuiz}
                disabled={!quizTitle.trim() || creating}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    إنشاء الاختبار
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}

function QuestionCard({ q, idx, selected, onToggle, onDelete, deletingId, onConfirmDelete, onCancelDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid={`question-card-${q.id}`}
      className={`bg-white border rounded-2xl transition-all duration-200 ${
        selected ? 'border-violet-300 shadow-md shadow-violet-50' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button onClick={onToggle} className="flex-shrink-0 mt-0.5" data-testid={`select-q-${q.id}`}>
          {selected
            ? <CheckSquare className="w-5 h-5 text-violet-600" />
            : <Square className="w-5 h-5 text-slate-300 hover:text-slate-500" />
          }
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[q.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {TYPE_LABELS[q.type] || q.type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DIFF_COLORS[q.difficulty] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {DIFF_LABELS[q.difficulty] || q.difficulty}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
              صف {q.grade}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
              {q.points} درجة
            </span>
          </div>

          <p className="text-sm text-slate-800 font-medium leading-relaxed">{q.text}</p>

          {/* Topic */}
          {q.topic && (
            <p className="text-xs text-slate-400 mt-1 truncate">{q.topic}</p>
          )}

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              {q.type === 'mcq' && q.options && (
                <div className="space-y-1">
                  {q.options.map((opt, i) => (
                    <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded-lg ${opt === q.correct_answer ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'}`}>
                      <span className="font-medium flex-shrink-0">{['أ', 'ب', 'ج', 'د'][i]}.</span>
                      <span>{opt}</span>
                      {opt === q.correct_answer && <span className="mr-auto text-xs bg-emerald-100 px-1.5 py-0.5 rounded">صحيح</span>}
                    </div>
                  ))}
                </div>
              )}
              {q.type === 'true_false' && (
                <div className="text-sm">
                  <span className="text-slate-500">الإجابة الصحيحة: </span>
                  <span className={`font-medium ${q.correct_answer === 'صح' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {q.correct_answer}
                  </span>
                </div>
              )}
              {q.type === 'short' && q.correct_answer && (
                <div className="text-sm">
                  <span className="text-slate-500">الإجابة النموذجية: </span>
                  <span className="text-slate-700">{q.correct_answer}</span>
                </div>
              )}
              {q.cognitive_level && (
                <p className="text-xs text-slate-400">المستوى المعرفي: {q.cognitive_level}</p>
              )}
            </div>
          )}

          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 mt-2 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </button>
        </div>

        {/* Delete button */}
        <div className="flex-shrink-0">
          {deletingId === q.id ? (
            <div className="flex gap-1">
              <button
                onClick={onCancelDelete}
                className="text-xs px-2 py-1 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={onConfirmDelete}
                className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                data-testid={`confirm-delete-${q.id}`}
              >
                حذف
              </button>
            </div>
          ) : (
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              data-testid={`delete-q-${q.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
