import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import TeacherLayout from './TeacherLayout';
import {
  Trash2, Search, CheckCircle2, ChevronRight, ChevronLeft,
  BookOpen, Layers, Brain, Gauge, FilePlus2, X, Loader2, Eye, EyeOff,
  ListChecks, GitCompareArrows, AlignLeft, AlignJustify, ToggleLeft, Image as ImageIcon
} from 'lucide-react';
import { API, getAuthHeaders } from '../../utils';

const BACKEND = API.replace(/\/api$/, '');

const TYPE_META = {
  mcq: { label: 'اختيار من متعدد', icon: ListChecks, color: '#16D67A' },
  true_false: { label: 'صح وخطأ', icon: ToggleLeft, color: '#38BDF8' },
  short: { label: 'إجابة قصيرة', icon: AlignLeft, color: '#FBBF24' },
  long: { label: 'إجابة طويلة', icon: AlignJustify, color: '#F472B6' },
  match: { label: 'توصيل', icon: GitCompareArrows, color: '#A78BFA' },
};
const COG_META = { recall: 'تذكر', understanding: 'فهم', application: 'تطبيق', reasoning: 'استدلال', analysis: 'استدلال' };
const DIFF_META = {
  easy: { label: 'سهل', color: '#16D67A' },
  medium: { label: 'متوسط', color: '#FBBF24' },
  hard: { label: 'صعب', color: '#F87171' },
};
const GRADES = ['5', '6', '7', '8'];
const GRADE_LABELS = { '5': 'الخامس', '6': 'السادس', '7': 'السابع', '8': 'الثامن' };

