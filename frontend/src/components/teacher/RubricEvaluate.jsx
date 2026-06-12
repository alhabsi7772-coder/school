import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, Circle, X, ChevronRight, Zap, Users, ArrowRight, ImagePlus } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';
import { GB_FIELDS, GB_FIELDS_78, themeOfGrade } from '../../utils/gradebook';

const GRADES_56 = ['الخامس', 'السادس'];
const colLabel = (key, grade) => {
  const fields = (grade && !GRADES_56.includes(grade)) ? GB_FIELDS_78 : GB_FIELDS;
  return fields.find(f => f.key === key)?.label || key;
};
const fmt = (v) => v == null ? '—' : (v % 1 === 0 ? v : v.toFixed(1));

// أزرار الدرجات: 0..max (أعداد صحيحة) + الحد الأقصى إن كان كسرياً
const scoreOptions = (max) => {
  const opts = [];
  for (let i = 0; i <= Math.floor(max); i++) opts.push(i);
  if (max % 1 !== 0) opts.push(max);
  return opts;
};

export default function RubricEvaluate() {
  const { rubricId } = useParams();
  const [rubric, setRubric] = useState(null);
  const [gradebooks, setGradebooks] = useState([]);
  const [gb, setGb] = useState(null);
  const [evals, setEvals] = useState({});
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState({});
  const [previewImg, setPreviewImg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/rubrics/${rubricId}`, getAuthHeaders()),
      axios.get(`${API}/gradebooks`, getAuthHeaders()),
    ]).then(([r, g]) => { setRubric(r.data); setGradebooks(g.data); })
      .catch(() => toast.error('تعذر التحميل'));
  }, [rubricId]);

  const selectGradebook = async (g) => {
    try {
      const [gbRes, evRes] = await Promise.all([
        axios.get(`${API}/gradebooks/${g.id}`, getAuthHeaders()),
        axios.get(`${API}/rubrics/${rubricId}/evaluations?gradebook_id=${g.id}`, getAuthHeaders()),
      ]);
      setGb(gbRes.data);
      setEvals(Object.fromEntries(evRes.data.map(e => [e.student_id, e])));
    } catch { toast.error('تعذر تحميل الطلاب'); }
  };

  const openStudent = (st) => {
    setActive(st);
    setDraft({ ...(evals[st.id]?.scores || {}) });
  };

  const setVal = (cid, v) => setDraft(d => ({ ...d, [cid]: d[cid] === v ? undefined : v }));
  const fullMarks = () => setDraft(Object.fromEntries(rubric.criteria.map(c => [c.id, c.max])));

  const total = rubric ? rubric.criteria.reduce((s, c) => s + (draft[c.id] ?? 0), 0) : 0;
  const students = gb?.students || [];
  const doneCount = students.filter(s => evals[s.id]).length;

  const save = async (goNext) => {
    setSaving(true);
    try {
      const scores = Object.fromEntries(Object.entries(draft).filter(([, v]) => v != null));
      const res = await axios.put(`${API}/rubrics/${rubricId}/evaluations`,
        { gradebook_id: gb.id, student_id: active.id, scores }, getAuthHeaders());
      setEvals(prev => ({ ...prev, [active.id]: { student_id: active.id, scores, total: res.data.total, gb_score: res.data.gb_score } }));
      toast.success(`${active.name.split(' ')[0]}: ${fmt(res.data.total)}/${fmt(rubric.total_max)} — نُقلت للسجل (${colLabel(res.data.column, rubric.grade)}: ${fmt(res.data.gb_score)}) ✓`);
      if (goNext) {
        const idx = students.findIndex(s => s.id === active.id);
        const next = [...students.slice(idx + 1), ...students.slice(0, idx)].find(s => !evals[s.id] && s.id !== active.id);
        if (next) openStudent(next);
        else { setActive(null); toast.success('🎉 تم تقييم جميع الطلاب!'); }
      } else setActive(null);
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر الحفظ'); }
    finally { setSaving(false); }
  };

  if (!rubric) return (
    <TeacherLayout title="التقييم السريع" backTo="/teacher/rubrics">
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>جارٍ التحميل...</div>
    </TeacherLayout>
  );

  return (
    <TeacherLayout title={rubric.title} backTo="/teacher/rubrics">
      {/* اختيار الصف/الشعبة */}
      {!gb ? (() => {
        const filtered = rubric.grade ? gradebooks.filter(g => g.grade === rubric.grade) : gradebooks;
        const th = rubric.grade ? themeOfGrade(rubric.grade) : null;
        return (
        <div className="max-w-2xl">
          <p className="font-bold text-white mb-2 flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
            اختر شعبة الصف {rubric.grade || ''} لبدء التقييم
          </p>
          {rubric.grade && (
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }} data-testid="rubric-grade-hint">
              تُعرض فقط سجلات <span className="font-bold" style={{ color: th.hex }}>الصف {rubric.grade}</span>
              {gradebooks.length !== filtered.length && ` (${gradebooks.length - filtered.length} سجل من صفوف أخرى مخفي)`}
            </p>
          )}
          {filtered.length === 0 ? (
            <div className="quiz-card rounded-2xl p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {gradebooks.length === 0
                ? <>لا توجد سجلات درجات بعد — أنشئ سجلاً من قسم &quot;سجل الدرجات&quot; أولاً</>
                : <>لا يوجد سجل درجات للصف {rubric.grade} بعد — أنشئ سجلاً من قسم &quot;سجل الدرجات&quot; أولاً</>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3" data-testid="rubric-gradebook-list">
              {filtered.map(g => (
                <button key={g.id} onClick={() => selectGradebook(g)}
                  data-testid={`rubric-pick-gb-${g.grade}-${g.section}`}
                  className="quiz-card rounded-2xl p-4 flex items-center gap-3 text-right transition-all hover:scale-[1.02]"
                  style={th ? { borderColor: `rgba(${th.rgb},0.25)` } : undefined}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                    style={th
                      ? { background: `rgba(${th.rgb},0.15)`, border: `1px solid rgba(${th.rgb},0.3)`, color: th.hex }
                      : { background: 'rgba(var(--theme-accent-rgb),0.12)', border: '1px solid rgba(var(--theme-accent-rgb),0.25)', color: 'var(--theme-accent)' }}>
                    {g.section}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">الصف {g.grade} / {g.section}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.student_count} طالب</p>
                  </div>
                  <ChevronRight className="w-5 h-5 rotate-180" style={{ color: 'var(--text-hint)' }} />
                </button>
              ))}
            </div>
          )}
        </div>
        );
      })() : (
        <div className="max-w-2xl">
          {/* شريط التقدم */}
          <div className="quiz-card rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => { setGb(null); setEvals({}); }}
                className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--theme-accent)' }}
                data-testid="rubric-change-gb-btn">
                <ArrowRight className="w-3.5 h-3.5" /> تغيير الشعبة
              </button>
              <p className="text-sm font-bold text-white">الصف {gb.grade} / {gb.section}</p>
              <span className="text-sm font-black" style={{ color: doneCount === students.length && students.length > 0 ? '#34D399' : 'var(--theme-accent)' }}
                data-testid="rubric-progress-count">
                {doneCount} / {students.length}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${students.length ? (doneCount / students.length) * 100 : 0}%`, background: doneCount === students.length && students.length > 0 ? '#34D399' : 'var(--theme-accent)' }} />
            </div>
          </div>

          {/* قائمة الطلاب */}
          <div className="space-y-2" data-testid="rubric-student-list">
            {students.map((st, i) => {
              const ev = evals[st.id];
              return (
                <button key={st.id} onClick={() => openStudent(st)}
                  data-testid={`rubric-student-${i}`}
                  className="quiz-card rounded-xl p-3.5 w-full flex items-center gap-3 text-right transition-all hover:scale-[1.01]"
                  style={ev ? { borderColor: 'rgba(52,211,153,0.3)' } : undefined}>
                  {ev
                    ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: '#34D399' }} />
                    : <Circle className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--text-hint)' }} />}
                  <span className="w-6 text-center text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span className="flex-1 font-semibold text-white text-base leading-snug">{st.name}</span>
                  {ev && (
                    <span className="px-2.5 py-1 rounded-lg text-sm font-black flex-shrink-0"
                      style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399' }}>
                      {fmt(ev.total)} / {fmt(rubric.total_max)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* لوحة تقييم الطالب */}
      {active && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm">
          <div className="glass-modal w-full max-w-2xl mx-auto flex flex-col flex-1 sm:my-6 sm:rounded-3xl overflow-hidden" data-testid="rubric-eval-panel">
            {/* رأس */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setActive(null)} className="p-2 hover:bg-white/10 rounded-xl" data-testid="rubric-eval-close">
                <X className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-lg truncate" data-testid="rubric-eval-student-name">{active.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rubric.title}</p>
              </div>
              <button onClick={fullMarks} data-testid="rubric-full-marks-btn"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all hover:scale-[1.03]"
                style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.25)' }}>
                <Zap className="w-3.5 h-3.5" /> الدرجة كاملة
              </button>
            </div>

            {/* المعايير */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {rubric.criteria.map((c, ci) => (
                <div key={c.id} className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-2.5 gap-2">
                    <p className="font-semibold text-white text-sm leading-snug">{ci + 1}. {c.name}</p>
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>من {fmt(c.max)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {scoreOptions(c.max).map(v => {
                      const sel = draft[c.id] === v;
                      return (
                        <button key={v} onClick={() => setVal(c.id, v)}
                          data-testid={`rubric-score-${ci}-${v}`}
                          className="min-w-[46px] h-11 px-2 rounded-xl font-black text-base transition-all active:scale-90"
                          style={sel
                            ? { background: 'var(--theme-accent)', color: '#0B1120', boxShadow: '0 0 12px rgba(var(--theme-accent-rgb),0.5)' }
                            : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {fmt(v)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* صور البطاقة المرجعية (للعرض فقط) */}
              {rubric.images?.length > 0 && (
                <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                      <ImagePlus className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
                      صور مرجعية من البطاقة
                    </p>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                      {rubric.images.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" data-testid="rubric-reference-images">
                    {rubric.images.map((url, i) => (
                      <button type="button" key={i} onClick={() => setPreviewImg(url)}
                        data-testid={`rubric-reference-img-${i}`}
                        className="relative aspect-square rounded-xl overflow-hidden transition-all hover:scale-[1.03]"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* تذييل ثابت */}
            <div className="p-4 border-t border-white/10 flex items-center gap-3 flex-shrink-0"
              style={{ background: 'rgba(11,17,32,0.6)' }}>
              <div className="flex-shrink-0">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>المجموع</p>
                <p className="text-2xl font-black" style={{ color: 'var(--theme-accent)' }} data-testid="rubric-eval-total">
                  {fmt(total)}<span className="text-sm font-bold" style={{ color: 'var(--text-hint)' }}> / {fmt(rubric.total_max)}</span>
                </p>
              </div>
              <button onClick={() => save(false)} disabled={saving} data-testid="rubric-save-only-btn"
                className="px-4 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}>
                حفظ
              </button>
              <button onClick={() => save(true)} disabled={saving} data-testid="rubric-save-next-btn"
                className="btn-primary flex-1 py-3 disabled:opacity-50">
                {saving ? 'جارٍ الحفظ...' : 'حفظ والتالي ←'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* معاينة صورة مرجعية بحجم كبير */}
      {previewImg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setPreviewImg(null)} data-testid="rubric-img-preview">
          <button onClick={() => setPreviewImg(null)} data-testid="rubric-img-preview-close"
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 hover:bg-white/20">
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={previewImg} alt="" className="max-w-full max-h-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </TeacherLayout>
  );
}
