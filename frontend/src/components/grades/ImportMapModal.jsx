import { X, FileUp } from 'lucide-react';

export default function ImportMapModal({ preview, fields, mapping, setMapping, onConfirm, onCancel, confirming }) {
  if (!preview) return null;
  const { headers, sample_rows, total_rows } = preview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={onCancel}>
      <div className="sub-card p-6 w-full max-w-3xl sub-rise" onClick={(e) => e.stopPropagation()} data-testid="import-map-modal">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-lg flex items-center gap-2" style={{ color: 'var(--sub-navy-ink)' }}>
            <FileUp className="w-5 h-5" /> تحديد الأعمدة قبل الاستيراد
          </h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-black/5" data-testid="import-map-close"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs font-semibold mb-4" style={{ color: 'var(--sub-muted)' }}>
          حدد لكل حقل العمود المطابق له في الملف ({total_rows} صف) — تم اقتراح المطابقة تلقائيًا ويمكن تعديلها
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--sub-muted)' }}>
                {f.label}{f.required && <span style={{ color: 'var(--sub-red-ink)' }}> *</span>}
              </label>
              <select
                className="sub-input w-full"
                value={mapping[f.key] ?? ''}
                onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                data-testid={`import-map-${f.key}`}
              >
                <option value="">— لا يوجد —</option>
                {headers.map((h, i) => <option key={i} value={i}>{h || `عمود ${i + 1}`}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border mb-5" style={{ borderColor: 'var(--sub-line)' }}>
          <table className="sub-table">
            <thead>
              <tr>{headers.map((h, i) => <th key={i}>{h || `عمود ${i + 1}`}</th>)}</tr>
            </thead>
            <tbody>
              {sample_rows.map((row, i) => (
                <tr key={i}>{headers.map((_, j) => <td key={j} className="text-xs">{row[j] || '—'}</td>)}</tr>
              ))}
              {sample_rows.length === 0 && (
                <tr><td colSpan={headers.length} className="text-center py-4" style={{ color: 'var(--sub-muted)' }}>لا توجد بيانات للمعاينة</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <button className="sub-btn sub-btn-ghost" onClick={onCancel} data-testid="import-map-cancel">إلغاء</button>
          <button
            className="sub-btn sub-btn-primary"
            onClick={onConfirm}
            disabled={confirming || (() => { const v = mapping[fields.find((f) => f.required)?.key]; return v === '' || v == null; })()}
            data-testid="import-map-confirm"
          >
            {confirming ? 'جارٍ الاستيراد...' : 'تأكيد الاستيراد'}
          </button>
        </div>
      </div>
    </div>
  );
}
