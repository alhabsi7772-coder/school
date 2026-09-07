import { Plus, X, UserX, CalendarDays, ChevronRight, ChevronLeft, Check, Ban, Printer, FileDown, Copy, MessageCircle, Trash2, Sparkles, Users } from 'lucide-react';
import { fmtAr } from './subApi';

export function DateCard({ date, setDate, day }) {
  return (
    <div className="sub-card p-5 sub-rise" data-testid="sub-date-card">
      <div className="sub-card-title mb-4">
        <span className="ic" style={{ background: '#E3E8F5' }}><CalendarDays className="w-4 h-4" style={{ color: 'var(--sub-navy)' }} /></span>
        اليوم الدراسي
      </div>
      <div className="flex items-center gap-2">
        <button className="sub-btn sub-btn-ghost sub-btn-sm px-2" onClick={() => setDate(-1)} title="اليوم السابق" data-testid="sub-prev-day"><ChevronRight className="w-4 h-4" /></button>
        <input type="date" className="sub-input text-center font-bold" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} data-testid="sub-date-input" />
        <button className="sub-btn sub-btn-ghost sub-btn-sm px-2" onClick={() => setDate(1)} title="اليوم التالي" data-testid="sub-next-day"><ChevronLeft className="w-4 h-4" /></button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-black" style={{ color: day?.is_school_day ? 'var(--sub-navy)' : 'var(--sub-red)' }} data-testid="sub-day-name">
          {day?.is_school_day ? day.day_name : 'عطلة نهاية الأسبوع'}
        </span>
        <span className="text-sm font-bold" style={{ color: 'var(--sub-muted)' }} dir="ltr">{fmtAr(date)}</span>
      </div>
    </div>
  );
}

