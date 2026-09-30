import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Users, FileUp, Trash2, Plus, X, GraduationCap } from 'lucide-react';
import GradesLayout from './GradesLayout';
import { gradesApi, errMsg, GRADES_LIST, SUBJECTS } from './gradesApi';

export default function GradesTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [editAssign, setEditAssign] = useState(null);
  const [addForm, setAddForm] = useState(null);
  const fileRef = useRef(null);

  const fetchTeachers = async () => {
    try {
      const res = await gradesApi.get('/teachers');
      setTeachers(res.data.teachers);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await gradesApi.post('/teachers/import', fd);
      toast.success(`تم الاستيراد — جديد ${res.data.added} · محدّث ${res.data.updated}`);
      fetchTeachers();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setImporting(false); }
  };

  const addTeacher = async (e) => {
    e.preventDefault();
    try {
      await gradesApi.post('/teachers', addForm);
      toast.success('تمت إضافة المعلم — كلمة المرور الافتراضية 123456');
      setAddForm(null);
      fetchTeachers();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const importFromSub = async () => {
    if (!confirm('استيراد المعلمين ومواده وصفوفهم وشعبهم من نظام حصص الاحتياط؟')) return;
    setImporting(true);
    try {
      const res = await gradesApi.post('/teachers/import-substitution');
      toast.success(`تم الاستيراد — جديد ${res.data.added} · محدّث ${res.data.updated}`);
      fetchTeachers();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setImporting(false); }
  };

  const deleteTeacher = async (id) => {
    if (!confirm('حذف هذا المعلم ودرجاته؟')) return;
    try {
      await gradesApi.delete(`/teachers/${id}`);
      toast.success('تم الحذف');
      fetchTeachers();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const saveAssignments = async () => {
    try {
      await gradesApi.put(`/teachers/${editAssign.id}`, { assignments: editAssign.assignments, employee_number: editAssign.employee_number || '', civil_number: editAssign.civil_number || '' });
      toast.success('تم الحفظ');
      setEditAssign(null);
      fetchTeachers();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <GradesLayout title="إدارة المعلمين" subtitle="استيراد بيانات المعلمين وتكليفهم بالصفوف والشعب والمواد"
      actions={
        <>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importFile} />
          <button onClick={() => setAddForm({ name: '', employee_number: '', civil_number: '' })} className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="grades-add-teacher">
            <Plus className="w-4 h-4" /> إضافة معلم
          </button>
          <button onClick={importFromSub} disabled={importing} className="sub-btn sub-btn-primary sub-btn-sm" data-testid="grades-import-sub">
            <Users className="w-4 h-4" /> استيراد من نظام الاحتياط
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="sub-btn sub-btn-primary sub-btn-sm" data-testid="grades-import-teachers">
            <FileUp className="w-4 h-4" /> {importing ? 'جارٍ الاستيراد...' : 'استيراد من Excel'}
          </button>
        </>
      }>
      {/* تنبيه صيغة الملف */}
      <div className="sub-card p-4 mb-5 sub-rise" style={{ background: 'var(--sub-amber-soft)', borderColor: 'var(--sub-amber-line)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--sub-amber-ink)' }}>
          صيغة ملف Excel: أعمدة (الاسم | الرقم الوظيفي | الرقم المدني) — كلمة المرور الافتراضية للمعلمين الجدد: 123456
        </p>
      </div>

      <div className="sub-card p-5 sub-rise">
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
          <table className="sub-table">
            <thead><tr><th>م</th><th>المعلم</th><th>الرقم الوظيفي</th><th>الرقم المدني</th><th>التكليفات</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {teachers.map((t, i) => (
                <tr key={t.id}>
                  <td>{i + 1}</td>
                  <td className="font-bold">{t.name}</td>
                  <td className="text-xs" style={{ color: 'var(--sub-muted)' }}>{t.employee_number || '—'}</td>
                  <td className="text-xs" style={{ color: 'var(--sub-muted)' }}>{t.civil_number || '—'}</td>
                  <td className="text-xs">
                    {(t.assignments || []).length === 0 ? <span style={{ color: 'var(--sub-muted)' }}>—</span> :
                      t.assignments.map((a, j) => (
                        <span key={j} className="sub-badge sub-badge-navy" style={{ marginLeft: 4 }}>{a.subject} {a.grade}/{a.section}</span>
                      ))}
                  </td>
                  <td>{t.is_active ? <span className="sub-badge sub-badge-green">نشط</span> : <span className="sub-badge sub-badge-red">معطّل</span>}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setEditAssign({ ...t, assignments: [...(t.assignments || [])] })} className="sub-btn sub-btn-ghost sub-btn-sm" title="التكليفات"><GraduationCap className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteTeacher(t.id)} className="sub-btn sub-btn-danger sub-btn-sm" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && !loading && (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--sub-muted)' }}>لا يوجد معلمون بعد — استورد ملف Excel</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={() => setAddForm(null)}>
          <form onSubmit={addTeacher} className="sub-card p-6 w-full max-w-md sub-rise space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-lg" style={{ color: 'var(--sub-navy-ink)' }}>إضافة معلم</h3>
            <input className="sub-input" placeholder="اسم المعلم" required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} data-testid="add-teacher-name" />
            <input className="sub-input" placeholder="الرقم الوظيفي" value={addForm.employee_number} onChange={(e) => setAddForm({ ...addForm, employee_number: e.target.value })} />
            <input className="sub-input" placeholder="الرقم المدني" value={addForm.civil_number} onChange={(e) => setAddForm({ ...addForm, civil_number: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="sub-btn sub-btn-ghost" onClick={() => setAddForm(null)}>إلغاء</button>
              <button type="submit" className="sub-btn sub-btn-primary" data-testid="add-teacher-save">حفظ</button>
            </div>
          </form>
        </div>
      )}

      {/* نافذة التكليفات */}
      {editAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={() => setEditAssign(null)}>
          <div className="sub-card p-6 w-full max-w-2xl sub-rise" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg" style={{ color: 'var(--sub-navy-ink)' }}>بيانات وتكليف: {editAssign.name}</h3>
              <button onClick={() => setEditAssign(null)} className="p-1.5 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex gap-2 mb-4">
              <input className="sub-input flex-1" placeholder="الرقم الوظيفي" value={editAssign.employee_number || ''} onChange={(e) => setEditAssign({ ...editAssign, employee_number: e.target.value })} data-testid="edit-emp" />
              <input className="sub-input flex-1" placeholder="الرقم المدني" value={editAssign.civil_number || ''} onChange={(e) => setEditAssign({ ...editAssign, civil_number: e.target.value })} data-testid="edit-civil" />
            </div>
            <div className="space-y-3 mb-4">
              {editAssign.assignments.map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className="sub-input flex-1" value={a.subject} onChange={(e) => { const arr = [...editAssign.assignments]; arr[i].subject = e.target.value; setEditAssign({ ...editAssign, assignments: arr }); }}>
                    <option value="">المادة</option>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="sub-input w-32" value={a.grade} onChange={(e) => { const arr = [...editAssign.assignments]; arr[i].grade = e.target.value; setEditAssign({ ...editAssign, assignments: arr }); }}>
                    <option value="">الصف</option>
                    {GRADES_LIST.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input className="sub-input w-20" placeholder="الشعبة" value={a.section} onChange={(e) => { const arr = [...editAssign.assignments]; arr[i].section = e.target.value; setEditAssign({ ...editAssign, assignments: arr }); }} />
                  <button onClick={() => setEditAssign({ ...editAssign, assignments: editAssign.assignments.filter((_, j) => j !== i) })} className="sub-btn sub-btn-danger sub-btn-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>

            <button onClick={() => setEditAssign({ ...editAssign, assignments: [...editAssign.assignments, { subject: '', grade: '', section: '' }] })} className="sub-btn sub-btn-ghost sub-btn-sm mb-4">
              <Plus className="w-4 h-4" /> إضافة تكليف
            </button>

            <div className="flex justify-end gap-2">
              <button className="sub-btn sub-btn-ghost" onClick={() => setEditAssign(null)}>إلغاء</button>
              <button className="sub-btn sub-btn-primary" onClick={saveAssignments}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </GradesLayout>
  );
}
