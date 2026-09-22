import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Search, Pencil, Trash2, Check, X, CalendarDays, UserPlus, Users, ShieldCheck } from 'lucide-react';
import SubLayout from './SubLayout';
import { subApi, errMsg } from './subApi';
import ImportModal from './ImportModal';
import SubSupervision from './SubSupervision';

function WeekModal({ t, days, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={onClose}>
      <div className="sub-card p-6 w-full max-w-3xl sub-rise" onClick={(e) => e.stopPropagation()} data-testid="sub-week-modal">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-lg" style={{ color: 'var(--sub-navy-ink)' }}>{t.name}</h3>
            <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>{t.subject} · النصاب {t.quota} حصة</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
        </div>
        <div className="sub-week">
          <div className="h">اليوم</div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => <div key={p} className="h">{p}</div>)}
          {days.map((d) => (
            <>
              <div key={d} className="d">{d}</div>
              {(t.schedule?.[d] || Array(8).fill(null)).map((c, i) => (
                <div key={`${d}-${i}`} className={`c ${c ? '' : 'empty'}`} title={c?.subject || ''}>{c ? c.class : '—'}</div>
              ))}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddModal({ onClose, onAdded }) {
  const [f, setF] = useState({ name: '', subject: '', quota: 0 });
  const save = async (e) => {
    e.preventDefault();
    try {
      const r = await subApi.post('/teachers', { ...f, quota: Number(f.quota) || 0 });
      onAdded(r.data); toast.success('تمت إضافة المعلم'); onClose();
    } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={onClose}>
      <form className="sub-card p-6 w-full max-w-sm space-y-3 sub-rise" onClick={(e) => e.stopPropagation()} onSubmit={save} data-testid="sub-add-teacher-modal">
        <h3 className="font-black" style={{ color: 'var(--sub-navy-ink)' }}>إضافة معلم</h3>
        <input className="sub-input" placeholder="اسم المعلم" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required data-testid="sub-add-name" />
        <input className="sub-input" placeholder="المادة" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} data-testid="sub-add-subject" />
        <input className="sub-input" type="number" min="0" placeholder="النصاب" value={f.quota} onChange={(e) => setF({ ...f, quota: e.target.value })} data-testid="sub-add-quota" />
        <button className="sub-btn sub-btn-primary w-full" data-testid="sub-add-save">حفظ</button>
      </form>
    </div>
  );
}

export default function SubTeachers() {
  const [data, setData] = useState({ teachers: [], days: [], academic_range: [] });
  const [q, setQ] = useState('');
  const [subj, setSubj] = useState('');
  const [edit, setEdit] = useState(null);
  const [week, setWeek] = useState(null);
  const [add, setAdd] = useState(false);
  const [imp, setImp] = useState(false);
  const [tab, setTab] = useState(() => localStorage.getItem('subTeachersTab') || 'teachers');
  const switchTab = (t) => { setTab(t); localStorage.setItem('subTeachersTab', t); };

  const load = () => subApi.get('/teachers').then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const subjects = useMemo(() => [...new Set(data.teachers.map((t) => t.subject).filter(Boolean))], [data.teachers]);
  const list = data.teachers.filter((t) => (!q || t.name.includes(q)) && (!subj || t.subject === subj));
  const totalQuota = list.reduce((s, t) => s + (t.quota || 0), 0);

  const saveEdit = async () => {
    try {
      await subApi.put(`/teachers/${edit.id}`, { name: edit.name, subject: edit.subject, quota: Number(edit.quota) || 0 });
      toast.success('تم الحفظ'); setEdit(null); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const toggleActive = async (t) => {
    try { await subApi.put(`/teachers/${t.id}`, { active: !(t.active !== false) }); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const del = async (t) => {
    if (!window.confirm(`حذف ${t.name} نهائياً؟`)) return;
    try { await subApi.delete(`/teachers/${t.id}`); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const deleteAll = async () => {
    if (data.teachers.length === 0) return;
    const typed = window.prompt(`سيتم حذف جميع المعلمين (${data.teachers.length}) نهائياً ولا يمكن التراجع عن ذلك.\nاكتب كلمة "حذف" للتأكيد:`);
    if (typed === null) return;
    if (typed.trim() !== 'حذف') return toast.error('لم يتم التأكيد بشكل صحيح — لم يُحذف أي معلم');
    try { await subApi.delete('/teachers/all'); toast.success('تم حذف جميع المعلمين'); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <SubLayout title={tab === 'supervision' ? 'جدول الإشراف' : 'المعلمون والأنصبة'} subtitle={`العام الدراسي ${data.academic_range[0]?.slice(0, 4) || ''}/${data.academic_range[1]?.slice(0, 4) || ''} · ${data.teachers.length} معلماً`}
      actions={tab === 'teachers' && (
        <>
          <button className="sub-btn sub-btn-ghost" onClick={() => setAdd(true)} data-testid="sub-add-teacher-btn"><UserPlus className="w-4 h-4" /> إضافة معلم</button>
          <button className="sub-btn sub-btn-primary" onClick={() => setImp(true)} data-testid="sub-import-btn">
            <Upload className="w-4 h-4" /> استيراد الجداول والتوقيت
          </button>
          <button className="sub-btn sub-btn-danger" onClick={deleteAll} disabled={!data.teachers.length} data-testid="sub-delete-all-teachers-btn">
            <Trash2 className="w-4 h-4" /> حذف الجميع
          </button>
        </>
      )}>
      <div className="mb-4 sub-tabs" data-testid="sub-teachers-tabs">
        <button type="button" className={tab === 'teachers' ? 'active' : ''} onClick={() => switchTab('teachers')} data-testid="sub-tab-teachers"><Users className="w-4 h-4" /> المعلمون والأنصبة</button>
        <button type="button" className={tab === 'supervision' ? 'active' : ''} onClick={() => switchTab('supervision')} data-testid="sub-tab-supervision"><ShieldCheck className="w-4 h-4" /> جدول الإشراف</button>
      </div>

      {tab === 'supervision' && <SubSupervision />}

      {tab === 'teachers' && <>
      <div className="sub-card p-4 mb-4 flex flex-wrap gap-3 items-center sub-rise">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sub-muted)' }} />
          <input className="sub-input pr-11" placeholder="بحث باسم المعلم..." value={q} onChange={(e) => setQ(e.target.value)} data-testid="sub-teacher-search" />
        </div>
        <select className="sub-input w-auto min-w-[200px]" value={subj} onChange={(e) => setSubj(e.target.value)} data-testid="sub-subject-filter">
          <option value="">كل المواد</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="sub-badge sub-badge-navy">{list.length} معلماً</span>
        <span className="sub-badge sub-badge-gray">مجموع الأنصبة: {totalQuota}</span>
      </div>

      <div className="sub-card overflow-x-auto sub-rise sub-rise-2">
        <table className="sub-table" data-testid="sub-teachers-table">
          <thead><tr><th>م</th><th>المعلم</th><th>المادة</th><th>النصاب</th><th>أيام الغياب</th><th>حصص الاحتياط</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {list.map((t, i) => {
              const ed = edit?.id === t.id;
              return (
                <tr key={t.id} style={{ opacity: t.active === false ? 0.5 : 1 }} data-testid={`sub-teacher-row-${t.id}`}>
                  <td>{i + 1}</td>
                  <td className="font-bold">{ed ? <input className="sub-input py-1.5" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} data-testid="sub-edit-name" /> : t.name}</td>
                  <td>{ed ? <input className="sub-input py-1.5" value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /> : <span className="sub-badge sub-badge-navy">{t.subject}</span>}</td>
                  <td>{ed ? <input className="sub-input py-1.5 w-20" type="number" value={edit.quota} onChange={(e) => setEdit({ ...edit, quota: e.target.value })} data-testid="sub-edit-quota" /> : <span className="font-black">{t.quota}</span>}</td>
                  <td><span className={`sub-badge ${t.absences ? 'sub-badge-red' : 'sub-badge-gray'}`}>{t.absences}</span></td>
                  <td><span className={`sub-badge ${t.subs ? 'sub-badge-green' : 'sub-badge-gray'}`}>{t.subs}</span></td>
                  <td>
                    <button onClick={() => toggleActive(t)} className={`sub-badge ${t.active === false ? 'sub-badge-gray' : 'sub-badge-green'}`} data-testid={`sub-toggle-${t.id}`}>
                      {t.active === false ? 'غير نشط' : 'نشط'}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      {ed ? (
                        <>
                          <button className="p-1.5 rounded-lg hover:bg-green-50" style={{ color: 'var(--sub-green-ink)' }} onClick={saveEdit} data-testid="sub-edit-save"><Check className="w-4 h-4" /></button>
                          <button className="p-1.5 rounded-lg hover:bg-black/5" onClick={() => setEdit(null)}><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button className="p-1.5 rounded-lg hover:bg-black/5" title="الجدول الأسبوعي" onClick={() => setWeek(t)} data-testid={`sub-week-${t.id}`}><CalendarDays className="w-4 h-4" style={{ color: 'var(--sub-navy-ink)' }} /></button>
                          <button className="p-1.5 rounded-lg hover:bg-black/5" title="تعديل" onClick={() => setEdit({ id: t.id, name: t.name, subject: t.subject, quota: t.quota })} data-testid={`sub-edit-${t.id}`}><Pencil className="w-4 h-4" style={{ color: 'var(--sub-amber)' }} /></button>
                          <button className="p-1.5 rounded-lg hover:bg-red-50" title="حذف" onClick={() => del(t)} data-testid={`sub-del-${t.id}`}><Trash2 className="w-4 h-4" style={{ color: 'var(--sub-red-ink)' }} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={8} className="text-center py-8 font-bold" style={{ color: 'var(--sub-muted)' }}>لا توجد نتائج — استورد ملفات الجداول للبدء</td></tr>}
          </tbody>
        </table>
      </div>
      </>}

      {week && <WeekModal t={week} days={data.days} onClose={() => setWeek(null)} />}
      {add && <AddModal onClose={() => setAdd(false)} onAdded={load} />}
      {imp && <ImportModal onClose={() => setImp(false)} onDone={load} />}
    </SubLayout>
  );
}
