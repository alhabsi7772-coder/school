import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Download, FileText, Users, Calendar, File } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';

const FILE_ICON_COLOR = (ct = '') => {
  if (ct.includes('pdf')) return 'text-red-500 bg-red-50';
  if (ct.includes('word') || ct.includes('document')) return 'text-blue-500 bg-blue-50';
  if (ct.includes('sheet') || ct.includes('excel')) return 'text-green-600 bg-green-50';
  if (ct.includes('image')) return 'text-purple-500 bg-purple-50';
  if (ct.includes('zip') || ct.includes('rar') || ct.includes('compressed')) return 'text-orange-500 bg-orange-50';
  return 'text-slate-500 bg-slate-100';
};

const formatBytes = (n = 0) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

export default function ProjectSubmissions() {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => { fetchData(); }, [projectId]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/submissions`, getAuthHeaders());
      setData(res.data);
    } catch { toast.error('تعذر تحميل التسليمات'); }
    finally { setLoading(false); }
  };

  const downloadFile = async (fileId, filename) => {
    setDownloading(fileId);
    try {
      const res = await axios.get(`${API}/project-file/${fileId}`, getAuthHeaders());
      const { data_base64, content_type } = res.data;
      const byteStr = atob(data_base64);
      const arr = new Uint8Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
      const blob = new Blob([arr], { type: content_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('تعذر تحميل الملف'); }
    finally { setDownloading(null); }
  };

  if (loading) return <TeacherLayout title="التسليمات" backTo="/teacher/projects"><div className="text-center py-16 text-slate-400">جارٍ التحميل...</div></TeacherLayout>;

  const { project, submissions } = data || {};

  return (
    <TeacherLayout title={`تسليمات: ${project?.title || ''}`} backTo="/teacher/projects">
      {/* Project info card */}
      <div className="quiz-card p-5 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">{project?.title}</h2>
            {project?.description && <p className="text-sm text-slate-500 mt-1">{project.description}</p>}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{submissions?.length || 0} تسليم</span>
            {project?.deadline && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />آخر موعد: {new Date(project.deadline).toLocaleDateString('ar-KW')}</span>}
            <span className="font-mono bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold">{project?.code}</span>
          </div>
        </div>
      </div>

      {/* Submissions */}
      {!submissions?.length ? (
        <div className="quiz-card p-16 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">لم يسلّم أي طالب بعد</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((sub, i) => (
            <div key={sub.id} className="quiz-card p-5">
              {/* Student header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{sub.student_name}</p>
                    <p className="text-xs text-slate-500">{sub.grade} / الشعبة {sub.section}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-400">
                    {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('ar-KW', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub.files?.length || 0} ملف</p>
                </div>
              </div>

              {/* Files list */}
              <div className="space-y-2">
                {(sub.files || []).map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${FILE_ICON_COLOR(f.content_type)}`}>
                      <File className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{f.filename}</p>
                      <p className="text-xs text-slate-400">{formatBytes(f.size_bytes)}</p>
                    </div>
                    <button onClick={() => downloadFile(f.id, f.filename)} disabled={downloading === f.id}
                      data-testid={`download-file-${f.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50 flex-shrink-0">
                      {downloading === f.id
                        ? <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        : <Download className="w-3.5 h-3.5" />}
                      تحميل
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
