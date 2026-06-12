import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Save, UserPlus, FileUp, FileDown, Trash2, Pencil, X, CalendarRange, ChevronUp, ChevronDown
} from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';
import {
  GB_FIELDS, sumKeys, totalScore, midterm,
  levelLetter, descNum, LEVEL_COLORS, fileToBase64
} from '../../utils/gradebook';
import useGlobalSemester from '../../utils/useGlobalSemester';

const TABS = [
  { id: '1', label: 'الفصل الأول' },
  { id: '2', label: 'الفصل الثاني' },
  { id: 'annual', label: 'السجل السنوي' },
];

// يحوّل الأرقام العربية (٠-٩) والفارسية (۰-۹) والفاصلة العربية إلى صيغة لاتينية
const toLatinDigits = (s) => String(s)
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٫,]/g, '.');

function ScoreCell({ value, max, onChange, testId }) {
  const [text, setText] = useState(null); // null = غير قيد التحرير
  const shown = text !== null ? text : (value ?? '');
  return (
    <input
      type="text" inputMode="decimal" dir="ltr"
      className="gb-cell-input"
      value={shown}
      data-testid={testId}
      onFocus={() => setText(value != null ? String(value) : '')}
      onChange={e => {
        const t = toLatinDigits(e.target.value);
        if (!/^\d*\.?\d*$/.test(t)) return; // يقبل الأرقام والكسور فقط
        if (t === '') { setText(''); onChange(null); return; }
        const v = parseFloat(t);
        if (isNaN(v)) { setText(t); return; }
        const clamped = Math.max(0, Math.min(v, max));
        setText(clamped !== v ? String(clamped) : t);
        onChange(clamped);
      }}
      onBlur={() => setText(null)}
    />
  );
}

