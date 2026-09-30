import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { BookOpen, FileUp, Trash2, Search, Plus } from 'lucide-react';
import GradesLayout from './GradesLayout';
import { gradesApi, errMsg, GRADES_LIST } from './gradesApi';

export default function GradesStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState({ grade: '', section: '', q: '' });
  const [addForm, setAddForm] = useState(null);
  const fileRef = useRef(null);

  const fetchStudents = async () => {
    try {
      const res = await gradesApi.get('/students', { params: { grade: filter.grade || undefined, section: filter.section || undefined } });
      setStudents(res.data.students);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, [filter.grade, filter.section]);

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await gradesApi.post('/students/import', fd);
      toast.success(`تم الاستيراد — جديد ${res.data.added} · محدّث ${res.data.updated}`);
      fetchStudents();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setImporting(false); }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    try {
      await gradesApi.post('/students', addForm);
      toast.success('تمت إضافة الطالب');
      setAddForm(null);
      fetchStudents();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const deleteStudent = async (id) => {
    if (!confirm('حذف هذا الطالب ودرجاته؟')) return;
    try {
      await gradesApi.delete(`/students/${id}`);
      toast.success('تم الحذف');
      fetchStudents();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const deleteAll = async () => {
    if (!confirm('حذف جميع الطلاب والدرجات؟ لا يمكن التراجع.')) return;
    try {
      await gradesApi.delete('/students/all');
      toast.success('تم حذف جميع الطلاب');
      fetchStudents();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const filtered = students.filter(s => !filter.q || s.name?.includes(filter.q) || s.civil_number?.includes(filter.q));

  return (
    <GradesLayout title="إدارة الطلاب" subtitle="استيراد بيانات الطلاب من Excel ومتابعتهم"
      actions={
        <>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importFile} />
          <button onClick={() => setAddForm({ name: '', grade: '', section: '', civil_number: '' })} className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="grades-add-student">
            <Plus className="w-4 h-4" /> إضافة طالب
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="sub-btn sub-btn-primary sub-btn-sm" data-testid="grades-import-students">
            <FileUp className="w-4 h-4" /> {importing ? 'جارٍ الاستيراد...' : 'استيراد من Excel'}
          </button>
          <button onClick={deleteAll} className="sub-btn sub-btn-danger sub-btn-sm"><Trash2 className="w-4 h-4" /> حذف الكل</button>
        </>
      }>
      <div className="sub-card p-4 mb-5 sub-rise" style={{ background: 'var(--sub-amber-soft)', borderColor: 'var(--sub-amber-line)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--sub-amber-ink)' }}>
          صيغة ملف Excel: أعمدة (الاسم | الصف | الشعبة | الرقم المدني)
        </p>
      </div>

      <div className="sub-card p-4 mb-5 sub-rise flex flex-wrap gap-3 items-center">
        <select className="sub-input w-auto" value={filter.grade} onChange={(e) => setFilter({ ...filter, grade: e.target.value })}>
          <option value="">كل الصفوف</option>
          {GRADES_LIST.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input className="sub-input w-28" placeholder="الشعبة" value={filter.section} onChange={(e) => setFilter({ ...filter, section: e.target.value })} />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sub-muted)' }} />
          <input className="sub-input pr-10" placeholder="بحث بالاسم أو الرقم المدني..." value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
        </div>
        <span className="text-sm font-bold" style={{ color: 'var(--sub-muted)' }}>{filtered.length} طالب</span>
      </div>

      <div className="sub-card p-5 sub-rise">
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
          <table className="sub-table">
            <thead><tr><th>م</th><th>الاسم</th><th>الصف</th><th>الشعبة</th><th>الرقم المدني</th><th></th></tr></thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td className="font-bold">{s.name}</td>
                  <td>{s.grade}</td>
                  <td>{s.section}</td>
                  <td className="text-xs" style={{ color: 'var(--sub-muted)' }}>{s.civil_number || '—'}</td>
                  <td><button onClick={() => deleteStudent(s.id)} className="sub-btn sub-btn-danger sub-btn-sm"><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--sub-muted)' }}>لا يوجد طلاب — استورد ملف Excel</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {addForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={() => setAddForm(null)}>
          <form onSubmit={addStudent} className="sub-card p-6 w-full max-w-md sub-rise space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-lg" style={{ color: 'var(--sub-navy-ink)' }}>إضافة طالب</h3>
            <input className="sub-input" placeholder="اسم الطالب" required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} data-testid="add-student-name" />
            <div className="flex gap-2">
              <select className="sub-input flex-1" required value={addForm.grade} onChange={(e) => setAddForm({ ...addForm, grade: e.target.value })}>
                <option value="">الصف</option>
                {GRADES_LIST.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input className="sub-input w-24" placeholder="الشعبة" required value={addForm.section} onChange={(e) => setAddForm({ ...addForm, section: e.target.value })} />
            </div>
            <input className="sub-input" placeholder="الرقم المدني" value={addForm.civil_number} onChange={(e) => setAddForm({ ...addForm, civil_number: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="sub-btn sub-btn-ghost" onClick={() => setAddForm(null)}>إلغاء</button>
              <button type="submit" className="sub-btn sub-btn-primary" data-testid="add-student-save">حفظ</button>
            </div>
          </form>
        </div>
      )}
    </GradesLayout>
  );
}
