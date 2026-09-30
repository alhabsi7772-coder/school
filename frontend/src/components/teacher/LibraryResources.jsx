import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Library, Upload, Trash2, Copy, Download, Eye, Edit3, X, Check,
  FileText, Music, Image as ImageIcon, FileSpreadsheet, Film, RefreshCw,
  Video, Link2, Plus, Share2, ListChecks, ChevronRight, Sparkles, BookOpenCheck
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

const iconColor = (ct = '', name = '') => {
  const n = (name || '').toLowerCase();
  if (ct.startsWith('audio/') || /\.(mp3|wav|m4a)$/.test(n)) return { fg: '#A78BFA', bg: 'rgba(167,139,250,0.12)', bd: 'rgba(167,139,250,0.30)' };
  if (ct.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(n)) return { fg: '#FBBF24', bg: 'rgba(251,191,36,0.12)', bd: 'rgba(251,191,36,0.30)' };
  if (ct.startsWith('video/') || /\.(mp4|mov|webm)$/.test(n)) return { fg: '#F87171', bg: 'rgba(248,113,113,0.12)', bd: 'rgba(248,113,113,0.30)' };
  if (/\.(xlsx?|csv)$/.test(n)) return { fg: '#34D399', bg: 'rgba(52,211,153,0.12)', bd: 'rgba(52,211,153,0.30)' };
  if (/\.pdf$/.test(n)) return { fg: '#F87171', bg: 'rgba(248,113,113,0.12)', bd: 'rgba(248,113,113,0.30)' };
  if (/\.docx?$/.test(n)) return { fg: '#60A5FA', bg: 'rgba(96,165,250,0.12)', bd: 'rgba(96,165,250,0.30)' };
  if (/\.pptx?$/.test(n)) return { fg: '#FB923C', bg: 'rgba(251,146,60,0.12)', bd: 'rgba(251,146,60,0.30)' };
  return { fg: '#00E5FF', bg: 'rgba(0,229,255,0.10)', bd: 'rgba(0,229,255,0.25)' };
};

const fmtBytes = (n) => !n ? '—' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;

