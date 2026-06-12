import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Users, UserPlus, KeyRound, Trash2, Power, ShieldCheck,
  FileText, FolderOpen, Eye, EyeOff, X, AlertTriangle, Pencil, School
} from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="glass-modal rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            data-testid="close-modal-btn">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TeacherCard({ t, onEdit, onToggleActive, onDelete }) {
  const isAdmin = t.role === 'admin';
  const active = t.is_active !== false;
  return (
    <div className="quiz-card rounded-2xl p-5" data-testid={`teacher-card-${t.username}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-black"
          style={{
            background: isAdmin
              ? 'linear-gradient(135deg, rgba(255,145,0,0.18), rgba(255,145,0,0.08))'
              : 'linear-gradient(135deg, rgba(var(--theme-accent-rgb),0.18), rgba(var(--theme-accent-rgb),0.08))',
            border: isAdmin ? '1px solid rgba(255,145,0,0.3)' : '1px solid rgba(var(--theme-accent-rgb),0.25)',
            color: isAdmin ? '#FFB74D' : 'var(--theme-accent)',
          }}>
          {(t.teacher_name || '?').charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white truncate">{t.teacher_name}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                style={{ background: 'rgba(255,145,0,0.12)', color: '#FFB74D', border: '1px solid rgba(255,145,0,0.25)' }}>
                <ShieldCheck className="w-3 h-3" /> مدير
              </span>
            )}
            {!active && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}
                data-testid={`inactive-badge-${t.username}`}>
                معطّل
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" dir="ltr" style={{ color: 'var(--text-hint)', textAlign: 'right', fontFamily: 'monospace' }}>
            @{t.username}
          </p>
          {t.school_name && (
            <p className="text-[11px] mt-1 flex items-center gap-1 truncate" style={{ color: 'var(--text-muted)' }}
              data-testid={`teacher-school-${t.username}`}>
              <School className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{t.school_name}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <FileText className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
          <div>
            <p className="text-sm font-bold text-white">{t.quiz_count}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-hint)' }}>اختبار</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <FolderOpen className="w-4 h-4" style={{ color: '#D500F9' }} />
          <div>
            <p className="text-sm font-bold text-white">{t.project_count}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-hint)' }}>مشروع</p>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="flex gap-2">
          <button onClick={() => onEdit(t)} data-testid={`edit-teacher-${t.username}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(var(--theme-accent-rgb),0.1)', color: 'var(--theme-accent)', border: '1px solid rgba(var(--theme-accent-rgb),0.2)' }}>
            <Pencil className="w-3.5 h-3.5" /> تعديل
          </button>
          <button onClick={() => onToggleActive(t)} data-testid={`toggle-active-${t.username}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
            style={active
              ? { background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }
              : { background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>
            <Power className="w-3.5 h-3.5" /> {active ? 'تعطيل' : 'تفعيل'}
          </button>
          <button onClick={() => onDelete(t)} data-testid={`delete-teacher-${t.username}`}
            className="flex items-center justify-center px-3 py-2 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {type: 'create'|'edit'|'delete', teacher}
  const [form, setForm] = useState({ username: '', password: '', teacher_name: '', school_name: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${API}/admin/teachers`, getAuthHeaders());
      setTeachers(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'تعذر تحميل قائمة المعلمين');
    } finally { setLoading(false); }
  };

  const openCreate = () => { setForm({ username: '', password: '', teacher_name: '', school_name: '' }); setShowPwd(false); setModal({ type: 'create' }); };
  const openEdit = (t) => { setForm({ username: t.username, password: '', teacher_name: t.teacher_name, school_name: t.school_name || '' }); setShowPwd(false); setModal({ type: 'edit', teacher: t }); };

  const createTeacher = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API}/admin/teachers`, form, getAuthHeaders());
      toast.success(`تم إنشاء حساب "${form.teacher_name}" بنجاح`);
      setModal(null);
      fetchTeachers();
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر إنشاء الحساب'); }
    finally { setSaving(false); }
  };

  const updateTeacher = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { teacher_name: form.teacher_name, school_name: form.school_name };
      if (form.password) payload.new_password = form.password;
      await axios.put(`${API}/admin/teachers/${modal.teacher.id}`, payload, getAuthHeaders());
      toast.success('تم حفظ التعديلات');
      setModal(null);
      fetchTeachers();
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر الحفظ'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (t) => {
    try {
      await axios.put(`${API}/admin/teachers/${t.id}`, { is_active: !(t.is_active !== false) }, getAuthHeaders());
      toast.success(t.is_active !== false ? `تم تعطيل حساب ${t.teacher_name}` : `تم تفعيل حساب ${t.teacher_name}`);
      fetchTeachers();
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر التحديث'); }
  };

  const deleteTeacher = async () => {
    setSaving(true);
    try {
      await axios.delete(`${API}/admin/teachers/${modal.teacher.id}`, getAuthHeaders());
      toast.success('تم حذف المعلم وجميع بياناته');
      setModal(null);
      fetchTeachers();
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر الحذف'); }
    finally { setSaving(false); }
  };

  return (
    <TeacherLayout title="إدارة المعلمين">
      <div className="max-w-5xl">
        {/* Header */}
        <div className="quiz-card rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,145,0,0.12)', border: '1px solid rgba(255,145,0,0.25)' }}>
              <Users className="w-6 h-6" style={{ color: '#FFB74D' }} />
            </div>
            <div>
              <h2 className="font-bold text-white">حسابات المعلمين</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {teachers.length} حساب — كل معلم يرى اختباراته ومشاريعه الخاصة فقط
              </p>
            </div>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center justify-center gap-2"
            data-testid="add-teacher-btn">
            <UserPlus className="w-4 h-4" />
            <span>إضافة معلم جديد</span>
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(var(--theme-accent-rgb),0.2)', borderTopColor: 'var(--theme-accent)' }} />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4" data-testid="teachers-grid">
            {teachers.map(t => (
              <TeacherCard key={t.id} t={t}
                onEdit={openEdit}
                onToggleActive={toggleActive}
                onDelete={(tc) => setModal({ type: 'delete', teacher: tc })} />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {modal?.type === 'create' && (
          <Modal title="إضافة معلم جديد" onClose={() => setModal(null)}>
            <form onSubmit={createTeacher} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>اسم المعلم</label>
                <input className="input-field" placeholder="مثال: أ. محمد السالمي" required
                  value={form.teacher_name} onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))}
                  data-testid="new-teacher-name-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1.5"><School className="w-3.5 h-3.5" /> اسم المدرسة</span>
                </label>
                <input className="input-field" placeholder="مثال: مدرسة الخيرات للتعليم الأساسي"
                  value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
                  data-testid="new-teacher-school-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>اسم المستخدم (بالإنجليزية)</label>
                <input className="input-field" placeholder="example: mohammed" required dir="ltr" style={{ textAlign: 'left' }}
                  value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  data-testid="new-teacher-username-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>كلمة المرور (6 أحرف على الأقل)</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" required minLength={6}
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    data-testid="new-teacher-password-input" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2"
                data-testid="create-teacher-submit-btn">
                <UserPlus className="w-4 h-4" />
                {saving ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
              </button>
            </form>
          </Modal>
        )}

        {/* Edit Modal */}
        {modal?.type === 'edit' && (
          <Modal title={`تعديل: ${modal.teacher.teacher_name}`} onClose={() => setModal(null)}>
            <form onSubmit={updateTeacher} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>اسم المعلم</label>
                <input className="input-field" required
                  value={form.teacher_name} onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))}
                  data-testid="edit-teacher-name-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1.5"><School className="w-3.5 h-3.5" /> اسم المدرسة</span>
                </label>
                <input className="input-field" placeholder="مثال: مدرسة الخيرات للتعليم الأساسي"
                  value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
                  data-testid="edit-teacher-school-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> كلمة مرور جديدة (اتركها فارغة لعدم التغيير)</span>
                </label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" minLength={6}
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    data-testid="edit-teacher-password-input" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full"
                data-testid="edit-teacher-submit-btn">
                {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
              </button>
            </form>
          </Modal>
        )}

        {/* Delete Confirm Modal */}
        {modal?.type === 'delete' && (
          <Modal title="تأكيد الحذف" onClose={() => setModal(null)}>
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F87171' }} />
              <div>
                <p className="text-sm font-bold text-white mb-1">
                  هل أنت متأكد من حذف "{modal.teacher.teacher_name}"؟
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  سيتم حذف الحساب نهائياً مع جميع اختباراته ({modal.teacher.quiz_count}) ومشاريعه ({modal.teacher.project_count}) ونتائج طلابه. لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'white' }}
                data-testid="cancel-delete-btn">
                إلغاء
              </button>
              <button onClick={deleteTeacher} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.85)', color: 'white' }}
                data-testid="confirm-delete-btn">
                {saving ? 'جارٍ الحذف...' : 'نعم، احذف نهائياً'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </TeacherLayout>
  );
}
