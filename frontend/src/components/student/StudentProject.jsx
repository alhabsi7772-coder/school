import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Upload, X, File, CheckCircle, CloudUpload, Calendar } from 'lucide-react';
import { GRADES } from '../../utils';
import { useStudentMode } from '../../hooks/useStudentMode';

const API = process.env.REACT_APP_BACKEND_URL;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 15;

const formatBytes = (n) => n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

const fileToBase64 = (file) => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = () => {
    const b64 = reader.result.split(',')[1];
    res(b64);
  };
  reader.onerror = rej;
  reader.readAsDataURL(file);
});

export default function StudentProject() {
  const { code } = useParams();
  useStudentMode();
  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [form, setForm] = useState({ student_name: '', grade: '', section: '' });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef();
  const sections = GRADES[form.grade] || [];

  useEffect(() => {
    axios.get(`${API}/api/project/${code}/info`)
      .then(r => setProject(r.data))
      .catch(() => setProject(null))
      .finally(() => setLoadingProject(false));
  }, [code]);

  const addFiles = (newFiles) => {
    const valid = [];
    for (const f of newFiles) {
      if (f.size > MAX_FILE_SIZE) { toast.error(`${f.name}: الحجم أكبر من 20MB`); continue; }
      if (files.length + valid.length >= MAX_FILES) { toast.error(`الحد الأقصى ${MAX_FILES} ملفات`); break; }
      if (files.find(x => x.name === f.name && x.size === f.size)) continue;
      valid.push(f);
    }
    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles([...e.dataTransfer.files]);
  };

  const submit = async () => {
    if (!form.student_name.trim()) return toast.error('أدخل اسمك');
    if (!form.grade) return toast.error('اختر الصف');
    if (!form.section) return toast.error('اختر الشعبة');
    if (!files.length) return toast.error('أرفق ملفاً واحداً على الأقل');
    setSubmitting(true);
    try {
      const filesData = await Promise.all(files.map(async f => ({
        filename: f.name,
        content_type: f.type || 'application/octet-stream',
        data_base64: await fileToBase64(f),
        size_bytes: f.size
      })));
      await axios.post(`${API}/api/project/${code}/submit`, {
        student_name: form.student_name,
        grade: form.grade,
        section: String(form.section),
        files: filesData
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'تعذر التسليم، حاول مرة أخرى');
    } finally { setSubmitting(false); }
  };

  if (loadingProject) return (
    <div className="min-h-screen page-bg flex items-center justify-center font-tajawal">
      <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!project) return (
    <div className="min-h-screen page-bg flex items-center justify-center font-tajawal">
      <div className="text-center quiz-card p-10 max-w-sm mx-4">
        <p className="text-4xl mb-3">🔍</p>
        <h2 className="font-bold text-slate-900 text-xl mb-2">المشروع غير موجود</h2>
        <p className="text-slate-500 text-sm">تأكد من الرابط أو تواصل مع المعلم</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen page-bg flex items-center justify-center font-tajawal p-4">
      <div className="quiz-card p-10 max-w-sm w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="font-bold text-slate-900 text-2xl mb-2">تم التسليم!</h2>
        <p className="text-slate-500">تم استلام مشروعك بنجاح</p>
        <p className="text-sm text-violet-600 font-semibold mt-4">{project.title}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen page-bg font-tajawal py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="quiz-card p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-violet-600 font-semibold mb-0.5">تسليم مشروع</p>
              <h1 className="font-bold text-slate-900 text-lg">{project.title}</h1>
              {project.description && <p className="text-sm text-slate-500 mt-1">{project.description}</p>}
              {project.deadline && (
                <p className="text-xs text-orange-600 flex items-center gap-1 mt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  آخر موعد: {new Date(project.deadline).toLocaleDateString('ar-KW')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Student info */}
        <div className="quiz-card p-5 space-y-4">
          <h2 className="font-bold text-slate-800 text-sm">معلوماتك</h2>
          <input className="input-field" placeholder="الاسم الكامل *" value={form.student_name}
            onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">الصف</label>
              <select className="input-field" value={form.grade}
                onChange={e => setForm(p => ({ ...p, grade: e.target.value, section: '' }))}>
                <option value="">اختر</option>
                {Object.keys(GRADES).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">الشعبة</label>
              <select className="input-field" value={form.section} disabled={!form.grade}
                onChange={e => setForm(p => ({ ...p, section: e.target.value }))}>
                <option value="">اختر</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* File upload */}
        <div className="quiz-card p-5">
          <h2 className="font-bold text-slate-800 text-sm mb-3">
            الملفات <span className="text-slate-400 font-normal">({files.length}/{MAX_FILES}) · أي صيغة · حتى 20MB لكل ملف</span>
          </h2>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="file-drop-zone"
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/40'}`}
          >
            <CloudUpload className={`w-10 h-10 mx-auto mb-2 ${dragging ? 'text-violet-500' : 'text-slate-300'}`} />
            <p className="text-sm text-slate-500">اسحب الملفات هنا أو <span className="text-violet-600 font-semibold">اضغط للاختيار</span></p>
            <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, صور, ZIP, وغيرها...</p>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={e => { addFiles([...e.target.files]); e.target.value = ''; }} />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(f.size)}</p>
                  </div>
                  <button onClick={() => removeFile(i)} data-testid={`remove-file-${i}`}
                    className="p-1 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button onClick={submit} disabled={submitting} data-testid="submit-project-btn"
          className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-60">
          {submitting ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />جارٍ التسليم...</>
          ) : (
            <><Upload className="w-5 h-5" />تسليم المشروع</>
          )}
        </button>
      </div>
    </div>
  );
}
