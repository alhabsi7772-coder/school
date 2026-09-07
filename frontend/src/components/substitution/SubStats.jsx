import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarDays, UserX, ArrowLeftRight, TrendingUp, Printer } from 'lucide-react';
import SubLayout from './SubLayout';
import { subApi, errMsg, todayISO, academicRange } from './subApi';

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function rangeFor(mode, v) {
  if (mode === 'day') return [v, v];
  if (mode === 'month') {
    const [y, m] = v.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return [`${v}-01`, `${v}-${String(last).padStart(2, '0')}`];
  }
  return [`${v}-09-01`, `${Number(v) + 1}-08-31`];
}

export default function SubStats() {
  const today = todayISO();
  const [mode, setMode] = useState('month');
  const [val, setVal] = useState({ day: today, month: today.slice(0, 7), year: academicRange(today)[0].slice(0, 4) });
  const [data, setData] = useState(null);
  const [sort, setSort] = useState('subs');

  const [from, to] = rangeFor(mode, val[mode]);
  useEffect(() => {
    subApi.get('/stats', { params: { from_date: from, to_date: to } }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [from, to]);

  const teachers = useMemo(() => {
    if (!data) return [];
    const arr = data.per_teacher.filter((t) => t.active !== false);
    return [...arr].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name, 'ar') : (b[sort] - a[sort]) || a.quota - b.quota));
  }, [data, sort]);
  const maxSubs = Math.max(1, ...teachers.map((t) => t.subs));

  const label = mode === 'day' ? `يوم ${val.day}` : mode === 'month' ? `${MONTHS[Number(val.month.split('-')[1]) - 1]} ${val.month.split('-')[0]}` : `العام الدراسي ${val.year}/${Number(val.year) + 1}`;

  return (
    <SubLayout title="الإحصائيات" subtitle="متابعة الغياب وحصص الاحتياط حسب اليوم أو الشهر أو العام الدراسي">
      <div className="sub-card p-4 mb-5 flex flex-wrap items-center gap-3 sub-rise" data-testid="sub-stats-filter">
        <div className="flex rounded-full p-1" style={{ background: 'var(--sub-surface-2)', border: '1px solid var(--sub-line)' }}>
          {[['day', 'يوم'], ['month', 'شهر'], ['year', 'عام دراسي']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} className="px-4 py-1.5 rounded-full text-sm font-bold transition-colors"
              style={mode === m ? { background: 'var(--sub-navy)', color: '#fff' } : { color: 'var(--sub-muted)' }} data-testid={`sub-stats-mode-${m}`}>{l}</button>
          ))}
        </div>
        {mode === 'day' && <input type="date" className="sub-input w-auto" value={val.day} onChange={(e) => e.target.value && setVal({ ...val, day: e.target.value })} data-testid="sub-stats-day" />}
        {mode === 'month' && <input type="month" className="sub-input w-auto" value={val.month} onChange={(e) => e.target.value && setVal({ ...val, month: e.target.value })} data-testid="sub-stats-month" />}
        {mode === 'year' && (
          <select className="sub-input w-auto" value={val.year} onChange={(e) => setVal({ ...val, year: e.target.value })} data-testid="sub-stats-year">
            {[2025, 2026, 2027, 2028, 2029].map((y) => <option key={y} value={y}>{y}/{y + 1}</option>)}
          </select>
        )}
        <span className="text-sm font-bold mr-auto" style={{ color: 'var(--sub-muted)' }}>{label}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { l: 'أيام فيها غياب', v: data?.days ?? '—', ic: CalendarDays, c: 'var(--sub-navy)', bg: '#E3E8F5' },
          { l: 'حالات الغياب', v: data?.total_absences ?? '—', ic: UserX, c: 'var(--sub-red)', bg: 'var(--sub-red-soft)' },
          { l: 'حصص الاحتياط الموزَّعة', v: data?.total_subs ?? '—', ic: ArrowLeftRight, c: 'var(--sub-green)', bg: 'var(--sub-green-soft)' },
          { l: 'متوسط الاحتياط لكل يوم', v: data?.days ? (data.total_subs / data.days).toFixed(1) : '—', ic: TrendingUp, c: 'var(--sub-amber)', bg: 'var(--sub-amber-soft)' },
        ].map((s, i) => (
          <div key={s.l} className={`sub-stat sub-rise sub-rise-${Math.min(3, i + 1)}`} data-testid={`sub-stat-${i}`}>
            <div className="flex items-center justify-between">
              <span className="v">{s.v}</span>
              <span style={{ width: 40, height: 40, borderRadius: 14, background: s.bg, display: 'grid', placeItems: 'center' }}><s.ic className="w-5 h-5" style={{ color: s.c }} /></span>
            </div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 sub-card p-5 sub-rise">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="font-black" style={{ color: 'var(--sub-navy)' }}>المعلمون — الأنصبة والغياب والاحتياط</h3>
            <select className="sub-input w-auto py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value)} data-testid="sub-stats-sort">
              <option value="subs">الأكثر احتياطاً</option>
              <option value="absences">الأكثر غياباً</option>
              <option value="quota">الأعلى نصاباً</option>
              <option value="name">بالاسم</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--sub-line)' }}>
            <table className="sub-table" data-testid="sub-stats-table">
              <thead><tr><th>م</th><th>المعلم</th><th>المادة</th><th>النصاب</th><th>الغياب</th><th>الاحتياط</th><th style={{ minWidth: 140 }}>التوزيع</th></tr></thead>
              <tbody>
                {teachers.map((t, i) => (
                  <tr key={t.id}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{t.name}</td>
                    <td className="text-xs">{t.subject}</td>
                    <td className="font-black">{t.quota}</td>
                    <td><span className={`sub-badge ${t.absences ? 'sub-badge-red' : 'sub-badge-gray'}`}>{t.absences}</span></td>
                    <td><span className={`sub-badge ${t.subs ? 'sub-badge-green' : 'sub-badge-gray'}`}>{t.subs}</span></td>
                    <td><div className="sub-bar"><span style={{ width: `${(t.subs / maxSubs) * 100}%`, background: 'var(--sub-green)' }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="sub-card p-5 sub-rise sub-rise-2">
            <h3 className="font-black mb-3" style={{ color: 'var(--sub-navy)' }}>حسب المادة</h3>
            <div className="space-y-3">
              {(data?.by_subject || []).sort((a, b) => b.subs - a.subs).map((s) => {
                const mx = Math.max(1, ...data.by_subject.map((x) => x.subs));
                return (
                  <div key={s.subject}>
                    <div className="flex justify-between text-xs font-bold mb-1"><span>{s.subject}</span><span style={{ color: 'var(--sub-muted)' }}>احتياط {s.subs} · غياب {s.absences}</span></div>
                    <div className="sub-bar"><span style={{ width: `${(s.subs / mx) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sub-card p-5 sub-rise sub-rise-3">
            <h3 className="font-black mb-3" style={{ color: 'var(--sub-navy)' }}>سجل الأيام</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="sub-stats-days">
              {(data?.per_day || []).slice().reverse().map((d) => (
                <div key={d.date} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'var(--sub-surface-2)' }}>
                  <div>
                    <p className="text-sm font-bold">{d.day_name} <span dir="ltr" className="text-xs" style={{ color: 'var(--sub-muted)' }}>{d.date_ar}</span></p>
                    <p className="text-xs font-semibold" style={{ color: 'var(--sub-muted)' }}>غياب {d.absent} · احتياط {d.subs}</p>
                  </div>
                  <Link to={`/substitution/print/${d.date}`} target="_blank" className="p-1.5 rounded-lg hover:bg-black/5" title="طباعة"><Printer className="w-4 h-4" style={{ color: 'var(--sub-navy)' }} /></Link>
                </div>
              ))}
              {data && data.per_day.length === 0 && <p className="text-sm font-semibold text-center py-4" style={{ color: 'var(--sub-muted)' }}>لا توجد بيانات في هذه الفترة</p>}
            </div>
          </div>
        </div>
      </div>
    </SubLayout>
  );
}
