import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Library, Video, Trash2, Copy, Eye, Edit3, X, Upload, Youtube,
  MessageCircle, RefreshCw, Plus, Users, PlayCircle, Sparkles
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
  const [mode, setMode] = useState('youtube');
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
        if (!form.youtube_url.trim()) { setBusy(false); return toast.error('أدخل رابط YouTube'); }
        await axios.post(`${API}/videos/youtube`, {
          title: form.title.trim(),
          description: form.description.trim(),
          youtube_url: form.youtube_url.trim(),
          grades: form.grades,
          allow_comments: form.allow_comments,
          is_active: true,
        }, getAuthHeaders());
      } else {
        if (!form.file) { setBusy(false); return toast.error('اختر ملف الفيديو'); }
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
    if (!window.confirm(`حذف «${v.title}»؟`)) return;
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
          className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Library className="w-4 h-4 inline ml-1.5" />الموارد
        </Link>
        <button className="px-4 py-2 rounded-2xl font-bold text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(213,0,249,0.18), rgba(213,0,249,0.08))', color: '#F0ABFC', border: '1px solid rgba(213,0,249,0.35)', boxShadow: '0 4px 16px rgba(213,0,249,0.10)' }}>
          <Video className="w-4 h-4 inline ml-1.5" />الفيديوهات
        </button>
      </div>

      {/* Library Code Card */}
      {info && (
        <div className="lib-hero-card is-fuchsia mb-6">
          <div className="lib-hero-orb-1" />
          <div className="lib-hero-orb-2" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-widest uppercase mb-2 flex items-center gap-1.5"
                style={{ color: 'rgba(213,0,249,0.75)' }}>
                <Sparkles className="w-3 h-3" />رمز مكتبة الفيديوهات
              </p>
              <div className="flex items-center gap-3">
                <code className="lib-hero-code">{info.videos_code}</code>
                <button onClick={() => { navigator.clipboard.writeText(info.videos_code); toast.success('تم نسخ الرمز'); }}
                  className="p-2 rounded-xl hover:bg-white/5 transition" title="نسخ الرمز">
                  <Copy className="w-4 h-4" style={{ color: '#F0ABFC' }} />
                </button>
              </div>
              <p className="text-xs mt-2 text-slate-400">
                <span className="opacity-70">شارك الرابط:</span>
                <span dir="ltr" className="mx-2 break-all font-mono text-[11px]" style={{ color: '#F0ABFC' }}>{window.location.origin}/v/{info.videos_code}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={copyLink} className="btn-ghost rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm"><Copy className="w-4 h-4" />نسخ الرابط</button>
              <button onClick={regenerate} className="btn-ghost rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm"><RefreshCw className="w-4 h-4" />رمز جديد</button>
              <button onClick={() => setShowNew(true)} className="btn-primary rounded-2xl flex items-center gap-1.5 px-4 py-2 text-sm font-bold"><Plus className="w-4 h-4" />إضافة فيديو</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-slate-500 py-12">جارٍ التحميل...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-3xl"
          style={{ background: 'rgba(30,42,58,0.4)', border: '1px dashed rgba(213,0,249,0.20)' }}>
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-3"
            style={{ background: 'rgba(213,0,249,0.10)', border: '1px solid rgba(213,0,249,0.25)' }}>
            <Video className="w-8 h-8" style={{ color: '#F0ABFC' }} />
          </div>
          <p className="text-slate-300 mb-4 font-bold">لا يوجد فيديوهات بعد</p>
          <p className="text-xs text-slate-500 mb-5">أضف رابط YouTube أو ارفع فيديو من جهازك</p>
          <button onClick={() => setShowNew(true)} className="btn-primary rounded-2xl inline-flex items-center gap-2 px-5 py-2.5"><Plus className="w-4 h-4" />إضافة فيديو</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(v => (
            <div key={v.id} className="lib-card group">
              {/* Top ribbon */}
              <div className="lib-card-ribbon"
                style={{ background: v.source_type === 'youtube'
                  ? 'linear-gradient(90deg, transparent, #EF4444, transparent)'
                  : 'linear-gradient(90deg, transparent, #00E5FF, transparent)' }} />

              {/* Thumbnail */}
              <div className="video-thumb">
                {v.source_type === 'youtube' && v.youtube_id ? (
                  <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-slate-600" />
                  </div>
                )}
                <div className="video-thumb-overlay">
                  <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg" />
                </div>
                <span className={`video-source-badge ${v.source_type === 'youtube' ? 'yt' : 'up'}`}>
                  {v.source_type === 'youtube' ? 'YouTube' : 'مرفوع'}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-white text-base leading-tight truncate" title={v.title}>{v.title}</h3>
                  {v.description && <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">{v.description}</p>}
                </div>
                <span className={`lib-status-badge ${v.is_active ? 'is-active' : 'is-closed'}`} style={{ position: 'static', flexShrink: 0 }}>
                  {v.is_active ? '● مُتاح' : '○ مُغلق'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {(v.grades || []).length === 0 ? (
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                    style={{ background: 'rgba(213,0,249,0.10)', color: '#E879F9', border: '1px solid rgba(213,0,249,0.2)' }}>الجميع</span>
                ) : (
                  v.grades.map(g => (
                    <span key={g} className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                      style={{ background: 'rgba(100,181,246,0.10)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.2)' }}>{g}</span>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/5">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> <span className="font-bold">{v.view_count || 0}</span></span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> <span className="font-bold">{v.comment_count || 0}</span></span>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => navigate(`/teacher/library/videos/${v.id}`)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition" title="التعليقات والمشاهدات">
                    <MessageCircle className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button onClick={() => toggleActive(v)} title={v.is_active ? 'إيقاف' : 'تفعيل'}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition">
                    <Eye className="w-4 h-4" style={{ color: v.is_active ? '#34D399' : '#94A3B8' }} />
                  </button>
                  <button onClick={() => setEditing({ ...v, grades: v.grades || [] })}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition">
                    <Edit3 className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button onClick={() => remove(v)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
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
            <button onClick={() => setMode('youtube')} className="flex-1 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition"
              style={mode === 'youtube'
                ? { background: 'rgba(239,68,68,0.18)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.4)' }
                : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Youtube className="w-4 h-4" />YouTube
            </button>
            <button onClick={() => setMode('upload')} className="flex-1 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition"
              style={mode === 'upload'
                ? { background: 'rgba(0,229,255,0.15)', color: '#67E8F9', border: '1px solid rgba(0,229,255,0.4)' }
                : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                  className="block w-full text-sm text-slate-400 file:ml-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-cyan-500/15 file:text-cyan-300 file:cursor-pointer file:font-bold" />
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
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition"
                    style={form.grades.includes(g)
                      ? { background: 'rgba(100,181,246,0.20)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.45)' }
                      : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>{g}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.allow_comments} onChange={e => setForm(p => ({ ...p, allow_comments: e.target.checked }))} />
              السماح بتعليقات الطلاب
            </label>
            {busy && mode === 'upload' && (
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00E5FF, #67E8F9)' }} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowNew(false)} disabled={busy} className="btn-ghost rounded-2xl flex-1">إلغاء</button>
              <button onClick={create} disabled={busy} className="btn-primary rounded-2xl flex-1">{busy ? `جارٍ... ${progress > 0 ? progress + '%' : ''}` : 'إضافة'}</button>
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
                    className="px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={editing.grades.includes(g)
                      ? { background: 'rgba(100,181,246,0.20)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.45)' }
                      : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>{g}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={editing.allow_comments !== false} onChange={e => setEditing(p => ({ ...p, allow_comments: e.target.checked }))} />
              السماح بالتعليقات
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="btn-ghost rounded-2xl flex-1">إلغاء</button>
              <button onClick={saveEdit} className="btn-primary rounded-2xl flex-1">حفظ</button>
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
      <div className="lib-modal w-full max-w-lg rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(11,17,32,0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
