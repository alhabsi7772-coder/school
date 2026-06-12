import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Printer, ArrowRight, FileText, Users } from 'lucide-react';
import { API, getAuthHeaders } from '../../utils';
import { GB_FIELDS } from '../../utils/gradebook';

const colLabel = (key) => GB_FIELDS.find(f => f.key === key)?.label || key;
const semLabel = (s) => (s === '2' ? 'الفصل الثاني' : 'الفصل الأول');
const fmt = (v) => v == null ? '' : (v % 1 === 0 ? Math.round(v) : v.toFixed(1));

export default function RubricPrint() {
  const { rubricId } = useParams();
  const navigate = useNavigate();
  const [rubric, setRubric] = useState(null);
  const [gradebooks, setGradebooks] = useState([]);
  const [gbId, setGbId] = useState('');
  const [gb, setGb] = useState(null);
  const [evals, setEvals] = useState({});
  const [mode, setMode] = useState('filled'); // 'filled' | 'blank' | 'class'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/rubrics/${rubricId}`, getAuthHeaders()),
      axios.get(`${API}/gradebooks`, getAuthHeaders()),
    ]).then(([r, g]) => { setRubric(r.data); setGradebooks(g.data); })
      .catch(() => toast.error('تعذر التحميل'))
      .finally(() => setLoading(false));
  }, [rubricId]);

  useEffect(() => {
    if (!gbId) { setGb(null); setEvals({}); return; }
    Promise.all([
      axios.get(`${API}/gradebooks/${gbId}`, getAuthHeaders()),
      axios.get(`${API}/rubrics/${rubricId}/evaluations?gradebook_id=${gbId}`, getAuthHeaders()),
    ]).then(([g, e]) => {
      setGb(g.data);
      setEvals(Object.fromEntries(e.data.map(ev => [ev.student_id, ev])));
    }).catch(() => toast.error('تعذر تحميل بيانات السجل'));
  }, [gbId, rubricId]);

  // Decide what to render: blank template, per-student filled, or class summary
  const students = useMemo(() => {
    if (mode === 'blank') return [{ id: 'blank', name: '', section: '', grade: '' }];
    if (!gb) return [];
    if (mode === 'class') return [{ ...gb, isClass: true }];
    return gb.students || [];
  }, [mode, gb]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B1120', color: 'white' }}>
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <>
      {/* Print-only stylesheet */}
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; }
          .print-page:last-child { page-break-after: auto; }
        }
        .print-page {
          width: 210mm; min-height: 297mm; padding: 14mm 12mm;
          background: #fff; color: #1a1a1a; font-family: 'Tajawal', 'Cairo', sans-serif;
          margin: 0 auto 12mm; box-shadow: 0 6px 28px rgba(0,0,0,0.35);
          box-sizing: border-box; position: relative;
          display: flex; flex-direction: column;
        }
        .print-header { text-align: center; margin-bottom: 6mm; }
        .print-header .line-1 { font-weight: 800; font-size: 14pt; }
        .print-header .line-2 { font-weight: 700; font-size: 13pt; margin-top: 1mm; }
        .print-header .line-3 { font-weight: 700; font-size: 12pt; margin-top: 1mm; }
        .print-divider { border-top: 2px solid #1a1a1a; margin: 4mm 0 6mm; }
        .print-title { text-align: center; font-weight: 800; font-size: 16pt; margin: 2mm 0 5mm; }
        .print-meta-row { display: flex; gap: 10mm; margin-bottom: 5mm; font-size: 12pt; font-weight: 600; }
        .print-meta-row .field { flex: 1; border-bottom: 1.5px dotted #1a1a1a; padding-bottom: 1mm; }
        .print-meta-row .field span.label { font-weight: 800; }
        .print-meta-row .field span.value { font-weight: 600; margin-right: 2mm; }
        .print-table { width: 100%; border-collapse: collapse; margin-top: 2mm; font-size: 11.5pt; }
        .print-table th, .print-table td { border: 1.4px solid #1a1a1a; padding: 2.6mm 3mm; vertical-align: middle; }
        .print-table th { background: #f0f0f0; font-weight: 800; text-align: center; }
        .print-table .col-no { width: 10mm; text-align: center; }
        .print-table .col-max { width: 22mm; text-align: center; }
        .print-table .col-score { width: 26mm; text-align: center; font-weight: 800; font-size: 13pt; }
        .print-table .total-row td { background: #f0f0f0; font-weight: 800; font-size: 12.5pt; }
        .print-footer { margin-top: auto; display: flex; gap: 16mm; padding-top: 14mm; font-size: 11pt; }
        .print-footer .sig { flex: 1; }
        .print-footer .sig .label { font-weight: 800; }
        .print-footer .sig .line { border-top: 1.4px dotted #1a1a1a; margin-top: 18mm; }
        .print-table.class-table .name-col { text-align: right; min-width: 50mm; }
        .print-table.class-table th, .print-table.class-table td { padding: 2mm; font-size: 10.5pt; }
      `}</style>

      {/* Top control bar (hidden when printing) */}
      <div className="no-print sticky top-0 z-50 px-5 py-3 flex items-center gap-3 flex-wrap"
        style={{ background: '#0B1120', borderBottom: '1px solid rgba(255,255,255,0.08)' }} dir="rtl">
        <button onClick={() => navigate('/teacher/rubrics')} data-testid="print-back-btn"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'white' }}>
          <ArrowRight className="w-4 h-4" /> رجوع
        </button>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span className="text-xs font-bold text-white">النمط:</span>
          {[
            ['filled', 'مملوءة لكل طالب', <Users className="w-3.5 h-3.5" key="i1" />],
            ['class', 'جدول الصف كامل', <FileText className="w-3.5 h-3.5" key="i2" />],
            ['blank', 'نموذج فارغ', <FileText className="w-3.5 h-3.5" key="i3" />],
          ].map(([v, l, icn]) => (
            <button key={v} onClick={() => setMode(v)} data-testid={`print-mode-${v}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all"
              style={mode === v
                ? { background: 'var(--theme-accent)', color: '#0B1120' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.7)' }}>
              {icn} {l}
            </button>
          ))}
        </div>

        {mode !== 'blank' && (
          <select value={gbId} onChange={e => setGbId(e.target.value)} data-testid="print-gb-select"
            className="px-3 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="">— اختر الصف/الشعبة —</option>
            {gradebooks.map(g => (
              <option key={g.id} value={g.id}>الصف {g.grade}/{g.section} ({g.student_count} طالب)</option>
            ))}
          </select>
        )}

        <button onClick={() => window.print()} data-testid="print-trigger-btn"
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]"
          style={{ background: '#34D399', color: '#0B1120' }}>
          <Printer className="w-4 h-4" /> طباعة / حفظ PDF
        </button>
      </div>

      <div className="py-6" style={{ background: '#1E2A3A', minHeight: '100vh' }} dir="rtl">
        {mode !== 'blank' && !gb && (
          <div className="no-print text-center py-20" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-bold mb-1">اختر الصف/الشعبة من الأعلى</p>
            <p className="text-xs">سيظهر النموذج هنا للمعاينة قبل الطباعة</p>
          </div>
        )}

        {mode === 'blank' && (
          <PrintCard rubric={rubric} student={null} evaluation={null} isBlank />
        )}

        {mode === 'filled' && gb && (gb.students || []).map(st => (
          <PrintCard key={st.id} rubric={rubric} student={st} evaluation={evals[st.id]}
            grade={gb.grade} section={gb.section} />
        ))}

        {mode === 'class' && gb && (
          <ClassSummary rubric={rubric} gb={gb} evals={evals} />
        )}
      </div>
    </>
  );
}

function PrintCard({ rubric, student, evaluation, isBlank, grade, section }) {
  const scores = evaluation?.scores || {};
  const studentName = isBlank ? '' : (student?.name || '');
  const gradeStr = isBlank ? '' : `${grade || ''}/${section || ''}`;

  return (
    <div className="print-page">
      <Header />
      <div className="print-divider" />
      <div className="print-title">{rubric.title}</div>

      <div className="print-meta-row">
        <div className="field">
          <span className="label">الاسم:</span>
          <span className="value">{studentName}</span>
        </div>
        <div className="field" style={{ flex: '0 0 50mm' }}>
          <span className="label">الصف:</span>
          <span className="value">{gradeStr}</span>
        </div>
      </div>

      <div className="print-meta-row">
        <div className="field">
          <span className="label">النشاط/المهارة:</span>
          <span className="value">{colLabel(rubric.column)}</span>
        </div>
        <div className="field" style={{ flex: '0 0 50mm' }}>
          <span className="label">الفصل:</span>
          <span className="value">{semLabel(rubric.semester)}</span>
        </div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th className="col-no">م</th>
            <th>المعيار / المهارة</th>
            <th className="col-max">الدرجة القصوى</th>
            <th className="col-score">الدرجة</th>
          </tr>
        </thead>
        <tbody>
          {rubric.criteria.map((c, i) => (
            <tr key={c.id}>
              <td className="col-no">{i + 1}</td>
              <td>{c.name}</td>
              <td className="col-max">{fmt(c.max)}</td>
              <td className="col-score">{isBlank ? '' : (scores[c.id] != null ? fmt(scores[c.id]) : '')}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan={2} style={{ textAlign: 'left' }}>المجموع الكلّي</td>
            <td className="col-max">{fmt(rubric.total_max)}</td>
            <td className="col-score">{isBlank ? '' : (evaluation?.total != null ? fmt(evaluation.total) : '')}</td>
          </tr>
        </tbody>
      </table>

      <div className="print-footer">
        <div className="sig">
          <div className="label">اسم المعلم:</div>
          <div className="line" />
        </div>
        <div className="sig">
          <div className="label">التوقيع:</div>
          <div className="line" />
        </div>
        <div className="sig">
          <div className="label">التاريخ:</div>
          <div className="line" />
        </div>
      </div>
    </div>
  );
}

function ClassSummary({ rubric, gb, evals }) {
  return (
    <div className="print-page">
      <Header />
      <div className="print-divider" />
      <div className="print-title">{rubric.title} — كشف الدرجات</div>

      <div className="print-meta-row">
        <div className="field">
          <span className="label">الصف/الشعبة:</span>
          <span className="value">{gb.grade}/{gb.section}</span>
        </div>
        <div className="field">
          <span className="label">عدد الطلاب:</span>
          <span className="value">{(gb.students || []).length}</span>
        </div>
        <div className="field">
          <span className="label">الفصل:</span>
          <span className="value">{semLabel(rubric.semester)}</span>
        </div>
      </div>

      <table className="print-table class-table">
        <thead>
          <tr>
            <th className="col-no">م</th>
            <th className="name-col">اسم الطالب</th>
            {rubric.criteria.map((c, i) => (
              <th key={c.id} title={c.name}>
                {i + 1}<br /><span style={{ fontWeight: 400, fontSize: '9pt' }}>({fmt(c.max)})</span>
              </th>
            ))}
            <th className="col-max">المجموع<br /><span style={{ fontWeight: 400, fontSize: '9pt' }}>({fmt(rubric.total_max)})</span></th>
          </tr>
        </thead>
        <tbody>
          {(gb.students || []).map((st, i) => {
            const ev = evals[st.id];
            const sc = ev?.scores || {};
            return (
              <tr key={st.id}>
                <td className="col-no">{i + 1}</td>
                <td className="name-col">{st.name}</td>
                {rubric.criteria.map(c => (
                  <td key={c.id} style={{ textAlign: 'center' }}>
                    {sc[c.id] != null ? fmt(sc[c.id]) : ''}
                  </td>
                ))}
                <td className="col-max" style={{ fontWeight: 800 }}>
                  {ev?.total != null ? fmt(ev.total) : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="print-footer">
        <div className="sig">
          <div className="label">معلم المادة:</div>
          <div className="line" />
        </div>
        <div className="sig">
          <div className="label">مدير المدرسة:</div>
          <div className="line" />
        </div>
        <div className="sig">
          <div className="label">التاريخ:</div>
          <div className="line" />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="print-header">
      <div className="line-1">سلطنة عمان</div>
      <div className="line-2">وزارة التعليم</div>
      <div className="line-3">مدرسة الخيرات للبنين للصفوف ٥-٨</div>
    </div>
  );
}
