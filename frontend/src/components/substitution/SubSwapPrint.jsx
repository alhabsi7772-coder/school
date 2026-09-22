import { useEffect, useState, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, FileDown, ArrowRight } from 'lucide-react';
import { subApi, SCHOOL_NAME } from './subApi';
import { getSubTheme, themeClass } from './subTheme';
import './substitution.css';

export default function SubSwapPrint() {
  const { date } = useParams();
  const [day, setDay] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.documentElement.classList.add('sub-app');
    subApi.get(`/swap/${date}`).then((r) => setDay(r.data)).catch(() => setErr('تعذّر تحميل بيانات اليوم'));
    return () => document.documentElement.classList.remove('sub-app');
  }, [date]);

  useEffect(() => {
    if (!day?.day_name) return;
    const prevTitle = document.title;
    document.title = `تبادل حصص ${day.day_name} ${(day.date_ar || '').replace(/\//g, '-')}`;
    return () => { document.title = prevTitle; };
  }, [day]);

  const word = async () => {
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/substitution/swap/${date}/export`, { headers: { Authorization: `Bearer ${localStorage.getItem('subToken')}` } });
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `تبادل حصص ${day?.day_name || ''} ${(day?.date_ar || date).replace(/\//g, '-')}.docx`; a.click();
  };

  const swaps = day?.swaps || [];
  return (
    <div className={`sub-root py-6 px-3 ${themeClass(getSubTheme())}`} data-testid="sub-swap-print-page">
      <div className="sub-no-print max-w-[210mm] mx-auto flex flex-wrap items-center justify-between gap-2 mb-4">
        <Link to="/substitution/swap" className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="sub-swap-print-back"><ArrowRight className="w-4 h-4" /> رجوع</Link>
        <div className="flex gap-2">
          <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={word} data-testid="sub-swap-print-word"><FileDown className="w-4 h-4" /> تصدير Word</button>
          <button className="sub-btn sub-btn-primary sub-btn-sm" onClick={() => window.print()} data-testid="sub-swap-print-now"><Printer className="w-4 h-4" /> طباعة / حفظ PDF</button>
        </div>
      </div>

      <div className="sub-print-sheet" dir="rtl">
        {err && <p className="text-center font-bold text-red-700">{err}</p>}
        <div className="text-center">
          <img src="/moe-logo.jpeg" alt="وزارة التعليم" style={{ width: 120, height: 120, objectFit: 'contain', margin: '0 auto' }} />
          <p style={{ fontSize: 13, color: '#7A1E1E', fontWeight: 700, marginTop: 4 }}>سلطنة عمان — وزارة التعليم</p>
          <p style={{ fontSize: 12, color: '#444' }}>المديرية العامة للتعليم بمحافظة شمال الشرقية</p>
          <h1 style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>{day?.school_name || SCHOOL_NAME}</h1>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 10, borderBottom: '2px solid #111', display: 'inline-block', paddingBottom: 4 }} data-testid="sub-swap-print-title">
            تبادل الحصص ليوم {day?.day_name || ''} — الموافق {day?.date_ar || ''}
          </h2>
        </div>

        <table style={{ marginTop: 22 }} data-testid="sub-swap-print-table">
          <thead>
            <tr><th style={{ width: 36 }}>م</th><th>المعلم</th><th style={{ width: 56 }}>الحصة</th><th style={{ width: 60 }}>الصف</th><th>المادة</th><th>يُغطّيها</th></tr>
          </thead>
          <tbody>
            {swaps.map((s, gi) => (
              <Fragment key={s.id}>
                <tr><td colSpan={6} style={{ textAlign: 'right', fontWeight: 800, background: '#FAFAFA' }}>تبادل {gi + 1}: {s.teacher_a_name} ↔ {s.teacher_b_name}</td></tr>
                <tr>
                  <td>{gi * 2 + 1}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{s.teacher_a_name}</td>
                  <td>{s.period_b}</td><td>{s.class_b}</td><td>{s.subject_b}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{s.teacher_b_name}</td>
                </tr>
                <tr>
                  <td>{gi * 2 + 2}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{s.teacher_b_name}</td>
                  <td>{s.period_a}</td><td>{s.class_a}</td><td>{s.subject_a}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{s.teacher_a_name}</td>
                </tr>
              </Fragment>
            ))}
            {swaps.length === 0 && <tr><td colSpan={6} style={{ padding: 18, color: '#666' }}>لا توجد عمليات تبادل حصص لهذا اليوم</td></tr>}
          </tbody>
        </table>

        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
          <div>
            <p>عدد عمليات التبادل: {swaps.length}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 900 }}>اعتماد إدارة المدرسة</p>
            <p style={{ marginTop: 30 }}>الاسم: ....................................</p>
            <p style={{ marginTop: 14 }}>التوقيع: ..................................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
