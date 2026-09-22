import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Repeat, UserCog, Check, X, Trash2, Printer, FileDown, Copy, MessageCircle } from 'lucide-react';
import SubLayout from './SubLayout';
import { subApi, errMsg, todayISO, shiftDate } from './subApi';
import { DateCard } from './DistributeParts';

function periodsOf(t, dayName) {
  const sched = t?.schedule?.[dayName] || [];
  return sched.map((c, i) => ({ period: i + 1, cell: c })).filter((p) => p.cell);
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

  const setDate = (v) => {
    const next = typeof v === 'number' ? shiftDate(date, v) : v;
    localStorage.setItem('subSwapDate', next);
    setDateState(next);
    setAId(''); setPeriodA(null); setCands([]); setBId(''); setPeriodB(null);
  };

  useEffect(() => { subApi.get('/teachers').then((r) => setTeachers(r.data.teachers)).catch((e) => toast.error(errMsg(e))); }, []);

  const load = useCallback(() => subApi.get(`/swap/${date}`).then((r) => setDay(r.data)).catch((e) => toast.error(errMsg(e))), [date]);
  useEffect(() => { load(); }, [load]);

  const teacherA = teachers.find((t) => t.id === aId);
  const teacherB = teachers.find((t) => t.id === bId);
  const periodsA = useMemo(() => (teacherA && day ? periodsOf(teacherA, day.day_name) : []), [teacherA, day]);
  const periodsB = useMemo(() => (teacherB && day ? periodsOf(teacherB, day.day_name).filter((p) => p.period !== periodA) : []), [teacherB, day, periodA]);

  const pickA = (id) => { setAId(id); setPeriodA(null); setCands([]); setBId(''); setPeriodB(null); };
  const pickPeriodA = async (p) => {
    setPeriodA(p); setBId(''); setPeriodB(null); setCandLoading(true);
    try {
      const r = await subApi.get(`/swap/${date}/candidates`, { params: { teacher_id: aId, period: p } });
      setCands(r.data);
    } catch (e) { toast.error(errMsg(e)); } finally { setCandLoading(false); }
  };
  const pickB = (id) => { setBId(id); setPeriodB(null); };

  const confirm = async () => {
    setBusy(true);
    try {
      await subApi.post(`/swap/${date}`, { teacher_a_id: aId, period_a: periodA, teacher_b_id: bId, period_b: periodB });
      toast.success('تم إنشاء التبادل');
      setAId(''); setPeriodA(null); setCands([]); setBId(''); setPeriodB(null);
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
      lines.push(`  • ${s.teacher_a_name} يغطي حصة ${s.period_b} (${s.class_b}) للمعلم ${s.teacher_b_name} — وبالمقابل ${s.teacher_b_name} يغطي حصة ${s.period_a} (${s.class_a}) للمعلم ${s.teacher_a_name}`);
    });
    return lines.join('\n');
  };
  const copy = () => navigator.clipboard.writeText(text());
  const wa = () => window.open(`https://wa.me/?text=${encodeURIComponent(text())}`, '_blank');

  const activeOptions = teachers.filter((t) => t.active !== false);

  return (
    <SubLayout title="تبادل الحصص" subtitle="اتفاق معلمين على تبادل حصة مقابل حصة في نفس اليوم — الأولوية لنفس الصف">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-5 lg:col-span-1">
          <DateCard date={date} setDate={setDate} day={day} />
          <div className="sub-card p-5 sub-rise sub-rise-2" data-testid="sub-swap-picker-a">
            <div className="sub-card-title mb-4"><span className="ic" style={{ background: 'var(--sub-navy-soft)' }}><UserCog className="w-4 h-4" style={{ color: 'var(--sub-navy-ink)' }} /></span>المعلم الأول</div>
            <select className="sub-input" value={aId} onChange={(e) => pickA(e.target.value)} disabled={!day?.is_school_day} data-testid="sub-swap-teacher-a-select">
              <option value="">— اختر المعلم الأول —</option>
              {activeOptions.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.subject}</option>)}
            </select>
            {teacherA && (
              <div className="mt-3">
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--sub-muted)' }}>اختر الحصة التي يريد التنازل عنها:</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {periodsA.map((p) => (
                    <button key={p.period} type="button" onClick={() => pickPeriodA(p.period)}
                      className={`sub-period has ${periodA === p.period ? 'selected' : ''}`} title={p.cell.subject}
                      data-testid={`sub-swap-period-a-${p.period}`}>
                      <div className="num">{p.period}</div><div className="cls">{p.cell.class}</div>
                    </button>
                  ))}
                  {periodsA.length === 0 && <p className="text-xs col-span-4" style={{ color: 'var(--sub-muted)' }}>لا حصص لهذا المعلم هذا اليوم</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {aId && periodA ? (
            <div className="sub-card p-5 sub-rise" data-testid="sub-swap-candidates">
              <div className="sub-card-title mb-4"><span className="ic" style={{ background: 'var(--sub-green-soft)' }}><Repeat className="w-4 h-4" style={{ color: 'var(--sub-green-ink)' }} /></span>المعلم الثاني — سيغطي حصة {periodA}</div>
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
                      <button className={`sub-btn sub-btn-sm ${bId === c.id ? 'sub-btn-green' : 'sub-btn-ghost'}`} onClick={() => pickB(c.id)} data-testid={`sub-swap-pick-b-${c.id}`}>
                        {bId === c.id ? <><Check className="w-3.5 h-3.5" /> محدَّد</> : 'اختيار'}
                      </button>
                    </div>
                  ))}
                  {cands.length === 0 && <p className="text-sm font-bold text-center py-4" style={{ color: 'var(--sub-red-ink)' }}>لا يوجد معلم متاح في هذه الحصة</p>}
                </div>
              )}

              {teacherB && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px dashed var(--sub-line)' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: 'var(--sub-muted)' }}>اختر الحصة التي سيتنازل عنها {teacherB.name} (يغطيها {teacherA.name} بدلاً منه):</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {periodsB.map((p) => (
                      <button key={p.period} type="button" onClick={() => setPeriodB(p.period)}
                        className={`sub-period has ${periodB === p.period ? 'selected' : ''}`} title={p.cell.subject}
                        data-testid={`sub-swap-period-b-${p.period}`}>
                        <div className="num">{p.period}</div><div className="cls">{p.cell.class}</div>
                      </button>
                    ))}
                    {periodsB.length === 0 && <p className="text-xs col-span-4" style={{ color: 'var(--sub-muted)' }}>لا حصص أخرى لهذا المعلم</p>}
                  </div>
                  <button className="sub-btn sub-btn-primary sub-btn-sm mt-4" onClick={confirm} disabled={!periodB || busy} data-testid="sub-swap-confirm-btn">
                    <Repeat className="w-3.5 h-3.5" /> {busy ? 'جارٍ الحفظ...' : 'تأكيد التبادل'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="sub-card p-8 text-center sub-rise" data-testid="sub-swap-empty">
              <Repeat className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--sub-line-2)' }} />
              <p className="font-bold" style={{ color: 'var(--sub-muted)' }}>اختر المعلم الأول ثم إحدى حصصه للبدء بالتبادل</p>
            </div>
          )}
        </div>
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
              <thead><tr><th>م</th><th>المعلم الأول</th><th>يُغطّي حصة</th><th>المعلم الثاني</th><th>يُغطّي حصة</th><th></th></tr></thead>
              <tbody>
                {day.swaps.map((s, i) => (
                  <tr key={s.id} data-testid={`sub-swap-row-${i}`}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{s.teacher_a_name}</td>
                    <td><span className="sub-badge sub-badge-amber">ح{s.period_b}</span> {s.class_b}</td>
                    <td className="font-bold">{s.teacher_b_name}</td>
                    <td><span className="sub-badge sub-badge-amber">ح{s.period_a}</span> {s.class_a}</td>
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
