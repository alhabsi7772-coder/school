import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ClipboardList, Plus, Trash2, Users, FileUp, X, AlertTriangle, ArrowLeft } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';
import { fileToBase64 } from '../../utils/gradebook';

const GRADE_OPTIONS = ['الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
const GRADES_56 = ['الخامس', 'السادس'];
const templateOfGrade = (g) => (GRADES_56.includes(g) ? '5-6' : '7-10');

export default function Gradebooks() {
  const navigate = useNavigate();
  const [gradebooks, setGradebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ grade: 'الخامس', section: '', students: '' });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const res = await axios.get(`${API}/gradebooks`, getAuthHeaders());
      setGradebooks(res.data);
    } catch { toast.error('تعذر تحميل سجلات الدرجات'); }
    finally { setLoading(false); }
  };

  const createGradebook = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const students = form.students.split('\n').map(s => s.trim()).filter(Boolean);
      const res = await axios.post(`${API}/gradebooks`, { grade: form.grade, section: form.section, students, template: templateOfGrade(form.grade) }, getAuthHeaders());
      toast.success('تم إنشاء سجل الدرجات');
      navigate(`/teacher/gradebooks/${res.data.id}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر الإنشاء'); }
    finally { setSaving(false); }
  };

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await axios.post(`${API}/gradebooks/import`, { data_base64: b64 }, getAuthHeaders());
      toast.success(`تم الاستيراد: ${res.data.total_in_file} طالب`);
      navigate(`/teacher/gradebooks/${res.data.gradebook_id}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر استيراد الملف'); }
    finally { setImporting(false); }
  };

  const deleteGradebook = async () => {
    try {
      await axios.delete(`${API}/gradebooks/${deleteTarget.id}`, getAuthHeaders());
      toast.success('تم حذف السجل');
      setDeleteTarget(null);
      fetchAll();
    } catch { toast.error('تعذر الحذف'); }
  };

  return (
    <TeacherLayout title="سجل الدرجات">
      {/* Header */}
      <div className="quiz-card rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,110,64,0.12)', border: '1px solid rgba(255,110,64,0.25)' }}>
            <ClipboardList className="w-6 h-6" style={{ color: '#FF8A65' }} />
          </div>
          <div>
            <h2 className="font-bold text-white">سجلات الدرجات — الصفوف (5-10)</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              مطابق للاستمارات الرسمية: نموذج (5-6) ونموذج (7-10) — يُحدد النموذج تلقائياً حسب الصف
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={importFile} data-testid="import-gradebook-file" />
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            data-testid="import-gradebook-btn"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}>
            <FileUp className="w-4 h-4" />
            {importing ? 'جارٍ الاستيراد...' : 'استيراد من Excel'}
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2" data-testid="create-gradebook-btn">
            <Plus className="w-4 h-4" />
            <span>سجل جديد</span>
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(var(--theme-accent-rgb),0.2)', borderTopColor: 'var(--theme-accent)' }} />
        </div>
      ) : gradebooks.length === 0 ? (
        <div className="quiz-card rounded-2xl p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-hint)' }} />
          <p className="font-bold text-white mb-1">لا توجد سجلات بعد</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            أنشئ سجلاً جديداً لكل صف وشعبة، أو استورد ملف Excel الرسمي مباشرة
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="gradebooks-grid">
          {gradebooks.map(gb => (
            <div key={gb.id} className="quiz-card rounded-2xl p-5 cursor-pointer group"
              data-testid={`gradebook-card-${gb.grade}-${gb.section}`}
              onClick={() => navigate(`/teacher/gradebooks/${gb.id}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg"
                    style={{ background: 'rgba(var(--theme-accent-rgb),0.12)', border: '1px solid rgba(var(--theme-accent-rgb),0.25)', color: 'var(--theme-accent)' }}>
                    {gb.section}
                  </div>
                  <div>
                    <p className="font-bold text-white">الصف {gb.grade}</p>
                    <p className="text-xs" style={{ color: 'var(--text-hint)' }}>الشعبة {gb.section}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold self-start"
                    data-testid={`gb-template-badge-${gb.grade}-${gb.section}`}
                    style={{ background: 'rgba(var(--theme-accent-rgb),0.1)', color: 'var(--theme-accent)', border: '1px solid rgba(var(--theme-accent-rgb),0.2)' }}>
                    نموذج {gb.template || '5-6'}
                  </span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(gb); }}
                  data-testid={`delete-gradebook-${gb.grade}-${gb.section}`}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#F87171' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Users className="w-4 h-4" />
                  {gb.student_count} طالب
                </span>
                <span className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--theme-accent)' }}>
                  فتح السجل
                  <ArrowLeft className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-lg">سجل درجات جديد</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={createGradebook} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>الصف</label>
                  <select className="input-field" value={form.grade}
                    onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                    data-testid="gradebook-grade-select">
                    {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>الشعبة</label>
                  <input className="input-field" placeholder="مثال: 3" required value={form.section}
                    onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                    data-testid="gradebook-section-input" />
                </div>
              </div>
              <div className="px-3 py-2 rounded-xl text-xs font-bold" data-testid="gradebook-template-hint"
                style={{ background: 'rgba(var(--theme-accent-rgb),0.07)', color: 'var(--theme-accent)', border: '1px solid rgba(var(--theme-accent-rgb),0.18)' }}>
                {templateOfGrade(form.grade) === '7-10'
                  ? 'النموذج: الصفوف (7-10) — الحوار 20 + الأنشطة العملية 40 + الاختبار القصير 20 + المشروع 20'
                  : 'النموذج: الصفوف (5-6) — الحوار 20 + الأسئلة القصيرة 20 + الأنشطة العملية 40 + المشروع 20'}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  أسماء الطلاب (اسم في كل سطر — يمكن إضافتهم لاحقاً)
                </label>
                <textarea className="input-field" rows={6} placeholder={'أحمد بن سالم الحبسي\nمحمد بن خالد العامري\n...'}
                  value={form.students}
                  onChange={e => setForm(f => ({ ...f, students: e.target.value }))}
                  data-testid="gradebook-students-textarea" />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full" data-testid="gradebook-create-submit">
                {saving ? 'جارٍ الإنشاء...' : 'إنشاء السجل'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F87171' }} />
              <p className="text-sm font-bold text-white">
                حذف سجل الصف {deleteTarget.grade} / {deleteTarget.section} نهائياً مع جميع الدرجات؟
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'white' }}>إلغاء</button>
              <button onClick={deleteGradebook} data-testid="confirm-delete-gradebook"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.85)', color: 'white' }}>
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
