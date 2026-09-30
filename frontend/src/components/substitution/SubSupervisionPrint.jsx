import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, ArrowRight } from 'lucide-react';
import { subApi, SCHOOL_NAME } from './subApi';
import { getSubTheme, themeClass } from './subTheme';
import './substitution.css';

export default function SubSupervisionPrint() {
  const [data, setData] = useState(null);

  useEffect(() => {
    document.documentElement.classList.add('sub-app');
    subApi.get('/supervision').then((r) => setData(r.data)).catch(() => {});
    const prev = document.title;
    document.title = 'جدول الإشراف';
    return () => { document.documentElement.classList.remove('sub-app'); document.title = prev; };
  }, []);

  return (
    <div className={`sub-root py-6 px-3 ${themeClass(getSubTheme())}`} data-testid="sub-sup-print-page">
      <div className="sub-no-print max-w-[210mm] mx-auto flex items-center justify-between gap-2 mb-4">
        <Link to="/substitution/teachers" className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="sub-sup-print-back"><ArrowRight className="w-4 h-4" /> رجوع</Link>
        <button className="sub-btn sub-btn-primary sub-btn-sm" onClick={() => window.print()} data-testid="sub-sup-print-now"><Printer className="w-4 h-4" /> طباعة / حفظ PDF</button>
      </div>
      <div className="sub-print-sheet" dir="rtl">
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#B91C1C', textAlign: 'center', marginBottom: 14 }} data-testid="sub-sup-print-title">
          جدول الإشراف {data?.school_name || SCHOOL_NAME} <span dir="ltr">{data?.year_label || ''}</span>
        </h1>
        <table className="sub-sup-print-table">
          <thead><tr><th style={{ width: 70 }}>اليوم</th><th style={{ width: 160 }}>قائد الإشراف</th><th>المشرفين</th></tr></thead>
          <tbody>
            {(data?.days || []).map((d) => (
              <tr key={d.day}>
                <td style={{ color: '#B91C1C', fontWeight: 900, fontSize: 16 }}>{d.day}</td>
                <td style={{ fontWeight: 900, fontSize: 18 }}>{d.leader.name}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, lineHeight: 1.7 }}>
                  {d.supervisors.map((s, i) => <div key={i}>{s.name}</div>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
