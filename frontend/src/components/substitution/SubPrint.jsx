import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Printer, FileDown, ArrowRight, FileImage } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { subApi, SCHOOL_NAME } from './subApi';
import { getSubTheme, themeClass } from './subTheme';
import './substitution.css';

export default function SubPrint() {
  const { date } = useParams();
  const [params] = useSearchParams();
  const lateId = params.get('late') || '';
  const [day, setDay] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.documentElement.classList.add('sub-app');
    subApi.get(`/day/${date}`).then((r) => setDay(r.data)).catch(() => setErr('تعذّر تحميل بيانات اليوم'));
    return () => document.documentElement.classList.remove('sub-app');
  }, [date]);

  useEffect(() => {
    if (!day?.day_name) return;
    const prevTitle = document.title;
    document.title = `${lateId ? 'ملحق ' : ''}احتياط ${day.day_name} ${(day.date_ar || '').replace(/\//g, '-')}`;
    return () => { document.title = prevTitle; };
  }, [day, lateId]);

  const fileName = () => `${lateId ? 'ملحق ' : ''}احتياط ${day?.day_name || ''} ${(day?.date_ar || date).replace(/\//g, '-')}`;

  const word = async () => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/substitution/day/${date}/export${lateId ? `?absent_id=${lateId}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('subToken')}` } });
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${fileName()}.docx`; a.click();
  };

  const downloadPdf = async () => {
    const el = document.querySelector('.sub-print-sheet');
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const w = 210, h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, 'PNG', 0, 0, w, h);
    pdf.save(`${fileName()}.pdf`);
  };

  const downloadImage = async () => {
    const el = document.querySelector('.sub-print-sheet');
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `${fileName()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const allRows = day?.assignments || [];
  const rows = lateId ? allRows.filter((r) => r.absent_id === lateId) : allRows;
  const lateAbsent = lateId ? day?.absent?.find((a) => a.id === lateId) : null;
  return (
    <div className={`sub-root py-6 px-3 ${themeClass(getSubTheme())}`} data-testid="sub-print-page">
      <div className="sub-no-print max-w-[210mm] mx-auto flex flex-wrap items-center justify-between gap-2 mb-4">
        <Link to="/substitution" className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="sub-print-back"><ArrowRight className="w-4 h-4" /> رجوع</Link>
        <div className="flex flex-wrap gap-2">
          <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={word} data-testid="sub-print-word"><FileDown className="w-4 h-4" /> تصدير Word</button>
          <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={downloadPdf} data-testid="sub-print-pdf"><FileDown className="w-4 h-4" /> تحميل PDF</button>
          <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={downloadImage} data-testid="sub-print-image"><FileImage className="w-4 h-4" /> تحميل كصورة</button>
          <button className="sub-btn sub-btn-primary sub-btn-sm" onClick={() => window.print()} data-testid="sub-print-now"><Printer className="w-4 h-4" /> طباعة / حفظ PDF</button>
        </div>
      </div>

      <div className="sub-print-sheet" dir="rtl">
        {err && <p className="text-center font-bold text-red-700">{err}</p>}
        <div className="text-center">
          <img src="/moe-logo.jpeg" alt="وزارة التعليم" style={{ width: 120, height: 120, objectFit: 'contain', margin: '0 auto' }} />
          <p style={{ fontSize: 13, color: '#7A1E1E', fontWeight: 700, marginTop: 4 }}>سلطنة عمان — وزارة التعليم</p>
          <p style={{ fontSize: 12, color: '#444' }}>المديرية العامة للتعليم بمحافظة شمال الشرقية</p>
          <h1 style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>{day?.school_name || SCHOOL_NAME}</h1>
          <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 10, borderBottom: '2px solid #111', display: 'inline-block', paddingBottom: 4 }} data-testid="sub-print-title">
            توزيع الاحتياط ليوم {day?.day_name || ''} — الموافق {day?.date_ar || ''}
          </h2>
          {lateId && (
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#B45309', marginTop: 8 }} data-testid="sub-print-late-note">
              ملحق إضافي — معلم غائب متأخر: {lateAbsent?.name || ''} (أُضيف بعد التوزيع الأصلي لهذا اليوم)
            </p>
          )}
        </div>

        <table style={{ marginTop: 22 }} data-testid="sub-print-table">
          <thead>
            <tr><th style={{ width: 36 }}>م</th><th>المعلم الغائب</th><th style={{ width: 56 }}>الحصة</th><th style={{ width: 60 }}>الصف</th><th>المادة</th><th>المعلم البديل</th><th style={{ width: 110 }}>عدد حصص الاحتياط</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const first = i === 0 || rows[i - 1].absent_id !== r.absent_id;
              const span = first ? rows.filter((x) => x.absent_id === r.absent_id).length : 0;
              return (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  {first && <td rowSpan={span} style={{ textAlign: 'right', fontWeight: 700, background: '#FAFAFA' }}>{r.absent_name}</td>}
                  <td>{r.period}</td><td>{r.class}</td><td>{r.subject}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{r.substitute_name}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.substitute_id ? r.substitute_subs_year : ''}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} style={{ padding: 18, color: '#666' }}>لا توجد حصص احتياط لهذا اليوم</td></tr>}
            {rows.length > 0 && rows.length < 6 && Array.from({ length: 6 - rows.length }).map((_, i) => <tr key={`e${i}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>)}
          </tbody>
        </table>

        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
          <div>
            <p>عدد الحصص الموزَّعة: {rows.length}</p>
            <p style={{ marginTop: 6 }}>عدد المعلمين الغائبين: {lateId ? 1 : (day?.absent?.length || 0)}</p>
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