const Badge = ({ children, color, testId }) => (
  <span data-testid={testId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold"
    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
    {children}
  </span>
);

function QuestionCard({ q, selected, onToggle, onDelete, canDelete }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const tm = TYPE_META[q.type] || TYPE_META.mcq;
  const dm = DIFF_META[q.difficulty] || DIFF_META.medium;
  const selectable = q.type !== 'match';
  const imgSrc = q.image_url ? (q.image_url.startsWith('http') ? q.image_url : `${BACKEND}${q.image_url}`) : null;

  return (
    <div data-testid="qb-question-card"
      className={`quiz-card p-4 sm:p-5 transition-all ${selected ? 'ring-2 ring-emerald-400/60' : ''}`}>
      <div className="flex items-start gap-3">
        {selectable ? (
          <input type="checkbox" checked={selected} onChange={onToggle} data-testid="qb-select-checkbox"
            className="mt-1.5 w-4 h-4 accent-emerald-500 cursor-pointer flex-shrink-0" />
        ) : (
          <span className="mt-1.5 w-4 h-4 flex-shrink-0 opacity-30" title="التوصيل غير مدعوم في الاختبارات التفاعلية">
            <GitCompareArrows className="w-4 h-4" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <Badge color={tm.color} testId="qb-type-badge"><tm.icon className="w-3 h-3" />{tm.label}</Badge>
            <Badge color={dm.color}>{dm.label}</Badge>
            <Badge color="#94A3B8"><Brain className="w-3 h-3" />{COG_META[q.cognitive_level] || 'فهم'}</Badge>
            {q.lesson && <Badge color="#60A5FA"><BookOpen className="w-3 h-3" />{q.lesson}</Badge>}
            <span className="text-[11px] font-bold mr-auto" style={{ color: 'var(--text-hint)' }}>{q.points} درجة</span>
          </div>

          <p className="font-bold text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>{q.text}</p>

          {imgSrc && (
            <a href={imgSrc} target="_blank" rel="noreferrer" className="block mb-3">
              <img src={imgSrc} alt="صورة السؤال" loading="lazy"
                className="max-h-44 rounded-xl border object-contain"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            </a>
          )}

          {q.type === 'mcq' && q.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-1">
              {q.options.map((opt, i) => {
                const correct = opt === q.correct_answer;
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                    style={correct
                      ? { background: 'rgba(22,214,122,0.10)', border: '1px solid rgba(22,214,122,0.35)', color: '#28F5A7', fontWeight: 700 }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
                    {correct && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className="truncate">{opt}</span>
                  </div>
                );
              })}
            </div>
          )}

          {q.type === 'true_false' && (
            <Badge color={q.correct_answer === 'صح' ? '#16D67A' : '#F87171'}>
              <CheckCircle2 className="w-3 h-3" /> الإجابة: {q.correct_answer}
            </Badge>
          )}

          {(q.type === 'short' || q.type === 'long') && q.correct_answer && (
            <div>
              <button onClick={() => setShowAnswer(v => !v)} data-testid="qb-toggle-answer"
                className="flex items-center gap-1.5 text-xs font-bold mb-1.5 transition-colors"
                style={{ color: '#28F5A7' }}>
                {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showAnswer ? 'إخفاء الإجابة النموذجية' : 'عرض الإجابة النموذجية'}
              </button>
              {showAnswer && (
                <p className="text-sm leading-relaxed px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(22,214,122,0.06)', border: '1px solid rgba(22,214,122,0.18)', color: 'var(--text-muted)' }}>
                  {q.correct_answer}
                </p>
              )}
            </div>
          )}

          {q.type === 'match' && q.pairs && (
            <div className="space-y-1">
              {q.pairs.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 px-3 py-1.5 rounded-lg truncate"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>{p.left}</span>
                  <ChevronLeft className="w-4 h-4 flex-shrink-0" style={{ color: '#28F5A7' }} />
                  <span className="flex-1 px-3 py-1.5 rounded-lg truncate"
                    style={{ background: 'rgba(22,214,122,0.06)', border: '1px solid rgba(22,214,122,0.18)', color: 'var(--text-muted)' }}>{p.right}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {canDelete && (
          <button onClick={onDelete} data-testid="qb-delete-btn"
            className="p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-red-500/10 text-red-400/70 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function QuestionBank() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('teacherRole') === 'admin';

  const [grade, setGrade] = useState('5');
  const [lesson, setLesson] = useState('');
  const [fType, setFType] = useState('');
  const [fDiff, setFDiff] = useState('');
  const [fCog, setFCog] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  const [meta, setMeta] = useState(null);
  const [data, setData] = useState({ questions: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizLoading, setQuizLoading] = useState(false);

  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchMeta = useCallback(async (g) => {
    try {
      const res = await axios.get(`${API}/question-bank/meta?grade=${g}`, getAuthHeaders());
      return res.data;
    } catch { return null; }
  }, []);

  useEffect(() => { fetchMeta(grade).then(setMeta); }, [grade, fetchMeta]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ grade, page: String(page), limit: '20' });
      if (lesson) params.set('lesson', lesson);
      if (fType) params.set('type', fType);
      if (fDiff) params.set('difficulty', fDiff);
      if (fCog) params.set('cognitive_level', fCog);
      if (debounced) params.set('q', debounced);
      const res = await axios.get(`${API}/question-bank?${params}`, getAuthHeaders());
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل تحميل الأسئلة');
    } finally { setLoading(false); }
  }, [grade, lesson, fType, fDiff, fCog, debounced, page]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const changeGrade = (g) => { setGrade(g); setLesson(''); setPage(1); setSelected(new Set()); };
  const clearFilters = () => { setLesson(''); setFType(''); setFDiff(''); setFCog(''); setSearch(''); setPage(1); };
  const hasFilters = lesson || fType || fDiff || fCog || search;

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const deleteQuestion = async (id) => {
    if (!window.confirm('حذف هذا السؤال نهائياً؟')) return;
    try {
      await axios.delete(`${API}/question-bank/${id}`, getAuthHeaders());
      toast.success('تم الحذف');
      fetchQuestions();
      fetchMeta(grade).then(setMeta);
    } catch (e) { toast.error(e.response?.data?.detail || 'فشل الحذف'); }
  };

  const createQuiz = async () => {
    if (!quizTitle.trim()) return toast.error('أدخل عنوان الاختبار');
    setQuizLoading(true);
    try {
      const res = await axios.post(`${API}/question-bank/create-quiz`,
        { question_ids: [...selected], title: quizTitle.trim() }, getAuthHeaders());
      toast.success('تم إنشاء الاختبار بنجاح');
      setQuizOpen(false); setSelected(new Set());
      navigate(`/teacher/quiz/${res.data.quiz_id || res.data.id}/edit`);
    } catch (e) { toast.error(e.response?.data?.detail || 'فشل إنشاء الاختبار'); }
    finally { setQuizLoading(false); }
  };

  const typeCounts = meta?.types || {};
  const total = meta?.total || 0;

  return (
    <TeacherLayout title="بنك الأسئلة">
      {/* إحصاءات سريعة */}
      <div className="flex flex-wrap items-center gap-2 mb-5" data-testid="qb-stats-bar">
        <div className="glass-card px-4 py-2.5 flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: '#28F5A7' }} />
          <span className="text-sm font-black text-white">{total}</span>
          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>سؤال للصف {GRADE_LABELS[grade]}</span>
        </div>
        {Object.entries(TYPE_META).map(([k, v]) => typeCounts[k] ? (
          <div key={k} className="glass-card px-3 py-2.5 flex items-center gap-1.5">
            <v.icon className="w-3.5 h-3.5" style={{ color: v.color }} />
            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{typeCounts[k]}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{v.label}</span>
          </div>
        ) : null)}
        <div className="mr-auto flex gap-2">
          {selected.size > 0 && (
            <button onClick={() => { setQuizTitle(''); setQuizOpen(true); }}
              className="btn-secondary flex items-center gap-2 text-sm" data-testid="qb-create-quiz-btn">
              <FilePlus2 className="w-4 h-4" /> إنشاء اختبار ({selected.size})
            </button>
          )}
        </div>
      </div>

      {/* اختيار الصف */}
      <div className="flex gap-2 mb-4" data-testid="qb-grade-tabs">
        {GRADES.map(g => (
          <button key={g} onClick={() => changeGrade(g)} data-testid={`qb-grade-${g}`}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={grade === g
              ? { background: 'rgba(22,214,122,0.12)', border: '1px solid rgba(22,214,122,0.4)', color: '#28F5A7' }
              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
            الصف {GRADE_LABELS[g]}
          </button>
        ))}
      </div>

      {/* الفلاتر */}
      <div className="glass-card p-3 sm:p-4 mb-5">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-hint)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} data-testid="qb-search-input"
              placeholder="ابحث في نص الأسئلة..." className="input-field !pr-9 text-sm" />
          </div>
          <select value={lesson} onChange={e => { setLesson(e.target.value); setPage(1); }}
            className="input-field text-sm" style={{ width: 'auto', maxWidth: '250px' }} data-testid="qb-lesson-select">
            <option value="">كل الدروس</option>
            {(meta?.units || []).map(u => (
              <optgroup key={u.unit} label={`وحدة: ${u.unit}`}>
                {u.lessons.map(l => <option key={l.lesson} value={l.lesson}>{l.lesson} ({l.count})</option>)}
              </optgroup>
            ))}
          </select>
          <select value={fType} onChange={e => { setFType(e.target.value); setPage(1); }}
            className="input-field text-sm" style={{ width: 'auto' }} data-testid="qb-type-select">
            <option value="">كل الأنواع</option>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={fCog} onChange={e => { setFCog(e.target.value); setPage(1); }}
            className="input-field text-sm" style={{ width: 'auto' }} data-testid="qb-cog-select">
            <option value="">كل المستويات المعرفية</option>
            <option value="recall">تذكر</option>
            <option value="understanding">فهم</option>
            <option value="application">تطبيق</option>
            <option value="reasoning">استدلال</option>
          </select>
          <select value={fDiff} onChange={e => { setFDiff(e.target.value); setPage(1); }}
            className="input-field text-sm" style={{ width: 'auto' }} data-testid="qb-diff-select">
            <option value="">كل الصعوبات</option>
            <option value="easy">سهل</option>
            <option value="medium">متوسط</option>
            <option value="hard">صعب</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters} data-testid="qb-clear-filters"
              className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: '#F87171' }}>
              <X className="w-3.5 h-3.5" /> مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#28F5A7' }} />
        </div>
      ) : data.questions.length === 0 ? (
        <div className="glass-card p-10 text-center" data-testid="qb-empty-state">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-hint)' }} />
          <p className="font-bold mb-1" style={{ color: 'var(--text-muted)' }}>لا توجد أسئلة مطابقة</p>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {hasFilters ? 'جرّب تعديل الفلاتر أو مسحها' : 'لا توجد أسئلة لهذا الصف حالياً'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {data.questions.map(q => (
              <QuestionCard key={q.id} q={q}
                selected={selected.has(q.id)}
                onToggle={() => toggleSelect(q.id)}
                onDelete={() => deleteQuestion(q.id)}
                canDelete={q.scope === 'global' ? isAdmin : true} />
            ))}
          </div>

          {/* ترقيم الصفحات */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pb-8" data-testid="qb-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="qb-prev-page"
                className="btn-secondary flex items-center gap-1 text-sm disabled:opacity-30">
                <ChevronRight className="w-4 h-4" /> السابق
              </button>
              <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                صفحة {page} من {data.pages} <span style={{ color: 'var(--text-hint)' }}>({data.total} سؤال)</span>
              </span>
              <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} data-testid="qb-next-page"
                className="btn-secondary flex items-center gap-1 text-sm disabled:opacity-30">
                التالي <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* نافذة إنشاء اختبار */}
      {quizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !quizLoading && setQuizOpen(false)}>
          <div className="glass-modal w-full max-w-md p-6" onClick={e => e.stopPropagation()} data-testid="qb-quiz-modal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FilePlus2 className="w-5 h-5" style={{ color: '#28F5A7' }} /> إنشاء اختبار من {selected.size} سؤالاً
              </h3>
              <button onClick={() => setQuizOpen(false)} disabled={quizLoading}><X className="w-5 h-5" style={{ color: 'var(--text-hint)' }} /></button>
            </div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>عنوان الاختبار</label>
            <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} data-testid="quiz-title-input"
              placeholder="مثال: اختبار الوحدة الأولى — الصف الخامس" className="input-field mb-5" />
            <button onClick={createQuiz} disabled={quizLoading} data-testid="quiz-submit-btn"
              className="btn-primary w-full flex items-center justify-center gap-2">
              {quizLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الإنشاء...</> : 'إنشاء الاختبار'}
            </button>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
