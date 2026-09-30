import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, X, Plus, Pencil, Check, ShieldCheck, Printer } from 'lucide-react';
import { subApi, errMsg } from './subApi';

function NameChip({ s, onRemove }) {
  const ok = !!s.teacher_id;
  return (
    <span className={`sub-sup-name ${ok ? '' : 'unmatched'}`} title={ok ? 'مطابق لقائمة المعلمين' : 'غير موجود في قائمة المعلمين (إداري أو اسم مختلف)'} data-testid={`sub-sup-name-${s.name}`}>
      {s.name}
      {onRemove && <button type="button" className="rm" onClick={onRemove} title="إزالة" data-testid={`sub-sup-remove-${s.name}`}><X className="w-3 h-3" /></button>}
    </span>
  );
}

function DayRow({ d, editing, onChange }) {
  const [newName, setNewName] = useState('');
  const add = () => {
    const n = newName.trim();
    if (!n) return;
    onChange({ ...d, supervisors: [...d.supervisors, { name: n, teacher_id: null }] });
    setNewName('');
  };
  return (
    <tr data-testid={`sub-sup-row-${d.day}`}>
      <td className="sub-sup-day">{d.day}</td>
      <td className="sub-sup-leader">
        {editing ? (
          <input className="sub-input py-1.5 text-center font-bold" value={d.leader.name} placeholder="قائد الإشراف" onChange={(e) => onChange({ ...d, leader: { ...d.leader, name: e.target.value } })} data-testid={`sub-sup-leader-input-${d.day}`} />
        ) : (
          d.leader.name ? <NameChip s={d.leader} /> : <span className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>—</span>
        )}
      </td>
      <td>
        <div className="sub-sup-list">
          {d.supervisors.map((s, i) => (
            <NameChip key={`${s.name}-${i}`} s={s} onRemove={editing ? () => onChange({ ...d, supervisors: d.supervisors.filter((_, j) => j !== i) }) : null} />
          ))}
          {d.supervisors.length === 0 && !editing && <span className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>لا يوجد مشرفون</span>}
          {editing && (
            <span className="flex items-center gap-1">
              <input className="sub-input py-1 text-sm" style={{ width: 200 }} value={newName} placeholder="إضافة مشرف..." onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} data-testid={`sub-sup-add-input-${d.day}`} />
              <button type="button" className="sub-btn sub-btn-green sub-btn-sm px-2" onClick={add} data-testid={`sub-sup-add-btn-${d.day}`}><Plus className="w-3.5 h-3.5" /></button>
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function SubSupervision({ onChanged }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () => subApi.get('/supervision').then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const importPdf = async (f) => {
    if (!f) return;
    setBusy(true);
    const fd = new FormData(); fd.append('file', f);
    try {
      const r = await subApi.post('/supervision/import', fd);
      setData(r.data); setDraft(null); onChanged?.();
      toast.success(`تم استيراد جدول الإشراف — ${r.data.imported_days} أيام · ${r.data.matched}/${r.data.total} اسماً مطابقاً للمعلمين`);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async () => {
    try {
      const r = await subApi.put('/supervision', { days: draft.map((d) => ({ day: d.day, leader: d.leader.name, supervisors: d.supervisors.map((s) => s.name) })) });
      setData(r.data); setDraft(null); onChanged?.(); toast.success('تم حفظ جدول الإشراف');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const clear = async () => {
    if (!window.confirm('مسح جدول الإشراف بالكامل؟')) return;
    try { const r = await subApi.delete('/supervision'); setData(r.data); setDraft(null); onChanged?.(); toast.success('تم مسح جدول الإشراف'); } catch (e) { toast.error(errMsg(e)); }
  };

  if (!data) return <div className="sub-card p-8 text-center font-bold" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</div>;
  const rows = draft || data.days;
  const hasData = data.total > 0;

  return (
    <div className="space-y-4" data-testid="sub-supervision">
      <div className="sub-card p-4 flex flex-wrap gap-3 items-center sub-rise">
        <span className="ic" style={{ background: 'var(--sub-amber-soft)', width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center' }}><ShieldCheck className="w-4 h-4" style={{ color: 'var(--sub-amber-ink)' }} /></span>
        <div className="flex-1 min-w-[200px]">
          <p className="font-black text-sm" style={{ color: 'var(--sub-navy-ink)' }}>جدول الإشراف الأسبوعي</p>
          <p className="text-[11px] font-semibold" style={{ color: 'var(--sub-muted)' }}>
            {hasData ? `${data.total} اسماً · ${data.matched} مطابق لقائمة المعلمين · يظهر المشرف بشارة "مشرف" في يوم إشرافه عند التوزيع` : 'لم يُستورد جدول إشراف بعد — ارفع ملف PDF بنفس تنسيق جدول الإشراف المدرسي'}
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => importPdf(e.target.files?.[0])} data-testid="sub-sup-import-file" />
        <button className="sub-btn sub-btn-primary" onClick={() => fileRef.current?.click()} disabled={busy} data-testid="sub-sup-import-btn"><Upload className="w-4 h-4" /> {busy ? 'جارٍ القراءة...' : 'استيراد جدول الإشراف (PDF)'}</button>
        {hasData && !draft && <button className="sub-btn sub-btn-ghost" onClick={() => setDraft(JSON.parse(JSON.stringify(data.days)))} data-testid="sub-sup-edit-btn"><Pencil className="w-4 h-4" /> تعديل</button>}
        {hasData && !draft && <a className="sub-btn sub-btn-ghost" href="/substitution/supervision/print" target="_blank" rel="noreferrer" data-testid="sub-sup-print-btn"><Printer className="w-4 h-4" /> طباعة</a>}
        {draft && <button className="sub-btn sub-btn-green" onClick={save} data-testid="sub-sup-save-btn"><Check className="w-4 h-4" /> حفظ</button>}
        {draft && <button className="sub-btn sub-btn-ghost" onClick={() => setDraft(null)} data-testid="sub-sup-cancel-btn"><X className="w-4 h-4" /> إلغاء</button>}
        {hasData && !draft && <button className="sub-btn sub-btn-danger" onClick={clear} data-testid="sub-sup-clear-btn"><Trash2 className="w-4 h-4" /> مسح</button>}
      </div>

      <div className="sub-card overflow-x-auto sub-rise sub-rise-2 p-4">
        <h3 className="sub-sup-title" data-testid="sub-sup-title">جدول الإشراف {data.school_name} <span dir="ltr">{data.year_label}</span></h3>
        <table className="sub-sup-table" data-testid="sub-sup-table">
          <thead><tr><th style={{ width: 90 }}>اليوم</th><th style={{ width: 200 }}>قائد الإشراف</th><th>المشرفين</th></tr></thead>
          <tbody>
            {rows.map((d, i) => <DayRow key={d.day} d={d} editing={!!draft} onChange={(nd) => setDraft(rows.map((x, j) => (j === i ? nd : x)))} />)}
          </tbody>
        </table>
        {hasData && <p className="text-[11px] mt-3 font-semibold" style={{ color: 'var(--sub-muted)' }}><span className="sub-sup-name unmatched" style={{ padding: '0 6px' }}>اسم</span> = غير موجود في قائمة المعلمين (إداري أو اسم مختلف) — لن تظهر له شارة "مشرف" في التوزيع</p>}
      </div>
    </div>
  );
}
