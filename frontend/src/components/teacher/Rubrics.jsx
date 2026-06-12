import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ClipboardCheck, Plus, Trash2, Pencil, Smartphone, AlertTriangle, ListChecks, Printer } from 'lucide-react';
import TeacherLayout from './TeacherLayout';
import ReleaseGradesButton from './ReleaseGradesButton';
import { API, getAuthHeaders } from '../../utils';
import { GB_FIELDS, GB_FIELDS_78, themeOfGrade } from '../../utils/gradebook';

const GRADES_56 = ['الخامس', 'السادس'];
const colLabel = (key, grade) => {
  const fields = (grade && !GRADES_56.includes(grade)) ? GB_FIELDS_78 : GB_FIELDS;
  return fields.find(f => f.key === key)?.label || key;
};
const semLabel = (s) => s === '2' ? 'الفصل الثاني' : 'الفصل الأول';

export default function Rubrics() {
  const navigate = useNavigate();
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const res = await axios.get(`${API}/rubrics`, getAuthHeaders());
      setRubrics(res.data);
    } catch { toast.error('تعذر تحميل بطاقات التقييم'); }
    finally { setLoading(false); }
  };

  const deleteRubric = async () => {
    try {
      await axios.delete(`${API}/rubrics/${deleteTarget.id}`, getAuthHeaders());
      toast.success('تم حذف بطاقة التقييم');
      setDeleteTarget(null);
      fetchAll();
    } catch { toast.error('تعذر الحذف'); }
  };

  return (
    <TeacherLayout title="التقييم السريع">
      {/* Header */}
      <div className="quiz-card rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(100,181,246,0.12)', border: '1px solid rgba(100,181,246,0.25)' }}>
            <Smartphone className="w-6 h-6" style={{ color: '#64B5F6' }} />
          </div>
          <div>
            <h2 className="font-bold text-white">بطاقات تقييم الأنشطة والمشاريع</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              صمّم بطاقة بمعايير ودرجات مثل النماذج الرسمية → قيّم كل طالب من هاتفك بلمسات → الدرجة تنتقل تلقائياً للسجل
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ReleaseGradesButton />
          <button onClick={() => navigate('/teacher/rubrics/new')} className="btn-primary flex items-center gap-2" data-testid="create-rubric-btn">
            <Plus className="w-4 h-4" />
            <span>بطاقة تقييم جديدة</span>
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(var(--theme-accent-rgb),0.2)', borderTopColor: 'var(--theme-accent)' }} />
        </div>
      ) : rubrics.length === 0 ? (
        <div className="quiz-card rounded-2xl p-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-hint)' }} />
          <p className="font-bold text-white mb-1">لا توجد بطاقات تقييم بعد</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            أنشئ بطاقة لكل نشاط عملي أو مشروع — مثلاً: "النشاط العملي الأول — وحدة أساسيات الحاسوب"
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="rubrics-grid">
          {rubrics.map(r => (
            <div key={r.id} className="quiz-card rounded-2xl p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(100,181,246,0.12)', border: '1px solid rgba(100,181,246,0.25)' }}>
                  <ClipboardCheck className="w-5 h-5" style={{ color: '#64B5F6' }} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/teacher/rubrics/${r.id}/print`)}
                    className="p-1.5 rounded-lg hover:bg-white/10" title="طباعة / تنزيل PDF" data-testid={`print-rubric-${r.id}`}>
                    <Printer className="w-4 h-4" style={{ color: '#FBBF24' }} />
                  </button>
                  <button onClick={() => navigate(`/teacher/rubrics/${r.id}/edit`)}
                    className="p-1.5 rounded-lg hover:bg-white/10" title="تعديل" data-testid={`edit-rubric-${r.id}`}>
                    <Pencil className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
                  </button>
                  <button onClick={() => setDeleteTarget(r)}
                    className="p-1.5 rounded-lg hover:bg-white/10" title="حذف" data-testid={`delete-rubric-${r.id}`}>
                    <Trash2 className="w-4 h-4" style={{ color: '#F87171' }} />
                  </button>
                </div>
              </div>
              <p className="font-bold text-white mb-2 leading-snug">{r.title}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {r.grade && (() => {
                  const th = themeOfGrade(r.grade);
                  return (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                      style={{ background: `rgba(${th.rgb},0.15)`, color: th.hex, border: `1px solid rgba(${th.rgb},0.3)` }}
                      data-testid={`rubric-grade-badge-${r.id}`}>
                      الصف {r.grade}
                    </span>
                  );
                })()}
                <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                  style={{ background: 'rgba(var(--theme-accent-rgb),0.12)', color: 'var(--theme-accent)' }}>
                  {r.criteria.length} معايير — {r.total_max} درجة
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                  style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399' }}>
                  → عمود: {colLabel(r.column, r.grade)}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                  style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>
                  {semLabel(r.semester)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <ListChecks className="w-3.5 h-3.5" />
                  {r.evaluation_count} تقييم
                </span>
                <button onClick={() => navigate(`/teacher/rubrics/${r.id}/evaluate`)}
                  data-testid={`evaluate-rubric-${r.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                  <Smartphone className="w-4 h-4" />
                  بدء التقييم
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="glass-modal rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F87171' }} />
              <p className="text-sm font-bold text-white">
                حذف بطاقة "{deleteTarget.title}" مع جميع تقييماتها؟ (الدرجات المنقولة للسجل لن تُحذف)
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'white' }}>إلغاء</button>
              <button onClick={deleteRubric} data-testid="confirm-delete-rubric"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.85)', color: 'white' }}>
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
