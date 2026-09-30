import { useState } from 'react';
import { toast } from 'sonner';
import { X, FileText, Table2, Clock, Upload, CheckCircle2 } from 'lucide-react';
import { subApi, errMsg } from './subApi';

const SLOTS = [
  { key: 'teachers_pdf', label: 'جدول حصص المعلمين', hint: 'PDF من aSc Timetables — يحوي جدول كل معلم مع المواد', icon: FileText, accept: '.pdf,application/pdf' },
  { key: 'general_pdf', label: 'الجدول العام', hint: 'PDF — أسماء المعلمين ومجموع الحصص (النصاب)', icon: Table2, accept: '.pdf,application/pdf' },
  { key: 'timing', label: 'التوقيت المدرسي', hint: 'صورة أو PDF لبرنامج اليوم الدراسي', icon: Clock, accept: 'image/*,.pdf' },
];

export default function ImportModal({ onClose, onDone }) {
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!Object.values(files).some(Boolean)) return toast.error('اختر ملفاً واحداً على الأقل');
    setBusy(true);
    const fd = new FormData();
    SLOTS.forEach((s) => files[s.key] && fd.append(s.key, files[s.key]));
    try {
      const r = await subApi.post('/teachers/import', fd);
      setResult(r.data);
      toast.success('تم الاستيراد بنجاح');
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={onClose}>
      <div className="sub-card p-6 w-full max-w-2xl sub-rise" onClick={(e) => e.stopPropagation()} data-testid="sub-import-modal">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-black text-lg" style={{ color: 'var(--sub-navy-ink)' }}>استيراد بيانات المدرسة</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5" data-testid="sub-import-close"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs font-semibold mb-5" style={{ color: 'var(--sub-muted)' }}>يتعرّف النظام تلقائياً على أسماء المعلمين، الأنصبة، الجداول الأسبوعية، والتوقيت. يمكن رفع ملف واحد أو أكثر.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SLOTS.map((s) => {
            const f = files[s.key];
            return (
              <label key={s.key} className={`sub-drop block ${f ? 'ok' : ''}`} data-testid={`sub-import-slot-${s.key}`}>
                <input type="file" accept={s.accept} className="hidden" onChange={(e) => setFiles({ ...files, [s.key]: e.target.files?.[0] || null })} data-testid={`sub-import-file-${s.key}`} />
                <s.icon className="w-6 h-6 mx-auto mb-2" style={{ color: f ? 'var(--sub-navy-ink)' : 'var(--sub-muted)' }} />
                <div className="font-extrabold text-sm" style={{ color: 'var(--sub-ink)' }}>{s.label}</div>
                <div className="text-[11px] mt-1 font-semibold leading-relaxed" style={{ color: 'var(--sub-muted)' }}>{f ? f.name : s.hint}</div>
              </label>
            );
          })}
        </div>

        {result && (
          <div className="mt-5 p-4 rounded-2xl text-sm space-y-1" style={{ background: 'var(--sub-green-soft)', border: '1px solid var(--sub-green-line)' }} data-testid="sub-import-result">
            <p className="font-extrabold flex items-center gap-2" style={{ color: 'var(--sub-green-ink)' }}><CheckCircle2 className="w-4 h-4" /> تم التعرّف على {result.total} معلماً — جديد {result.added} · محدَّث {result.updated}{result.deactivated ? ` · مُعطَّل ${result.deactivated}` : ''}</p>
            {result.sources?.length > 0 && <p className="font-semibold" style={{ color: 'var(--sub-ink)' }}>المصادر: {result.sources.join(' + ')}</p>}
            {result.timing_detected ? <p className="font-semibold" style={{ color: 'var(--sub-ink)' }}>تم التعرّف على أوقات الحصص الثماني من ملف التوقيت</p> : files.timing && <p className="font-semibold" style={{ color: 'var(--sub-amber-ink)' }}>تم حفظ ملف التوقيت — راجع أوقات الحصص من صفحة الإعدادات</p>}
            {result.quota_mismatch?.length > 0 && <p className="font-semibold" style={{ color: 'var(--sub-amber-ink)' }}>اختلاف نصاب بين الجدولين لدى {result.quota_mismatch.length} معلم — اعتُمد الجدول العام</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button className="sub-btn sub-btn-ghost" onClick={onClose}>{result ? 'إغلاق' : 'إلغاء'}</button>
          <button className="sub-btn sub-btn-primary" onClick={submit} disabled={busy} data-testid="sub-import-submit"><Upload className="w-4 h-4" /> {busy ? 'جارٍ القراءة...' : 'استيراد'}</button>
        </div>
      </div>
    </div>
  );
}
