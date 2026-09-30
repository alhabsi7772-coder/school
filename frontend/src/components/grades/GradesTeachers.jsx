import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Users, FileUp, Trash2, Plus, Pencil } from 'lucide-react';
import GradesLayout from './GradesLayout';
import ImportMapModal from './ImportMapModal';
import TeacherEditModal from './TeacherEditModal';
import TeacherMatchModal from './TeacherMatchModal';
import { gradesApi, errMsg, classLabel } from './gradesApi';

const TEACHER_FIELDS = [
  { key: 'name', label: 'اسم المعلم', required: true },
  { key: 'emp', label: 'الرقم الوظيفي' },
  { key: 'civil', label: 'الرقم المدني' },
];

export default function GradesTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [matchData, setMatchData] = useState(null);
  const fileRef = useRef(null);

  const fetchTeachers = async () => {
    try {
      const res = await gradesApi.get('/teachers');
      setTeachers(res.data.teachers);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await gradesApi.post('/teachers/import/preview', fd);
      setPendingFile(file);
      setPreview(res.data);
      const s = res.data.suggested || {};
      setMapping({ name: s.name ?? '', emp: s.emp ?? '', civil: s.civil ?? '' });
    } catch (e) { toast.error(errMsg(e)); }
    finally { setImporting(false); }
  };

  const cancelImport = () => { setPendingFile(null); setPreview(null); setMapping({}); };

  const confirmImport = async () => {
    if (!pendingFile) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', pendingFile);
      fd.append('name_col', mapping.name ?? '');
      fd.append('emp_col', mapping.emp ?? '');
      fd.append('civil_col', mapping.civil ?? '');
      const res = await gradesApi.post('/teachers/import/match', fd);
      cancelImport();
      setMatchData(res.data);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setImporting(false); }
  };

  const applyMatch = async (rows) => {
    setImporting(true);
    try {
      const res = await gradesApi.post('/teachers/import/apply', { rows });
      toast.success(`تم نقل الأرقام إلى ${res.data.updated} معلم${res.data.skipped ? ` · تم تجاهل ${res.data.skipped}` : ''}`);
      setMatchData(null);
      fetchTeachers();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setImporting(false); }
  };

  const deleteAll = async () => {
    if (!confirm(`حذف جميع المعلمين (${teachers.length}) مع درجاتهم؟ لا يمكن التراجع.`)) return;
    try {
      const res = await gradesApi.delete('/teachers/all');
      toast.success(`تم حذف ${res.data.deleted} معلم`);
      fetchTeachers();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const saveTeacher = async (form) => {
    try {
      if (editing.id) {
        await gradesApi.put(`/teachers/${editing.id}`, form);
        toast.success('تم حفظ بيانات المعلم');
      } else {
        await gradesApi.post('/teachers', form);
        toast.success('تمت إضافة المعلم — كلمة المرور الافتراضية 123456');
      }
      setEditing(null);
      fetchTeachers();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const importFromSub = async () => {
    if (!confirm('استيراد المعلمين ومادتهم وصفوفهم من نظام حصص الاحتياط؟ (تتم المطابقة بالاسم بدون تكرار)')) return;
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

  return (
    <GradesLayout title="إدارة المعلمين" subtitle="بيانات المعلمين ومادتهم وصفوفهم"
      actions={
        <>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={pickFile} />
          <button onClick={() => setEditing({})} className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="grades-add-teacher">
            <Plus className="w-4 h-4" /> إضافة معلم
          </button>
          <button onClick={importFromSub} disabled={importing} className="sub-btn sub-btn-primary sub-btn-sm" data-testid="grades-import-sub">
            <Users className="w-4 h-4" /> استيراد من نظام الاحتياط
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="sub-btn sub-btn-primary sub-btn-sm" data-testid="grades-import-teachers">
            <FileUp className="w-4 h-4" /> {importing ? 'جارٍ الاستيراد...' : 'استيراد من Excel'}
          </button>
          {teachers.length > 0 && (
            <button onClick={deleteAll} disabled={importing} className="sub-btn sub-btn-danger sub-btn-sm" data-testid="grades-delete-all-teachers">
              <Trash2 className="w-4 h-4" /> حذف جميع المعلمين
            </button>
          )}
        </>
      }>
      {/* تنبيه صيغة الملف */}
      <div className="sub-card p-4 mb-5 sub-rise" style={{ background: 'var(--sub-amber-soft)', borderColor: 'var(--sub-amber-line)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--sub-amber-ink)' }}>
          الخطوات: ١) استيراد من نظام الاحتياط (الأسماء والمادة والصفوف) ← ٢) استيراد من Excel: تظهر نافذة مطابقة الأسماء تلقائياً ويدوياً، ويُنقل الرقم الوظيفي والرقم المدني فقط دون تكرار أي معلم. كلمة المرور الافتراضية للمعلمين الجدد: 123456
        </p>
      </div>

      <div className="sub-card p-5 sub-rise">
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
          <table className="sub-table">
            <thead><tr><th>م</th><th>المعلم</th><th>المادة</th><th>الصفوف</th><th>الرقم الوظيفي</th><th>الرقم المدني</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {teachers.map((t, i) => (
                <tr key={t.id} data-testid={`teacher-row-${t.id}`}>
                  <td>{i + 1}</td>
                  <td className="font-bold">{t.name}</td>
                  <td className="text-xs font-semibold" data-testid="teacher-subject">{t.subject || <span style={{ color: 'var(--sub-muted)' }}>—</span>}</td>
                  <td className="text-xs" data-testid="teacher-classes">
                    {(t.classes || []).length === 0 ? <span style={{ color: 'var(--sub-muted)' }}>—</span> :
                      <div className="flex flex-wrap gap-1">{t.classes.map((c) => <span key={classLabel(c)} className="sub-badge sub-badge-navy">{classLabel(c)}</span>)}</div>}
                  </td>
                  <td className="text-xs" style={{ color: 'var(--sub-muted)' }}>{t.employee_number || '—'}</td>
                  <td className="text-xs" style={{ color: 'var(--sub-muted)' }}>{t.civil_number || '—'}</td>
                  <td>{t.is_active ? <span className="sub-badge sub-badge-green">نشط</span> : <span className="sub-badge sub-badge-red">معطّل</span>}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(t)} className="sub-btn sub-btn-ghost sub-btn-sm" title="تعديل" data-testid={`teacher-edit-${t.id}`}><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteTeacher(t.id)} className="sub-btn sub-btn-danger sub-btn-sm" title="حذف" data-testid={`teacher-delete-${t.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && !loading && (
                <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--sub-muted)' }}>لا يوجد معلمون بعد — استورد ملف Excel</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ImportMapModal
        preview={preview}
        fields={TEACHER_FIELDS}
        mapping={mapping}
        setMapping={setMapping}
        onConfirm={confirmImport}
        onCancel={cancelImport}
        confirming={importing}
      />

      {matchData && (
        <TeacherMatchModal data={matchData} onClose={() => setMatchData(null)} onApply={applyMatch} applying={importing} />
      )}

      {editing && (
        <TeacherEditModal key={editing.id || 'new'} teacher={editing} title={editing.id ? `تعديل: ${editing.name}` : 'إضافة معلم'}
          onClose={() => setEditing(null)} onSave={saveTeacher} />
      )}
    </GradesLayout>
  );
}
