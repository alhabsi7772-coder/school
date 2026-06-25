import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Library, Video, Trash2, Copy, Eye, Edit3, X, Upload, Youtube,
  MessageCircle, RefreshCw, Plus, Users, ChevronLeft, PlayCircle
} from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';

const GRADES_ALL = ['الخامس', 'السادس', 'السابع', 'الثامن'];

export default function LibraryVideos() {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [mode, setMode] = useState('youtube'); // 'youtube' | 'upload'
  const [form, setForm] = useState({ title: '', description: '', grades: [], allow_comments: true, youtube_url: '', file: null });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editing, setEditing] = useState(null);
  const fileInput = useRef();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [a, b] = await Promise.all([
        axios.get(`${API}/library/me`, getAuthHeaders()),
        axios.get(`${API}/videos`, getAuthHeaders()),
      ]);
      setInfo(a.data); setItems(b.data);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  };

  const regenerate = async () => {
    if (!window.confirm('سيتم توليد رمز جديد وإبطال الرمز الحالي. متابعة؟')) return;
    try {
      const r = await axios.post(`${API}/library/regenerate`, { kind: 'videos' }, getAuthHeaders());
      setInfo(p => ({ ...p, videos_code: r.data.code }));
      toast.success('تم توليد رمز جديد');
    } catch { toast.error('فشل التوليد'); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/v/${info.videos_code}`);
    toast.success('تم نسخ رابط مكتبة الفيديوهات');
  };

  const onSelectFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 30 * 1024 * 1024) {
      toast.error('الفيديو يتجاوز 30 ميجابايت');
      e.target.value = '';
      return;
    }
    setForm(p => ({ ...p, file: f, title: p.title || f.name.replace(/\.[^.]+$/, '') }));
  };

  const create = async () => {
    if (!form.title.trim()) return toast.error('أدخل عنواناً');
    setBusy(true);
    try {
      if (mode === 'youtube') {
        if (!form.youtube_url.trim()) return toast.error('أدخل رابط YouTube');
        await axios.post(`${API}/videos/youtube`, {
          title: form.title.trim(),
          description: form.description.trim(),
          youtube_url: form.youtube_url.trim(),
          grades: form.grades,
          allow_comments: form.allow_comments,
          is_active: true,
        }, getAuthHeaders());
      } else {
        if (!form.file) return toast.error('اختر ملف الفيديو');
        const fd = new FormData();
        fd.append('file', form.file);
        fd.append('title', form.title.trim());
        fd.append('description', form.description.trim());
        fd.append('grades', form.grades.join(','));
        fd.append('allow_comments', String(form.allow_comments));
        fd.append('is_active', 'true');
        await axios.post(`${API}/videos/upload`, fd, {
          ...getAuthHeaders(),
          headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
        });
      }
      toast.success('تم إضافة الفيديو');
      setShowNew(false);
      setForm({ title: '', description: '', grades: [], allow_comments: true, youtube_url: '', file: null });
      if (fileInput.current) fileInput.current.value = '';
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الإنشاء');
    } finally { setBusy(false); setProgress(0); }
  };

  const toggleActive = async (v) => {
    try {
      await axios.put(`${API}/videos/${v.id}`, { is_active: !v.is_active }, getAuthHeaders());
      load();
    } catch { toast.error('فشل التحديث'); }
  };

  const saveEdit = async () => {
    try {
      const payload = { title: editing.title, description: editing.description, grades: editing.grades, allow_comments: editing.allow_comments };
      await axios.put(`${API}/videos/${editing.id}`, payload, getAuthHeaders());
      toast.success('تم الحفظ');
      setEditing(null); load();
    } catch { toast.error('فشل الحفظ'); }
  };

  const remove = async (v) => {
    if (!window.confirm(`حذف "${v.title}"؟`)) return;
    try {
      await axios.delete(`${API}/videos/${v.id}`, getAuthHeaders());
      toast.success('تم الحذف'); load();
    } catch { toast.error('فشل الحذف'); }
  };

  return (
    <TeacherLayout title="مكتبة الفيديوهات">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Link to="/teacher/library"
          className="px-4 py-2 rounded-xl font-bold text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Library className="w-4 h-4 inline ml-1.5" />الموارد
        </Link>
        <button className="px-4 py-2 rounded-xl font-bold text-sm"
          style={{ background: 'rgba(213,0,249,0.12)', color: '#E879F9', border: '1px solid rgba(213,0,249,0.3)' }}>
          <Video className="w-4 h-4 inline ml-1.5" />الفيديوهات
        </button>
      </div>

      {info && (
        <div className="rounded-2xl p-5 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(213,0,249,0.10), rgba(0,229,255,0.06))', border: '1px solid rgba(213,0,249,0.2)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: 'rgba(213,0,249,0.7)' }}>رمز مكتبة الفيديوهات</p>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-black tracking-widest" style={{ color: '#E879F9', letterSpacing: '0.2em' }}>{info.videos_code}</code>
                <button onClick={() => { navigator.clipboard.writeText(info.videos_code); toast.success('تم نسخ الرمز'); }}
                  className="p-1.5 rounded-lg hover:bg-white/5"><Copy className="w-4 h-4" style={{ color: '#E879F9' }} /></button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-hint)' }}>
                شارك الرابط:
                <span dir="ltr" className="mx-1 break-all" style={{ color: '#E879F9' }}>{window.location.origin}/v/{info.videos_code}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyLink} className="btn-ghost flex items-center gap-1.5"><Copy className="w-4 h-4" />نسخ الرابط</button>
              <button onClick={regenerate} className="btn-ghost flex items-center gap-1.5"><RefreshCw className="w-4 h-4" />رمز جديد</button>
              <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4" />إضافة فيديو</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-slate-500 py-12">جارٍ التحميل...</p>
      ) : items.length === 0 ? (
        <div className="glass-card text-center py-16">
          <Video className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 mb-4">لا يوجد فيديوهات بعد</p>
          <button onClick={() => setShowNew(true)} className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />إضافة فيديو</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(v => (
            <div key={v.id} className="glass-card flex flex-col gap-3">
              {/* Thumbnail */}
              <div className="relative rounded-xl overflow-hidden aspect-video" style={{ background: '#0B1120' }}>
                {v.source_type === 'youtube' && v.youtube_id ? (
                  <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-slate-600" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <PlayCircle className="w-10 h-10 text-white/80" />
                </div>
                <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-md font-bold"
                  style={v.source_type === 'youtube' ? { background: 'rgba(239,68,68,0.85)', color: '#fff' } : { background: 'rgba(0,229,255,0.85)', color: '#0B1120' }}>
                  {v.source_type === 'youtube' ? 'YouTube' : 'مرفوع'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm truncate">{v.title}</h3>
                {v.description && <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{v.description}</p>}
              </div>
              <div className="flex flex-wrap gap-1">
                {(v.grades || []).length === 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(213,0,249,0.10)', color: '#E879F9', border: '1px solid rgba(213,0,249,0.2)' }}>جميع الصفوف</span>
                ) : (
                  v.grades.map(g => <span key={g} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(100,181,246,0.10)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.2)' }}>{g}</span>)
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold"
                  style={v.is_active ? { background: 'rgba(0,230,118,0.12)', color: '#34D399', border: '1px solid rgba(0,230,118,0.25)' } : { background: 'rgba(148,163,184,0.10)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.2)' }}>
                  {v.is_active ? 'مُتاح' : 'مُغلق'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {v.view_count || 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {v.comment_count || 0}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/teacher/library/videos/${v.id}`)} className="p-1.5 rounded-md hover:bg-white/5" title="التعليقات والمشاهدات">
                    <MessageCircle className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button onClick={() => toggleActive(v)} title={v.is_active ? 'إيقاف' : 'تفعيل'} className="p-1.5 rounded-md hover:bg-white/5">
                    <Eye className="w-4 h-4" style={{ color: v.is_active ? '#34D399' : '#94A3B8' }} />
                  </button>
                  <button onClick={() => setEditing({ ...v, grades: v.grades || [] })} className="p-1.5 rounded-md hover:bg-white/5"><Edit3 className="w-4 h-4 text-cyan-400" /></button>
                  <button onClick={() => remove(v)} className="p-1.5 rounded-md hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Modal */}
      {showNew && (
        <Modal onClose={() => !busy && setShowNew(false)} title="إضافة فيديو">
          <div className="flex gap-2 mb-3">
            <button onClick={() => setMode('youtube')} className="flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
              style={mode === 'youtube' ? { background: 'rgba(239,68,68,0.18)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.4)' } : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Youtube className="w-4 h-4" />YouTube
            </button>
            <button onClick={() => setMode('upload')} className="flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
              style={mode === 'upload' ? { background: 'rgba(0,229,255,0.15)', color: '#67E8F9', border: '1px solid rgba(0,229,255,0.4)' } : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Upload className="w-4 h-4" />رفع من الجهاز
            </button>
          </div>
          <div className="space-y-3">
            {mode === 'youtube' ? (
              <input className="input-field" placeholder="رابط YouTube" dir="ltr"
                value={form.youtube_url} onChange={e => setForm(p => ({ ...p, youtube_url: e.target.value }))} />
            ) : (
              <>
                <input ref={fileInput} type="file" accept="video/*" onChange={onSelectFile}
                  className="block w-full text-sm text-slate-400 file:ml-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-cyan-500/10 file:text-cyan-300" />
                <p className="text-xs text-slate-500">الحد الأقصى: 30 ميجابايت</p>
              </>
            )}
            <input className="input-field" placeholder="عنوان الفيديو *"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <textarea className="input-field" placeholder="وصف الدرس / الفيديو" rows={2}
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <div>
              <p className="text-xs font-bold mb-1.5 text-slate-400">الصفوف المسموح لها (فارغ = الجميع)</p>
              <div className="flex flex-wrap gap-1.5">
                {GRADES_ALL.map(g => (
                  <button key={g} type="button"
                    onClick={() => setForm(p => ({ ...p, grades: p.grades.includes(g) ? p.grades.filter(x => x !== g) : [...p.grades, g] }))}
                    className="px-3 py-1 rounded-lg text-xs font-bold"
                    style={form.grades.includes(g) ? { background: 'rgba(100,181,246,0.18)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.4)' } : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>{g}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.allow_comments} onChange={e => setForm(p => ({ ...p, allow_comments: e.target.checked }))} />
              السماح بتعليقات الطلاب
            </label>
            {busy && mode === 'upload' && (
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowNew(false)} disabled={busy} className="btn-ghost flex-1">إلغاء</button>
              <button onClick={create} disabled={busy} className="btn-primary flex-1">{busy ? `جارٍ... ${progress > 0 ? progress + '%' : ''}` : 'إضافة'}</button>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} title="تعديل الفيديو">
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
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={editing.allow_comments !== false} onChange={e => setEditing(p => ({ ...p, allow_comments: e.target.checked }))} />
              السماح بالتعليقات
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="btn-ghost flex-1">إلغاء</button>
              <button onClick={saveEdit} className="btn-primary flex-1">حفظ</button>
            </div>
          </div>
        </Modal>
      )}
    </TeacherLayout>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(11,17,32,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
