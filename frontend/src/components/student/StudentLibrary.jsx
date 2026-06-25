import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Library, Download, FileText, Music, Image as ImageIcon, Film, FileSpreadsheet, User, GraduationCap, LogOut } from 'lucide-react';
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

const fmtBytes = (n) => !n ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;

export default function StudentLibrary() {
  const { code } = useParams();
  useStudentMode();
  const STORAGE_KEY = `lib_access_${code}`;

  const [phase, setPhase] = useState('checking'); // checking | join | list
  const [info, setInfo] = useState(null);
  const [access, setAccess] = useState(null);
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState({ student_name: '', grade: '', section: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/library/check/${code}`);
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
        toast.error(e.response?.data?.detail || 'رمز المكتبة غير صحيح');
        setPhase('invalid');
      }
    })();
    // eslint-disable-next-line
  }, [code]);

  const loadResources = async (accessId) => {
    try {
      const r = await axios.get(`${API}/library/${code}/resources`, { params: { access_id: accessId } });
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
      const r = await axios.post(`${API}/library/${code}/access`, form);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r.data));
      setAccess(r.data);
      setPhase('list');
      loadResources(r.data.access_id);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'تعذر الدخول');
    } finally { setBusy(false); }
  };

  const download = (rid, name) => {
    const url = `${API}/library/${code}/download/${rid}?access_id=${access.access_id}`;
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
      <LoginVideoBackground accentRgb="0,229,255" overlay={0.65} />
      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.22), rgba(0,229,255,0.10))', border: '1px solid rgba(0,229,255,0.40)' }}>
            <Library className="w-8 h-8" style={{ color: '#00E5FF' }} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">مكتبة <span className="neon-text-cyan">الموارد</span></h1>
          {info && <p className="text-sm text-slate-300 mt-1">{info.school_name} · {info.owner_name}</p>}
        </div>

        {phase === 'checking' && <p className="text-center text-slate-400">جارٍ التحقق...</p>}

        {phase === 'invalid' && (
          <div className="glass-modal rounded-2xl p-8 text-center">
            <p className="text-red-300">الرمز غير صحيح أو المكتبة غير متاحة</p>
          </div>
        )}

        {phase === 'join' && (
          <div className="max-w-md mx-auto glass-modal rounded-3xl p-6"
            style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold text-white mb-1">سجّل بياناتك</h2>
            <p className="text-xs text-slate-400 mb-4">لتتمكن من تنزيل الموارد</p>
            <form onSubmit={join} className="space-y-3">
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(0,229,255,0.4)' }} />
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
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'جارٍ الدخول...' : 'دخول المكتبة'}
              </button>
            </form>
          </div>
        )}

        {phase === 'list' && access && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 px-1">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                <span>{access.student_name} · {access.grade} · شعبة {access.section}</span>
              </div>
              <button onClick={logout} className="text-xs text-slate-400 hover:text-red-300 flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" />تغيير البيانات
              </button>
            </div>

            {resources.length === 0 ? (
              <div className="glass-modal rounded-2xl p-12 text-center text-slate-400">
                <Library className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                لا توجد موارد متاحة لصفك حالياً
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {resources.map(r => {
                  const Icon = guessIcon(r.content_type, r.original_filename);
                  return (
                    <div key={r.id} className="glass-card flex flex-col gap-3" style={{ background: 'rgba(11,17,32,0.55)' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.25)' }}>
                          <Icon className="w-6 h-6" style={{ color: '#00E5FF' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm">{r.title}</h3>
                          <p className="text-xs text-slate-500 truncate">{r.original_filename}</p>
                          <p className="text-xs text-slate-500">{fmtBytes(r.size_bytes)}</p>
                        </div>
                      </div>
                      {r.description && <p className="text-xs text-slate-300 line-clamp-2">{r.description}</p>}
                      <button onClick={() => download(r.id, r.original_filename)}
                        className="w-full py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition"
                        style={{ background: 'rgba(0,229,255,0.14)', color: '#67E8F9', border: '1px solid rgba(0,229,255,0.35)' }}>
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
