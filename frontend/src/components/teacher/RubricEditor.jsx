import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Trash2, Save, GripVertical, AlertCircle, ImagePlus } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';
import { GB_FIELDS, GB_FIELDS_78 } from '../../utils/gradebook';
import useGlobalSemester from '../../utils/useGlobalSemester';

const ALL_GRADES = ['الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
const GRADES_56 = ['الخامس', 'السادس'];
const fieldsOfGrade = (g) => (GRADES_56.includes(g) ? GB_FIELDS : GB_FIELDS_78);

const toLatinDigits = (s) => String(s)
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٫,]/g, '.');

const newCriterion = () => ({ key: Math.random().toString(36).slice(2), id: null, name: '', max: '' });

export default function RubricEditor() {
  const { rubricId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('الخامس');
  const [semester, setSemester] = useGlobalSemester();
  const [column, setColumn] = useState('p1');
  const [criteria, setCriteria] = useState([newCriterion(), newCriterion(), newCriterion()]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!rubricId);

  // أعمدة السجل المتاحة حسب الصف
  const availableFields = fieldsOfGrade(grade);

  useEffect(() => {
    if (!rubricId) return;
    axios.get(`${API}/rubrics/${rubricId}`, getAuthHeaders())
      .then(res => {
        const r = res.data;
        setTitle(r.title); setSemester(r.semester); setColumn(r.column);
        if (r.grade) setGrade(r.grade);
        setCriteria(r.criteria.map(c => ({ key: c.id, id: c.id, name: c.name, max: String(c.max % 1 === 0 ? Math.round(c.max) : c.max) })));
        setImages(Array.isArray(r.images) ? r.images : []);
      })
      .catch(() => toast.error('تعذر تحميل البطاقة'))
      .finally(() => setLoading(false));
  }, [rubricId]);

  // عند تغيير الصف، إذا كان العمود الحالي غير متاح، نعيد ضبطه
  const handleGradeChange = (g) => {
    setGrade(g);
    const next = fieldsOfGrade(g);
    if (!next.find(f => f.key === column)) {
      setColumn(next[0]?.key || 'p1');
    }
  };

  const setCrit = (key, patch) => setCriteria(cs => cs.map(c => c.key === key ? { ...c, ...patch } : c));
  const removeCrit = (key) => setCriteria(cs => cs.filter(c => c.key !== key));

  const uploadImages = async (files) => {
    if (!files || files.length === 0) return;
    if (images.length + files.length > 8) {
      toast.error('الحد الأقصى 8 صور لكل بطاقة');
      return;
    }
    setUploading(true);
    const added = [];
    for (const file of files) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error(`الصورة "${file.name}" أكبر من 3MB`);
        continue;
      }
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API}/upload-image`, fd, {
          headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' },
        });
        added.push(res.data.image_url);
      } catch { toast.error(`تعذر رفع ${file.name}`); }
    }
    if (added.length) setImages(prev => [...prev, ...added]);
    setUploading(false);
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const totalMax = criteria.reduce((s, c) => s + (parseFloat(c.max) || 0), 0);
  const colMax = availableFields.find(f => f.key === column)?.max || 0;

  const save = async (e) => {
    e.preventDefault();
    const valid = criteria.filter(c => c.name.trim() && parseFloat(c.max) > 0);
    if (!valid.length) { toast.error('أضف معياراً واحداً على الأقل باسم ودرجة'); return; }
    setSaving(true);
    try {
      const payload = {
        title, grade, semester, column,
        criteria: valid.map(c => ({ id: c.id, name: c.name.trim(), max: parseFloat(c.max) })),
        images,
      };
      if (rubricId) await axios.put(`${API}/rubrics/${rubricId}`, payload, getAuthHeaders());
      else await axios.post(`${API}/rubrics`, payload, getAuthHeaders());
      toast.success(rubricId ? 'تم تحديث البطاقة' : 'تم إنشاء بطاقة التقييم');
      navigate('/teacher/rubrics');
    } catch (err) { toast.error(err.response?.data?.detail || 'تعذر الحفظ'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <TeacherLayout title="بطاقة تقييم" backTo="/teacher/rubrics">
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>جارٍ التحميل...</div>
    </TeacherLayout>
  );

  return (
    <TeacherLayout title={rubricId ? 'تعديل بطاقة التقييم' : 'بطاقة تقييم جديدة'} backTo="/teacher/rubrics">
      <form onSubmit={save} className="max-w-3xl space-y-5">
        {/* Title */}
        <div className="quiz-card rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>عنوان البطاقة</label>
            <input className="input-field" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="مثال: النشاط العملي الأول — وحدة أساسيات الحاسوب (الصف الخامس)"
              data-testid="rubric-title-input" />
          </div>

          {/* الصف */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>الصف الدراسي</label>
            <div className="flex flex-wrap gap-2" data-testid="rubric-grade-picker">
              {ALL_GRADES.map(g => (
                <button type="button" key={g} onClick={() => handleGradeChange(g)} data-testid={`rubric-grade-${g}`}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={grade === g
                    ? { background: 'rgba(var(--theme-accent-rgb),0.15)', color: 'var(--theme-accent)', border: '1px solid rgba(var(--theme-accent-rgb),0.4)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>الفصل الدراسي</label>
              <div className="flex gap-2">
                {[['1', 'الفصل الأول'], ['2', 'الفصل الثاني']].map(([v, l]) => (
                  <button type="button" key={v} onClick={() => setSemester(v)} data-testid={`rubric-sem-${v}`}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={semester === v
                      ? { background: 'rgba(var(--theme-accent-rgb),0.15)', color: 'var(--theme-accent)', border: '1px solid rgba(var(--theme-accent-rgb),0.4)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                عمود السجل الذي تنتقل إليه الدرجة
              </label>
              <select className="input-field" value={column} onChange={e => setColumn(e.target.value)} data-testid="rubric-column-select">
                {availableFields.map(f => <option key={f.key} value={f.key}>{f.label} (من {f.max})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Criteria — مثل جدول النموذج الرسمي */}
        <div className="quiz-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">المعايير / المهارات العملية</h3>
            <span className="px-3 py-1 rounded-lg text-sm font-black"
              style={{ background: 'rgba(var(--theme-accent-rgb),0.12)', color: 'var(--theme-accent)' }}
              data-testid="rubric-total-badge">
              المجموع: {totalMax % 1 === 0 ? totalMax : totalMax.toFixed(1)}
            </span>
          </div>
          <div className="space-y-2">
            {criteria.map((c, i) => (
              <div key={c.key} className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-hint)' }} />
                <span className="w-6 text-center text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                <input className="input-field" style={{ flex: '1 1 0%', minWidth: 0 }} placeholder="مثال: فتح مستكشف الملفات"
                  value={c.name} onChange={e => setCrit(c.key, { name: e.target.value })}
                  data-testid={`rubric-crit-name-${i}`} />
                <input className="input-field text-center" style={{ flex: '0 0 5.5rem', width: '5.5rem' }} placeholder="الدرجة" dir="ltr" inputMode="decimal"
                  value={c.max}
                  onChange={e => {
                    const t = toLatinDigits(e.target.value);
                    if (/^\d*\.?\d*$/.test(t)) setCrit(c.key, { max: t });
                  }}
                  data-testid={`rubric-crit-max-${i}`} />
                <button type="button" onClick={() => removeCrit(c.key)} className="p-2 rounded-lg hover:bg-white/10 flex-shrink-0"
                  data-testid={`rubric-crit-delete-${i}`}>
                  <Trash2 className="w-4 h-4" style={{ color: '#F87171' }} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setCriteria(cs => [...cs, newCriterion()])}
            data-testid="rubric-add-criterion-btn"
            className="mt-3 flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(var(--theme-accent-rgb),0.1)', color: 'var(--theme-accent)', border: '1px solid rgba(var(--theme-accent-rgb),0.25)' }}>
            <Plus className="w-4 h-4" /> إضافة معيار
          </button>

          {totalMax > 0 && totalMax !== colMax && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl text-sm"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#FBBF24' }}
              data-testid="rubric-scale-warning">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                مجموع البطاقة ({totalMax % 1 === 0 ? totalMax : totalMax.toFixed(1)}) يختلف عن درجة العمود ({colMax}) —
                سيتم تحويل الدرجة تلقائياً عند النقل للسجل (مثال: {totalMax % 1 === 0 ? totalMax : totalMax.toFixed(1)}/{totalMax % 1 === 0 ? totalMax : totalMax.toFixed(1)} → {colMax}/{colMax})
              </span>
            </div>
          )}
        </div>

        {/* صور مرفقة بالبطاقة (مرجعية) */}
        <div className="quiz-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <ImagePlus className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
              صور مرفقة بالبطاقة
              <span className="text-[11px] font-normal" style={{ color: 'var(--text-hint)' }}>(اختياري — حتى 8 صور)</span>
            </h3>
            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }} data-testid="rubric-images-count">
              {images.length} / 8
            </span>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3" data-testid="rubric-editor-images">
              {images.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group"
                  data-testid={`rubric-editor-img-${i}`}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)}
                    data-testid={`rubric-editor-img-remove-${i}`}
                    className="absolute top-1 left-1 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    style={{ background: 'rgba(239,68,68,0.9)', color: 'white' }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.01]"
            data-testid="rubric-editor-upload-label"
            style={{ background: 'rgba(var(--theme-accent-rgb),0.1)', color: 'var(--theme-accent)', border: '1px dashed rgba(var(--theme-accent-rgb),0.4)' }}>
            <ImagePlus className="w-4 h-4" />
            {uploading ? 'جارٍ الرفع...' : images.length === 0 ? 'إضافة صور (من المعرض أو الكاميرا)' : 'إضافة المزيد'}
            <input type="file" accept="image/*" multiple className="hidden"
              data-testid="rubric-editor-image-input"
              disabled={uploading || images.length >= 8}
              onChange={e => { uploadImages(e.target.files); e.target.value = ''; }} />
          </label>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2" data-testid="rubric-save-btn">
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : rubricId ? 'حفظ التعديلات' : 'إنشاء البطاقة'}
        </button>
      </form>
    </TeacherLayout>
  );
}