export default function GradebookDetail() {
  const { gradebookId } = useParams();
  const [gb, setGb] = useState(null);
  const [scores, setScores] = useState({ 1: {}, 2: {} });
  const [dirty, setDirty] = useState(new Set());
  const [globalSemester] = useGlobalSemester();
  const [tab, setTab] = useState(() => localStorage.getItem('semester') === '2' ? '2' : '1');
  // مزامنة مع الفصل العالمي (الإعدادات) ما لم يكن المستخدم على تبويب السجل السنوي
  useEffect(() => {
    setTab(prev => prev === 'annual' ? prev : globalSemester);
  }, [globalSemester]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newNames, setNewNames] = useState('');
  const [addPos, setAddPos] = useState('end');
  const [renaming, setRenaming] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { fetchGb(); }, [gradebookId]);

  const fetchGb = async () => {
    try {
      const res = await axios.get(`${API}/gradebooks/${gradebookId}`, getAuthHeaders());
      setGb(res.data);
      setScores({ 1: res.data.scores?.['1'] || {}, 2: res.data.scores?.['2'] || {} });
      setDirty(new Set());
    } catch { toast.error('تعذر تحميل السجل'); }
  };

  const setScore = (sem, sid, field, value) => {
    setScores(prev => ({
      ...prev,
      [sem]: { ...prev[sem], [sid]: { ...(prev[sem][sid] || {}), [field]: value } }
    }));
    setDirty(prev => new Set(prev).add(`${sem}|${sid}|${field}`));
  };

  const saveAll = async (silent = false) => {
    if (dirty.size === 0) return;
    setSaving(true);
    try {
      const updates = [...dirty].map(key => {
        const [semester, student_id, field] = key.split('|');
        return { semester, student_id, field, value: scores[semester]?.[student_id]?.[field] ?? null };
      });
      await axios.put(`${API}/gradebooks/${gradebookId}/scores`, { updates }, getAuthHeaders());
      if (!silent) toast.success(`تم حفظ ${updates.length} درجة`);
      setDirty(new Set());
    } catch { if (!silent) toast.error('تعذر الحفظ'); }
    finally { setSaving(false); }
  };

  // حفظ تلقائي بعد 1.5 ثانية من آخر تعديل
  useEffect(() => {
    if (dirty.size === 0) return;
    const timer = setTimeout(() => saveAll(true), 1500);
    return () => clearTimeout(timer);
  }, [scores, dirty]);

  const moveStudent = async (i, dir) => {
    const j = i + dir;
    const arr = [...(gb.students || [])];
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setGb(g => ({ ...g, students: arr }));
    try {
      await axios.put(`${API}/gradebooks/${gradebookId}/reorder`, { student_ids: arr.map(s => s.id) }, getAuthHeaders());
    } catch { toast.error('تعذر تغيير الترتيب'); fetchGb(); }
  };

  const addStudents = async (e) => {
    e.preventDefault();
    const names = newNames.split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    try {
      const payload = { names };
      if (addPos !== 'end') payload.position = parseInt(addPos, 10);
      const res = await axios.post(`${API}/gradebooks/${gradebookId}/students`, payload, getAuthHeaders());
      toast.success(`تمت إضافة ${res.data.added} طالب${res.data.skipped ? ` (${res.data.skipped} مكرر)` : ''}`);
      setShowAdd(false); setNewNames(''); setAddPos('end');
      fetchGb();
    } catch { toast.error('تعذر الإضافة'); }
  };

  const renameStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/gradebooks/${gradebookId}/students/${renaming.id}`, { name: renaming.name }, getAuthHeaders());
      toast.success('تم تعديل الاسم');
      setRenaming(null);
      fetchGb();
    } catch { toast.error('تعذر التعديل'); }
  };

  const deleteStudent = async (st) => {
    if (!window.confirm(`حذف الطالب "${st.name}" مع درجاته؟`)) return;
    try {
      await axios.delete(`${API}/gradebooks/${gradebookId}/students/${st.id}`, getAuthHeaders());
      toast.success('تم الحذف');
      fetchGb();
    } catch { toast.error('تعذر الحذف'); }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/gradebooks/${gradebookId}/export`, { ...getAuthHeaders(), responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `سجل_الدرجات_${gb.grade}_${gb.section}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير الملف بنفس قالب السجل الرسمي');
    } catch { toast.error('تعذر التصدير'); }
    finally { setExporting(false); }
  };

  const importMerge = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await axios.post(`${API}/gradebooks/import`, { data_base64: b64, gradebook_id: gradebookId }, getAuthHeaders());
      toast.success(`تم الاستيراد: ${res.data.students_added} طالب جديد، ${res.data.scores_imported} درجة`);
      fetchGb();
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر الاستيراد'); }
    finally { setImporting(false); }
  };

  if (!gb) return (
    <TeacherLayout title="سجل الدرجات" backTo="/teacher/gradebooks">
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>جارٍ التحميل...</div>
    </TeacherLayout>
  );

  const students = gb.students || [];
  const tpl = gb.template || '5-6';
  const is78 = tpl === '7-10';

  const renderSemester = (sem) => (
    <div className="quiz-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="gb-table w-full text-sm" style={{ minWidth: is78 ? '840px' : '980px' }}>
          <thead>
            <tr className="gb-head-row">
              <th rowSpan={2} className="px-2 py-2 w-10">م</th>
              <th rowSpan={2} className="px-3 py-2 text-right" style={{ minWidth: '210px' }}>اسم الطالب</th>
              <th colSpan={2} className="px-2 py-2">الحوار</th>
              <th rowSpan={2} className="px-2 py-2 gb-total-col">المجموع<br /><span className="gb-max">20</span></th>
              {is78 ? (
                <>
                  <th colSpan={2} className="px-2 py-2">الأنشطة العملية</th>
                  <th rowSpan={2} className="px-2 py-2 gb-total-col">المجموع<br /><span className="gb-max">40</span></th>
                  <th rowSpan={2} className="px-2 py-2">الاختبار القصير<br /><span className="gb-max">20</span></th>
                </>
              ) : (
                <>
                  <th colSpan={4} className="px-2 py-2">الأسئلة القصيرة</th>
                  <th rowSpan={2} className="px-2 py-2 gb-total-col">المجموع<br /><span className="gb-max">20</span></th>
                  <th colSpan={2} className="px-2 py-2">الأنشطة العملية</th>
                  <th rowSpan={2} className="px-2 py-2 gb-total-col">المجموع<br /><span className="gb-max">40</span></th>
                </>
              )}
              <th rowSpan={2} className="px-2 py-2">المشروع<br /><span className="gb-max">20</span></th>
              <th rowSpan={2} className="px-2 py-2 gb-grand-col">الدرجة الكلية<br /><span className="gb-max">100</span></th>
              <th rowSpan={2} className="px-2 py-2 w-28"></th>
            </tr>
            <tr className="gb-head-row">
              {is78
                ? ['d1', 'd2', 'p1', 'p2'].map(k => (
                    <th key={k} className="px-1 py-1.5 text-xs font-semibold">{k.startsWith('d') ? 10 : 20}</th>
                  ))
                : GB_FIELDS.filter(f => f.key !== 'proj').map(f => (
                    <th key={f.key} className="px-1 py-1.5 text-xs font-semibold">{f.max}</th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr><td colSpan={16} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                لا يوجد طلاب — أضف الأسماء من زر "إضافة طلاب" أو استورد ملف Excel
              </td></tr>
            )}
            {students.map((st, i) => {
              const sc = scores[sem][st.id] || {};
              const total = totalScore(sc, tpl);
              return (
                <tr key={st.id} className="gb-row" data-testid={`gb-row-${sem}-${i}`}>
                  <td className="px-2 py-1.5 text-center font-semibold" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-white whitespace-nowrap">{st.name}</td>
                  <td className="px-1 py-1 text-center"><ScoreCell value={sc.d1} max={10} onChange={v => setScore(sem, st.id, 'd1', v)} testId={`gb-${sem}-${i}-d1`} /></td>
                  <td className="px-1 py-1 text-center"><ScoreCell value={sc.d2} max={10} onChange={v => setScore(sem, st.id, 'd2', v)} testId={`gb-${sem}-${i}-d2`} /></td>
                  <td className="px-2 py-1.5 text-center font-bold gb-total-col">{sumKeys(sc, ['d1', 'd2']) ?? '—'}</td>
                  {is78 ? (
                    <>
                      <td className="px-1 py-1 text-center"><ScoreCell value={sc.p1} max={20} onChange={v => setScore(sem, st.id, 'p1', v)} testId={`gb-${sem}-${i}-p1`} /></td>
                      <td className="px-1 py-1 text-center"><ScoreCell value={sc.p2} max={20} onChange={v => setScore(sem, st.id, 'p2', v)} testId={`gb-${sem}-${i}-p2`} /></td>
                      <td className="px-2 py-1.5 text-center font-bold gb-total-col">{sumKeys(sc, ['p1', 'p2']) ?? '—'}</td>
                      <td className="px-1 py-1 text-center"><ScoreCell value={sc.q1} max={20} onChange={v => setScore(sem, st.id, 'q1', v)} testId={`gb-${sem}-${i}-q1`} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-1 py-1 text-center"><ScoreCell value={sc.q1} max={5} onChange={v => setScore(sem, st.id, 'q1', v)} testId={`gb-${sem}-${i}-q1`} /></td>
                      <td className="px-1 py-1 text-center"><ScoreCell value={sc.q2} max={5} onChange={v => setScore(sem, st.id, 'q2', v)} testId={`gb-${sem}-${i}-q2`} /></td>
                      <td className="px-1 py-1 text-center"><ScoreCell value={sc.q3} max={5} onChange={v => setScore(sem, st.id, 'q3', v)} testId={`gb-${sem}-${i}-q3`} /></td>
                      <td className="px-1 py-1 text-center"><ScoreCell value={sc.q4} max={5} onChange={v => setScore(sem, st.id, 'q4', v)} testId={`gb-${sem}-${i}-q4`} /></td>
                      <td className="px-2 py-1.5 text-center font-bold gb-total-col">{sumKeys(sc, ['q1', 'q2', 'q3', 'q4']) ?? '—'}</td>
                      <td className="px-1 py-1 text-center"><ScoreCell value={sc.p1} max={20} onChange={v => setScore(sem, st.id, 'p1', v)} testId={`gb-${sem}-${i}-p1`} /></td>
                      <td className="px-1 py-1 text-center"><ScoreCell value={sc.p2} max={20} onChange={v => setScore(sem, st.id, 'p2', v)} testId={`gb-${sem}-${i}-p2`} /></td>
                      <td className="px-2 py-1.5 text-center font-bold gb-total-col">{sumKeys(sc, ['p1', 'p2']) ?? '—'}</td>
                    </>
                  )}
                  <td className="px-1 py-1 text-center"><ScoreCell value={sc.proj} max={20} onChange={v => setScore(sem, st.id, 'proj', v)} testId={`gb-${sem}-${i}-proj`} /></td>
                  <td className="px-2 py-1.5 text-center gb-grand-col">
                    <span className="font-black" style={{ color: total != null ? LEVEL_COLORS[levelLetter(total)] : 'var(--text-hint)' }}>
                      {total ?? '—'}
                    </span>
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5 justify-center">
                      <button onClick={() => moveStudent(i, -1)} disabled={i === 0}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-20" title="تحريك لأعلى"
                        data-testid={`gb-move-up-${i}`}>
                        <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button onClick={() => moveStudent(i, 1)} disabled={i === students.length - 1}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-20" title="تحريك لأسفل"
                        data-testid={`gb-move-down-${i}`}>
                        <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button onClick={() => setRenaming({ id: st.id, name: st.name })} className="p-1 rounded hover:bg-white/10" title="تعديل الاسم">
                        <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent)' }} />
                      </button>
                      <button onClick={() => deleteStudent(st)} className="p-1 rounded hover:bg-white/10" title="حذف"
                        data-testid={`gb-delete-student-${i}`}>
                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#F87171' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnnual = () => (
    <div className="quiz-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="gb-table w-full text-sm" style={{ minWidth: '900px' }}>
          <thead>
            <tr className="gb-head-row">
              <th rowSpan={2} className="px-2 py-2 w-10">م</th>
              <th rowSpan={2} className="px-3 py-2 text-right" style={{ minWidth: '210px' }}>اسم الطالب</th>
              <th colSpan={4} className="px-2 py-2">الفصل الدراسي الأول</th>
              <th colSpan={4} className="px-2 py-2">الفصل الدراسي الثاني</th>
              <th rowSpan={2} className="px-2 py-2 gb-grand-col">نهاية العام<br /><span className="gb-max">100</span></th>
              <th rowSpan={2} className="px-2 py-2">المستوى</th>
            </tr>
            <tr className="gb-head-row">
              {['منتصف الفصل', 'العبارة الوصفية', 'نهاية الفصل', 'المستوى', 'منتصف الفصل', 'العبارة الوصفية', 'نهاية الفصل', 'المستوى'].map((h, i) => (
                <th key={i} className="px-2 py-1.5 text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((st, i) => {
              const s1 = scores['1'][st.id] || {};
              const s2 = scores['2'][st.id] || {};
              const mid1 = midterm(s1, tpl), fin1 = totalScore(s1, tpl);
              const mid2 = midterm(s2, tpl), fin2 = totalScore(s2, tpl);
              const year = (fin1 != null && fin2 != null) ? Math.round(((fin1 + fin2) / 2) * 10) / 10 : null;
              const Lv = ({ v }) => {
                const l = levelLetter(v);
                return l ? <span className="font-black" style={{ color: LEVEL_COLORS[l] }}>{l}</span> : '—';
              };
              return (
                <tr key={st.id} className="gb-row" data-testid={`gb-annual-row-${i}`}>
                  <td className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-white whitespace-nowrap">{st.name}</td>
                  <td className="px-2 py-2 text-center font-bold">{mid1 ?? '—'}</td>
                  <td className="px-2 py-2 text-center">{descNum(mid1) || '—'}</td>
                  <td className="px-2 py-2 text-center font-bold">{fin1 ?? '—'}</td>
                  <td className="px-2 py-2 text-center"><Lv v={fin1} /></td>
                  <td className="px-2 py-2 text-center font-bold">{mid2 ?? '—'}</td>
                  <td className="px-2 py-2 text-center">{descNum(mid2) || '—'}</td>
                  <td className="px-2 py-2 text-center font-bold">{fin2 ?? '—'}</td>
                  <td className="px-2 py-2 text-center"><Lv v={fin2} /></td>
                  <td className="px-2 py-2 text-center gb-grand-col">
                    <span className="font-black" style={{ color: year != null ? LEVEL_COLORS[levelLetter(year)] : 'var(--text-hint)' }}>
                      {year ?? '—'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center"><Lv v={year} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <TeacherLayout title={`سجل الصف ${gb.grade} / ${gb.section} — نموذج (${tpl})`} backTo="/teacher/gradebooks">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowAdd(true)} data-testid="gb-add-students-btn"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(var(--theme-accent-rgb),0.1)', color: 'var(--theme-accent)', border: '1px solid rgba(var(--theme-accent-rgb),0.25)' }}>
            <UserPlus className="w-4 h-4" /> إضافة طلاب
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={importMerge} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} data-testid="gb-import-btn"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}>
            <FileUp className="w-4 h-4" /> {importing ? 'جارٍ...' : 'استيراد Excel'}
          </button>
          <button onClick={exportExcel} disabled={exporting} data-testid="gb-export-btn"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.25)' }}>
            <FileDown className="w-4 h-4" /> {exporting ? 'جارٍ...' : 'تصدير Excel'}
          </button>
        </div>
        <button onClick={() => saveAll(false)} disabled={saving || dirty.size === 0} data-testid="gb-save-btn"
          className="btn-primary flex items-center gap-2 disabled:opacity-40">
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : dirty.size > 0 ? `حفظ التغييرات (${dirty.size})` : 'محفوظ تلقائياً ✓'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} data-testid={`gb-tab-${tb.id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={tab === tb.id
              ? { background: 'rgba(var(--theme-accent-rgb),0.15)', color: 'var(--theme-accent)', border: '1px solid rgba(var(--theme-accent-rgb),0.4)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <CalendarRange className="w-4 h-4" />
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'annual' ? renderAnnual() : renderSemester(tab)}

      {/* Add students modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">إضافة طلاب</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-white/5 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={addStudents} className="space-y-4">
              <textarea className="input-field" rows={8} placeholder={'اسم في كل سطر...'}
                value={newNames} onChange={e => setNewNames(e.target.value)} data-testid="gb-add-names-textarea" />
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>موضع الإضافة في القائمة</label>
                <select className="input-field" value={addPos} onChange={e => setAddPos(e.target.value)} data-testid="gb-add-position-select">
                  <option value="end">نهاية القائمة</option>
                  <option value="0">بداية القائمة</option>
                  {students.map((st, i) => (
                    <option key={st.id} value={i + 1}>بعد: {st.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full" data-testid="gb-add-names-submit">إضافة</button>
            </form>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setRenaming(null)}>
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white text-lg mb-4">تعديل اسم الطالب</h3>
            <form onSubmit={renameStudent} className="space-y-4">
              <input className="input-field" required value={renaming.name}
                onChange={e => setRenaming(r => ({ ...r, name: e.target.value }))} data-testid="gb-rename-input" />
              <button type="submit" className="btn-primary w-full">حفظ</button>
            </form>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
