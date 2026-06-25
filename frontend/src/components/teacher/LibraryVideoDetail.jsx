import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Trash2, MessageCircle, Users, PlayCircle } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';

export default function LibraryVideoDetail() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [tab, setTab] = useState('comments');
  const [comments, setComments] = useState([]);
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [videoId]);

  const load = async () => {
    setLoading(true);
    try {
      const [vs, cs, vws] = await Promise.all([
        axios.get(`${API}/videos`, getAuthHeaders()),
        axios.get(`${API}/videos/${videoId}/comments`, getAuthHeaders()),
        axios.get(`${API}/videos/${videoId}/views`, getAuthHeaders()),
      ]);
      const v = vs.data.find(x => x.id === videoId);
      setVideo(v || null);
      setComments(cs.data);
      setViews(vws.data);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  };

  const deleteComment = async (cid) => {
    if (!window.confirm('حذف هذا التعليق؟')) return;
    try {
      await axios.delete(`${API}/videos/${videoId}/comments/${cid}`, getAuthHeaders());
      toast.success('تم الحذف');
      setComments(cs => cs.filter(c => c.id !== cid));
    } catch { toast.error('فشل الحذف'); }
  };

  if (loading) return <TeacherLayout title="تفاصيل الفيديو" backTo="/teacher/library/videos"><p className="text-center text-slate-500 py-12">جارٍ التحميل...</p></TeacherLayout>;
  if (!video) return <TeacherLayout title="تفاصيل الفيديو" backTo="/teacher/library/videos"><p className="text-center text-slate-500 py-12">الفيديو غير موجود</p></TeacherLayout>;

  return (
    <TeacherLayout title={video.title} backTo="/teacher/library/videos">
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Video Preview */}
        <div className="lg:col-span-2">
          <div className="lib-card !p-3">
            {video.source_type === 'youtube' && video.youtube_id ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden">
                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${video.youtube_id}`}
                  title={video.title} allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            ) : video.source_type === 'youtube' ? (
              <div className="aspect-video flex items-center justify-center text-slate-500 rounded-2xl bg-slate-900/40">رابط غير صالح</div>
            ) : (
              <div className="aspect-video rounded-2xl bg-slate-900/50 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <PlayCircle className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-sm">فيديو مرفوع — يُشاهد عبر رابط الطلاب</p>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Sidebar */}
        <div className="space-y-3">
          <div className="lib-card">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-3xl font-black" style={{ color: '#67E8F9' }}>{views.length}</p>
                <p className="text-xs text-slate-500 mt-1">مشاهد</p>
              </div>
              <div className="w-px bg-white/5" />
              <div>
                <p className="text-3xl font-black" style={{ color: '#F0ABFC' }}>{comments.length}</p>
                <p className="text-xs text-slate-500 mt-1">تعليق</p>
              </div>
            </div>
          </div>
          {video.description && (
            <div className="lib-card">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{video.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mt-6 mb-4">
        <button onClick={() => setTab('comments')} className="px-4 py-2 rounded-2xl font-bold text-sm flex items-center gap-1.5 transition"
          style={tab === 'comments'
            ? { background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,229,255,0.08))', color: '#67E8F9', border: '1px solid rgba(0,229,255,0.35)' }
            : { background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <MessageCircle className="w-4 h-4" />التعليقات ({comments.length})
        </button>
        <button onClick={() => setTab('views')} className="px-4 py-2 rounded-2xl font-bold text-sm flex items-center gap-1.5 transition"
          style={tab === 'views'
            ? { background: 'linear-gradient(135deg, rgba(213,0,249,0.18), rgba(213,0,249,0.08))', color: '#F0ABFC', border: '1px solid rgba(213,0,249,0.35)' }
            : { background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Users className="w-4 h-4" />المشاهدون ({views.length})
        </button>
      </div>

      {tab === 'comments' ? (
        comments.length === 0 ? (
          <p className="text-center text-slate-500 py-12">لا توجد تعليقات بعد</p>
        ) : (
          <div className="space-y-2">
            {comments.map(c => (
              <div key={c.id} className="lib-card !flex-row !gap-3 items-start">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.25)' }}>
                  <span className="text-cyan-300 font-bold text-sm">{(c.student_name || '?').charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-white text-sm">{c.student_name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(100,181,246,0.10)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.2)' }}>{c.grade} · {c.section}</span>
                    <span className="text-xs text-slate-500">{new Date(c.created_at).toLocaleString('ar')}</span>
                  </div>
                  <p className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{c.text}</p>
                </div>
                <button onClick={() => deleteComment(c.id)} className="p-1.5 rounded-md hover:bg-red-500/10" title="حذف">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        views.length === 0 ? (
          <p className="text-center text-slate-500 py-12">لم يشاهد أحد بعد</p>
        ) : (
          <div className="space-y-2">
            {views.map(v => (
              <div key={v.id} className="lib-card !flex-row !gap-3 items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">{v.student_name}</p>
                  <p className="text-xs text-slate-500">{v.grade} · شعبة {v.section}</p>
                </div>
                <span className="text-xs text-slate-500">{new Date(v.created_at).toLocaleString('ar')}</span>
              </div>
            ))}
          </div>
        )
      )}
    </TeacherLayout>
  );
}
