import { useState, Fragment } from 'react';
import { Plus, X, UserX, CalendarDays, ChevronRight, ChevronLeft, Check, Ban, Printer, FileDown, Copy, MessageCircle, Trash2, Sparkles, Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import { fmtAr } from './subApi';

const SUB_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

function ScheduleMini({ schedule, dayName, period }) {
  return (
    <div className="w-full mt-2 pt-2 overflow-x-auto" style={{ borderTop: '1px dashed var(--sub-line)' }} data-testid="sub-cand-schedule-mini">
      <div className="sub-week" style={{ fontSize: '0.68rem', minWidth: 420 }}>
        <div className="h">اليوم</div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => <div key={p} className="h">{p}</div>)}
        {SUB_DAYS.map((d) => (
          <Fragment key={d}>
            <div className="d">{d}</div>
            {(schedule?.[d] || Array(8).fill(null)).map((c, i) => {
              const isAssignSlot = d === dayName && i + 1 === period;
              if (isAssignSlot) {
                return (
                  <div key={`${d}-${i}`} className="c"
                    style={{ background: 'var(--sub-green-soft)', borderColor: 'var(--sub-green)', color: 'var(--sub-green-ink)', fontWeight: 800 }}>
                    احتياط
                  </div>
                );
              }
              return (
                <div key={`${d}-${i}`} className={`c ${c ? '' : 'empty'}`} title={c?.subject || ''}
                  style={c ? { background: 'var(--sub-amber-soft)', borderColor: 'var(--sub-amber-line)' } : undefined}>
                  {c ? c.class : '—'}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function DateCard({ date, setDate, day }) {
  return (
    <div className="sub-card p-5 sub-rise" data-testid="sub-date-card">
      <div className="sub-card-title mb-4">
        <span className="ic" style={{ background: 'var(--sub-navy-soft)' }}><CalendarDays className="w-4 h-4" style={{ color: 'var(--sub-navy-ink)' }} /></span>
        اليوم الدراسي
      </div>
      <div className="flex items-center gap-2">
        <button className="sub-btn sub-btn-ghost sub-btn-sm px-2" onClick={() => setDate(-1)} title="اليوم السابق" data-testid="sub-prev-day"><ChevronRight className="w-4 h-4" /></button>
        <input type="date" className="sub-input text-center font-bold" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} data-testid="sub-date-input" />
        <button className="sub-btn sub-btn-ghost sub-btn-sm px-2" onClick={() => setDate(1)} title="اليوم التالي" data-testid="sub-next-day"><ChevronLeft className="w-4 h-4" /></button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-black" style={{ color: day?.is_school_day ? 'var(--sub-navy-ink)' : 'var(--sub-red-ink)' }} data-testid="sub-day-name">
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
        <span className="ic" style={{ background: 'var(--sub-red-soft)' }}><UserX className="w-4 h-4" style={{ color: 'var(--sub-red-ink)' }} /></span>
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
      {day?.supervision && (day.supervision.leader?.name || day.supervision.supervisors?.length > 0) && (
        <div className="mt-4 pt-3 text-[11px] font-semibold" style={{ borderTop: '1px dashed var(--sub-line)', color: 'var(--sub-muted)' }} data-testid="sub-day-supervision">
          <span className="inline-flex items-center gap-1 font-extrabold" style={{ color: 'var(--sub-red-ink)' }}><ShieldCheck className="w-3.5 h-3.5" /> إشراف {day.day_name}:</span>
          {day.supervision.leader?.name && <> قائد الإشراف <b style={{ color: 'var(--sub-ink)' }}>{day.supervision.leader.name}</b> ·</>}
          {' '}{day.supervision.supervisors.length} مشرفاً
        </div>
      )}
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

export function CandidateList({ absent, period, candidates, loading, onAssign, onUnassign, excludeSup, onToggleExcludeSup, dayName }) {
  const [openSchedule, setOpenSchedule] = useState(null);
  if (!absent || !period) {
    return (
      <div className="sub-card p-8 text-center sub-rise" data-testid="sub-candidates-empty">
        <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sub-line-2)' }} />
        <p className="font-bold" style={{ color: 'var(--sub-muted)' }}>اختر معلماً غائباً ثم اضغط على إحدى حصصه لعرض البدلاء المتاحين</p>
      </div>
    );
  }
  const slot = absent.periods[period - 1];
  const free = candidates.filter((c) => c.free && !(excludeSup && c.supervisor));
  const excluded = excludeSup ? candidates.filter((c) => c.free && c.supervisor) : [];
  const busy = candidates.filter((c) => !c.free);
  const supLabel = (c) => (c.supervisor === 'leader' ? 'قائد الإشراف اليوم' : 'مشرف اليوم');
  return (
    <div className="sub-card p-5 sub-rise" data-testid="sub-candidates">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="sub-card-title">
          <span className="ic" style={{ background: 'var(--sub-green-soft)' }}><Users className="w-4 h-4" style={{ color: 'var(--sub-green-ink)' }} /></span>
          المعلمون البدلاء المتاحون
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <label className={`sub-switch ${excludeSup ? 'on' : ''}`} title="إخفاء المعلمين الذين لديهم إشراف في هذا اليوم من قائمة البدلاء (يشمل التوزيع التلقائي)" data-testid="sub-exclude-sup-toggle">
            <input type="checkbox" className="hidden" checked={excludeSup} onChange={onToggleExcludeSup} />
            <span className="track" /> استثناء مشرفي اليوم
          </label>
          <span className="sub-badge sub-badge-amber">الحصة {period} · {slot?.class}</span>
          <span className="sub-badge sub-badge-gray">{slot?.time}</span>
        </div>
      </div>

      {slot?.substitute_id && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl mb-4" style={{ background: 'var(--sub-green-soft)', border: '1px solid var(--sub-green-line)' }} data-testid="sub-current-assignment">
          <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--sub-green-ink)' }}><Check className="w-4 h-4" /> البديل الحالي: {slot.substitute_name}</span>
          <button className="sub-btn sub-btn-danger sub-btn-sm" onClick={() => onUnassign(period)} data-testid="sub-unassign-btn"><Ban className="w-3.5 h-3.5" /> إلغاء التكليف</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm font-semibold py-6 text-center" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</p>
      ) : (
        <div className="space-y-2 pr-1">
          <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--sub-muted)' }}>
            <span className="sub-dot green" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 4 }} /> متاح · نصاب عادي
            &nbsp;&nbsp;
            <span className="sub-dot amber" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 4 }} /> متاح · نصابه عالٍ جداً
          </p>
          {free.map((c, i) => (
            <div key={c.id} className={`sub-cand free ${c.high_quota ? 'high-quota' : ''} ${c.consecutive_alert ? 'streak-alert' : ''} ${c.supervisor ? 'is-supervisor' : ''}`} data-testid={`sub-cand-${c.id}`}>
              <span className="rank">{i + 1}</span>
              <span className={`sub-dot ${c.high_quota ? 'amber' : 'green'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-extrabold text-sm" style={{ color: 'var(--sub-ink)' }}>{c.name}</span>
                  <button type="button" className="p-1 rounded-lg hover:bg-black/5" title="عرض جدول المعلم"
                    onMouseEnter={() => setOpenSchedule(c.id)} onMouseLeave={() => setOpenSchedule(null)}
                    onClick={(e) => { e.stopPropagation(); setOpenSchedule(c.id); }}
                    data-testid={`sub-cand-schedule-icon-${c.id}`}>
                    <CalendarDays className="w-3.5 h-3.5" style={{ color: 'var(--sub-navy-ink)' }} />
                  </button>
                  {c.supervisor && <span className="sub-badge sub-badge-red" data-testid={`sub-cand-supervisor-${c.id}`}><ShieldCheck className="w-3 h-3" /> {supLabel(c)}</span>}
                  {c.least_quota && <span className="sub-badge sub-badge-teal">أقل نصاب</span>}
                  {c.least_subs && <span className="sub-badge sub-badge-green">أقل احتياط</span>}
                  {c.high_quota && <span className="sub-badge sub-badge-amber" data-testid={`sub-cand-highquota-${c.id}`}><AlertTriangle className="w-3 h-3" /> نصاب عالي جداً</span>}
                  {c.consecutive_alert && <span className="sub-badge sub-badge-red" data-testid={`sub-cand-streak-${c.id}`}><AlertTriangle className="w-3 h-3" /> احتياط يومين متتاليين</span>}
                  {c.same_class && <span className="sub-badge sub-badge-navy" data-testid={`sub-cand-sameclass-${c.id}`}>يُدرّس هذا الصف</span>}
                  {c.subs_today > 0 && <span className="sub-badge sub-badge-amber">له احتياط اليوم: {c.subs_today}</span>}
                </div>
                <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--sub-muted)' }}>{c.subject} · نصاب: {c.quota} · حصصه اليوم: {c.day_periods} · احتياط هذا العام: {c.subs_year} · احتياط الحصة الثامنة: {c.subs_year_p8}</p>
                {openSchedule === c.id && <ScheduleMini schedule={c.schedule} dayName={dayName} period={period} />}
              </div>
              <button className="sub-btn sub-btn-green sub-btn-sm" onClick={() => onAssign(period, c.id)} disabled={slot?.substitute_id === c.id} data-testid={`sub-assign-${c.id}`}>
                <Plus className="w-3.5 h-3.5" /> تكليف
              </button>
            </div>
          ))}
          {free.length === 0 && <p className="text-sm font-bold text-center py-4" style={{ color: 'var(--sub-red-ink)' }}>لا يوجد معلم متاح في هذه الحصة</p>}
          {excluded.length > 0 && (
            <details className="pt-2" data-testid="sub-excluded-supervisors">
              <summary className="text-xs font-bold cursor-pointer" style={{ color: 'var(--sub-red-ink)' }}>مشرفو اليوم المستثنون ({excluded.length})</summary>
              <div className="space-y-2 mt-2">
                {excluded.map((c) => (
                  <div key={c.id} className="sub-cand busy" data-testid={`sub-excluded-${c.id}`}>
                    <span className="rank"><ShieldCheck className="w-3.5 h-3.5" /></span>
                    <span className="sub-dot gray" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm">{c.name}</span>
                      <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>{supLabel(c)} · {c.subject} · نصاب: {c.quota}</p>
                    </div>
                    <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={() => onAssign(period, c.id)} data-testid={`sub-assign-${c.id}`}><Plus className="w-3.5 h-3.5" /> تكليف رغم الإشراف</button>
                  </div>
                ))}
              </div>
            </details>
          )}
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
    const lines = [`توزيع الاحتياط ليوم ${day.day_name} ${day.date_ar}`];
    let last = null;
    rows.forEach((r) => {
      if (r.absent_id !== last) { lines.push('', `الغائب: ${r.absent_name}`); last = r.absent_id; }
      lines.push(`  • الحصة ${r.period} — الصف ${r.class} (${r.time}) — البديل: ${r.substitute_name}`);
    });
    return lines.join('\n');
  };
  const copy = async () => { await navigator.clipboard.writeText(text()); };
  const wa = () => window.open(`https://wa.me/?text=${encodeURIComponent(text())}`, '_blank');
  const word = async () => {
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/substitution/day/${date}/export`, { headers: { Authorization: `Bearer ${localStorage.getItem('subToken')}` } });
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `احتياط ${day.day_name} ${(day.date_ar || date).replace(/\//g, '-')}.docx`; a.click();
  };
  return (
    <div className="sub-card p-5 sub-rise sub-rise-3" data-testid="sub-report">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="sub-card-title">
          <span className="ic" style={{ background: 'var(--sub-navy-soft)' }}><Printer className="w-4 h-4" style={{ color: 'var(--sub-navy-ink)' }} /></span>
          تقرير التوزيع
          <span className="sub-badge sub-badge-navy">{rows.length} حصة</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="sub-btn sub-btn-amber sub-btn-sm" onClick={onAuto} disabled={autoBusy || !day?.absent?.length} title="اضغط مرة أخرى للحصول على توزيع بديل بنفس العدالة" data-testid="sub-auto-btn"><Sparkles className="w-3.5 h-3.5" /> {autoBusy ? 'جارٍ التوزيع...' : 'توزيع تلقائي عادل'}</button>
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
            <thead><tr><th>م</th><th>الحصة</th><th>الوقت</th><th>الصف</th><th>المادة</th><th>المعلم البديل</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const first = i === 0 || rows[i - 1].absent_id !== r.absent_id;
                return [
                  first && (
                    <tr key={`g-${r.absent_id}`} className="sub-group-row" data-testid={`sub-report-group-${r.absent_id}`}>
                      <td colSpan={7}>المعلم الغائب: {r.absent_name} <span className="sub-badge sub-badge-red mr-2">{rows.filter((x) => x.absent_id === r.absent_id).length} حصة</span></td>
                    </tr>
                  ),
                  <tr key={r.id} data-testid={`sub-report-row-${i}`}>
                    <td>{i + 1}</td>
                    <td><span className="sub-badge sub-badge-amber">{r.period}</span></td>
                    <td className="text-xs" dir="ltr">{r.time}</td>
                    <td className="font-bold">{r.class}</td>
                    <td className="text-xs">{r.subject}</td>
                    <td className="font-bold" style={{ color: 'var(--sub-green-ink)' }}>{r.substitute_name} {r.substitute_supervisor && <span className="sub-badge sub-badge-red" title={r.substitute_supervisor === 'leader' ? 'قائد الإشراف اليوم' : 'مشرف اليوم'} data-testid={`sub-report-supervisor-${i}`}><ShieldCheck className="w-3 h-3" /> مشرف</span>} {r.auto && <span className="sub-badge sub-badge-gray">تلقائي</span>}</td>
                    <td><button className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: 'var(--sub-red-ink)' }} onClick={() => onRemove(r)} title="إزالة" data-testid={`sub-report-remove-${i}`}><X className="w-4 h-4" /></button></td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
