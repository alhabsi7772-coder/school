import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Video, User, GraduationCap, LogOut, Send, MessageCircle, PlayCircle } from 'lucide-react';
import { API, GRADES } from '../../utils';
import LoginVideoBackground from '../LoginVideoBackground';
import { useStudentMode } from '../../hooks/useStudentMode';

export default function StudentVideoWatch() {
  const { code } = useParams();
  useStudentMode();
  const STORAGE_KEY = `vs_access_${code}`;

  const [phase, setPhase] = useState('checking'); // checking | join | watch | invalid
  const [info, setInfo] = useState(null);
  const [access, setAccess] = useState(null);
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [form, setForm] = useState({ student_name: '', grade: '', section: '' });
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/video-share/check/${code}`);
        setInfo(r.data);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const a = JSON.parse(saved);
          setAccess(a);
          await loadVideo(a.access_id);
          setPhase('watch');
        } else {
          setPhase('join');
        }
      } catch (e) {
        toast.error(e.response?.data?.detail || 'رابط الفيديو غير صحيح');
        setPhase('invalid');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const loadVideo = async (accessId) => {
    try {
      const [v, cs] = await Promise.all([
        axios.get(`${API}/video-share/${code}`, { params: { access_id: accessId } }),
        axios.get(`${API}/video-share/${code}/comments`, { params: { access_id: accessId } }),
      ]);
      setVideo(v.data);
      setComments(cs.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        setAccess(null); setPhase('join');
        return;
      }
      toast.error('فشل تحميل الفيديو');
    }
  };

  const refreshComments = async () => {
    try {
      const cs = await axios.get(`${API}/video-share/${code}/comments`, { params: { access_id: access.access_id } });
      setComments(cs.data);
    } catch (e) { /* silent */ }
  };

  const join = async (e) => {
    e.preventDefault();
    if (!form.student_name.trim() || !form.grade || !form.section) return toast.error('أكمل بياناتك');
    setBusy(true);
    try {
      const r = await axios.post(`${API}/video-share/${code}/access`, form);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r.data));
      setAccess(r.data);
      await loadVideo(r.data.access_id);
      setPhase('watch');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'تعذر الدخول');
    } finally { setBusy(false); }
  };

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await axios.post(`${API}/video-share/${code}/comments`, { access_id: access.access_id, text: t });
      setText('');
      refreshComments();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الإرسال');
    } finally { setSending(false); }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAccess(null); setVideo(null); setComments([]);
    setForm({ student_name: '', grade: '', section: '' });
    setPhase('join');
  };

  const sections = form.grade ? GRADES[form.grade] || [] : [];

  return (
    <div className="min-h-screen font-tajawal relative" style={{ background: '#0B1120' }}>
      <LoginVideoBackground accentRgb="213,0,249" overlay={0.65} />
      <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-3xl items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, rgba(213,0,249,0.22), rgba(213,0,249,0.10))', border: '1px solid rgba(213,0,249,0.40)', boxShadow: '0 8px 32px rgba(213,0,249,0.15)' }}>
            <Video className="w-8 h-8" style={{ color: '#E879F9' }} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">{info?.title || 'فيديو تعليمي'}</h1>
          {info && <p className="text-sm text-slate-300 mt-1">{info.school_name} · {info.owner_name}</p>}
        </div>

        {phase === 'checking' && <p className="text-center text-slate-400">جارٍ التحقق...</p>}

        {phase === 'invalid' && (
          <div className="rounded-3xl p-8 text-center max-w-md mx-auto"
            style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(248,113,113,0.25)' }}>
            <p className="text-red-300">الرمز غير صحيح أو الفيديو غير متاح حالياً</p>
          </div>
        )}

        {phase === 'join' && (
          <div className="max-w-md mx-auto rounded-3xl p-6 md:p-7"
            style={{ background: 'rgba(11,17,32,0.75)', border: '1px solid rgba(213,0,249,0.18)', boxShadow: '0 12px 48px rgba(213,0,249,0.10)', backdropFilter: 'blur(20px)' }}>
            <h2 className="text-lg font-black text-white mb-1">سجّل بياناتك لمشاهدة الفيديو</h2>
            <p className="text-xs text-slate-400 mb-5">ستتمكن من المشاهدة والتعليق بعد التسجيل</p>
            {info && info.grades && info.grades.length > 0 && (
              <div className="rounded-xl p-2.5 mb-4 text-xs flex items-center gap-2"
                style={{ background: 'rgba(100,181,246,0.08)', border: '1px solid rgba(100,181,246,0.20)', color: '#93C5FD' }}>
                <GraduationCap className="w-4 h-4 flex-shrink-0" />
                <span>هذا الفيديو مخصص للصفوف: {info.grades.join(' · ')}</span>
              </div>
            )}
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
              <button type="submit" disabled={busy} className="btn-primary rounded-2xl w-full">{busy ? 'جارٍ الدخول...' : 'مشاهدة الفيديو'}</button>
            </form>
          </div>
        )}

        {phase === 'watch' && access && video && (
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

            {/* Player */}
            <div className="lib-card !p-0 mb-4 overflow-hidden">
              <div className="aspect-video bg-black">
                {video.source_type === 'youtube' && video.youtube_id ? (
                  <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${video.youtube_id}?rel=0`}
                    title={video.title} allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                ) : video.source_type === 'upload' ? (
                  <video className="w-full h-full" controls controlsList="nodownload" preload="metadata"
                    src={`${API}/video-share/${code}/stream?access_id=${access.access_id}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <PlayCircle className="w-16 h-16" />
                  </div>
                )}
              </div>
              {video.description && (
                <div className="p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{video.description}</p>
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="lib-card">
              <h2 className="flex items-center gap-2 font-black text-white mb-3">
                <MessageCircle className="w-5 h-5 text-cyan-400" />التعليقات ({comments.length})
              </h2>

              {video.allow_comments !== false ? (
                <form onSubmit={send} className="flex gap-2 mb-4">
                  <input className="input-field flex-1" placeholder="اكتب تعليقاً..."
                    value={text} onChange={e => setText(e.target.value)} maxLength={1000} />
                  <button type="submit" disabled={sending || !text.trim()} className="btn-primary rounded-2xl px-4 flex items-center gap-1.5">
                    <Send className="w-4 h-4" />إرسال
                  </button>
                </form>
              ) : (
                <p className="text-center text-sm text-slate-500 py-2 mb-2">التعليقات مغلقة لهذا الفيديو</p>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-center text-slate-500 py-6 text-sm">كن أول من يعلّق</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.25)' }}>
                        <span className="text-cyan-300 font-bold text-xs">{(c.student_name || '?').charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-white text-sm">{c.student_name}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(100,181,246,0.10)', color: '#64B5F6' }}>{c.grade} · {c.section}</span>
                          <span className="text-xs text-slate-500">{new Date(c.created_at).toLocaleString('ar')}</span>
                        </div>
                        <p className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
