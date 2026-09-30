import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Repeat, X, Trash2, Printer, FileDown, Copy, MessageCircle, Info } from 'lucide-react';
import SubLayout from './SubLayout';
import { subApi, errMsg, todayISO, shiftDate } from './subApi';
import { DateCard } from './DistributeParts';

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

function cellOf(t, dayName, p) {
  return (t?.schedule?.[dayName] || [])[p - 1] || null;
}

function ScheduleGrid({ teacherA, teacherB, dayName, periodA, periodB, onPickA, onPickB }) {
  return (
    <div className="overflow-x-auto">
      <table className="sub-swap-grid" data-testid="sub-swap-schedule-grid">
        <thead>
          <tr>
            <th className="sw-corner">المعلم</th>
            {PERIODS.map((p) => <th key={p}>الحصة {p}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr data-testid="sub-swap-grid-row-a">
            <td className="sw-name">{teacherA.name}</td>
            {PERIODS.map((p) => {
              const cell = cellOf(teacherA, dayName, p);
              const selected = periodA === p;
              const cls = !cell ? 'empty' : selected ? 'selected' : 'pick';
              return (
                <td key={p} className={`sw-cell ${cls}`} title={cell?.subject || ''}
                  onClick={() => cell && onPickA(p)} data-testid={`sub-swap-cell-a-${p}`}>
                  {cell ? cell.class : 'فارغة'}
                </td>
              );
            })}
          </tr>
          {teacherB && (
            <tr data-testid="sub-swap-grid-row-b">
              <td className="sw-name">{teacherB.name}</td>
              {PERIODS.map((p) => {
                const cell = cellOf(teacherB, dayName, p);
                const aBusyHere = !!cellOf(teacherA, dayName, p);
                const allowed = !!cell && (p === periodA || !aBusyHere);
                const selected = periodB === p;
                const cls = !cell ? 'empty' : selected ? 'selected' : allowed ? 'pick' : 'disabled';
                const title = !cell ? '' : !allowed ? 'المعلم الأول مشغول في هذه الحصة' : cell.subject || '';
                return (
                  <td key={p} className={`sw-cell ${cls}`} title={title}
                    onClick={() => allowed && onPickB(p)} data-testid={`sub-swap-cell-b-${p}`}>
                    {cell ? cell.class : 'فارغة'}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function SubSwap() {
  const [date, setDateState] = useState(() => localStorage.getItem('subSwapDate') || todayISO());
  const [teachers, setTeachers] = useState([]);
  const [day, setDay] = useState(null);
  const [aId, setAId] = useState('');
  const [periodA, setPeriodA] = useState(null);
  const [cands, setCands] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const [bId, setBId] = useState('');
  const [periodB, setPeriodB] = useState(null);
  const [busy, setBusy] = useState(false);

  const resetPicks = () => { setAId(''); setPeriodA(null); setCands([]); setBId(''); setPeriodB(null); };

  const setDate = (v) => {
    const next = typeof v === 'number' ? shiftDate(date, v) : v;
    localStorage.setItem('subSwapDate', next);
    setDateState(next);
    resetPicks();
  };

  useEffect(() => { subApi.get('/teachers').then((r) => setTeachers(r.data.teachers)).catch((e) => toast.error(errMsg(e))); }, []);

  const load = useCallback(() => subApi.get(`/swap/${date}`).then((r) => setDay(r.data)).catch((e) => toast.error(errMsg(e))), [date]);
  useEffect(() => { load(); }, [load]);

  const teacherA = teachers.find((t) => t.id === aId);
  const teacherB = teachers.find((t) => t.id === bId);

  const pickA = (id) => { setAId(id); setPeriodA(null); setCands([]); setBId(''); setPeriodB(null); };
  const pickPeriodA = async (p) => {
    setPeriodA(p); setBId(''); setPeriodB(null); setCandLoading(true);
    try {
      const r = await subApi.get(`/swap/${date}/candidates`, { params: { teacher_id: aId, period: p } });
      setCands(r.data);
    } catch (e) { toast.error(errMsg(e)); } finally { setCandLoading(false); }
  };
  const pickB = (id) => { setBId(id); setPeriodB(null); };
  const pickPeriodB = (p) => setPeriodB(p);

  const confirm = async () => {
    setBusy(true);
    try {
      await subApi.post(`/swap/${date}`, { teacher_a_id: aId, period_a: periodA, teacher_b_id: bId, period_b: periodB });
      toast.success('تم إنشاء التبادل بنجاح');
      resetPicks();
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const removeSwap = async (id) => {
    try { const r = await subApi.delete(`/swap/${date}/${id}`); setDay(r.data); } catch (e) { toast.error(errMsg(e)); }
  };
  const clearAll = async () => {
    if (!window.confirm('مسح جميع عمليات التبادل لهذا اليوم؟')) return;
    try { const r = await subApi.delete(`/swap/${date}`); setDay(r.data); } catch (e) { toast.error(errMsg(e)); }
  };
  const word = async () => {
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/substitution/swap/${date}/export`, { headers: { Authorization: `Bearer ${localStorage.getItem('subToken')}` } });
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `تبادل حصص ${day?.day_name || ''} ${date}.docx`; a.click();
  };
  const text = () => {
    const lines = [`تبادل الحصص ليوم ${day?.day_name || ''} ${day?.date_ar || ''}`];
    (day?.swaps || []).forEach((s) => {
      lines.push(`  • ${s.teacher_a_name} يغطي الحصة ${s.period_b} (${s.class_b}) للمعلم ${s.teacher_b_name} — وبالمقابل ${s.teacher_b_name} يغطي الحصة ${s.period_a} (${s.class_a}) للمعلم ${s.teacher_a_name}`);
    });
    return lines.join('\n');
  };
  const copy = () => navigator.clipboard.writeText(text());
  const wa = () => window.open(`https://wa.me/?text=${encodeURIComponent(text())}`, '_blank');

  const activeOptions = teachers.filter((t) => t.active !== false);

  return (
    <SubLayout title="تبادل الحصص" subtitle="اتفاق معلمين على تبادل حصة مقابل حصة في نفس اليوم فقط — الأولوية لنفس الصف">
      <div className="sub-card p-5 sub-rise" data-testid="sub-swap-setup">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <DateCard date={date} setDate={setDate} day={day} />
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--sub-muted)' }}>المعلم الأول (يتنازل عن حصة)</label>
            <select className="sub-input" value={aId} onChange={(e) => pickA(e.target.value)} disabled={!day?.is_school_day} data-testid="sub-swap-teacher-a-select">
              <option value="">— اختر المعلم الأول —</option>
              {activeOptions.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.subject}</option>)}
            </select>
          </div>
          {teacherB && (
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: 'var(--sub-muted)' }}>المعلم الثاني (يتنازل عن حصة)</label>
              <div className="sub-input flex items-center font-extrabold" style={{ cursor: 'default' }}>{teacherB.name}</div>
            </div>
          )}
        </div>

        {!teacherA && (
          <div className="text-center py-8 rounded-2xl" style={{ background: 'var(--sub-surface-2)' }} data-testid="sub-swap-empty">
            <Repeat className="w-9 h-9 mx-auto mb-2" style={{ color: 'var(--sub-line-2)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--sub-muted)' }}>اختر المعلم الأول لعرض جدول حصصه ليوم {day?.day_name || ''}</p>
          </div>
        )}

        {teacherA && (
          <>
            <div className="flex items-start gap-2 mb-3 text-xs font-bold p-3 rounded-xl" style={{ background: 'var(--sub-amber-soft)', color: 'var(--sub-amber-ink)' }} data-testid="sub-swap-instructions">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {!periodA && 'اضغط على أي حصة (خلية مصفرة) في صف المعلم الأول ليتنازل عنها.'}
                {periodA && !bId && 'الآن اختر المعلم الثاني من قائمة المرشحين أدناه.'}
                {periodA && bId && !periodB && 'اضغط الآن على حصة المعلم الثاني (الخلايا المصفرة في صفه) ليتنازل عنها لصالح المعلم الأول.'}
                {periodA && bId && periodB && 'التبادل جاهز — اضغط "تأكيد التبادل" لحفظه.'}
              </span>
            </div>
            <ScheduleGrid teacherA={teacherA} teacherB={teacherB} dayName={day?.day_name} periodA={periodA} periodB={periodB} onPickA={pickPeriodA} onPickB={pickPeriodB} />
          </>
        )}

        {teacherA && periodA && !bId && (
          <div className="mt-5 pt-5" style={{ borderTop: '1px dashed var(--sub-line)' }} data-testid="sub-swap-candidates">
            <div className="sub-card-title mb-3"><span className="ic" style={{ background: 'var(--sub-green-soft)' }}><Repeat className="w-4 h-4" style={{ color: 'var(--sub-green-ink)' }} /></span>اختر المعلم الثاني — سيغطي الحصة {periodA}</div>
            {candLoading ? <p className="text-sm font-semibold py-4 text-center" style={{ color: 'var(--sub-muted)' }}>جارٍ التحميل...</p> : (
              <div className="space-y-2">
                {cands.map((c) => (
                  <div key={c.id} className="sub-cand free" data-testid={`sub-swap-cand-${c.id}`}>
                    <span className="sub-dot green" />
                    <div className="flex-1 min-w-0">
                      <span className="font-extrabold text-sm">{c.name}</span>
                      {c.same_class && <span className="sub-badge sub-badge-navy mr-2">يُدرّس هذا الصف</span>}
                      <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>{c.subject}</p>
                    </div>
                    <button className="sub-btn sub-btn-sm sub-btn-ghost" onClick={() => pickB(c.id)} data-testid={`sub-swap-pick-b-${c.id}`}>اختيار</button>
                  </div>
                ))}
                {cands.length === 0 && <p className="text-sm font-bold text-center py-4" style={{ color: 'var(--sub-red-ink)' }}>لا يوجد معلم متاح في هذه الحصة</p>}
              </div>
            )}
          </div>
        )}

        {periodB && (
          <div className="mt-5 flex justify-end">
            <button className="sub-btn sub-btn-primary" onClick={confirm} disabled={busy} data-testid="sub-swap-confirm-btn">
              <Repeat className="w-4 h-4" /> {busy ? 'جارٍ الحفظ...' : 'تأكيد التبادل'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 sub-card p-5 sub-rise sub-rise-3" data-testid="sub-swap-report">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="sub-card-title">
            <span className="ic" style={{ background: 'var(--sub-navy-soft)' }}><Printer className="w-4 h-4" style={{ color: 'var(--sub-navy-ink)' }} /></span>
            تقرير التبادل <span className="sub-badge sub-badge-navy">{day?.swaps?.length || 0} تبادل</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="sub-btn sub-btn-primary sub-btn-sm" href={`/substitution/swap/print/${date}`} target="_blank" rel="noreferrer" data-testid="sub-swap-print-btn"><Printer className="w-3.5 h-3.5" /> طباعة / PDF</a>
            <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={word} disabled={!day?.swaps?.length} data-testid="sub-swap-word-btn"><FileDown className="w-3.5 h-3.5" /> Word</button>
            <button className="sub-btn sub-btn-ghost sub-btn-sm" onClick={copy} disabled={!day?.swaps?.length} data-testid="sub-swap-copy-btn"><Copy className="w-3.5 h-3.5" /> نسخ</button>
            <button className="sub-btn sub-btn-green sub-btn-sm" onClick={wa} disabled={!day?.swaps?.length} data-testid="sub-swap-wa-btn"><MessageCircle className="w-3.5 h-3.5" /> واتساب</button>
            <button className="sub-btn sub-btn-danger sub-btn-sm" onClick={clearAll} disabled={!day?.swaps?.length} data-testid="sub-swap-clear-btn"><Trash2 className="w-3.5 h-3.5" /> مسح الكل</button>
          </div>
        </div>
        {!day?.swaps?.length ? (
          <p className="text-sm font-semibold text-center py-6 rounded-2xl" style={{ color: 'var(--sub-muted)', background: 'var(--sub-surface-2)' }}>لا توجد عمليات تبادل لهذا اليوم</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
            <table className="sub-table" data-testid="sub-swap-table">
              <thead><tr><th>م</th><th>المعلم الأول</th><th>يُغطّي الحصة</th><th>المعلم الثاني</th><th>يُغطّي الحصة</th><th></th></tr></thead>
              <tbody>
                {day.swaps.map((s, i) => (
                  <tr key={s.id} data-testid={`sub-swap-row-${i}`}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{s.teacher_a_name}</td>
                    <td><span className="sub-badge sub-badge-amber">الحصة {s.period_b}</span> {s.class_b}</td>
                    <td className="font-bold">{s.teacher_b_name}</td>
                    <td><span className="sub-badge sub-badge-amber">الحصة {s.period_a}</span> {s.class_a}</td>
                    <td><button className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: 'var(--sub-red-ink)' }} onClick={() => removeSwap(s.id)} data-testid={`sub-swap-remove-${i}`}><X className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SubLayout>
  );
}
