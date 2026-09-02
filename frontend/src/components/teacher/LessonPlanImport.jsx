import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Upload, X, FileUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { API, getAuthHeaders } from '../../utils';

export const LessonPlanImport = ({ catalog, currentLessonId, onImported }) => {
  const fileRef = useRef();
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [grade, setGrade] = useState('5');
  const [lessonId, setLessonId] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await axios.post(`${API}/lesson-plans/import/parse`, fd, getAuthHeaders());
      const d = r.data;
      setParsed(d);
      setName(d.name || 'تحضير مستورد');
      const m = d.detected.match;
      const g = m?.grade || d.detected.grade || catalog.grades.find(x => x.units.some(u => u.lessons.some(l => l.id === currentLessonId)))?.grade || '5';
      setGrade(g);
      setLessonId(m?.id || (d.detected.grade ? '' : currentLessonId) || '');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'تعذر قراءة الملف');
    } finally { setParsing(false); }
  };

  const confirm = async () => {
    if (!lessonId) { toast.error('اختر الدرس أولاً'); return; }
    setSaving(true);
    try {
      const r = await axios.post(`${API}/lesson-plans/${lessonId}/custom`, { name, plan: parsed.plan }, getAuthHeaders());
      toast.success(`تمت إضافة التحضير ${r.data.variant}`);
      setParsed(null);
      onImported(lessonId, r.data.variant);
    } catch { toast.error('تعذر إضافة التحضير'); }
    finally { setSaving(false); }
  };

  const gradeData = catalog?.grades.find(g => g.grade === grade);
  const det = parsed?.detected;

  return (
    <>
      <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={onFile} data-testid="lp-import-file" />
      <button data-testid="lp-import-btn" onClick={() => fileRef.current?.click()} disabled={parsing}
        className="btn-secondary rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm font-bold">
        <Upload className="w-4 h-4" />{parsing ? 'جارٍ القراءة…' : 'استيراد تحضير (Word)'}
      </button>

      {parsed && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} dir="rtl">
          <div className="glass-card rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="lp-import-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2"><FileUp className="w-5 h-5 text-emerald-300" />استيراد تحضير من ملف Word</h3>
              <button onClick={() => setParsed(null)} className="p-2 rounded-xl hover:bg-white/5" data-testid="lp-import-close"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="rounded-2xl p-3 mb-4 text-sm" style={{ background: det.match ? 'rgba(52,211,153,0.10)' : 'rgba(251,191,36,0.10)', border: `1px solid ${det.match ? 'rgba(52,211,153,0.35)' : 'rgba(251,191,36,0.35)'}` }} data-testid="lp-import-detect">
              {det.match ? (
                <p className="flex items-center gap-2 text-emerald-200"><CheckCircle2 className="w-4 h-4" />تم التعرّف على الدرس تلقائياً: <b>{det.match.lesson}</b> (الصف {det.match.grade_name}) — يمكنك تغييره أدناه.</p>
              ) : (
                <p className="flex items-center gap-2 text-amber-200"><AlertTriangle className="w-4 h-4" />لم أتمكن من مطابقة الدرس «{det.lesson || 'غير محدد'}» مع دروس الكتاب — اختر الصف والدرس الذي تريد إضافة التحضير إليه.</p>
              )}
              {det.unit && <p className="text-xs text-slate-400 mt-1">الوحدة في الملف: {det.unit}{det.grade_name ? ` · الصف في الملف: ${det.grade_name}` : ''}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <label className="text-sm text-slate-300">الصف
                <select data-testid="lp-import-grade" value={grade} onChange={e => { setGrade(e.target.value); setLessonId(''); }} className="input-field mt-1">
                  {catalog.grades.map(g => <option key={g.grade} value={g.grade}>الصف {g.grade_name}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-300">الدرس
                <select data-testid="lp-import-lesson" value={lessonId} onChange={e => setLessonId(e.target.value)} className="input-field mt-1">
                  <option value="">— اختر الدرس —</option>
                  {gradeData?.units.map(u => (
                    <optgroup key={u.unit} label={u.unit}>
                      {u.lessons.map(l => <option key={l.id} value={l.id}>{l.lesson}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
            <label className="text-sm text-slate-300 block mb-4">اسم التحضير
              <input data-testid="lp-import-name" value={name} onChange={e => setName(e.target.value)} className="input-field mt-1" />
            </label>

            <div className="rounded-2xl p-3 mb-4 text-xs text-slate-300 space-y-1" style={{ background: 'rgba(255,255,255,0.04)' }} data-testid="lp-import-preview">
              <p><b className="text-slate-100">الأهداف:</b> {parsed.plan.objectives.length} · <b className="text-slate-100">الاستراتيجيات:</b> {parsed.plan.strategies.length} · <b className="text-slate-100">آلية التنفيذ:</b> {parsed.plan.execution.length} فقرة · <b className="text-slate-100">الوسائل:</b> {parsed.plan.resources.length}</p>
              <p><b className="text-slate-100">التكويني:</b> {parsed.plan.formative.length} · <b className="text-slate-100">الختامي:</b> {parsed.plan.summative.length} · <b className="text-slate-100">الواجب:</b> {parsed.plan.homework ? '✓' : '—'}</p>
              {parsed.plan.objectives[0] && <p className="opacity-80">أول هدف: {parsed.plan.objectives[0]}</p>}
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setParsed(null)} className="btn-ghost rounded-2xl px-4 py-2 text-sm">إلغاء</button>
              <button data-testid="lp-import-confirm" onClick={confirm} disabled={saving || !lessonId} className="btn-primary rounded-2xl px-4 py-2 text-sm font-bold">
                {saving ? 'جارٍ الإضافة…' : 'إضافة كتحضير جديد'}
              </button>
            </div>
          </div>
        </div>, document.body)}
    </>
  );
};
