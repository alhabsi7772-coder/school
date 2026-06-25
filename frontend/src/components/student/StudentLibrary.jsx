import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Library, Download, FileText, Music, Image as ImageIcon, Film, FileSpreadsheet, User, GraduationCap, LogOut, Share2 } from 'lucide-react';
import { API, GRADES } from '../../utils';
import LoginVideoBackground from '../LoginVideoBackground';
import { useStudentMode } from '../../hooks/useStudentMode';

const guessIcon = (ct = '', name = '') => {
  const n = (name || '').toLowerCase();
  if (ct.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/.test(n)) return Music;
  if (ct.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(n)) return ImageIcon;
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

const fmtBytes = (n) => !n ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;

export default function StudentLibrary() {
  const { code } = useParams();
  const location = useLocation();
  useStudentMode();
  const isBundle = location.pathname.startsWith('/b/');
  const apiBase = isBundle ? 'bundle' : 'library';
  const STORAGE_KEY = `${isBundle ? 'bundle' : 'lib'}_access_${code}`;
  const accent = isBundle ? '213,0,249' : '0,229,255';
  const accentSolid = isBundle ? '#E879F9' : '#00E5FF';

  const [phase, setPhase] = useState('checking');
  const [info, setInfo] = useState(null);
  const [access, setAccess] = useState(null);
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState({ student_name: '', grade: '', section: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/${apiBase}/check/${code}`);
        setInfo(r.data);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const a = JSON.parse(saved);
          setAccess(a);
          setPhase('list');
          loadResources(a.access_id);
        } else {
          setPhase('join');
        }
      } catch (e) {
        toast.error(e.response?.data?.detail || 'الرمز غير صحيح');
        setPhase('invalid');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const loadResources = async (accessId) => {
    try {
      const r = await axios.get(`${API}/${apiBase}/${code}/resources`, { params: { access_id: accessId } });
      setResources(r.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        setAccess(null); setPhase('join');
        return;
      }
      toast.error('فشل تحميل الموارد');
    }
  };

  const join = async (e) => {
    e.preventDefault();
    if (!form.student_name.trim() || !form.grade || !form.section) return toast.error('أكمل بياناتك');
    setBusy(true);
    try {
      const r = await axios.post(`${API}/${apiBase}/${code}/access`, form);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r.data));
      setAccess(r.data);
      setPhase('list');
      loadResources(r.data.access_id);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'تعذر الدخول');
    } finally { setBusy(false); }
  };

  const download = (rid) => {
    const url = `${API}/${apiBase}/${code}/download/${rid}?access_id=${access.access_id}`;
    const a = document.createElement('a');
    a.href = url; a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAccess(null); setPhase('join');
    setForm({ student_name: '', grade: '', section: '' });
  };

  const sections = form.grade ? GRADES[form.grade] || [] : [];

  return (
    <div className="min-h-screen font-tajawal relative" style={{ background: '#0B1120' }}>
      <LoginVideoBackground accentRgb={accent} overlay={0.65} />
      <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-3xl items-center justify-center mb-3"
            style={{ background: `linear-gradient(135deg, rgba(${accent},0.22), rgba(${accent},0.10))`, border: `1px solid rgba(${accent},0.40)`, boxShadow: `0 8px 32px rgba(${accent},0.15)` }}>
            {isBundle ? <Share2 className="w-8 h-8" style={{ color: accentSolid }} /> : <Library className="w-8 h-8" style={{ color: accentSolid }} />}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            {isBundle ? (info?.title || 'موارد مشاركة') : <>مكتبة <span style={{ color: accentSolid, textShadow: `0 0 20px rgba(${accent},0.5)` }}>الموارد</span></>}
          </h1>
          {info && <p className="text-sm text-slate-300 mt-1">{info.school_name} · {info.owner_name}</p>}
          {isBundle && info?.resources_count != null && (
            <p className="text-xs text-fuchsia-300 mt-2 font-bold">{info.resources_count} موارد</p>
          )}
        </div>

        {phase === 'checking' && <p className="text-center text-slate-400">جارٍ التحقق...</p>}

        {phase === 'invalid' && (
          <div className="rounded-3xl p-8 text-center max-w-md mx-auto"
            style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(248,113,113,0.25)' }}>
            <p className="text-red-300">الرمز غير صحيح أو الرابط منتهي</p>
          </div>
        )}

        {phase === 'join' && (
          <div className="max-w-md mx-auto rounded-3xl p-6 md:p-7"
            style={{ background: 'rgba(11,17,32,0.75)', border: `1px solid rgba(${accent},0.18)`, boxShadow: `0 12px 48px rgba(${accent},0.10)`, backdropFilter: 'blur(20px)' }}>
            <h2 className="text-lg font-black text-white mb-1">سجّل بياناتك</h2>
            <p className="text-xs text-slate-400 mb-5">{isBundle ? 'لمشاهدة الموارد المشاركة معك' : 'لتتمكن من تنزيل الموارد'}</p>
            <form onSubmit={join} className="space-y-3">
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `rgba(${accent},0.5)` }} />
                <input className="input-field pr-11" placeholder="الاسم الكامل"
                  value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className="input-field" value={form.grade}
                  onChange={e => setForm(p => ({ ...p, grade: e.target.value, section: '' }))} required>
                  <option value="">الصف</option>
                  {Object.keys(GRADES).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="input-field" value={form.section}
                  onChange={e => setForm(p => ({ ...p, section: e.target.value }))} required disabled={!form.grade}>
                  <option value="">الشعبة</option>
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button type="submit" disabled={busy} className="btn-primary rounded-2xl w-full">
                {busy ? 'جارٍ الدخول...' : 'دخول'}
              </button>
            </form>
          </div>
        )}

        {phase === 'list' && access && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5 px-1">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <GraduationCap className="w-4 h-4" style={{ color: accentSolid }} />
                <span>{access.student_name} · {access.grade} · شعبة {access.section}</span>
              </div>
              <button onClick={logout} className="text-xs text-slate-400 hover:text-red-300 flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" />تغيير البيانات
              </button>
            </div>

            {resources.length === 0 ? (
              <div className="rounded-3xl p-12 text-center text-slate-400"
                style={{ background: 'rgba(11,17,32,0.6)', border: '1px dashed rgba(148,163,184,0.2)' }}>
                <Library className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                لا توجد موارد متاحة لصفك حالياً
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resources.map(r => {
                  const Icon = guessIcon(r.content_type, r.original_filename);
                  const ic = iconColor(r.content_type, r.original_filename);
                  return (
                    <div key={r.id} className="rounded-3xl p-4 flex flex-col gap-3 transition-all hover:-translate-y-1 relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(30,42,58,0.65), rgba(15,23,42,0.55))',
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
                        backdropFilter: 'blur(14px)',
                      }}>
                      <div className="absolute top-0 right-4 left-4 h-[2px] opacity-50 rounded-full"
                        style={{ background: `linear-gradient(90deg, transparent, ${ic.fg}, transparent)` }} />
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background: ic.bg, border: `1px solid ${ic.bd}`, boxShadow: `0 4px 12px ${ic.bd}` }}>
                          <Icon className="w-7 h-7" style={{ color: ic.fg }} />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="font-black text-white text-base leading-tight" title={r.title}>{r.title}</h3>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{r.original_filename}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{fmtBytes(r.size_bytes)}</p>
                        </div>
                      </div>
                      {r.description && <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{r.description}</p>}
                      <button onClick={() => download(r.id)}
                        className="w-full py-2.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition mt-1"
                        style={{ background: `rgba(${accent},0.14)`, color: accentSolid, border: `1px solid rgba(${accent},0.35)`, boxShadow: `0 4px 14px rgba(${accent},0.10)` }}>
                        <Download className="w-4 h-4" />تنزيل
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
