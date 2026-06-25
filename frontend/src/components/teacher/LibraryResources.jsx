import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Library, Upload, Trash2, Copy, Download, Eye, Users, Edit3, X,
  FileText, Music, Image as ImageIcon, FileSpreadsheet, FilePlus, Film, RefreshCw, Video, ChevronLeft
} from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';

const GRADES_ALL = ['الخامس', 'السادس', 'السابع', 'الثامن'];

const guessIcon = (ct = '', name = '') => {
  const n = (name || '').toLowerCase();
  if (ct.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(n)) return Music;
  if (ct.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(n)) return ImageIcon;
  if (ct.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/.test(n)) return Film;
  if (/\.(xlsx?|csv)$/.test(n)) return FileSpreadsheet;
  return FileText;
};

const fmtBytes = (n) => !n ? '—' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;

export default function LibraryResources() {
  const [info, setInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewers, setViewers] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', grades: [], file: null });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [a, b] = await Promise.all([
        axios.get(`${API}/library/me`, getAuthHeaders()),
        axios.get(`${API}/resources`, getAuthHeaders()),
      ]);
      setInfo(a.data); setItems(b.data);
    } catch { toast.error('تعذر تحميل المكتبة'); }
    finally { setLoading(false); }
  };

  const regenerate = async () => {
    if (!window.confirm('سيتم توليد رمز جديد وإبطال الرمز الحالي. متابعة؟')) return;
    try {
      const r = await axios.post(`${API}/library/regenerate`, { kind: 'library' }, getAuthHeaders());
      setInfo(p => ({ ...p, library_code: r.data.code }));
      toast.success('تم توليد رمز جديد');
    } catch { toast.error('فشل توليد الرمز'); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/library/${info.library_code}`);
    toast.success('تم نسخ رابط المكتبة');
  };

  const onSelectFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 30 * 1024 * 1024) {
      toast.error('الحجم يتجاوز 30 ميجابايت');
      e.target.value = '';
      return;
    }
    setForm(p => ({ ...p, file: f, title: p.title || f.name.replace(/\.[^.]+$/, '') }));
  };

  const upload = async () => {
    if (!form.file) return toast.error('اختر ملفاً');
    if (!form.title.trim()) return toast.error('أدخل عنواناً');
    setUploading(true);
    setProgress(0);
    const fd = new FormData();
    fd.append('file', form.file);
    fd.append('title', form.title.trim());
    fd.append('description', form.description.trim());
    fd.append('grades', form.grades.join(','));
    fd.append('is_active', 'true');
    try {
      await axios.post(`${API}/resources/upload`, fd, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
      });
      toast.success('تم رفع المورد');
      setShowUpload(false);
      setForm({ title: '', description: '', grades: [], file: null });
      if (fileInput.current) fileInput.current.value = '';
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الرفع');
    } finally { setUploading(false); setProgress(0); }
  };

  const toggleActive = async (r) => {
    try {
      await axios.put(`${API}/resources/${r.id}`, { is_active: !r.is_active }, getAuthHeaders());
      load();
    } catch { toast.error('فشل التحديث'); }
  };

  const saveEdit = async () => {
    try {
      await axios.put(`${API}/resources/${editing.id}`, {
        title: editing.title, description: editing.description, grades: editing.grades,
      }, getAuthHeaders());
      toast.success('تم الحفظ');
      setEditing(null); load();
    } catch { toast.error('فشل الحفظ'); }
  };

  const remove = async (r) => {
    if (!window.confirm(`حذف "${r.title}"؟`)) return;
    try {
      await axios.delete(`${API}/resources/${r.id}`, getAuthHeaders());
      toast.success('تم الحذف'); load();
    } catch { toast.error('فشل الحذف'); }
  };

  const showDownloads = async (r) => {
    try {
      const res = await axios.get(`${API}/resources/${r.id}/downloads`, getAuthHeaders());
      setViewers({ resource: r, rows: res.data });
    } catch { toast.error('تعذر الجلب'); }
  };

  return (
    <TeacherLayout title="مكتبة الموارد">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button className="px-4 py-2 rounded-xl font-bold text-sm"
          style={{ background: 'rgba(0,229,255,0.12)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.3)' }}>
          <Library className="w-4 h-4 inline ml-1.5" />الموارد
        </button>
        <Link to="/teacher/library/videos"
          className="px-4 py-2 rounded-xl font-bold text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Video className="w-4 h-4 inline ml-1.5" />الفيديوهات
        </Link>
      </div>

      {/* Library Code Card */}
      {info && (
        <div className="rounded-2xl p-5 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.10), rgba(213,0,249,0.06))', border: '1px solid rgba(0,229,255,0.2)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>رمز مكتبتك</p>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-black tracking-widest" style={{ color: '#00E5FF', letterSpacing: '0.2em' }}>{info.library_code}</code>
                <button onClick={() => { navigator.clipboard.writeText(info.library_code); toast.success('تم نسخ الرمز'); }}
                  className="p-1.5 rounded-lg hover:bg-white/5"><Copy className="w-4 h-4 text-cyan-400" /></button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-hint)' }}>
                شارك الرابط:
                <span dir="ltr" className="text-cyan-400 mx-1 break-all">{window.location.origin}/library/{info.library_code}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyLink} className="btn-ghost flex items-center gap-1.5"><Copy className="w-4 h-4" />نسخ الرابط</button>
              <button onClick={regenerate} className="btn-ghost flex items-center gap-1.5"><RefreshCw className="w-4 h-4" />رمز جديد</button>
              <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-1.5"><Upload className="w-4 h-4" />رفع مورد</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-slate-500 py-12">جارٍ التحميل...</p>
      ) : items.length === 0 ? (
        <div className="glass-card text-center py-16">
          <Library className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 mb-4">لا يوجد موارد بعد — ارفع أول ملف الآن</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary inline-flex items-center gap-2"><Upload className="w-4 h-4" />رفع مورد</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(r => {
            const Icon = guessIcon(r.content_type, r.original_filename);
            return (
              <div key={r.id} className="glass-card flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.2)' }}>
                    <Icon className="w-5 h-5" style={{ color: '#00E5FF' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate" title={r.title}>{r.title}</h3>
                    <p className="text-xs text-slate-500 truncate" title={r.original_filename}>{r.original_filename}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fmtBytes(r.size_bytes)}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-md font-bold"
                    style={r.is_active ? { background: 'rgba(0,230,118,0.12)', color: '#34D399', border: '1px solid rgba(0,230,118,0.25)' } : { background: 'rgba(148,163,184,0.10)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.2)' }}>
                    {r.is_active ? 'مُتاح' : 'مُغلق'}
                  </span>
                </div>
                {r.description && <p className="text-xs text-slate-400 line-clamp-2">{r.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {(r.grades || []).length === 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(213,0,249,0.10)', color: '#E879F9', border: '1px solid rgba(213,0,249,0.2)' }}>جميع الصفوف</span>
                  ) : (
                    r.grades.map(g => <span key={g} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(100,181,246,0.10)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.2)' }}>{g}</span>)
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-500">
                  <button onClick={() => showDownloads(r)} className="flex items-center gap-1 hover:text-cyan-300">
                    <Download className="w-3.5 h-3.5" /> {r.download_count || 0} تنزيل
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(r)} title={r.is_active ? 'إيقاف' : 'تفعيل'} className="p-1.5 rounded-md hover:bg-white/5">
                      <Eye className="w-4 h-4" style={{ color: r.is_active ? '#34D399' : '#94A3B8' }} />
                    </button>
                    <button onClick={() => setEditing({ ...r, grades: r.grades || [] })} className="p-1.5 rounded-md hover:bg-white/5"><Edit3 className="w-4 h-4 text-cyan-400" /></button>
                    <button onClick={() => remove(r)} className="p-1.5 rounded-md hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <Modal onClose={() => !uploading && setShowUpload(false)} title="رفع مورد جديد">
          <div className="space-y-3">
            <input ref={fileInput} type="file" onChange={onSelectFile}
              className="block w-full text-sm text-slate-400 file:ml-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-cyan-500/10 file:text-cyan-300 file:cursor-pointer" />
            <p className="text-xs text-slate-500">الحد الأقصى: 30 ميجابايت — أي نوع ملف</p>
            <input className="input-field" placeholder="عنوان المورد *"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <textarea className="input-field" placeholder="وصف اختياري" rows={2}
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <div>
              <p className="text-xs font-bold mb-1.5 text-slate-400">الصفوف المسموح لها (اتركها فارغة = الجميع)</p>
              <div className="flex flex-wrap gap-1.5">
                {GRADES_ALL.map(g => (
                  <button key={g} type="button"
                    onClick={() => setForm(p => ({ ...p, grades: p.grades.includes(g) ? p.grades.filter(x => x !== g) : [...p.grades, g] }))}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition"
                    style={form.grades.includes(g) ? { background: 'rgba(100,181,246,0.18)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.4)' } : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>{g}</button>
                ))}
              </div>
            </div>
            {uploading && (
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowUpload(false)} disabled={uploading} className="btn-ghost flex-1">إلغاء</button>
              <button onClick={upload} disabled={uploading} className="btn-primary flex-1">{uploading ? `جارٍ الرفع ${progress}%` : 'رفع'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)} title="تعديل المورد">
          <div className="space-y-3">
            <input className="input-field" placeholder="العنوان" value={editing.title} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} />
            <textarea className="input-field" placeholder="الوصف" rows={2} value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} />
            <div>
              <p className="text-xs font-bold mb-1.5 text-slate-400">الصفوف</p>
              <div className="flex flex-wrap gap-1.5">
                {GRADES_ALL.map(g => (
                  <button key={g} type="button"
                    onClick={() => setEditing(p => ({ ...p, grades: p.grades.includes(g) ? p.grades.filter(x => x !== g) : [...p.grades, g] }))}
                    className="px-3 py-1 rounded-lg text-xs font-bold"
                    style={editing.grades.includes(g) ? { background: 'rgba(100,181,246,0.18)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.4)' } : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>{g}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="btn-ghost flex-1">إلغاء</button>
              <button onClick={saveEdit} className="btn-primary flex-1">حفظ</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Viewers Modal */}
      {viewers && (
        <Modal onClose={() => setViewers(null)} title={`من قام بتنزيل "${viewers.resource.title}"`}>
          {viewers.rows.length === 0 ? (
            <p className="text-center text-slate-500 py-6">لم يقم أحد بتنزيله بعد</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {viewers.rows.map(v => (
                <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <p className="text-sm font-bold text-white">{v.student_name}</p>
                    <p className="text-xs text-slate-500">{v.grade} · شعبة {v.section}</p>
                  </div>
                  <span className="text-xs text-slate-500">{new Date(v.created_at).toLocaleString('ar')}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </TeacherLayout>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-modal w-full max-w-lg rounded-2xl p-5" onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(11,17,32,0.92)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
