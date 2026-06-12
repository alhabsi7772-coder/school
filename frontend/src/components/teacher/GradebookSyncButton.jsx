import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ClipboardList, X, ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { API, getAuthHeaders } from '../../utils';
import { gbFields, gbMaxMap } from '../../utils/gradebook';

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

export default function GradebookSyncButton({ quizId }) {
  const [open, setOpen] = useState(false);
  const [gradebooks, setGradebooks] = useState(null);
  const [gbId, setGbId] = useState('');
  const [semester, setSemester] = useState(() => localStorage.getItem('semester') === '2' ? '2' : '1');
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
            <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">نقل الدرجات إلى سجل الدرجات</h3>
                <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                  {step === 1 ? 'اختر السجل والفصل والعمود المستهدف' : 'راجع المطابقة الذكية للأسماء وعدّل يدوياً عند الحاجة'}
                </p>
              </div>
              <button onClick={close} className="p-2 hover:bg-white/5 rounded-xl"><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-4 md:p-5">
              {step === 1 && (
                <div className="space-y-5">
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
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">السجل (الصف / الشعبة)</label>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {(gradebooks || []).map(g => (
                            <button key={g.id} onClick={() => pickGb(g)} data-testid={`sync-gb-${g.grade}-${g.section}`}
                              className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right"
                              style={gbId === g.id
                                ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb),0.1)' }
                                : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                              <span className="w-9 h-9 rounded-lg flex items-center justify-center font-black"
                                style={{ background: 'rgba(var(--theme-accent-rgb),0.12)', color: 'var(--theme-accent)' }}>{g.section}</span>
                              <span>
                                <span className="block text-sm font-bold text-white">الصف {g.grade} / {g.section}</span>
                                <span className="block text-xs" style={{ color: 'var(--text-hint)' }}>{g.student_count} طالب</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">الفصل الدراسي</label>
                        <div className="flex gap-2">
                          {[['1', 'الفصل الأول'], ['2', 'الفصل الثاني']].map(([v, l]) => (
                            <button key={v} onClick={() => setSemester(v)} data-testid={`sync-sem-${v}`}
                              className="px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                              style={semester === v
                                ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb),0.1)', color: 'var(--theme-accent)' }
                                : { borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>{l}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white mb-1">إلى أين تُنقل الدرجات؟ اختر العمود المستهدف في السجل:</label>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-hint)' }}>
                          مثال: إذا كان هذا الاختبار هو "القصير الثاني" اختر "قصيرة 2"
                        </p>
                        <div className="space-y-3">
                          {COLUMN_GROUPS.map(g => (
                            <div key={g.label}>
                              <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--text-hint)' }}>{g.label}</p>
                              <div className="flex gap-2 flex-wrap">
                                {g.keys.map(k => {
                                  const f = fields.find(x => x.key === k);
                                  return (
                                    <button key={k} onClick={() => setColumn(k)} data-testid={`sync-col-${k}`}
                                      className="px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                                      style={column === k
                                        ? { borderColor: 'var(--theme-accent)', background: 'rgba(var(--theme-accent-rgb),0.14)', color: 'var(--theme-accent)' }
                                        : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>
                                      {f.label}
                                      <span className="block text-[10px] font-semibold opacity-70">من {f.max} درجات</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs mt-3 px-3 py-2 rounded-lg inline-block"
                          style={{ background: 'rgba(var(--theme-accent-rgb),0.07)', color: 'var(--theme-accent)' }}
                          data-testid="sync-column-hint">
                          نسبة الطالب في الاختبار ستتحول تلقائياً إلى درجة من {maxMap[column]} — مثال: 80% = {Math.round(80 * maxMap[column] / 100 * 2) / 2} درجة
                        </p>
                      </div>
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
                          className="flex items-center gap-3 p-3 rounded-xl border transition-colors flex-wrap"
                          style={sid
                            ? (isDup
                              ? { background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.35)' }
                              : { background: 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.30)' })
                            : { background: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.30)' }}>
                          {sid
                            ? (isDup
                              ? <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#FBBF24' }} />
                              : <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#34D399' }} />)
                            : <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#F87171' }} />}
                          <div className="flex-1 min-w-[140px]">
                            <p className="text-sm font-bold text-white">{p.student_name}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
                              {p.grade}/{p.section} — {Math.round(p.percentage)}% في الاختبار
                              {p.confidence > 0 && sid === p.matched_student_id && ` — ثقة المطابقة ${Math.round(p.confidence * 100)}%`}
                            </p>
                          </div>
                          <select className="input-field" style={{ maxWidth: '230px', padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                            value={sid}
                            data-testid={`sync-select-${p.id}`}
                            onChange={e => setMappings(m => ({ ...m, [p.id]: e.target.value }))}>
                            <option value="">— بدون نقل —</option>
                            {matchData.students.map(st => (
                              <option key={st.id} value={st.id}>{st.name}</option>
                            ))}
                          </select>
                          <span className="text-sm font-black w-14 text-center flex-shrink-0"
                            style={{ color: sid ? '#34D399' : 'var(--text-hint)' }}>
                            {sid ? `${scaled}/${maxMap[column]}` : '—'}
                          </span>
                          {isDup && <span className="text-[10px] font-bold w-full" style={{ color: '#FBBF24' }}>⚠ هذا الطالب مرتبط بأكثر من نتيجة — الأخيرة ستعتمد</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex gap-3 flex-shrink-0">
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
