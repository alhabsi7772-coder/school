import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Video, User, GraduationCap, LogOut, PlayCircle } from 'lucide-react';
import { API, GRADES } from '../../utils';
import LoginVideoBackground from '../LoginVideoBackground';
import { useStudentMode } from '../../hooks/useStudentMode';

export default function StudentVideoLibrary() {
  const { code } = useParams();
  const navigate = useNavigate();
  useStudentMode();
  const STORAGE_KEY = `vlib_access_${code}`;

  const [phase, setPhase] = useState('checking');
  const [info, setInfo] = useState(null);
  const [access, setAccess] = useState(null);
  const [videos, setVideos] = useState([]);
  const [form, setForm] = useState({ student_name: '', grade: '', section: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/videos-library/check/${code}`);
        setInfo(r.data);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const a = JSON.parse(saved);
          setAccess(a); setPhase('list');
          load(a.access_id);
        } else {
          setPhase('join');
        }
      } catch (e) {
        toast.error(e.response?.data?.detail || 'رمز غير صحيح');
        setPhase('invalid');
      }
    })();
    // eslint-disable-next-line
  }, [code]);

  const load = async (accessId) => {
    try {
      const r = await axios.get(`${API}/videos-library/${code}/videos`, { params: { access_id: accessId } });
      setVideos(r.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        setAccess(null); setPhase('join'); return;
      }
      toast.error('فشل التحميل');
    }
  };

  const join = async (e) => {
    e.preventDefault();
    if (!form.student_name.trim() || !form.grade || !form.section) return toast.error('أكمل بياناتك');
    setBusy(true);
    try {
      const r = await axios.post(`${API}/videos-library/${code}/access`, form);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r.data));
      setAccess(r.data); setPhase('list');
      load(r.data.access_id);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'تعذر الدخول');
    } finally { setBusy(false); }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAccess(null); setPhase('join');
    setForm({ student_name: '', grade: '', section: '' });
  };

  const sections = form.grade ? GRADES[form.grade] || [] : [];

  return (
    <div className="min-h-screen font-tajawal relative" style={{ background: '#0B1120' }}>
      <LoginVideoBackground accentRgb="213,0,249" overlay={0.65} />
      <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, rgba(213,0,249,0.22), rgba(213,0,249,0.10))', border: '1px solid rgba(213,0,249,0.40)' }}>
            <Video className="w-8 h-8" style={{ color: '#E879F9' }} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">مكتبة <span className="neon-text-fuchsia">الفيديوهات</span></h1>
          {info && <p className="text-sm text-slate-300 mt-1">{info.school_name} · {info.owner_name}</p>}
        </div>

        {phase === 'checking' && <p className="text-center text-slate-400">جارٍ التحقق...</p>}

        {phase === 'invalid' && (
          <div className="glass-modal rounded-2xl p-8 text-center"><p className="text-red-300">الرمز غير صحيح</p></div>
        )}

        {phase === 'join' && (
          <div className="max-w-md mx-auto glass-modal rounded-3xl p-6"
            style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold text-white mb-1">سجّل بياناتك</h2>
            <p className="text-xs text-slate-400 mb-4">لمشاهدة الفيديوهات والتعليق</p>
            <form onSubmit={join} className="space-y-3">
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(213,0,249,0.5)' }} />
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
              <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'جارٍ الدخول...' : 'دخول'}</button>
            </form>
          </div>
        )}

        {phase === 'list' && access && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 px-1">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <GraduationCap className="w-4 h-4" style={{ color: '#E879F9' }} />
                <span>{access.student_name} · {access.grade} · شعبة {access.section}</span>
              </div>
              <button onClick={logout} className="text-xs text-slate-400 hover:text-red-300 flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" />تغيير البيانات
              </button>
            </div>

            {videos.length === 0 ? (
              <div className="glass-modal rounded-2xl p-12 text-center text-slate-400">
                <Video className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                لا توجد فيديوهات متاحة لصفك حالياً
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map(v => (
                  <button key={v.id} onClick={() => navigate(`/v/${code}/${v.id}`)}
                    className="glass-card text-right flex flex-col gap-3 hover:scale-[1.02] transition" style={{ background: 'rgba(11,17,32,0.55)' }}>
                    <div className="relative rounded-xl overflow-hidden aspect-video" style={{ background: '#0B1120' }}>
                      {v.source_type === 'youtube' && v.youtube_id ? (
                        <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                          <PlayCircle className="w-12 h-12 text-slate-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <PlayCircle className="w-12 h-12 text-white/90" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm line-clamp-1">{v.title}</h3>
                      {v.description && <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{v.description}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
