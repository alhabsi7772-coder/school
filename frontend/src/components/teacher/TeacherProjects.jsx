import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { FolderOpen, Plus, Trash2, Users, Copy, Calendar, X } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';

export default function TeacherProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', deadline: '' });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`, getAuthHeaders());
      setProjects(res.data);
    } catch { toast.error('تعذر تحميل المشاريع'); }
    finally { setLoading(false); }
  };

  const createProject = async () => {
    if (!form.title.trim()) return toast.error('أدخل عنوان المشروع');
    setCreating(true);
    try {
      await axios.post(`${API}/projects`, form, getAuthHeaders());
      toast.success('تم إنشاء المشروع');
      setShowCreate(false);
      setForm({ title: '', description: '', deadline: '' });
      fetchProjects();
    } catch { toast.error('تعذر إنشاء المشروع'); }
    finally { setCreating(false); }
  };

  const deleteProject = async (id, title) => {
    if (!window.confirm(`حذف مشروع "${title}"؟`)) return;
    try {
      await axios.delete(`${API}/projects/${id}`, getAuthHeaders());
      toast.success('تم الحذف');
      fetchProjects();
    } catch { toast.error('تعذر الحذف'); }
  };

  const copyLink = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/project/${code}`);
    toast.success('تم نسخ الرابط');
  };

  const formatBytes = (n) => n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;

  return (
    <TeacherLayout title="المشاريع">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">أرسل رابط المشروع للطلاب ليرفعوا ملفاتهم</p>
        <button onClick={() => setShowCreate(true)} data-testid="create-project-btn"
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          مشروع جديد
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="glass-modal rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-lg">مشروع جديد</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">عنوان المشروع *</label>
                <input className="input-field" placeholder="مثال: مشروع تصميم الويب" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">الوصف (اختياري)</label>
                <textarea className="input-field resize-none" rows={3} placeholder="تعليمات للطلاب..."
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">آخر موعد للتسليم (اختياري)</label>
                <input type="date" className="input-field" value={form.deadline}
                  onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              <button onClick={createProject} disabled={creating} className="btn-primary w-full">
                {creating ? 'جارٍ الإنشاء...' : 'إنشاء المشروع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects list */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">جارٍ التحميل...</div>
      ) : projects.length === 0 ? (
        <div className="quiz-card p-16 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا يوجد مشاريع بعد</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">إنشاء أول مشروع</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(p => (
            <div key={p.id} className="quiz-card p-5 hover:border-violet-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-base mb-1">{p.title}</h3>
                  {p.description && <p className="text-sm text-slate-500 mb-2 line-clamp-1">{p.description}</p>}
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {p.submission_count || 0} تسليم
                    </span>
                    {p.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        آخر موعد: {new Date(p.deadline).toLocaleDateString('ar-KW')}
                      </span>
                    )}
                    <span className="font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg">{p.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => copyLink(p.code)} data-testid={`copy-project-link-${p.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl text-sm font-medium hover:bg-teal-100 transition-colors">
                    <Copy className="w-4 h-4" />
                    نسخ الرابط
                  </button>
                  <button onClick={() => navigate(`/teacher/projects/${p.id}/submissions`)}
                    data-testid={`view-submissions-${p.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-100 transition-colors">
                    <FolderOpen className="w-4 h-4" />
                    التسليمات ({p.submission_count || 0})
                  </button>
                  <button onClick={() => deleteProject(p.id, p.title)} data-testid={`delete-project-${p.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