export function AbsentCard({ teachers, day, selected, onSelect, onAdd, onRemove, disabled }) {
  const absentIds = new Set((day?.absent || []).map((a) => a.id));
  const options = teachers.filter((t) => t.active !== false && !absentIds.has(t.id));
  return (
    <div className="sub-card p-5 sub-rise sub-rise-2" data-testid="sub-absent-card">
      <div className="sub-card-title mb-4">
        <span className="ic" style={{ background: 'var(--sub-red-soft)' }}><UserX className="w-4 h-4" style={{ color: 'var(--sub-red)' }} /></span>
        المعلمون الغائبون
        <span className="sub-badge sub-badge-red mr-auto" data-testid="sub-absent-count">{day?.absent?.length || 0}</span>
      </div>
      <select className="sub-input" value="" disabled={disabled} onChange={(e) => e.target.value && onAdd(e.target.value)} data-testid="sub-absent-select">
        <option value="">— اختر معلماً غائباً —</option>
        {options.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.subject}</option>)}
      </select>
      <div className="flex flex-wrap gap-2 mt-4" data-testid="sub-absent-chips">
        {(day?.absent || []).length === 0 && <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>لم يُحدَّد أي معلم غائب بعد</p>}
        {(day?.absent || []).map((a) => (
          <span key={a.id} className={`sub-chip ${selected === a.id ? 'active' : ''}`} onClick={() => onSelect(a.id)} data-testid={`sub-absent-chip-${a.id}`}>
            {a.name}
            <span className="x" onClick={(e) => { e.stopPropagation(); onRemove(a.id); }} data-testid={`sub-absent-remove-${a.id}`}><X className="w-3 h-3" /></span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function PeriodStrip({ absent, selectedPeriod, onPick }) {
  if (!absent) return null;
  return (
    <div className="sub-card p-5 sub-rise" data-testid="sub-periods-card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="sub-card-title">
          <span className="ic" style={{ background: 'var(--sub-amber-soft)' }}><CalendarDays className="w-4 h-4" style={{ color: 'var(--sub-amber)' }} /></span>
          حصص {absent.name}
        </div>
        <div className="flex gap-1.5 text-xs">
          <span className="sub-badge sub-badge-navy">{absent.subject}</span>
          <span className="sub-badge sub-badge-gray">النصاب: {absent.quota}</span>
          <span className="sub-badge sub-badge-red">غياب هذا العام: {absent.absences_year}</span>
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {absent.periods.map((p) => {
          const cls = p.class ? (p.substitute_id ? 'done' : 'has') : 'free';
          return (
            <button key={p.period} type="button" disabled={!p.class}
              className={`sub-period ${cls} ${selectedPeriod === p.period ? 'selected' : ''}`}
              onClick={() => p.class && onPick(p.period)}
              title={p.time}
              data-testid={`sub-period-${p.period}`}>
              <div className="num">{p.period}</div>
              <div className="cls">{p.class ? `${p.class}` : 'فراغ'}</div>
              {p.substitute_name && <div className="sub-name">{p.substitute_name.split(' ').slice(0, 2).join(' ')}</div>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] mt-3 font-semibold" style={{ color: 'var(--sub-muted)' }}>اضغط على حصة لعرض المعلمين المتاحين · الأصفر: تحتاج بديلاً · الأخضر: تم التكليف</p>
    </div>
  );
}

export function CandidateList({ absent, period, candidates, loading, onAssign, onUnassign }) {
  if (!absent || !period) {
    return (
      <div className="sub-card p-8 text-center sub-rise" data-testid="sub-candidates-empty">
        <Users className="w-10 h-10 mx-auto mb-3" style={{ color: '#C4C8D0' }} />
        <p className="font-bold" style={{ color: 'var(--sub-muted)' }}>اختر معلماً غائباً ثم اضغط على إحدى حصصه لعرض البدلاء المتاحين</p>
      </div>
    );
  }
  const slot = absent.periods[period - 1];
  const free = candidates.filter((c) => c.free);
  const busy = candidates.filter((c) => !c.free);
  return (
    <div className="sub-card p-5 sub-rise" data-testid="sub-candidates">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="sub-card-title">
          <span className="ic" style={{ background: 'var(--sub-green-soft)' }}><Users className="w-4 h-4" style={{ color: 'var(--sub-green)' }} /></span>
          المعلمون البدلاء المتاحون
        </div>
        <div className="flex items-center gap-1.5">
          <span className="sub-badge sub-badge-amber">الحصة {period} · {slot?.class}</span>
          <span className="sub-badge sub-badge-gray">{slot?.time}</span>
        </div>
      </div>

      {slot?.substitute_id && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl mb-4" style={{ background: 'var(--sub-green-soft)', border: '1px solid #86EFAC' }} data-testid="sub-current-assignment">
          <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--sub-green)' }}><Check className="w-4 h-4" /> البديل الحالي: {slot.substitute_name}</span>
          <button className="sub-btn sub-btn-danger sub-btn-sm" onClick={() => onUnassign(period)} data-testid="sub-unassign-btn"><Ban className="w-3.5 h-3.5" /> إلغاء التكليف</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm font-semibold py-6 text-center" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</p>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {free.map((c, i) => (
            <div key={c.id} className="sub-cand free" data-testid={`sub-cand-${c.id}`}>
              <span className="rank">{i + 1}</span>
              <span className="sub-dot green" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-extrabold text-sm" style={{ color: 'var(--sub-ink)' }}>{c.name}</span>
                  {c.least_quota && <span className="sub-badge sub-badge-teal">أقل نصاب</span>}
                  {c.least_subs && <span className="sub-badge sub-badge-green">أقل احتياط</span>}
                  {c.same_subject && <span className="sub-badge sub-badge-navy">نفس التخصص</span>}
                  {c.subs_today > 0 && <span className="sub-badge sub-badge-amber">له احتياط اليوم: {c.subs_today}</span>}
                </div>
                <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--sub-muted)' }}>{c.subject} · نصاب: {c.quota} · احتياط هذا العام: {c.subs_year}</p>
              </div>
              <button className="sub-btn sub-btn-green sub-btn-sm" onClick={() => onAssign(period, c.id)} disabled={slot?.substitute_id === c.id} data-testid={`sub-assign-${c.id}`}>
                <Plus className="w-3.5 h-3.5" /> تكليف
              </button>
            </div>
          ))}
          {free.length === 0 && <p className="text-sm font-bold text-center py-4" style={{ color: 'var(--sub-red)' }}>لا يوجد معلم متاح في هذه الحصة</p>}
          {busy.length > 0 && (
            <details className="pt-2">
              <summary className="text-xs font-bold cursor-pointer" style={{ color: 'var(--sub-muted)' }}>المعلمون المشغولون في هذه الحصة ({busy.length})</summary>
              <div className="space-y-2 mt-2">
                {busy.map((c) => (
                  <div key={c.id} className="sub-cand busy">
                    <span className="rank">—</span>
                    <span className="sub-dot gray" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm">{c.name}</span>
                      <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>{c.already_taken ? 'مكلَّف باحتياط آخر في هذه الحصة' : `لديه حصة: ${c.busy_class}`} · {c.subject}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export function ReportPanel({ day, date, onRemove, onClear, onAuto, autoBusy }) {
  const rows = day?.assignments || [];
  const text = () => {
    const lines = [`توزيع الاحتياط ليوم ${day.day_name} ${day.date_ar}`, ''];
    rows.forEach((r, i) => lines.push(`${i + 1}) الحصة ${r.period} — الصف ${r.class} — الغائب: ${r.absent_name} — البديل: ${r.substitute_name}`));
    return lines.join('\n');
  };
  const copy = async () => { await navigator.clipboard.writeText(text()); };
  const wa = () => window.open(`https://wa.me/?text=${encodeURIComponent(text())}`, '_blank');
  const word = async () => {
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/substitution/day/${date}/export`, { headers: { Authorization: `Bearer ${localStorage.getItem('subToken')}` } });
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `توزيع الاحتياط ${date}.docx`; a.click();
  };
  return (
    <div className="sub-card p-5 sub-rise sub-rise-3" data-testid="sub-report">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="sub-card-title">
          <span className="ic" style={{ background: '#E3E8F5' }}><Printer className="w-4 h-4" style={{ color: 'var(--sub-navy)' }} /></span>
          تقرير التوزيع
          <span className="sub-badge sub-badge-navy">{rows.length} حصة</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="sub-btn sub-btn-amber sub-btn-sm" onClick={onAuto} disabled={autoBusy || !day?.absent?.length} data-testid="sub-auto-btn"><Sparkles className="w-3.5 h-3.5" /> {autoBusy ? 'جارٍ التوزيع...' : 'توزيع تلقائي عادل'}</button>
          <a className="sub-btn sub-btn-primary sub-btn-sm" href={`/substitution/print/${date}`} target="_blank" rel="noreferrer" data-testid="sub-print-btn"><Printer className="w-3.5 h-3.5" /> طباعة / PDF</a>
          <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={word} disabled={!rows.length} data-testid="sub-word-btn"><FileDown className="w-3.5 h-3.5" /> Word</button>
          <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={copy} disabled={!rows.length} data-testid="sub-copy-btn"><Copy className="w-3.5 h-3.5" /> نسخ</button>
          <button className="sub-btn sub-btn-green sub-btn-sm" onClick={wa} disabled={!rows.length} data-testid="sub-wa-btn"><MessageCircle className="w-3.5 h-3.5" /> واتساب</button>
          <button className="sub-btn sub-btn-danger sub-btn-sm" onClick={onClear} disabled={!rows.length} data-testid="sub-clear-btn"><Trash2 className="w-3.5 h-3.5" /> مسح التوزيع</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm font-semibold text-center py-6 rounded-2xl" style={{ color: 'var(--sub-muted)', background: 'var(--sub-surface-2)' }}>لم يتم توزيع أي حصص بعد</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
          <table className="sub-table" data-testid="sub-report-table">
            <thead><tr><th>م</th><th>الحصة</th><th>الوقت</th><th>الصف</th><th>المادة</th><th>المعلم الغائب</th><th>المعلم البديل</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} data-testid={`sub-report-row-${i}`}>
                  <td>{i + 1}</td>
                  <td><span className="sub-badge sub-badge-amber">{r.period}</span></td>
                  <td className="text-xs" dir="ltr">{r.time}</td>
                  <td className="font-bold">{r.class}</td>
                  <td className="text-xs">{r.subject}</td>
                  <td>{r.absent_name}</td>
                  <td className="font-bold" style={{ color: 'var(--sub-green)' }}>{r.substitute_name} {r.auto && <span className="sub-badge sub-badge-gray">تلقائي</span>}</td>
                  <td><button className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: 'var(--sub-red)' }} onClick={() => onRemove(r)} title="إزالة" data-testid={`sub-report-remove-${i}`}><X className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
