import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SubLayout from './SubLayout';
import { subApi, errMsg, todayISO, shiftDate } from './subApi';
import { DateCard, AbsentCard, PeriodStrip, CandidateList, ReportPanel } from './DistributeParts';

export default function SubDistribute() {
  const [date, setDateState] = useState(() => localStorage.getItem('subDate') || todayISO());
  const [teachers, setTeachers] = useState([]);
  const [day, setDay] = useState(null);
  const [selected, setSelected] = useState(null);
  const [period, setPeriod] = useState(null);
  const [cands, setCands] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [excludeSup, setExcludeSup] = useState(() => localStorage.getItem('subExcludeSup') === '1');
  const toggleExcludeSup = () => setExcludeSup((v) => { localStorage.setItem('subExcludeSup', v ? '0' : '1'); return !v; });

  const setDate = (v) => {
    const next = typeof v === 'number' ? shiftDate(date, v) : v;
    localStorage.setItem('subDate', next);
    setDateState(next);
    setSelected(null); setPeriod(null); setCands([]);
  };

  useEffect(() => { subApi.get('/teachers').then((r) => setTeachers(r.data.teachers)).catch((e) => toast.error(errMsg(e))); }, []);

  const loadDay = useCallback(async () => {
    try {
      const r = await subApi.get(`/day/${date}`);
      setDay(r.data);
      setSelected((s) => (s && r.data.absent.some((a) => a.id === s) ? s : (r.data.absent[0]?.id || null)));
      return r.data;
    } catch (e) { toast.error(errMsg(e)); }
  }, [date]);

  useEffect(() => { loadDay(); }, [loadDay]);

  const applyDay = (d) => {
    setDay(d);
    if (selected && !d.absent.some((a) => a.id === selected)) { setSelected(null); setPeriod(null); setCands([]); }
  };

  const loadCands = useCallback(async (absentId, p) => {
    setCandLoading(true);
    try {
      const r = await subApi.get(`/day/${date}/candidates`, { params: { absent_id: absentId, period: p } });
      setCands(r.data);
    } catch (e) { toast.error(errMsg(e)); } finally { setCandLoading(false); }
  }, [date]);

  const setAbsent = async (ids) => {
    try {
      const r = await subApi.put(`/day/${date}/absent`, { teacher_ids: ids });
      applyDay(r.data);
      return r.data;
    } catch (e) { toast.error(errMsg(e)); }
  };

  const addAbsent = async (id) => {
    const d = await setAbsent([...(day?.absent || []).map((a) => a.id), id]);
    if (d) { setSelected(id); setPeriod(null); setCands([]); }
  };
  const removeAbsent = (id) => setAbsent((day?.absent || []).map((a) => a.id).filter((x) => x !== id));

  const pickPeriod = (p) => { setPeriod(p); loadCands(selected, p); };

  const assign = async (p, subId) => {
    try {
      const r = await subApi.post(`/day/${date}/assign`, { absent_id: selected, period: p, substitute_id: subId });
      applyDay(r.data);
      toast.success(subId ? 'تم التكليف' : 'تم إلغاء التكليف');
      loadCands(selected, p);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const removeRow = async (row) => {
    try {
      const r = await subApi.post(`/day/${date}/assign`, { absent_id: row.absent_id, period: row.period, substitute_id: null });
      applyDay(r.data);
      if (selected === row.absent_id && period === row.period) loadCands(selected, period);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const auto = async () => {
    setAutoBusy(true);
    try {
      const r = await subApi.post(`/day/${date}/auto`, null, { params: { exclude_supervisors: excludeSup } });
      applyDay(r.data);
      toast.success(`تم توزيع ${r.data.filled} حصة${r.data.unfilled ? ` — ${r.data.unfilled} بلا بديل متاح` : ''}`);
      if (selected && period) loadCands(selected, period);
    } catch (e) { toast.error(errMsg(e)); } finally { setAutoBusy(false); }
  };

  const clear = async () => {
    if (!window.confirm('مسح كل توزيعات هذا اليوم؟')) return;
    try {
      const r = await subApi.delete(`/day/${date}/assignments`);
      applyDay(r.data);
      if (selected && period) loadCands(selected, period);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const absentObj = day?.absent?.find((a) => a.id === selected) || null;

  return (
    <SubLayout title="توزيع حصص الاحتياط" subtitle="حدّد الغائبين، ثم وزّع الحصص يدوياً أو بضغطة واحدة بعدالة حسب النصاب">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-5 lg:col-span-1">
          <DateCard date={date} setDate={setDate} day={day} />
          <AbsentCard teachers={teachers} day={day} selected={selected} onSelect={(id) => { setSelected(id); setPeriod(null); setCands([]); }}
            onAdd={addAbsent} onRemove={removeAbsent} disabled={!day?.is_school_day} />
        </div>
        <div className="space-y-5 lg:col-span-2">
          {!day?.is_school_day && day && (
            <div className="sub-card p-6 text-center font-bold" style={{ color: 'var(--sub-red)' }} data-testid="sub-weekend-note">هذا اليوم عطلة — اختر يوماً من الأحد إلى الخميس</div>
          )}
          <PeriodStrip absent={absentObj} selectedPeriod={period} onPick={pickPeriod} />
          <CandidateList absent={absentObj} period={period} candidates={cands} loading={candLoading} onAssign={assign} onUnassign={(p) => assign(p, null)}
            excludeSup={excludeSup} onToggleExcludeSup={toggleExcludeSup} dayName={day?.day_name} />
        </div>
      </div>
      <div className="mt-5">
        <ReportPanel day={day} date={date} onRemove={removeRow} onClear={clear} onAuto={auto} autoBusy={autoBusy} />
      </div>
    </SubLayout>
  );
}
