import { useMemo, useState } from 'react';
import { X, Link2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

const CONF = {
  exact: { label: 'مطابقة تامة', cls: 'sub-badge-green', Icon: CheckCircle2 },
  high: { label: 'مطابقة قوية', cls: 'sub-badge-green', Icon: CheckCircle2 },
  low: { label: 'مطابقة محتملة — راجعها', cls: 'sub-badge-amber', Icon: AlertTriangle },
  none: { label: 'لم يُطابَق — اختر يدوياً', cls: 'sub-badge-red', Icon: HelpCircle },
};

export default function TeacherMatchModal({ data, onClose, onApply, applying }) {
  const [rows, setRows] = useState(() => data.rows.map((r) => ({ ...r, teacher_id: r.match_id || '' })));
  const teachers = data.teachers;
  const nameOf = useMemo(() => Object.fromEntries(teachers.map((t) => [t.id, t.name])), [teachers]);

  const usedBy = useMemo(() => {
    const m = {};
    rows.forEach((r) => { if (r.teacher_id) m[r.teacher_id] = (m[r.teacher_id] || 0) + 1; });
    return m;
  }, [rows]);

  const setTeacher = (i, teacher_id) => setRows(rows.map((r, j) => (j === i ? { ...r, teacher_id, confidence: teacher_id ? 'manual' : 'none' } : r)));

  const ready = rows.filter((r) => r.teacher_id && usedBy[r.teacher_id] === 1);
  const conflicts = Object.values(usedBy).filter((n) => n > 1).length;
  const unmatched = rows.filter((r) => !r.teacher_id).length;

  const apply = () => onApply(ready.map((r) => ({ teacher_id: r.teacher_id, emp: r.emp, civil: r.civil })));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--sub-overlay)' }} onClick={onClose}>
      <div className="sub-card p-6 w-full max-w-5xl sub-rise space-y-4 max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()} data-testid="teacher-match-modal">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg" style={{ color: 'var(--sub-navy-ink)' }}>مطابقة أسماء Excel مع المعلمين</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--sub-muted)' }}>
              سيتم نقل الرقم الوظيفي والرقم المدني فقط إلى المعلم المطابَق — لن يُنشأ أي معلم جديد.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5" data-testid="teacher-match-close"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs" data-testid="teacher-match-summary">
          <span className="sub-badge sub-badge-green">جاهز للنقل: {ready.length}</span>
          <span className="sub-badge sub-badge-red">غير مطابَق: {unmatched}</span>
          {conflicts > 0 && <span className="sub-badge sub-badge-amber">معلم مختار لأكثر من صف: {conflicts}</span>}
        </div>

        <div className="overflow-auto rounded-2xl border flex-1" style={{ borderColor: 'var(--sub-line)' }}>
          <table className="sub-table">
            <thead><tr><th>م</th><th>الاسم في Excel</th><th>الرقم الوظيفي</th><th>الرقم المدني</th><th>المعلم في الموقع</th><th>الحالة</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const c = CONF[r.confidence] || { label: 'اختيار يدوي', cls: 'sub-badge-navy', Icon: Link2 };
                const dupSel = r.teacher_id && usedBy[r.teacher_id] > 1;
                return (
                  <tr key={r.row} data-testid={`match-row-${r.row}`} style={dupSel ? { background: 'var(--sub-amber-soft)' } : undefined}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{r.name}{r.duplicate && <span className="sub-badge sub-badge-amber mr-2">مكرر في الملف</span>}</td>
                    <td className="text-xs">{r.emp || '—'}</td>
                    <td className="text-xs">{r.civil || '—'}</td>
                    <td>
                      <select className="sub-input text-xs" value={r.teacher_id} onChange={(e) => setTeacher(i, e.target.value)} data-testid={`match-select-${r.row}`}>
                        <option value="">— تجاهل هذا الصف —</option>
                        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` (${t.subject})` : ''}</option>)}
                      </select>
                    </td>
                    <td className="text-xs">
                      {dupSel ? <span className="sub-badge sub-badge-amber">مختار مرتين: {nameOf[r.teacher_id]}</span>
                        : <span className={`sub-badge ${c.cls}`}><c.Icon className="w-3 h-3" /> {c.label}{r.confidence === 'low' ? ` (${Math.round(r.score * 100)}%)` : ''}</span>}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center py-6" style={{ color: 'var(--sub-muted)' }}>لا توجد أسماء في الملف</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="sub-btn sub-btn-ghost" onClick={onClose} data-testid="teacher-match-cancel">إلغاء</button>
          <button type="button" className="sub-btn sub-btn-primary" disabled={applying || ready.length === 0} onClick={apply} data-testid="teacher-match-apply">
            {applying ? 'جارٍ النقل...' : `نقل الأرقام إلى ${ready.length} معلم`}
          </button>
        </div>
      </div>
    </div>
  );
}
