import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ChevronRight, Send, MessageCircle, PlayCircle } from 'lucide-react';
import { API } from '../../utils';
import { useStudentMode } from '../../hooks/useStudentMode';

export default function StudentVideoPlay() {
  const { code, videoId } = useParams();
  const navigate = useNavigate();
  useStudentMode();
  const STORAGE_KEY = `vlib_access_${code}`;

  const [access, setAccess] = useState(null);
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const commentsBoxRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) { navigate(`/v/${code}`); return; }
    const a = JSON.parse(saved);
    setAccess(a);
    load(a.access_id);
    // eslint-disable-next-line
  }, [videoId, code]);

  const load = async (accessId) => {
    setLoading(true);
    try {
      const [v, cs] = await Promise.all([
        axios.get(`${API}/videos-library/${code}/video/${videoId}`, { params: { access_id: accessId } }),
        axios.get(`${API}/videos-library/${code}/video/${videoId}/comments`, { params: { access_id: accessId } }),
      ]);
      setVideo(v.data); setComments(cs.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        navigate(`/v/${code}`); return;
      }
      toast.error(e.response?.data?.detail || 'تعذر التحميل');
    } finally { setLoading(false); }
  };

  const refreshComments = async () => {
    try {
      const cs = await axios.get(`${API}/videos-library/${code}/video/${videoId}/comments`, { params: { access_id: access.access_id } });
      setComments(cs.data);
    } catch (e) { /* ignore comment refresh errors */ }
  };

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await axios.post(`${API}/videos-library/${code}/video/${videoId}/comments`, { access_id: access.access_id, text: t });
      setText('');
      refreshComments();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الإرسال');
    } finally { setSending(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400" style={{ background: '#0B1120' }}>جارٍ التحميل...</div>;
  if (!video) return <div className="min-h-screen flex items-center justify-center text-slate-400" style={{ background: '#0B1120' }}>الفيديو غير متاح</div>;

  return (
    <div className="min-h-screen font-tajawal" style={{ background: '#0B1120' }}>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <button onClick={() => navigate(`/v/${code}`)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4">
          <ChevronRight className="w-4 h-4" />العودة لقائمة الفيديوهات
        </button>

        {/* Player */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="aspect-video bg-black">
            {video.source_type === 'youtube' && video.youtube_id ? (
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${video.youtube_id}?rel=0`}
                title={video.title} allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            ) : (
              <video className="w-full h-full" controls controlsList="nodownload" preload="metadata"
                src={`${API}/videos-library/${code}/video/${videoId}/stream?access_id=${access.access_id}`} />
            )}
          </div>
          <div className="p-4">
            <h1 className="text-lg md:text-xl font-bold text-white mb-1">{video.title}</h1>
            {video.description && <p className="text-sm text-slate-400 whitespace-pre-wrap">{video.description}</p>}
          </div>
        </div>

        {/* Comments */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="flex items-center gap-2 font-bold text-white mb-3">
            <MessageCircle className="w-5 h-5 text-cyan-400" />التعليقات ({comments.length})
          </h2>

          {video.allow_comments !== false && (
            <form onSubmit={send} className="flex gap-2 mb-4">
              <input className="input-field flex-1" placeholder="اكتب تعليقاً..."
                value={text} onChange={e => setText(e.target.value)} maxLength={1000} />
              <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-4 flex items-center gap-1.5">
                <Send className="w-4 h-4" />إرسال
              </button>
            </form>
          )}
          {video.allow_comments === false && (
            <p className="text-center text-sm text-slate-500 py-2">التعليقات مغلقة لهذا الفيديو</p>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto" ref={commentsBoxRef}>
            {comments.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-sm">كن أول من يعلّق</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
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
      </div>
    </div>
  );
}
