import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Printer, ArrowRight, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { API, getAuthHeaders } from '../../utils';

const typeLabel = (t) => ({ mcq: 'اختيار من متعدد', true_false: 'صواب / خطأ', short: 'إجابة قصيرة', long: 'إجابة مطوّلة' }[t] || '');
const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

export default function QuizPrint() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/quizzes/${quizId}`, getAuthHeaders()),
      axios.get(`${API}/auth/profile`, getAuthHeaders()),
    ]).then(([q, p]) => { setQuiz(q.data); setSchoolName(p.data?.school_name || ''); })
      .catch(() => toast.error('تعذر تحميل الاختبار'))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B1120', color: 'white' }}>
        جارٍ التحميل...
      </div>
    );
  }
  if (!quiz) return null;

  const totalPoints = (quiz.questions || []).reduce((s, q) => s + (q.points || 1), 0);

  const downloadPdf = async () => {
    const el = document.querySelector('.print-page');
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = 210, h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save(`${quiz.title || 'نموذج فارغ'}.pdf`);
    } catch { toast.error('تعذر إنشاء ملف PDF'); }
    finally { setDownloading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700;800;900&family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; }
          .print-page:last-child { page-break-after: auto; }
          .q-block { page-break-inside: avoid; }
        }
        .print-page {
          width: 210mm; min-height: 297mm; padding: 14mm 12mm;
          background: #fff; color: #1a1a1a; font-family: 'Noto Sans Arabic', 'Tajawal', sans-serif;
          margin: 0 auto 12mm; box-shadow: 0 6px 28px rgba(0,0,0,0.35);
          box-sizing: border-box; position: relative;
        }
        .print-header { text-align: center; margin-bottom: 6mm; }
        .print-header .moe-logo { width: 34mm; height: 34mm; object-fit: contain; margin: 0 auto 2mm; display: block; }
        .print-header .line-1 { font-weight: 700; font-size: 13pt; color: #7A1E1E; font-family: 'Noto Kufi Arabic', 'Noto Sans Arabic', sans-serif; }
        .print-header .line-2 { font-weight: 500; font-size: 11pt; color: #444; margin-top: 1mm; }
        .print-header .line-3 { font-weight: 900; font-size: 15pt; margin-top: 2mm; font-family: 'Noto Kufi Arabic', 'Noto Sans Arabic', sans-serif; }
        .print-divider { border-top: 2px solid #1a1a1a; margin: 4mm 0 6mm; }
        .print-title { text-align: center; font-weight: 800; font-size: 16pt; margin: 2mm 0 5mm; font-family: 'Noto Kufi Arabic', 'Noto Sans Arabic', sans-serif; }
        .print-meta-row { display: flex; gap: 10mm; margin-bottom: 5mm; font-size: 12pt; font-weight: 600; }
        .print-meta-row .field { flex: 1; border-bottom: 1.5px dotted #1a1a1a; padding-bottom: 1mm; }
        .print-meta-row .field span.label { font-weight: 800; }
        .q-block { margin-bottom: 6mm; }
        .q-head { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
        .q-num { font-weight: 800; font-size: 12.5pt; }
        .q-text { font-weight: 700; font-size: 12.5pt; flex: 1; }
        .q-points { font-size: 10.5pt; font-weight: 700; color: #555; white-space: nowrap; }
        .q-type { font-size: 9.5pt; color: #777; margin-top: 1mm; }
        .q-options { margin-top: 3mm; display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm 6mm; }
        .q-option { display: flex; align-items: center; gap: 2.5mm; font-size: 11.5pt; }
        .q-option .bubble { width: 5mm; height: 5mm; border: 1.4px solid #1a1a1a; border-radius: 50%; flex-shrink: 0; }
        .q-lines { margin-top: 3mm; }
        .q-lines .line { border-bottom: 1.4px dotted #999; height: 7mm; }
      `}</style>

      <div className="no-print sticky top-0 z-50 px-5 py-3 flex items-center gap-3 flex-wrap"
        style={{ background: '#0B1120', borderBottom: '1px solid rgba(255,255,255,0.08)' }} dir="rtl">
        <button onClick={() => navigate(-1)} data-testid="quiz-print-back-btn"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'white' }}>
          <ArrowRight className="w-4 h-4" /> رجوع
        </button>
        <span className="text-sm font-bold text-white">{quiz.title} — نموذج فارغ للطباعة</span>
        <button onClick={() => window.print()} data-testid="quiz-print-trigger-btn"
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]"
          style={{ background: '#34D399', color: '#0B1120' }}>
          <Printer className="w-4 h-4" /> طباعة / حفظ PDF
        </button>
        <button onClick={downloadPdf} disabled={downloading} data-testid="quiz-print-download-pdf-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-60"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
          <FileDown className="w-4 h-4" /> {downloading ? 'جارٍ التجهيز...' : 'تحميل PDF'}
        </button>
      </div>

      <div className="py-6" style={{ background: '#1E2A3A', minHeight: '100vh' }} dir="rtl">
        <div className="print-page">
          <div className="print-header">
            <img src="/moe-logo.jpeg" alt="وزارة التعليم" className="moe-logo" />
            <div className="line-1">سلطنة عمان — وزارة التعليم</div>
            <div className="line-2">المديرية العامة للتعليم بمحافظة شمال الشرقية</div>
            <div className="line-3">{schoolName || 'مدرسة الخيرات للبنين ٥-٨'}</div>
          </div>
          <div className="print-divider" />
          <div className="print-title">{quiz.title}</div>

          <div className="print-meta-row">
            <div className="field"><span className="label">اسم الطالب:</span></div>
            <div className="field" style={{ flex: '0 0 40mm' }}><span className="label">الصف/الشعبة:</span></div>
            <div className="field" style={{ flex: '0 0 30mm' }}><span className="label">الدرجة:</span> / {totalPoints}</div>
          </div>

          {(quiz.questions || []).map((q, i) => (
            <div className="q-block" key={q.id}>
              <div className="q-head">
                <span className="q-num">{i + 1}.</span>
                <span className="q-text">{q.text}</span>
                <span className="q-points">({q.points || 1} درجة)</span>
              </div>
              <div className="q-type">{typeLabel(q.type)}</div>

              {(q.type === 'mcq') && (
                <div className="q-options">
                  {(q.options || []).map((op, oi) => (
                    <div className="q-option" key={oi}>
                      <span className="bubble" />
                      <span>{ARABIC_LETTERS[oi]}. {op}</span>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="q-options">
                  <div className="q-option"><span className="bubble" /><span>صواب</span></div>
                  <div className="q-option"><span className="bubble" /><span>خطأ</span></div>
                </div>
              )}

              {(q.type === 'short') && (
                <div className="q-lines"><div className="line" /></div>
              )}

              {(q.type === 'long') && (
                <div className="q-lines">
                  <div className="line" /><div className="line" /><div className="line" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
