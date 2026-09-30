import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { gradesApi, SCHOOL_NAME, SEMESTERS } from './gradesApi';
import '../substitution/substitution.css';

export default function GradesFullMarksPrint() {
  const [params] = useSearchParams();
  const semester = params.get('semester') || '';
  const [rows, setRows] = useState([]);
  const [max, setMax] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add('sub-app');
    gradesApi.get('/full-marks', { params: semester ? { semester } : {} })
      .then(r => { setRows(r.data.rows || []); setMax(r.data.max || 20); })
      .finally(() => setLoading(false));
    return () => document.documentElement.classList.remove('sub-app');
  }, [semester]);

  const semLabel = SEMESTERS.find(s => s.value === semester)?.label || 'الفصلان الدراسيان';
  const today = new Date().toLocaleDateString('ar-EG');

  useEffect(() => { document.title = `كشف المتميزين — ${semLabel}`; }, [semLabel]);

  return (
    <div className="sub-root sub-theme-light">
      <div className="sub-print-bar no-print p-4 flex justify-center gap-3">
        <button onClick={() => window.print()} className="sub-btn sub-btn-primary sub-btn-sm" data-testid="grades-print-btn">
          <Printer className="w-4 h-4" /> طباعة / حفظ PDF
        </button>
      </div>
      <div className="sub-print-sheet" data-testid="grades-fullmarks-sheet">
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img src="/moe-logo.jpeg" alt="" style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 6px' }} />
          <p style={{ fontWeight: 900, color: '#7F1D1D', margin: 0 }}>سلطنة عمان — وزارة التعليم</p>
          <p style={{ fontWeight: 800, margin: '2px 0' }}>{SCHOOL_NAME}</p>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: '10px 0 2px' }}>كشف الطلاب المتميزين — الدرجة النهائية ({max}/{max})</h1>
          <p style={{ fontSize: 13, margin: 0 }}>{semLabel} · بتاريخ: {today} · العدد: {rows.length}</p>
        </div>
        {loading ? <p style={{ textAlign: 'center' }}>جارٍ التحميل...</p> : (
          <table className="sub-print-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['م', 'اسم الطالب', 'الصف', 'الشعبة', 'المادة', 'الفصل الدراسي', 'المعلم', 'الدرجة'].map(h => (
                  <th key={h} style={{ border: '1px solid #333', padding: '6px 4px', background: '#f1f5f9', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 700, textAlign: 'right' }}>{r.student_name}</td>
                  <td style={td}>{r.grade}</td>
                  <td style={td}>{r.section}</td>
                  <td style={td}>{r.subject}</td>
                  <td style={td}>{r.semester_label}</td>
                  <td style={td}>{r.teacher_name}</td>
                  <td style={{ ...td, fontWeight: 900 }}>{r.total}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} style={{ ...td, padding: 20 }}>لا يوجد طلاب حاصلون على الدرجة النهائية</td></tr>}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 34, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
          <span>المعلم الأول: ........................</span>
          <span>مدير المدرسة: ........................</span>
        </div>
      </div>
    </div>
  );
}

const td = { border: '1px solid #333', padding: '5px 4px', fontSize: 12, textAlign: 'center' };
