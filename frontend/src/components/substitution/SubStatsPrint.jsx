import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Printer, ArrowRight } from 'lucide-react';
import { subApi, SCHOOL_NAME } from './subApi';
import { getSubTheme, themeClass } from './subTheme';
import './substitution.css';

export default function SubStatsPrint() {
  const [params] = useSearchParams();
  const from = params.get('from');
  const to = params.get('to');
  const teacherId = params.get('teacher_id') || '';
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.documentElement.classList.add('sub-app');
    subApi.get('/stats', { params: { from_date: from, to_date: to, teacher_id: teacherId || undefined } })
      .then((r) => setData(r.data)).catch(() => setErr('تعذّر تحميل بيانات الكشف'));
    return () => document.documentElement.classList.remove('sub-app');
  }, [from, to, teacherId]);

  useEffect(() => {
    if (!data) return;
    const prevTitle = document.title;
    const who = data.teacher ? data.teacher.name : 'كشف عام';
    document.title = `كشف احتياط - ${who} - ${from} إلى ${to}`;
    return () => { document.title = prevTitle; };
  }, [data, from, to]);

  const teachers = (data?.per_teacher || []).filter((t) => t.active !== false).sort((a, b) => b.subs - a.subs);
  const totalAbs = teachers.reduce((s, t) => s + t.absences, 0);
  const totalSub = teachers.reduce((s, t) => s + t.subs, 0);

  return (
    <div className={`sub-root py-6 px-3 ${themeClass(getSubTheme())}`} data-testid="sub-stats-print-page">
      <div className="sub-no-print max-w-[210mm] mx-auto flex flex-wrap items-center justify-between gap-2 mb-4">
        <Link to="/substitution/stats" className="sub-btn sub-btn-ghost sub-btn-sm" data-testid="sub-stats-print-back"><ArrowRight className="w-4 h-4" /> رجوع</Link>
        <button className="sub-btn sub-btn-primary sub-btn-sm" onClick={() => window.print()} data-testid="sub-stats-print-now"><Printer className="w-4 h-4" /> طباعة / حفظ PDF</button>
      </div>

      <div className="sub-print-sheet" dir="rtl">
        {err && <p className="text-center font-bold text-red-700">{err}</p>}
        <div className="text-center">
          <img src="/moe-logo.jpeg" alt="وزارة التعليم" style={{ width: 110, height: 110, objectFit: 'contain', margin: '0 auto' }} />
          <p style={{ fontSize: 13, color: '#7A1E1E', fontWeight: 700, marginTop: 4 }}>سلطنة عمان — وزارة التعليم</p>
          <p style={{ fontSize: 12, color: '#444' }}>المديرية العامة للتعليم بمحافظة شمال الشرقية</p>
          <h1 style={{ fontSize: 19, fontWeight: 900, marginTop: 6 }}>{SCHOOL_NAME}</h1>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginTop: 10, borderBottom: '2px solid #111', display: 'inline-block', paddingBottom: 4 }} data-testid="sub-stats-print-title">
            {data?.teacher ? `كشف حصص احتياط المعلم: ${data.teacher.name}` : 'كشف عام لحصص الاحتياط'} — من {from} إلى {to}
          </h2>
        </div>

        {data?.teacher ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 18, fontSize: 13, fontWeight: 700 }}>
              <span>المادة: {data.teacher.subject || '—'}</span>
              <span>النصاب: {data.teacher.quota}</span>
              <span>أيام الغياب في الفترة: {data.teacher_absence_rows?.length || 0}</span>
              <span>عدد حصص الاحتياط في الفترة: {data.teacher_rows?.length || 0}</span>
            </div>

            {data.teacher_absence_rows?.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 800, marginTop: 20, textAlign: 'right' }}>أيام الغياب في هذه الفترة</h3>
                <table style={{ marginTop: 8 }} data-testid="sub-stats-print-absence-table">
                  <thead><tr><th style={{ width: 36 }}>م</th><th>التاريخ</th><th>اليوم</th></tr></thead>
                  <tbody>
                    {data.teacher_absence_rows.map((r, i) => (
                      <tr key={i}><td>{i + 1}</td><td dir="ltr">{r.date_ar}</td><td>{r.day_name}</td></tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h3 style={{ fontSize: 14, fontWeight: 800, marginTop: 20, textAlign: 'right' }}>حصص الاحتياط في هذه الفترة</h3>
            <table style={{ marginTop: 8 }} data-testid="sub-stats-print-detail-table">
              <thead>
                <tr><th style={{ width: 36 }}>م</th><th>التاريخ</th><th>اليوم</th><th style={{ width: 56 }}>الحصة</th><th>الوقت</th><th style={{ width: 60 }}>الصف</th><th>المادة</th><th>المعلم الغائب</th></tr>
              </thead>
              <tbody>
                {(data.teacher_rows || []).map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td dir="ltr">{r.date_ar}</td>
                    <td>{r.day_name}</td>
                    <td>{r.period}</td>
                    <td dir="ltr" style={{ fontSize: 11 }}>{r.time}</td>
                    <td>{r.class}</td>
                    <td>{r.subject}</td>
                    <td style={{ fontWeight: 700 }}>{r.absent_name}</td>
                  </tr>
                ))}
                {(!data.teacher_rows || data.teacher_rows.length === 0) && <tr><td colSpan={8} style={{ padding: 18, color: '#666' }}>لا توجد حصص احتياط لهذا المعلم في هذه الفترة</td></tr>}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 18, fontSize: 13, fontWeight: 700 }}>
              <span>إجمالي حالات الغياب: {totalAbs}</span>
              <span>إجمالي حصص الاحتياط: {totalSub}</span>
              <span>عدد المعلمين: {teachers.length}</span>
            </div>
            <table style={{ marginTop: 18 }} data-testid="sub-stats-print-general-table">
              <thead><tr><th style={{ width: 36 }}>م</th><th>المعلم</th><th>المادة</th><th style={{ width: 60 }}>النصاب</th><th style={{ width: 60 }}>الغياب</th><th style={{ width: 70 }}>الاحتياط</th><th style={{ width: 60 }}>ح٨</th></tr></thead>
              <tbody>
                {teachers.map((t, i) => (
                  <tr key={t.id}>
                    <td>{i + 1}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{t.name}</td>
                    <td>{t.subject}</td>
                    <td>{t.quota}</td>
                    <td>{t.absences}</td>
                    <td style={{ fontWeight: 700 }}>{t.subs}</td>
                    <td>{t.subs_p8}</td>
                  </tr>
                ))}
                {teachers.length === 0 && <tr><td colSpan={7} style={{ padding: 18, color: '#666' }}>لا توجد بيانات في هذه الفترة</td></tr>}
              </tbody>
            </table>
          </>
        )}

        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
          <div>
            <p>تاريخ إصدار الكشف: {new Date().toLocaleDateString('en-GB')}</p>
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