export default function LibraryResources() {
  const [info, setInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewers, setViewers] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', grades: [], file: null });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef();

  // Selection mode (multi-select for bundle creation)
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [bundleTitle, setBundleTitle] = useState('');
  const [createdBundle, setCreatedBundle] = useState(null);
  const [showBundlesList, setShowBundlesList] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [a, b, c] = await Promise.all([
        axios.get(`${API}/library/me`, getAuthHeaders()),
        axios.get(`${API}/resources`, getAuthHeaders()),
        axios.get(`${API}/bundles`, getAuthHeaders()),
      ]);
      setInfo(a.data); setItems(b.data); setBundles(c.data);
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
    setUploading(true); setProgress(0);
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

  // ====== Selection / Bundles ======
  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const enterSelectMode = () => { setSelectMode(true); setSelected(new Set()); };
  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };
  const selectAll = () => setSelected(new Set(items.map(r => r.id)));

  const openBundleCreate = () => {
    if (selected.size === 0) return toast.error('اختر مورداً أو أكثر');
    setBundleTitle(selected.size === 1 ? items.find(r => selected.has(r.id))?.title || '' : `مجموعة (${selected.size} موارد)`);
    setShowBundleModal(true);
  };

  const createBundle = async () => {
    if (!bundleTitle.trim()) return toast.error('أدخل عنوان الحزمة');
    try {
      const r = await axios.post(`${API}/bundles`, {
        title: bundleTitle.trim(),
        resource_ids: Array.from(selected),
      }, getAuthHeaders());
      setCreatedBundle(r.data);
      setShowBundleModal(false);
      setBundleTitle('');
      exitSelectMode();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الإنشاء');
    }
  };

  const deleteBundle = async (b) => {
    if (!window.confirm(`حذف الرابط "${b.title}"؟`)) return;
    try {
      await axios.delete(`${API}/bundles/${b.id}`, getAuthHeaders());
      toast.success('تم الحذف');
      load();
    } catch { toast.error('فشل الحذف'); }
  };

  const copyBundleLink = (b) => {
    navigator.clipboard.writeText(`${window.location.origin}/b/${b.code}`);
    toast.success('تم نسخ الرابط');
  };

  return (
    <TeacherLayout title="مكتبة الموارد">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button className="px-4 py-2 rounded-2xl font-bold text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,229,255,0.08))', color: '#67E8F9', border: '1px solid rgba(0,229,255,0.35)', boxShadow: '0 4px 16px rgba(0,229,255,0.10)' }}>
          <Library className="w-4 h-4 inline ml-1.5" />الموارد
        </button>
        <Link to="/teacher/library/videos"
          className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Video className="w-4 h-4 inline ml-1.5" />الفيديوهات
        </Link>
        <Link to="/teacher/library/plans" data-testid="library-tab-plans"
          className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <BookOpenCheck className="w-4 h-4 inline ml-1.5" />التحضير
        </Link>
        <button onClick={() => setShowBundlesList(s => !s)}
          className="px-4 py-2 rounded-2xl font-bold text-sm transition-all hover:scale-105 mr-auto flex items-center gap-1.5"
          style={{ background: 'rgba(213,0,249,0.10)', color: '#E879F9', border: '1px solid rgba(213,0,249,0.25)' }}>
          <Link2 className="w-4 h-4" />الروابط المخصصة
          {bundles.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black"
              style={{ background: 'rgba(213,0,249,0.25)', color: '#F0ABFC' }}>{bundles.length}</span>
          )}
        </button>
      </div>

      {/* Library Code Card — refined gradient */}
      {info && (
        <div className="lib-hero-card mb-6">
          <div className="lib-hero-orb-1" />
          <div className="lib-hero-orb-2" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-widest uppercase mb-2 flex items-center gap-1.5"
                style={{ color: 'rgba(0,229,255,0.7)' }}>
                <Sparkles className="w-3 h-3" />رابط المكتبة الموحّد
              </p>
              <div className="flex items-center gap-3">
                <code className="lib-hero-code">{info.library_code}</code>
                <button onClick={() => { navigator.clipboard.writeText(info.library_code); toast.success('تم نسخ الرمز'); }}
                  className="p-2 rounded-xl hover:bg-white/5 transition" title="نسخ الرمز">
                  <Copy className="w-4 h-4 text-cyan-300" />
                </button>
              </div>
              <p className="text-xs mt-2 text-slate-400">
                <span className="opacity-70">شارك الرابط:</span>
                <span dir="ltr" className="text-cyan-300 mx-2 break-all font-mono text-[11px]">{window.location.origin}/library/{info.library_code}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={copyLink} className="btn-ghost rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm"><Copy className="w-4 h-4" />نسخ الرابط</button>
              <button onClick={regenerate} className="btn-ghost rounded-2xl flex items-center gap-1.5 px-3 py-2 text-sm"><RefreshCw className="w-4 h-4" />رمز جديد</button>
              <button onClick={() => setShowUpload(true)} className="btn-primary rounded-2xl flex items-center gap-1.5 px-4 py-2 text-sm font-bold"><Upload className="w-4 h-4" />رفع مورد</button>
            </div>
          </div>
        </div>
      )}

      {/* Bundles list panel */}
      {showBundlesList && (
        <div className="rounded-3xl p-4 md:p-5 mb-6"
          style={{ background: 'rgba(213,0,249,0.05)', border: '1px solid rgba(213,0,249,0.18)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-fuchsia-300 flex items-center gap-1.5">
              <Link2 className="w-4 h-4" />روابط مخصصة لمجموعات موارد
            </h3>
            <button onClick={() => setShowBundlesList(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {bundles.length === 0 ? (
            <p className="text-center text-slate-500 py-4 text-sm">لا توجد روابط بعد — استخدم وضع التحديد لإنشاء رابط لمجموعة موارد</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {bundles.map(b => (
                <div key={b.id} className="rounded-2xl p-3 flex items-start gap-3"
                  style={{ background: 'rgba(11,17,32,0.5)', border: '1px solid rgba(213,0,249,0.18)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(213,0,249,0.12)', border: '1px solid rgba(213,0,249,0.3)' }}>
                    <Share2 className="w-4 h-4" style={{ color: '#E879F9' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{b.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{b.resource_ids?.length || 0} موارد</p>
                    <code className="text-xs font-bold tracking-widest" style={{ color: '#E879F9' }}>{b.code}</code>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => copyBundleLink(b)} className="p-1.5 rounded-lg hover:bg-white/5" title="نسخ الرابط">
                      <Copy className="w-3.5 h-3.5 text-fuchsia-300" />
                    </button>
                    <button onClick={() => deleteBundle(b)} className="p-1.5 rounded-lg hover:bg-red-500/10" title="حذف">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selection Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <button onClick={enterSelectMode} disabled={items.length === 0}
              className="rounded-2xl px-4 py-2 text-sm font-bold flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: 'rgba(213,0,249,0.10)', color: '#E879F9', border: '1px solid rgba(213,0,249,0.25)' }}>
              <ListChecks className="w-4 h-4" />تحديد موارد لإنشاء رابط
            </button>
          ) : (
            <>
              <span className="text-sm font-bold text-cyan-300">
                {selected.size} مختار
              </span>
              <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10">الكل</button>
              <button onClick={exitSelectMode} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10">إلغاء</button>
              <button onClick={openBundleCreate} disabled={selected.size === 0}
                className="rounded-2xl px-4 py-2 text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #D500F9, #A78BFA)', color: '#fff', border: '1px solid rgba(213,0,249,0.5)', boxShadow: '0 4px 16px rgba(213,0,249,0.3)' }}>
                <Share2 className="w-4 h-4" />إنشاء رابط للمحدد
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <p className="text-center text-slate-500 py-12">جارٍ التحميل...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-3xl"
          style={{ background: 'rgba(30,42,58,0.4)', border: '1px dashed rgba(0,229,255,0.20)' }}>
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-3"
            style={{ background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.25)' }}>
            <Library className="w-8 h-8" style={{ color: '#67E8F9' }} />
          </div>
          <p className="text-slate-300 mb-4 font-bold">لا يوجد موارد بعد</p>
          <p className="text-xs text-slate-500 mb-5">ابدأ برفع أول ملف من زر «رفع مورد» أعلاه</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary rounded-2xl inline-flex items-center gap-2 px-5 py-2.5"><Upload className="w-4 h-4" />رفع مورد</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(r => {
            const Icon = guessIcon(r.content_type, r.original_filename);
            const ic = iconColor(r.content_type, r.original_filename);
            const isSelected = selected.has(r.id);
            return (
              <div key={r.id}
                onClick={() => selectMode && toggleSelect(r.id)}
                className={`lib-card group ${isSelected ? 'is-selected' : ''}`}
                style={{ cursor: selectMode ? 'pointer' : 'default' }}>

                {/* Top gradient accent line */}
                <div className="lib-card-ribbon"
                  style={{ background: `linear-gradient(90deg, transparent, ${ic.fg}, transparent)` }} />

                {/* Selection checkbox */}
                {selectMode && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center transition z-10"
                    style={isSelected
                      ? { background: '#D500F9', border: '1px solid #D500F9' }
                      : { background: 'rgba(0,0,0,0.4)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                )}

                {/* Status badge (hidden in select mode) */}
                {!selectMode && (
                  <span className={`lib-status-badge ${r.is_active ? 'is-active' : 'is-closed'}`}>
                    {r.is_active ? '● مُتاح' : '○ مُغلق'}
                  </span>
                )}

                <div className="flex items-start gap-3 mt-1">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: ic.bg, border: `1px solid ${ic.bd}`, boxShadow: `0 4px 12px ${ic.bd}` }}>
                    <Icon className="w-6 h-6" style={{ color: ic.fg }} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-black text-white text-base leading-tight truncate" title={r.title}>{r.title}</h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5" title={r.original_filename}>{r.original_filename}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{fmtBytes(r.size_bytes)}</p>
                  </div>
                </div>

                {r.description && <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{r.description}</p>}

                <div className="flex flex-wrap gap-1">
                  {(r.grades || []).length === 0 ? (
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                      style={{ background: 'rgba(213,0,249,0.10)', color: '#E879F9', border: '1px solid rgba(213,0,249,0.2)' }}>الجميع</span>
                  ) : (
                    r.grades.map(g => (
                      <span key={g} className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                        style={{ background: 'rgba(100,181,246,0.10)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.2)' }}>{g}</span>
                    ))
                  )}
                </div>

                {!selectMode && (
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/5">
                    <button onClick={() => showDownloads(r)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition">
                      <Download className="w-3.5 h-3.5" /> <span className="font-bold">{r.download_count || 0}</span> تنزيل
                    </button>
                    <div className="flex gap-0.5">
                      <button onClick={() => toggleActive(r)} title={r.is_active ? 'إيقاف' : 'تفعيل'}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition">
                        <Eye className="w-4 h-4" style={{ color: r.is_active ? '#34D399' : '#94A3B8' }} />
                      </button>
                      <button onClick={() => setEditing({ ...r, grades: r.grades || [] })}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition">
                        <Edit3 className="w-4 h-4 text-cyan-400" />
                      </button>
                      <button onClick={() => remove(r)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
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
              className="block w-full text-sm text-slate-400 file:ml-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-cyan-500/15 file:text-cyan-300 file:cursor-pointer file:font-bold" />
            <p className="text-xs text-slate-500">الحد الأقصى: 30 ميجابايت — أي نوع ملف</p>
            <input className="input-field" placeholder="عنوان المورد *"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <textarea className="input-field" placeholder="وصف اختياري" rows={2}
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
            {uploading && (
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00E5FF, #67E8F9)' }} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowUpload(false)} disabled={uploading} className="btn-ghost rounded-2xl flex-1">إلغاء</button>
              <button onClick={upload} disabled={uploading} className="btn-primary rounded-2xl flex-1">{uploading ? `جارٍ الرفع ${progress}%` : 'رفع'}</button>
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
                    className="px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={editing.grades.includes(g)
                      ? { background: 'rgba(100,181,246,0.20)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.45)' }
                      : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>{g}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="btn-ghost rounded-2xl flex-1">إلغاء</button>
              <button onClick={saveEdit} className="btn-primary rounded-2xl flex-1">حفظ</button>
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
                <div key={v.id} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
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

      {/* Bundle Creation Modal */}
      {showBundleModal && (
        <Modal onClose={() => setShowBundleModal(false)} title="إنشاء رابط مخصص">
          <div className="space-y-3">
            <div className="rounded-2xl p-3" style={{ background: 'rgba(213,0,249,0.06)', border: '1px solid rgba(213,0,249,0.18)' }}>
              <p className="text-xs font-bold text-fuchsia-300 mb-1">{selected.size} موارد محددة</p>
              <p className="text-xs text-slate-400">سيتم توليد رمز فريد ورابط يفتح للطالب هذه الموارد فقط (بصرف النظر عن صفه)</p>
            </div>
            <input className="input-field" placeholder="عنوان المجموعة (مثل: مراجعة الفصل الأول)"
              value={bundleTitle} onChange={e => setBundleTitle(e.target.value)} autoFocus />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowBundleModal(false)} className="btn-ghost rounded-2xl flex-1">إلغاء</button>
              <button onClick={createBundle} className="btn-primary rounded-2xl flex-1 flex items-center justify-center gap-1.5">
                <Share2 className="w-4 h-4" />إنشاء الرابط
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Created Bundle Success */}
      {createdBundle && (
        <Modal onClose={() => setCreatedBundle(null)} title="تم إنشاء الرابط ✓">
          <div className="space-y-4">
            <div className="rounded-2xl p-4 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(213,0,249,0.12), rgba(167,139,250,0.06))', border: '1px solid rgba(213,0,249,0.30)' }}>
              <p className="text-xs text-fuchsia-300 font-bold mb-2 tracking-wider">رمز الرابط</p>
              <code className="text-3xl font-black tracking-widest block mb-3" style={{ color: '#F0ABFC', textShadow: '0 0 16px rgba(213,0,249,0.5)', letterSpacing: '0.3em' }}>{createdBundle.code}</code>
              <div className="rounded-xl p-2.5 text-xs font-mono break-all"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#E879F9', border: '1px solid rgba(213,0,249,0.2)' }} dir="ltr">
                {window.location.origin}/b/{createdBundle.code}
              </div>
            </div>
            <button onClick={() => { copyBundleLink(createdBundle); setCreatedBundle(null); }}
              className="btn-primary rounded-2xl w-full flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #D500F9, #A78BFA)' }}>
              <Copy className="w-4 h-4" />نسخ الرابط
            </button>
            <p className="text-xs text-center text-slate-500">يمكنك إيجاد الرابط لاحقاً في «الروابط المخصصة»</p>
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
