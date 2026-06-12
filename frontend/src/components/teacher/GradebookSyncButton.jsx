import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ClipboardList, X, ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { API, getAuthHeaders } from '../../utils';
import { gbFields, gbMaxMap, themeOfGrade, GRADE_ORDER_NUM } from '../../utils/gradebook';
import useGlobalSemester from '../../utils/useGlobalSemester';

const COLUMN_GROUPS_56 = [
  { label: 'الأسئلة القصيرة (5)', keys: ['q1', 'q2', 'q3', 'q4'] },
  { label: 'الحوار (10)', keys: ['d1', 'd2'] },
  { label: 'الأنشطة العملية (20)', keys: ['p1', 'p2'] },
  { label: 'المشروع (20)', keys: ['proj'] },
];
const COLUMN_GROUPS_78 = [
  { label: 'الاختبار القصير (20)', keys: ['q1'] },
  { label: 'الحوار (10)', keys: ['d1', 'd2'] },
  { label: 'الأنشطة العملية (20)', keys: ['p1', 'p2'] },
  { label: 'المشروع (20)', keys: ['proj'] },
];

// فرز رقمي للشعب
const sectionVal = (s) => {
  const n = parseInt(String(s).replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 9999 : n;
};

export default function GradebookSyncButton({ quizId }) {
  const [open, setOpen] = useState(false);
  const [gradebooks, setGradebooks] = useState(null);
  const [gbId, setGbId] = useState('');
  const [semester, setSemester] = useGlobalSemester();
  const [column, setColumn] = useState('q1');
  const [step, setStep] = useState(1);
  const [matchData, setMatchData] = useState(null);
  const [mappings, setMappings] = useState({}); // submission_id -> student_id|''
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const selGb = (gradebooks || []).find(g => g.id === gbId);
  const tpl = selGb?.template || '5-6';
  const fields = gbFields(tpl);
  const maxMap = gbMaxMap(tpl);
  const COLUMN_GROUPS = tpl === '7-10' ? COLUMN_GROUPS_78 : COLUMN_GROUPS_56;
  const FIELD_LABEL = Object.fromEntries(fields.map(f => [f.key, `${f.label} (من ${f.max})`]));

  // تجميع السجلات حسب الصف (مع ترتيب الخامس → العاشر)
  const groupedGbs = (() => {
    if (!gradebooks?.length) return [];
    const buckets = {}; const order = [];
    const sorted = gradebooks.slice().sort((a, b) => {
      const ga = GRADE_ORDER_NUM[a.grade] || 99;
      const gb_ = GRADE_ORDER_NUM[b.grade] || 99;
      if (ga !== gb_) return ga - gb_;
      return sectionVal(a.section) - sectionVal(b.section);
    });
    sorted.forEach(g => {
      if (!buckets[g.grade]) { buckets[g.grade] = []; order.push(g.grade); }
      buckets[g.grade].push(g);
    });
    return order.map(grade => ({ grade, items: buckets[grade], theme: themeOfGrade(grade) }));
  })();

  // اختيار سجل مع إعادة ضبط العمود إذا لم يكن متاحاً في نموذجه
  const pickGb = (g) => {
    setGbId(g.id);
    const m = gbMaxMap(g.template || '5-6');
    if (m[column] == null) setColumn('q1');
  };

  useEffect(() => {
    if (open && gradebooks === null) {
      axios.get(`${API}/gradebooks`, getAuthHeaders())
        .then(res => { setGradebooks(res.data); if (res.data.length) setGbId(res.data[0].id); })
        .catch(() => toast.error('تعذر تحميل سجلات الدرجات'));
    }
  }, [open]);

  const runMatch = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/gradebooks/${gbId}/match-quiz`, { quiz_id: quizId }, getAuthHeaders());
      setMatchData(res.data);
      const m = {};
      res.data.proposals.forEach(p => { m[p.id] = p.matched_student_id || ''; });
      setMappings(m);
      setStep(2);
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذرت المطابقة'); }
    finally { setLoading(false); }
  };

  const apply = async () => {
    const list = Object.entries(mappings)
      .filter(([, sid]) => sid)
      .map(([submission_id, student_id]) => ({ submission_id, student_id }));
    if (!list.length) return toast.error('لا توجد أسماء مرتبطة للنقل');
    setApplying(true);
    try {
      const res = await axios.post(`${API}/gradebooks/${gbId}/apply-quiz`,
        { quiz_id: quizId, semester, column, mappings: list }, getAuthHeaders());
      toast.success(`تم نقل ${res.data.applied} درجة إلى عمود "${FIELD_LABEL[column]}"`);
      close();
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر النقل'); }
    finally { setApplying(false); }
  };

  const close = () => { setOpen(false); setStep(1); setMatchData(null); setMappings({}); };

  // detect duplicate student selections
  const dupCounts = {};
  Object.values(mappings).forEach(sid => { if (sid) dupCounts[sid] = (dupCounts[sid] || 0) + 1; });

  const matchedCount = Object.values(mappings).filter(Boolean).length;
  const unmatchedCount = (matchData?.proposals?.length || 0) - matchedCount;

  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="sync-gradebook-btn"
        className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-700 border border-sky-200 rounded-xl text-sm font-medium hover:bg-sky-100 transition-colors">
        <ClipboardList className="w-4 h-4" />
        نقل الدرجات إلى السجل
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
          <div className="glass-modal rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 md:p-6 border-b border-white/10 flex items-start justify-between gap-3 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg mb-1">نقل الدرجات إلى سجل الدرجات</h3>
                <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                  {step === 1 ? 'الخطوة 1 من 2 — اختر السجل والفصل والعمود' : 'الخطوة 2 من 2 — راجع المطابقة وعدّل عند الحاجة'}
                </p>
              </div>
              <button onClick={close} className="p-2 hover:bg-white/5 rounded-xl flex-shrink-0" data-testid="sync-close-btn">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-4 md:p-6">
              {step === 1 && (
                <div className="space-y-6">
                  {gradebooks !== null && gradebooks.length === 0 ? (
                    <div className="text-center py-8">
                      <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-hint)' }} />
                      <p className="text-white font-bold mb-2">لا يوجد سجل درجات بعد</p>
                      <Link to="/teacher/gradebooks" className="btn-primary inline-flex items-center gap-2">
                        إنشاء سجل الدرجات أولاً <ArrowLeft className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* القسم 1: السجل */}
                      <section className="rounded-2xl p-4 md:p-5"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={{ background: 'rgba(var(--theme-accent-rgb),0.15)', color: 'var(--theme-accent)' }}>1</span>
                          <h4 className="text-sm font-bold text-white">السجل (الصف / الشعبة)</h4>
                        </div>
                        <div className="space-y-3.5">
                          {groupedGbs.map(group => {
                            const th = group.theme;
                            return (
                              <div key={group.grade} data-testid={`sync-grade-group-${group.grade}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-1.5 h-4 rounded-sm" style={{ background: th.hex }} />
                                  <span className="text-xs font-bold" style={{ color: th.hex }}>الصف {group.grade}</span>
                                  <span className="text-[10px] font-bold opacity-60" style={{ color: th.hex }}>
                                    ({group.items.length})
                                  </span>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-2">
                                  {group.items.map(g => (
                                    <button key={g.id} onClick={() => pickGb(g)} data-testid={`sync-gb-${g.grade}-${g.section}`}
                                      className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right"
                                      style={gbId === g.id
                                        ? { borderColor: th.hex, background: `rgba(${th.rgb},0.12)` }
                                        : { borderColor: `rgba(${th.rgb},0.18)`, background: `rgba(${th.rgb},0.04)` }}>
                                      <span className="w-9 h-9 rounded-lg flex items-center justify-center font-black flex-shrink-0"
                                        style={{ background: `rgba(${th.rgb},0.18)`, color: th.hex }}>{g.section}</span>
                                      <span className="min-w-0">
                                        <span className="block text-sm font-bold text-white truncate">الصف {g.grade} / {g.section}</span>
                                        <span className="block text-xs" style={{ color: 'var(--text-hint)' }}>{g.student_count} طالب</span>
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      {/* القسم 2: الفصل الدراسي */}
                      <section className="rounded-2xl p-4 md:p-5"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={{ background: 'rgba(var(--theme-accent-rgb),0.15)', color: 'var(--theme-accent)' }}>2</span>
                          <h4 className="text-sm font-bold text-white">الفصل الدراسي</h4>
                        </div>
                        <div className="flex gap-2.5">
                          {[['1', 'الفصل الأول'], ['2', 'الفصل الثاني']].map(([v, l]) => (
                            <button key={v} onClick={() => setSemester(v)} data-testid={`sync-sem-${v}`}
                              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                              style={semester === v
                                ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb),0.1)', color: 'var(--theme-accent)' }
                                : { borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>{l}</button>
                          ))}
                        </div>
                      </section>

                      {/* القسم 3: العمود المستهدف */}
                      <section className="rounded-2xl p-4 md:p-5"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={{ background: 'rgba(var(--theme-accent-rgb),0.15)', color: 'var(--theme-accent)' }}>3</span>
                          <h4 className="text-sm font-bold text-white">العمود المستهدف في السجل</h4>
                        </div>
                        <p className="text-xs mb-4 pr-8" style={{ color: 'var(--text-hint)' }}>
                          اختر إلى أي عمود تُنقل هذه الدرجة — مثال: لو كان هذا الاختبار &quot;القصير الثاني&quot; اختر &quot;قصيرة 2&quot;
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {COLUMN_GROUPS.map(g => (
                            <div key={g.label} className="rounded-xl p-3"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-sm font-bold mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                <span className="inline-block w-1 h-4 rounded-sm" style={{ background: 'var(--theme-accent)' }} />
                                {g.label}
                              </p>
                              <div className="flex gap-2 flex-wrap">
                                {g.keys.map(k => {
                                  const f = fields.find(x => x.key === k);
                                  return (
                                    <button key={k} onClick={() => setColumn(k)} data-testid={`sync-col-${k}`}
                                      className="px-3.5 py-2 rounded-lg text-sm font-bold border-2 transition-all flex-1 min-w-[88px]"
                                      style={column === k
                                        ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb),0.14)', color: 'var(--theme-accent)' }
                                        : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                                      {f.label}
                                      <span className="block text-[11px] font-semibold opacity-70 mt-0.5">من {f.max} درجات</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-5 flex items-start gap-2 px-3 py-2.5 rounded-xl"
                          style={{ background: 'rgba(var(--theme-accent-rgb),0.07)', border: '1px solid rgba(var(--theme-accent-rgb),0.18)' }}
                          data-testid="sync-column-hint">
                          <span className="text-xs leading-relaxed" style={{ color: 'var(--theme-accent)' }}>
                            💡 نسبة الطالب في الاختبار ستتحول تلقائياً إلى درجة من {maxMap[column]} — مثال: 80% = {Math.round(80 * maxMap[column] / 100 * 2) / 2} درجة
                          </span>
                        </div>
                      </section>
                    </>
                  )}
                </div>
              )}

              {step === 2 && matchData && (
                <div>
                  {/* Summary */}
                  <div className="flex gap-3 mb-4 flex-wrap">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}
                      data-testid="sync-matched-count">
                      <CheckCircle2 className="w-3.5 h-3.5" /> مطابق: {matchedCount}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}
                      data-testid="sync-unmatched-count">
                      <XCircle className="w-3.5 h-3.5" /> غير مطابق: {unmatchedCount}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {matchData.proposals.map(p => {
                      const sid = mappings[p.id] || '';
                      const isDup = sid && dupCounts[sid] > 1;
                      const scaled = Math.round(p.percentage * maxMap[column] / 100 * 2) / 2;
                      return (
                        <div key={p.id} data-testid={`sync-row-${p.id}`}
                          className="p-3 rounded-xl border transition-colors"
                          style={sid
                            ? (isDup
                              ? { background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.35)' }
                              : { background: 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.30)' })
                            : { background: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.30)' }}>
                          {/* الصف العلوي: حالة + اسم الطالب + الدرجة */}
                          <div className="flex items-center gap-2.5 mb-2.5">
                            {sid
                              ? (isDup
                                ? <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#FBBF24' }} />
                                : <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#34D399' }} />)
                              : <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#F87171' }} />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{p.student_name}</p>
                              <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--text-hint)' }}>
                                <span>{p.grade}/{p.section}</span>
                                <span className="mx-1.5">·</span>
                                <span>{Math.round(p.percentage)}% في الاختبار</span>
                                {p.confidence > 0 && sid === p.matched_student_id && (
                                  <>
                                    <span className="mx-1.5">·</span>
                                    <span>ثقة {Math.round(p.confidence * 100)}%</span>
                                  </>
                                )}
                              </p>
                            </div>
                            <span className="px-2 py-1 rounded-lg text-xs font-black flex-shrink-0"
                              style={sid
                                ? { background: 'rgba(52,211,153,0.15)', color: '#34D399' }
                                : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-hint)' }}>
                              {sid ? `${scaled} / ${maxMap[column]}` : '—'}
                            </span>
                          </div>
                          {/* الصف السفلي: قائمة الربط بالطالب من السجل */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                              ↩ مرتبط بـ:
                            </span>
                            <select className="input-field flex-1"
                              style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem', minWidth: 0 }}
                              value={sid}
                              data-testid={`sync-select-${p.id}`}
                              onChange={e => setMappings(m => ({ ...m, [p.id]: e.target.value }))}>
                              <option value="">— بدون نقل —</option>
                              {matchData.students.map(st => (
                                <option key={st.id} value={st.id}>{st.name}</option>
                              ))}
                            </select>
                          </div>
                          {isDup && (
                            <p className="text-[10px] font-bold mt-2 flex items-center gap-1" style={{ color: '#FBBF24' }}>
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              هذا الطالب مرتبط بأكثر من نتيجة — الأخيرة ستعتمد
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 md:p-5 border-t border-white/10 flex gap-3 flex-shrink-0">
              {step === 1 ? (
                <button onClick={runMatch} disabled={!gbId || loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
                  data-testid="sync-match-btn">
                  {loading ? 'جارٍ المطابقة الذكية...' : 'مطابقة الأسماء تلقائياً'}
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'white' }}>رجوع</button>
                  <button onClick={apply} disabled={applying || matchedCount === 0}
                    className="btn-primary flex-1 disabled:opacity-40" data-testid="sync-apply-btn">
                    {applying ? 'جارٍ النقل...' : `تأكيد نقل ${matchedCount} درجة إلى السجل`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
