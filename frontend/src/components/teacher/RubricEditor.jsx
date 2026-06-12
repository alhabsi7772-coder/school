import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Trash2, Save, GripVertical, AlertCircle } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import { API, getAuthHeaders } from '../../utils';
import { GB_FIELDS } from '../../utils/gradebook';

const toLatinDigits = (s) => String(s)
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٫,]/g, '.');

const newCriterion = () => ({ key: Math.random().toString(36).slice(2), id: null, name: '', max: '' });

export default function RubricEditor() {
  const { rubricId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [semester, setSemester] = useState(() => localStorage.getItem('semester') === '2' ? '2' : '1');
  const [column, setColumn] = useState('p1');
  const [criteria, setCriteria] = useState([newCriterion(), newCriterion(), newCriterion()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!rubricId);

  useEffect(() => {
    if (!rubricId) return;
    axios.get(`${API}/rubrics/${rubricId}`, getAuthHeaders())
      .then(res => {
        const r = res.data;
        setTitle(r.title); setSemester(r.semester); setColumn(r.column);
        setCriteria(r.criteria.map(c => ({ key: c.id, id: c.id, name: c.name, max: String(c.max % 1 === 0 ? Math.round(c.max) : c.max) })));
      })
      .catch(() => toast.error('تعذر تحميل البطاقة'))
      .finally(() => setLoading(false));
  }, [rubricId]);

  const setCrit = (key, patch) => setCriteria(cs => cs.map(c => c.key === key ? { ...c, ...patch } : c));
  const removeCrit = (key) => setCriteria(cs => cs.filter(c => c.key !== key));

  const totalMax = criteria.reduce((s, c) => s + (parseFloat(c.max) || 0), 0);
  const colMax = GB_FIELDS.find(f => f.key === column)?.max || 0;

  const save = async (e) => {
    e.preventDefault();
    const valid = criteria.filter(c => c.name.trim() && parseFloat(c.max) > 0);
    if (!valid.length) { toast.error('أضف معياراً واحداً على الأقل باسم ودرجة'); return; }
    setSaving(true);
    try {
      const payload = {
        title, semester, column,
        criteria: valid.map(c => ({ id: c.id, name: c.name.trim(), max: parseFloat(c.max) }))
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
                {GB_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label} (من {f.max})</option>)}
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
                <input className="input-field flex-1" placeholder="مثال: فتح مستكشف الملفات"
                  value={c.name} onChange={e => setCrit(c.key, { name: e.target.value })}
                  data-testid={`rubric-crit-name-${i}`} />
                <input className="input-field w-20 text-center" placeholder="الدرجة" dir="ltr" inputMode="decimal"
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

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2" data-testid="rubric-save-btn">
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : rubricId ? 'حفظ التعديلات' : 'إنشاء البطاقة'}
        </button>
      </form>
    </TeacherLayout>
  );
}
