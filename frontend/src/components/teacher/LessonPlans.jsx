import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Library, Video, BookOpenCheck, ChevronLeft, Building2, Check } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';
import { themeOfGrade } from '../../utils/gradebook';
import { LessonPlanSheet, PlanToolbar } from './LessonPlanSheet';

const PLAN_KEYS = ['prior', 'objectives', 'strategies', 'execution', 'resources', 'formative', 'enrichment', 'remedial', 'summative', 'homework', 'notes'];
const pick = (p) => Object.fromEntries(PLAN_KEYS.map(k => [k, p[k]]));
const DEFAULT_DIRECTORATE = 'المديرية العامة للتربية والتعليم بمحافظة شمال الشرقية';

export default function LessonPlans() {
  const [catalog, setCatalog] = useState(null);
  const [grade, setGrade] = useState('5');
  const [lessonId, setLessonId] = useState(null);
  const [data, setData] = useState(null);
  const [variant, setVariant] = useState(1);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [profile, setProfile] = useState({});
  const [year, setYear] = useState('2025/2026');
  const [directorate, setDirectorate] = useState(DEFAULT_DIRECTORATE);
  const [dirSaved, setDirSaved] = useState(true);

  const loadCatalog = useCallback(async () => {
    const r = await axios.get(`${API}/lesson-plans/catalog`, getAuthHeaders());
    setCatalog(r.data);
    return r.data;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [c, p, y] = await Promise.all([loadCatalog(), axios.get(`${API}/auth/profile`, getAuthHeaders()), axios.get(`${API}/academic-years`, getAuthHeaders())]);
        setProfile(p.data || {});
        if (p.data?.directorate) setDirectorate(p.data.directorate);
        setYear((y.data?.current || '2025-2026').replace('-', '/'));
        const first = c.grades[0]?.units[0]?.lessons[0];
        if (first) setLessonId(first.id);
      } catch { toast.error('تعذر تحميل التحاضير'); }
    })();
  }, [loadCatalog]);

  useEffect(() => {
    if (!lessonId) return;
    setEditing(false); setDraft(null);
    axios.get(`${API}/lesson-plans/${lessonId}`, getAuthHeaders())
      .then(r => setData(r.data))
      .catch(() => toast.error('تعذر تحميل تحاضير الدرس'));
  }, [lessonId]);

  const current = data?.variants.find(v => v.variant === variant);
  const plan = editing ? draft : current;
  const header = { directorate, school: profile.school_name || 'مدرسة الخيرات للبنين', teacher: profile.teacher_name || '', year };

  const pickGrade = (g) => {
    setGrade(g);
    const first = catalog.grades.find(x => x.grade === g)?.units[0]?.lessons[0];
    if (first) setLessonId(first.id);
  };

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/lesson-plans/${lessonId}/${variant}`, pick(draft), getAuthHeaders());
      setData(d => ({ ...d, variants: d.variants.map(v => v.variant === variant ? { ...v, ...pick(draft), edited: true } : v) }));
      setEditing(false); setDraft(null);
      toast.success('تم حفظ التحضير');
      loadCatalog();
    } catch { toast.error('تعذر الحفظ'); }
    finally { setSaving(false); }
  };

  const reset = async () => {
    try {
      await axios.delete(`${API}/lesson-plans/${lessonId}/${variant}`, getAuthHeaders());
      const r = await axios.get(`${API}/lesson-plans/${lessonId}`, getAuthHeaders());
      setData(r.data); toast.success('تمت استعادة التحضير الأصلي'); loadCatalog();
    } catch { toast.error('تعذر الاستعادة'); }
  };

  const exportDocx = async () => {
    setExporting(true);
    try {
      const r = await axios.post(`${API}/lesson-plans/${lessonId}/${variant}/export`, { plan: pick(plan), directorate },
        { ...getAuthHeaders(), responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = `تحضير - ${data.lesson.lesson} - ${variant}.docx`; a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير ملف Word');
    } catch { toast.error('تعذر التصدير'); }
    finally { setExporting(false); }
  };

  const saveDirectorate = async () => {
    try {
      await axios.put(`${API}/auth/profile`, { directorate }, getAuthHeaders());
      setDirSaved(true); toast.success('تم حفظ اسم المديرية');
    } catch { toast.error('تعذر الحفظ'); }
  };

  const gradeData = catalog?.grades.find(g => g.grade === grade);

  return (
    <TeacherLayout title="التحضير">
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link to="/teacher/library" className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Library className="w-4 h-4 inline ml-1.5" />الموارد
        </Link>
        <Link to="/teacher/library/videos" className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Video className="w-4 h-4 inline ml-1.5" />الفيديوهات
        </Link>
        <button data-testid="library-tab-plans" className="px-4 py-2 rounded-2xl font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.08))', color: '#6EE7B7', border: '1px solid rgba(52,211,153,0.35)', boxShadow: '0 4px 16px rgba(52,211,153,0.10)' }}>
          <BookOpenCheck className="w-4 h-4 inline ml-1.5" />التحضير
        </button>
      </div>

      {/* الترويسة */}
      <div className="glass-card rounded-3xl p-4 mb-5 flex flex-wrap items-center gap-3" data-testid="lp-header-card">
        <Building2 className="w-5 h-5 text-emerald-300 shrink-0" />
        <input data-testid="lp-directorate-input" value={directorate} onChange={e => { setDirectorate(e.target.value); setDirSaved(false); }}
          className="input-field flex-1 min-w-[260px]" style={{ width: 'auto' }} placeholder="اسم المديرية" />
        {!dirSaved && <button data-testid="lp-directorate-save" onClick={saveDirectorate} className="btn-primary rounded-2xl px-3 py-2 text-sm flex items-center gap-1"><Check className="w-4 h-4" />حفظ</button>}
        <div className="text-xs text-slate-400 leading-relaxed">
          <p>المدرسة: <span className="text-slate-200 font-bold">{header.school}</span> · المعلم: <span className="text-slate-200 font-bold">{header.teacher || '—'}</span> · العام: <span className="text-slate-200 font-bold">{year}</span></p>
          <p className="opacity-70">تُعدَّل من الإعدادات — وتظهر تلقائياً في ترويسة التحضير وملف Word</p>
        </div>
      </div>

      {/* تبويبات الصفوف */}
      <div className="flex gap-2 mb-5 flex-wrap" data-testid="lp-grade-tabs">
        {catalog?.grades.map(g => {
          const th = themeOfGrade(g.grade_name);
          const active = g.grade === grade;
          return (
            <button key={g.grade} data-testid={`lp-grade-tab-${g.grade}`} onClick={() => pickGrade(g.grade)}
              className="px-4 py-2 rounded-2xl font-black text-sm transition-all hover:scale-105"
              style={{ background: active ? `rgba(${th.rgb},0.22)` : 'rgba(255,255,255,0.04)', color: active ? th.hex : '#94A3B8', border: `1px solid ${active ? th.hex : 'rgba(255,255,255,0.08)'}` }}>
              الصف {g.grade_name}
              <span className="text-[10px] opacity-70 mr-1.5">({g.units.reduce((a, u) => a + u.lessons.length, 0)} درساً)</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* قائمة الدروس */}
        <aside className="glass-card rounded-3xl p-3 self-start lg:sticky lg:top-4 max-h-[80vh] overflow-y-auto" data-testid="lp-lesson-list">
          {gradeData?.units.map(u => (
            <div key={u.unit} className="mb-3">
              <p className="text-[11px] font-black tracking-wide px-2 py-1.5 rounded-xl mb-1" style={{ color: themeOfGrade(gradeData.grade_name).hex, background: `rgba(${themeOfGrade(gradeData.grade_name).rgb},0.10)` }}>
                الوحدة: {u.unit}
              </p>
              {u.lessons.map(l => {
                const active = l.id === lessonId;
                return (
                  <button key={l.id} data-testid={`lp-lesson-${l.id}`} onClick={() => setLessonId(l.id)}
                    className="w-full text-right flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                    style={{ background: active ? 'rgba(255,255,255,0.08)' : 'transparent', color: active ? '#F8FAFC' : '#CBD5E1', fontWeight: active ? 800 : 500 }}>
                    <span className="flex-1">{l.lesson}</span>
                    {l.edited_variants.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black" title="يحوي تعديلات محفوظة">{l.edited_variants.length}</span>}
                    <ChevronLeft className="w-4 h-4 opacity-40" />
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* التحضير */}
        <section className="min-w-0">
          {data && (
            <>
              <div className="flex flex-wrap gap-2 mb-4" data-testid="lp-variant-tabs">
                {data.variants.map(v => {
                  const active = v.variant === variant;
                  return (
                    <button key={v.variant} data-testid={`lp-variant-${v.variant}`} onClick={() => { if (editing) { setEditing(false); setDraft(null); } setVariant(v.variant); }}
                      className="rounded-2xl px-3 py-2 text-right transition-all hover:scale-[1.02]"
                      style={{ background: active ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.08)'}`, minWidth: 170 }}>
                      <p className="text-[10px] font-black" style={{ color: active ? '#6EE7B7' : '#94A3B8' }}>التحضير {v.variant} {v.edited && <span className="text-amber-300">• معدَّل</span>}</p>
                      <p className="text-xs font-bold" style={{ color: active ? '#F8FAFC' : '#CBD5E1' }}>{v.name}</p>
                    </button>
                  );
                })}
              </div>
              {current && <p className="text-xs text-slate-400 mb-3">{current.tagline}</p>}

              <div className="mb-3">
                <PlanToolbar editing={editing} dirty={editing && JSON.stringify(pick(draft)) !== JSON.stringify(pick(current))} saving={saving} exporting={exporting}
                  edited={current?.edited}
                  onEdit={() => { setDraft(pick(current)); setEditing(true); }}
                  onCancel={() => { setEditing(false); setDraft(null); }}
                  onSave={save} onReset={reset} onExport={exportDocx} />
              </div>

              {plan && <LessonPlanSheet lesson={data.lesson} plan={plan} header={header} editing={editing} onChange={setDraft} />}
            </>
          )}
        </section>
      </div>
    </TeacherLayout>
  );
}
